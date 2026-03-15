import { supabase } from "@/lib/supabase";
import { normalizeExternalUrl, normalizeHexColor } from "@/lib/brand-visuals";
import type { BrandBusinessType, BrandRecord, BrandSegment, BrandStatus, CreateBrandInput } from "@/types/brand";

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

interface PostgrestLikeError {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
}

type BrandInsertPayload = Record<string, string | number | boolean | null>;

interface BrandNotesEnvelope {
  version: 1;
  internalNotes?: string;
  businessType?: BrandBusinessType;
  status?: BrandStatus;
  website?: string;
  founded?: number | null;
  headquarters?: string;
  color?: string;
  logo?: string;
}

const BRAND_NOTES_META_PREFIX = "__FLUXA_BRAND_META__:";

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

function normalizeYear(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.trunc(value);
  if (normalized < 1800 || normalized > 9999) {
    return null;
  }

  return normalized;
}

function ensureOptionalUrl(value: string | undefined, errorMessage: string): string | null {
  const trimmed = value?.trim() || "";
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeExternalUrl(trimmed);
  if (!normalized) {
    throw new Error(errorMessage);
  }

  return normalized;
}

function ensureOptionalHexColor(value: string | undefined): string | null {
  const trimmed = value?.trim() || "";
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeHexColor(trimmed);
  if (!normalized) {
    throw new Error("Accent color must be a hex value like #5749F4.");
  }

  return normalized;
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

function buildErrorMessage(error: unknown): string | null {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object") {
    const postgrestError = error as PostgrestLikeError;
    if (typeof postgrestError.message === "string" && postgrestError.message.trim()) {
      return postgrestError.message.trim();
    }
  }

  return null;
}

function getMissingColumnName(error: unknown): string | null {
  const message = buildErrorMessage(error);
  if (!message) {
    return null;
  }

  const match = message.match(/Could not find the '([^']+)' column of 'brands' in the schema cache/i);
  return match?.[1] || null;
}

function parseBrandNotes(value: unknown): { internalNotes?: string; metadata: Partial<BrandNotesEnvelope> } {
  const raw = normalizeOptionalString(value);
  if (!raw) {
    return { metadata: {} };
  }

  if (!raw.startsWith(BRAND_NOTES_META_PREFIX)) {
    return {
      internalNotes: raw,
      metadata: {}
    };
  }

  try {
    const parsed = JSON.parse(raw.slice(BRAND_NOTES_META_PREFIX.length)) as BrandNotesEnvelope;
    return {
      internalNotes: normalizeOptionalString(parsed.internalNotes),
      metadata: parsed && typeof parsed === "object" ? parsed : {}
    };
  } catch {
    return {
      internalNotes: raw,
      metadata: {}
    };
  }
}

function serializeBrandNotesEnvelope(input: CreateBrandInput): string | null {
  const envelope: BrandNotesEnvelope = {
    version: 1,
    internalNotes: normalizeOptionalString(input.notes),
    businessType: input.businessType,
    status: input.status,
    website: ensureOptionalUrl(input.website, "Website URL is invalid.") || undefined,
    founded: normalizeYear(input.founded),
    headquarters: normalizeOptionalString(input.headquarters),
    color: ensureOptionalHexColor(input.color) || undefined,
    logo: ensureOptionalUrl(input.logo, "Image URL is invalid.") || undefined
  };

  return `${BRAND_NOTES_META_PREFIX}${JSON.stringify(envelope)}`;
}

function mapBrandRowToRecord(row: BrandRow, stats?: BrandStatsAccumulator): BrandRecord {
  const parsedNotes = parseBrandNotes(row.notes);
  const category = normalizeString(row.category, "other");
  const name = normalizeString(row.name, "Unknown");
  const uiSegment = mapCategoryToSegment(category, name);
  const createdAt = normalizeOptionalString(row.created_at) || normalizeOptionalString(row.updated_at) || new Date().toISOString();
  const updatedAt = normalizeOptionalString(row.updated_at) || normalizeOptionalString(row.created_at) || createdAt;
  const lastSyncAt = stats?.lastSyncAt || updatedAt;
  const embeddedBusinessType = parsedNotes.metadata.businessType;
  const embeddedStatus = parsedNotes.metadata.status;
  const embeddedWebsite = parsedNotes.metadata.website;
  const embeddedFounded = parsedNotes.metadata.founded;
  const embeddedHeadquarters = parsedNotes.metadata.headquarters;
  const embeddedColor = parsedNotes.metadata.color;
  const embeddedLogo = parsedNotes.metadata.logo;

  return {
    id: row.id,
    name,
    description: normalizeOptionalString(row.description),
    notes: parsedNotes.internalNotes,
    category,
    businessType: normalizeBusinessType(category, row.business_type || embeddedBusinessType),
    status: normalizeBrandStatus(row.status || embeddedStatus),
    iconUrl: normalizeOptionalString(row.icon_url),
    logo: normalizeOptionalString(row.logo) || normalizeOptionalString(embeddedLogo),
    color: normalizeOptionalString(row.color) || normalizeOptionalString(embeddedColor),
    website: normalizeOptionalString(row.website) || normalizeOptionalString(embeddedWebsite),
    founded: normalizeNumber(row.founded) ?? normalizeNumber(embeddedFounded),
    headquarters: normalizeOptionalString(row.headquarters) || normalizeOptionalString(embeddedHeadquarters),
    isSystemBrand: normalizeBoolean(row.is_system_brand),
    createdBy: normalizeOptionalString(row.created_by),
    createdAt,
    updatedAt,
    storeCount: stats?.storeCount || 0,
    activeStoreCount: stats?.activeStoreCount || 0,
    inactiveStoreCount: stats?.inactiveStoreCount || 0,
    primaryCity: pickPrimaryCity(
      stats?.cityCounts || new Map<string, number>(),
      normalizeOptionalString(row.headquarters) || normalizeOptionalString(embeddedHeadquarters)
    ),
    lastSyncAt,
    uiSegment,
    uiCategoryLabel: mapSegmentToCategoryLabel(uiSegment)
  };
}

