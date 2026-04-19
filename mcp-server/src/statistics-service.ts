import { supabase } from "./supabase.js";
import { FluxaService } from "./fluxa-service.js";
import type { LocationRecord, SiteStatisticsRecord } from "./types.js";

interface CardScopeRow {
  scope: "public" | "personal";
}

interface ErrorReportRow {
  id: string;
  status: string | null;
}

const IGNORABLE_ERROR_CODES = new Set(["PGRST116", "PGRST205", "42P01", "42703", "406"]);

function isIgnorableError(error: unknown): boolean {
  const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code: string }).code) : "";
  return IGNORABLE_ERROR_CODES.has(code);
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function incrementCount(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) || 0) + 1);
}

function toTopCountEntries<TKey extends string>(
  counts: Map<string, number>,
  keyName: TKey,
  limit: number
): Array<Record<TKey, string> & { count: number }> {
  return Array.from(counts.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0], "zh-CN");
    })
    .slice(0, limit)
    .map(([key, count]) => ({
      [keyName]: key,
      count
    })) as Array<Record<TKey, string> & { count: number }>;
}

function toDateKey(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function buildRecentLocationSeries(locations: LocationRecord[], days = 14): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    counts.set(date.toISOString().slice(0, 10), 0);
  }

  locations.forEach((location) => {
    const key = toDateKey(location.createdAt);
    if (!key || !counts.has(key)) {
      return;
    }

    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([date, count]) => ({
    date,
    count
  }));
}

function countLocationsSince(locations: LocationRecord[], days: number): number {
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;

  return locations.filter((location) => {
    const timestamp = new Date(location.createdAt).getTime();
    return Number.isFinite(timestamp) && timestamp >= threshold;
  }).length;
}

function buildNewestLocations(locations: LocationRecord[], limit: number): SiteStatisticsRecord["newestLocations"] {
  return [...locations]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit)
    .map((location) => ({
      id: location.id,
      name: location.name,
      brand: location.brand,
      city: location.city,
      status: location.status,
      source: location.source,
      createdAt: location.createdAt,
      addedBy: normalizeString(location.addedBy, "Unknown")
    }));
}

export class StatisticsService {
  constructor(private readonly fluxaService: FluxaService) {}

  async getSiteStatistics(options?: { topN?: number }): Promise<SiteStatisticsRecord> {
    const topN = Math.max(5, Math.min(options?.topN || 10, 25));
    const [locations, topContributors, brandCountResult, cardScopeRows, userCountResult, errorReportRows] = await Promise.all([
      this.fluxaService.listMergedLocations(),
      this.fluxaService.rankLocationContributors({ limit: topN }),
      supabase.from("brands").select("id", { count: "exact", head: true }),
      supabase.from("card_album_cards").select("scope"),
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("location_error_reports").select("id, status")
    ]);

    if (brandCountResult.error) {
      throw brandCountResult.error;
    }
    if (cardScopeRows.error) {
      throw cardScopeRows.error;
    }
    if (userCountResult.error && !isIgnorableError(userCountResult.error)) {
      throw userCountResult.error;
    }
    if (errorReportRows.error && !isIgnorableError(errorReportRows.error)) {
      throw errorReportRows.error;
    }

    const statusCounts = new Map<string, number>();
    const sourceCounts = new Map<string, number>();
    const cityCounts = new Map<string, number>();
    const brandCounts = new Map<string, number>();

    locations.forEach((location) => {
      incrementCount(statusCounts, location.status || "unknown");
      incrementCount(sourceCounts, location.source || "unknown");
      incrementCount(cityCounts, location.city || "Unknown");
      incrementCount(brandCounts, location.brand || "Unknown");
    });

    const scopes = (cardScopeRows.data || []) as CardScopeRow[];
    const reportRows = ((errorReportRows.data || []) as ErrorReportRow[]).filter(Boolean);
    const publicCards = scopes.filter((row) => row.scope === "public").length;
    const personalCards = scopes.filter((row) => row.scope === "personal").length;
    const openErrorReports = reportRows.filter((row) => !["resolved", "closed", "rejected"].includes(normalizeString(row.status))).length;

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        locations: locations.length,
        posLocations: locations.filter((location) => location.source === "pos_machines").length,
        fluxaLocations: locations.filter((location) => location.source === "fluxa_locations").length,
        brands: brandCountResult.count || 0,
        publicCards,
        personalCards,
        users: userCountResult.count || 0,
        errorReports: reportRows.length,
        openErrorReports,
        newLocations7d: countLocationsSince(locations, 7),
        newLocations30d: countLocationsSince(locations, 30)
      },
      recentLocationSeries: buildRecentLocationSeries(locations, 14),
      locationStatusBreakdown: toTopCountEntries(statusCounts, "status", 10),
      locationSourceBreakdown: toTopCountEntries(sourceCounts, "source", 10),
      topCities: toTopCountEntries(cityCounts, "city", topN),
      topBrands: toTopCountEntries(brandCounts, "brand", topN),
      topContributors,
      newestLocations: buildNewestLocations(locations, topN)
    };
  }
}
