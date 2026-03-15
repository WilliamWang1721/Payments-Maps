import { supabase } from "@/lib/supabase";
import type { BrandBusinessType, BrandRecord, BrandSegment, BrandStatus } from "@/types/brand";

interface BrandRow {
  id: string;
  name: string;
  description?: string | null;
  notes?: string | null;
  category?: string | null;
  business_type?: string | null;
  status?: string | null;
  icon_url?: string | null;
  logo?: string | null;
  color?: string | null;
  website?: string | null;
  founded?: number | string | null;
  headquarters?: string | null;
  is_system_brand?: boolean | null;
  created_by?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

interface PosMachineBrandRow {
  brand_id: string | null;
  status: string | null;
  updated_at: string | null;
  address: string | null;
  merchant_info: Record<string, unknown> | null;
}

interface BrandStatsAccumulator {
  storeCount: number;
  activeStoreCount: number;
  inactiveStoreCount: number;
  lastSyncAt: string | null;
  cityCounts: Map<string, number>;
}

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function inferCity(address: string, fallback?: string): string {
  if (fallback?.trim()) return fallback.trim();

  const segments = address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length >= 2) {
    return segments[segments.length - 2];
  }

  return segments[0] || "Unknown";
}

function normalizeBrandStatus(value: unknown): BrandStatus {
  const normalized = normalizeString(value, "active").toLowerCase();
  if (normalized === "inactive") return "inactive";
  if (normalized === "coming_soon") return "coming_soon";
  return "active";
}

function normalizeBusinessType(category: string, businessType: unknown): BrandBusinessType {
  const normalizedBusinessType = normalizeString(businessType).toLowerCase();
  if (normalizedBusinessType === "online") return "online";
  if (normalizedBusinessType === "offline") return "offline";

  const normalizedCategory = category.toLowerCase();
  if (normalizedCategory === "ecommerce" || normalizedCategory === "food_delivery") {
    return "online";
  }

  return "offline";
}

function mapCategoryToSegment(category: string, brandName: string): BrandSegment {
  const normalizedCategory = category.toLowerCase();
  const normalizedName = brandName.toLowerCase();

  if (normalizedCategory === "coffee" || normalizedName.includes("coffee") || normalizedName.includes("starbucks")) {
    return "Coffee";
  }

  if (
    normalizedCategory === "fast_food" ||
    normalizedCategory === "restaurant" ||
    normalizedCategory === "food_delivery" ||
    normalizedName.includes("mcd") ||
    normalizedName.includes("kfc") ||
    normalizedName.includes("burger") ||
    normalizedName.includes("subway")
  ) {
    return "Fast Food";
  }

  if (normalizedCategory === "convenience" || normalizedName.includes("lawson") || normalizedName.includes("familymart") || normalizedName.includes("7-eleven")) {
    return "Convenience";
  }

  return "Retail";
}

function mapSegmentToCategoryLabel(segment: BrandSegment): string {
  if (segment === "Coffee") return "Coffee & Beverage";
  if (segment === "Fast Food") return "Quick Service";
  if (segment === "Convenience") return "Convenience";
  return "Retail";
}

function pickPrimaryCity(cityCounts: Map<string, number>, fallback?: string): string {
  const entries = Array.from(cityCounts.entries()).sort((left, right) => right[1] - left[1]);
  return entries[0]?.[0] || fallback || "Unknown";
}

function buildBrandStats(rows: PosMachineBrandRow[]): Map<string, BrandStatsAccumulator> {
  const statsByBrandId = new Map<string, BrandStatsAccumulator>();

  rows.forEach((row) => {
    if (!row.brand_id) return;

    const stats = statsByBrandId.get(row.brand_id) || {
      storeCount: 0,
      activeStoreCount: 0,
      inactiveStoreCount: 0,
      lastSyncAt: null,
      cityCounts: new Map<string, number>()
    };

    stats.storeCount += 1;
    if (normalizeString(row.status, "active").toLowerCase() === "inactive") {
      stats.inactiveStoreCount += 1;
    } else {
      stats.activeStoreCount += 1;
    }

    if (row.updated_at) {
      const currentTimestamp = new Date(row.updated_at).getTime();
      const previousTimestamp = stats.lastSyncAt ? new Date(stats.lastSyncAt).getTime() : 0;
      if (Number.isFinite(currentTimestamp) && currentTimestamp >= previousTimestamp) {
        stats.lastSyncAt = row.updated_at;
      }
    }

    const merchantInfo = normalizeRecord(row.merchant_info);
    const city = normalizeOptionalString(merchantInfo.city) || inferCity(normalizeString(row.address), undefined);
    if (city && city !== "Unknown") {
      stats.cityCounts.set(city, (stats.cityCounts.get(city) || 0) + 1);
    }

    statsByBrandId.set(row.brand_id, stats);
  });

  return statsByBrandId;
}

function mapBrandRowToRecord(row: BrandRow, stats?: BrandStatsAccumulator): BrandRecord {
  const category = normalizeString(row.category, "other");
  const name = normalizeString(row.name, "Unknown");
  const uiSegment = mapCategoryToSegment(category, name);
  const createdAt = normalizeOptionalString(row.created_at) || normalizeOptionalString(row.updated_at) || new Date().toISOString();
  const updatedAt = normalizeOptionalString(row.updated_at) || normalizeOptionalString(row.created_at) || createdAt;
  const lastSyncAt = stats?.lastSyncAt || updatedAt;

  return {
    id: row.id,
    name,
    description: normalizeOptionalString(row.description),
    notes: normalizeOptionalString(row.notes),
    category,
    businessType: normalizeBusinessType(category, row.business_type),
    status: normalizeBrandStatus(row.status),
    iconUrl: normalizeOptionalString(row.icon_url),
    logo: normalizeOptionalString(row.logo),
    color: normalizeOptionalString(row.color),
    website: normalizeOptionalString(row.website),
    founded: normalizeNumber(row.founded),
    headquarters: normalizeOptionalString(row.headquarters),
    isSystemBrand: normalizeBoolean(row.is_system_brand),
    createdBy: normalizeOptionalString(row.created_by),
    createdAt,
    updatedAt,
    storeCount: stats?.storeCount || 0,
    activeStoreCount: stats?.activeStoreCount || 0,
    inactiveStoreCount: stats?.inactiveStoreCount || 0,
    primaryCity: pickPrimaryCity(stats?.cityCounts || new Map<string, number>(), normalizeOptionalString(row.headquarters)),
    lastSyncAt,
    uiSegment,
    uiCategoryLabel: mapSegmentToCategoryLabel(uiSegment)
  };
}

export const brandService = {
  async listBrands(): Promise<BrandRecord[]> {
    const [{ data: brandData, error: brandError }, { data: posMachineData, error: posMachineError }] = await Promise.all([
      supabase.from("brands").select("*").order("created_at", { ascending: false }),
      supabase.from("pos_machines").select("brand_id, status, updated_at, address, merchant_info")
    ]);

    if (brandError) {
      throw brandError;
    }

    if (posMachineError) {
      throw posMachineError;
    }

    const statsByBrandId = buildBrandStats((posMachineData || []) as PosMachineBrandRow[]);

    return ((brandData || []) as BrandRow[])
      .map((row) => mapBrandRowToRecord(row, statsByBrandId.get(row.id)))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  }
};