function buildOptimisticBrandRecord(input: CreateBrandInput, userId?: string): BrandRecord {
  const name = normalizeString(input.name, "Unknown");
  const category = normalizeString(input.category, "other");
  const uiSegment = mapCategoryToSegment(category, name);
  const timestamp = new Date().toISOString();

  return {
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `brand-${Date.now()}`,
    name,
    description: normalizeOptionalString(input.description),
    notes: normalizeOptionalString(input.notes),
    category,
    businessType: input.businessType,
    status: input.status,
    iconUrl: normalizeOptionalString(input.iconUrl),
    logo: normalizeOptionalString(input.logo),
    color: normalizeOptionalString(input.color),
    website: normalizeOptionalString(input.website),
    founded: normalizeYear(input.founded ?? null),
    headquarters: normalizeOptionalString(input.headquarters),
    isSystemBrand: false,
    createdBy: userId,
    createdAt: timestamp,
    updatedAt: timestamp,
    storeCount: 0,
    activeStoreCount: 0,
    inactiveStoreCount: 0,
    primaryCity: normalizeOptionalString(input.headquarters) || "Unknown",
    lastSyncAt: timestamp,
    uiSegment,
    uiCategoryLabel: mapSegmentToCategoryLabel(uiSegment)
  };
}

async function getCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user?.id) {
    throw new Error("Your login session has expired. Sign in again before creating a brand.");
  }

  return user.id;
}

async function assertBrandNameAvailable(name: string): Promise<void> {
  const { data, error } = await supabase
    .from("brands")
    .select("id, name")
    .ilike("name", name.trim())
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.id) {
    throw new Error("A brand with this name already exists.");
  }
}

async function fetchBrandByName(name: string): Promise<BrandRecord | null> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("name", name.trim())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const message = buildErrorMessage(error) || "";
    if (error.code === "PGRST116" || message.toLowerCase().includes("0 rows")) {
      return null;
    }
    throw error;
  }

  return data ? mapBrandRowToRecord(data as BrandRow) : null;
}

function buildCreateBrandPayload(input: CreateBrandInput, userId: string): BrandInsertPayload {
  return {
    name: input.name.trim(),
    description: normalizeOptionalString(input.description) ?? null,
    notes: serializeBrandNotesEnvelope(input),
    category: normalizeString(input.category, "other"),
    business_type: input.businessType,
    status: input.status,
    icon_url: ensureOptionalUrl(input.iconUrl, "Image URL is invalid."),
    logo: ensureOptionalUrl(input.logo, "Image URL is invalid."),
    color: ensureOptionalHexColor(input.color),
    website: ensureOptionalUrl(input.website, "Website URL is invalid."),
    founded: normalizeYear(input.founded),
    headquarters: normalizeOptionalString(input.headquarters) ?? null,
    created_by: userId,
    is_system_brand: false
  };
}

async function insertBrandPayloadWithFallback(payload: BrandInsertPayload): Promise<void> {
  const currentPayload: BrandInsertPayload = { ...payload };

  while (true) {
    const { error } = await supabase.from("brands").insert(currentPayload);

    if (!error) {
      return;
    }

    if (error.code === "23505") {
      throw new Error("A brand with this name already exists.");
    }

    const missingColumn = getMissingColumnName(error);
    if (!missingColumn || !(missingColumn in currentPayload) || missingColumn === "name") {
      throw error;
    }

    delete currentPayload[missingColumn];
  }
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
  },

  async createBrand(input: CreateBrandInput): Promise<BrandRecord> {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      throw new Error("Brand name is required.");
    }

    const userId = await getCurrentUserId();
    await assertBrandNameAvailable(trimmedName);

    await insertBrandPayloadWithFallback(buildCreateBrandPayload(input, userId));

    try {
      const insertedBrand = await fetchBrandByName(trimmedName);
      if (insertedBrand) {
        return insertedBrand;
      }
    } catch {
      // Some production policies allow insert but restrict immediate reads. Fall back to optimistic UI.
    }

    return buildOptimisticBrandRecord(input, userId);
  }
};
