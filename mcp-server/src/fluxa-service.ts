import type { User } from "@supabase/supabase-js";

import { supabase } from "./supabase.js";
import type {
  BrandRecord,
  BrowsingHistoryRecord,
  CardAlbumCard,
  ContributorRankingRecord,
  CreateCardAlbumCardInput,
  CreateLocationAttemptInput,
  CreateLocationInput,
  DatasetSummary,
  LocationAttemptRecord,
  LocationDetailRecord,
  LocationRecord,
  LocationReviewRecord,
  SiteStatisticsRecord,
  UpdateViewerProfileInput,
  ViewerProfileRecord
} from "./types.js";

type RecordValue = Record<string, unknown>;

interface FluxaLocationRow {
  id: string;
  merchant_name: string;
  address: string;
  brand: string | null;
  bin: string | null;
  city: string | null;
  status: "active" | "inactive";
  latitude: number | string;
  longitude: number | string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PosMachineRow {
  id: string;
  name: string;
  merchant_name: string;
  address: string;
  brand_id: string | null;
  created_by: string | null;
  latitude: number | string;
  longitude: number | string;
  basic_info: RecordValue | null;
  status: string | null;
  remarks: string | null;
  merchant_info: RecordValue | null;
  created_at: string | null;
  updated_at: string | null;
}

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

interface PosAttemptRow {
  id: string;
  attempted_at: string | null;
  created_at: string | null;
  created_by: string | null;
  user_id: string | null;
  card_name: string | null;
  card_network: string | null;
  payment_method: string | null;
  result: string | null;
  attempt_result: string | null;
  notes: string | null;
  attempt_number?: number | null;
}

interface ReviewRow {
  id: string;
  comment: string | null;
  created_at: string | null;
  updated_at: string | null;
  rating: number | null;
  user_id: string | null;
}

interface CommentRow {
  id: string;
  content: string;
  created_at: string | null;
  updated_at: string | null;
  rating: number | null;
  user_id: string;
}

interface UserRow {
  id: string;
  username: string | null;
  email: string | null;
}

interface CardAlbumRow {
  id: string;
  user_id: string | null;
  issuer: string;
  title: string;
  bin: string;
  organization: string;
  group_name: string;
  description: string | null;
  scope: "public" | "personal";
  updated_at: string;
  created_at: string;
}

type CardAlbumScope = "public" | "personal";

interface UserHistoryRow {
  id: string;
  visited_at: string | null;
  pos_machine_id: string | null;
  pos_machines:
    | {
        id: string;
        merchant_name: string | null;
        address: string | null;
        merchant_info: RecordValue | null;
      }
    | Array<{
        id: string;
        merchant_name: string | null;
        address: string | null;
        merchant_info: RecordValue | null;
      }>
    | null;
}

interface ContributionPreviewRow {
  id: string;
  merchant_name: string | null;
  address: string | null;
  status: string | null;
  created_at: string | null;
}

interface PosMachineBrandRow {
  brand_id: string | null;
  status: string | null;
  updated_at: string | null;
  address: string | null;
  merchant_info: RecordValue | null;
}

interface BrandStatsAccumulator {
  storeCount: number;
  activeStoreCount: number;
  inactiveStoreCount: number;
  lastSyncAt: string | null;
  cityCounts: Map<string, number>;
}

const LOCATION_COLUMNS = `
  id,
  merchant_name,
  address,
  brand,
  bin,
  city,
  status,
  latitude,
  longitude,
  notes,
  created_at,
  updated_at
`;

const POS_MACHINE_COLUMNS = `
  id,
  name,
  merchant_name,
  address,
  brand_id,
  created_by,
  latitude,
  longitude,
  basic_info,
  status,
  remarks,
  merchant_info,
  created_at,
  updated_at
`;

const POS_ATTEMPT_COLUMNS = `
  id,
  attempted_at,
  created_at,
  created_by,
  user_id,
  card_name,
  card_network,
  payment_method,
  result,
  attempt_result,
  notes,
  attempt_number
`;

const REVIEW_COLUMNS = `
  id,
  comment,
  created_at,
  updated_at,
  rating,
  user_id
`;

const COMMENT_COLUMNS = `
  id,
  content,
  created_at,
  updated_at,
  rating,
  user_id
`;

const CARD_ALBUM_COLUMNS = `
  id,
  user_id,
  issuer,
  title,
  bin,
  organization,
  group_name,
  description,
  scope,
  updated_at,
  created_at
`;

const IGNORABLE_ERROR_CODES = new Set(["PGRST116", "PGRST205", "42P01", "42703", "406"]);
const MISSING_RPC_ERROR_CODES = new Set(["PGRST202", "42883"]);

function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeCardAlbumScope(value: unknown): CardAlbumScope {
  return value === "public" ? "public" : "personal";
}

function normalizeRecord(value: unknown): RecordValue {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as RecordValue;
  }

  return {};
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
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

function normalizeRelatedRow<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function inferCity(address: string, fallback: string): string {
  if (fallback.trim()) {
    return fallback.trim();
  }

  const segments = address
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length >= 2) {
    return segments[segments.length - 2];
  }

  return segments[0] || "Unknown";
}

function buildMetaLine(brand: string, city: string, extra: string): string {
  return `品牌：${brand}  •  城市：${city}  •  ${extra}`;
}

function buildInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return name.replace(/\s+/g, "").slice(0, 2).toUpperCase() || "NA";
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "未知时间";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function formatJoinedDate(value: string | null | undefined): string {
  if (!value) return "Unknown";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatActivityTime(value: string | null | undefined): string {
  if (!value) return "Recently";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function mapAttemptStatus(result: string | null | undefined): LocationAttemptRecord["status"] {
  const normalized = normalizeString(result).toLowerCase();
  if (normalized.includes("success") || normalized.includes("approved") || normalized.includes("pass")) {
    return "success";
  }
  if (normalized.includes("declin")) {
    return "declined";
  }
  return "failed";
}

function resolveUserName(identifier: string | null | undefined, usersById: Map<string, string>): string {
  const normalized = normalizeString(identifier);
  if (!normalized) return "Unknown";
  return usersById.get(normalized) || normalized;
}

function isIgnorableError(error: unknown): boolean {
  const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code: string }).code) : "";
  return IGNORABLE_ERROR_CODES.has(code);
}

function isMissingRpcError(error: unknown): boolean {
  const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code: string }).code) : "";
  return MISSING_RPC_ERROR_CODES.has(code);
}

function mapFluxaRowToLocation(row: FluxaLocationRow): LocationRecord {
  return {
    id: row.id,
    name: normalizeString(row.merchant_name, "Untitled Location"),
    address: normalizeString(row.address, "Unknown address"),
    brand: normalizeString(row.brand, "Unknown"),
    bin: normalizeString(row.bin, "N/A"),
    city: inferCity(normalizeString(row.address), normalizeString(row.city)),
    addedBy: "Unknown",
    status: row.status === "inactive" ? "inactive" : "active",
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    notes: normalizeString(row.notes),
    source: "fluxa_locations"
  };
}

function mapPosMachineToLocation(
  row: PosMachineRow,
  brandsById: Map<string, string>,
  usersById: Map<string, string>,
  networksByPosId?: Map<string, string[]>
): LocationRecord {
  const basicInfo = normalizeRecord(row.basic_info);
  const merchantInfo = normalizeRecord(row.merchant_info);
  const brandName =
    normalizeOptionalString(brandsById.get(row.brand_id || "") || null) ||
    normalizeOptionalString(merchantInfo.brand) ||
    normalizeOptionalString(merchantInfo.brand_name) ||
    "Unknown";
  const city = normalizeOptionalString(merchantInfo.city) || inferCity(row.address, "");
  const bin = normalizeOptionalString(merchantInfo.bin) || normalizeOptionalString(merchantInfo.card_bin) || "N/A";
  const supportedNetworks = Array.from(
    new Set([
      ...normalizeStringArray(basicInfo.supported_card_networks),
      ...normalizeStringArray(merchantInfo.supported_card_networks),
      ...(networksByPosId?.get(row.id) || [])
    ])
  );

  return {
    id: row.id,
    name: normalizeString(row.merchant_name, normalizeString(row.name, "Untitled Location")),
    address: normalizeString(row.address, "Unknown address"),
    brand: brandName,
    bin,
    city: city || "Unknown",
    addedBy: resolveUserName(row.created_by, usersById),
    supportedNetworks,
    status: row.status === "inactive" ? "inactive" : "active",
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    createdAt: row.created_at || row.updated_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    notes: normalizeString(row.remarks),
    source: "pos_machines"
  };
}

function buildDetailRecord(
  base: LocationRecord,
  deviceName: string,
  attempts: LocationAttemptRecord[],
  reviews: LocationReviewRecord[],
  metaLine: string
): LocationDetailRecord {
  const successCount = attempts.filter((attempt) => attempt.status === "success").length;
  const failedCount = attempts.length - successCount;
  const successRate = attempts.length > 0 ? Number(((successCount / attempts.length) * 100).toFixed(1)) : 0;

  return {
    ...base,
    deviceName,
    metaLine,
    successRate,
    successCount,
    failedCount,
    totalAttempts: attempts.length,
    attempts,
    reviews
  };
}

function normalizeAttemptResult(status: CreateLocationInput["transactionStatus"] | CreateLocationAttemptInput["transactionStatus"]): string {
  if (status === "Success") {
    return "success";
  }
  if (status === "Fault") {
    return "failure";
  }
  return "unknown";
}

function normalizePaymentMethod(value: string | undefined): string | null {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return null;

  if (normalized === "apple pay") return "apple_pay";
  if (normalized === "google pay") return "google_pay";
  if (normalized === "tap") return "tap";
  if (normalized === "insert") return "insert";
  if (normalized === "swipe") return "swipe";
  if (normalized === "hce") return "hce";
  return normalized.replace(/\s+/g, "_");
}

function normalizeCvm(value: string | undefined): string | null {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return null;

  if (normalized === "no cvm") return "no_pin";
  if (normalized === "pin") return "pin";
  if (normalized === "signature") return "signature";
  return "unknown";
}

function normalizeAcquiringMode(value: string | undefined): string {
  const normalized = normalizeString(value).toUpperCase();
  if (normalized === "DCC" || normalized === "EDC") {
    return normalized;
  }
  return "unknown";
}

function normalizeCheckoutLocation(value: CreateLocationInput["checkoutLocation"] | CreateLocationAttemptInput["checkoutLocation"]): string | null {
  if (value === "Self-checkout") {
    return "自助收银";
  }
  if (value === "Staffed Checkout") {
    return "人工收银";
  }
  return null;
}

function normalizeBrandStatus(value: unknown): BrandRecord["status"] {
  const normalized = normalizeString(value, "active").toLowerCase();
  if (normalized === "inactive") return "inactive";
  if (normalized === "coming_soon") return "coming_soon";
  return "active";
}

function normalizeBusinessType(category: string, businessType: unknown): BrandRecord["businessType"] {
  const normalizedBusinessType = normalizeString(businessType).toLowerCase();
  if (normalizedBusinessType === "online") return "online";
  if (normalizedBusinessType === "offline") return "offline";

  const normalizedCategory = category.toLowerCase();
  if (normalizedCategory === "ecommerce" || normalizedCategory === "food_delivery") {
    return "online";
  }

  return "offline";
}

function mapCategoryToSegment(category: string, brandName: string): BrandRecord["uiSegment"] {
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

function mapSegmentToCategoryLabel(segment: BrandRecord["uiSegment"]): string {
  if (segment === "Coffee") return "Coffee & Beverage";
  if (segment === "Fast Food") return "Quick Service";
  if (segment === "Convenience") return "Convenience";
  return "Retail";
}

function pickPrimaryCity(cityCounts: Map<string, number>, fallback?: string): string {
  const entries = Array.from(cityCounts.entries()).sort((left, right) => right[1] - left[1]);
  return entries[0]?.[0] || fallback || "Unknown";
}

function mapRowToCard(row: CardAlbumRow): CardAlbumCard {
  return {
    id: row.id,
    userId: row.user_id,
    issuer: row.issuer,
    title: row.title,
    bin: row.bin,
    organization: row.organization,
    groupName: row.group_name,
    description: row.description || "",
    scope: row.scope,
    updatedAt: row.updated_at,
    createdAt: row.created_at
  };
}

function getCardScopeLabel(scope: CardAlbumScope): string {
  return scope === "public" ? "public album" : "personal album";
}

function getCardIdentityKey(card: Pick<CardAlbumCard, "issuer" | "title" | "bin" | "organization">): string {
  return [card.issuer.trim(), card.title.trim(), card.bin.trim(), card.organization.trim()].join("::").toLowerCase();
}

function normalizeMetadata(user: User): RecordValue {
  if (user.user_metadata && typeof user.user_metadata === "object" && !Array.isArray(user.user_metadata)) {
    return user.user_metadata as RecordValue;
  }

  return {};
}

function readUserRecordValue(record: RecordValue | null, key: string): string {
  return record ? normalizeString(record[key]) : "";
}

function deriveProfileName(user: User, userRecord: RecordValue | null, fallbackName = ""): string {
  const metadata = normalizeMetadata(user);
  const metadataName =
    normalizeString(metadata.display_name) ||
    normalizeString(metadata.full_name) ||
    normalizeString(metadata.name) ||
    normalizeString(metadata.user_name) ||
    normalizeString(metadata.preferred_username);

  return metadataName || readUserRecordValue(userRecord, "username") || fallbackName || user.email?.split("@")[0] || "Unknown User";
}

function deriveProfileLocation(user: User): string {
  const metadata = normalizeMetadata(user);
  return normalizeString(metadata.location) || normalizeString(metadata.locale) || "Not set";
}

function deriveProfileBio(user: User): string {
  const metadata = normalizeMetadata(user);
  return normalizeString(metadata.bio) || "No bio yet.";
}

const MATCH_FIELD_PRIORITY: Record<string, number> = {
  name: 0,
  notes: 1,
  city: 2,
  brand: 3,
  address: 4,
  bin: 5,
  id: 6,
  network: 7,
  addedBy: 8
};

function includesQuery(value: string | undefined, normalizedQuery: string): boolean {
  return Boolean(value && value.toLocaleLowerCase().includes(normalizedQuery));
}

function buildLocationSearchResults(locations: LocationRecord[], searchQuery: string): LocationRecord[] {
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  if (!normalizedSearchQuery) {
    return locations;
  }

  return locations
    .map((location) => {
      const matchedFields: string[] = [];
      if (includesQuery(location.name, normalizedSearchQuery)) matchedFields.push("name");
      if (includesQuery(location.notes, normalizedSearchQuery)) matchedFields.push("notes");
      if (includesQuery(location.city, normalizedSearchQuery)) matchedFields.push("city");
      if (includesQuery(location.address, normalizedSearchQuery)) matchedFields.push("address");
      if (includesQuery(location.brand, normalizedSearchQuery)) matchedFields.push("brand");
      if (includesQuery(location.bin, normalizedSearchQuery)) matchedFields.push("bin");
      if (includesQuery(location.id, normalizedSearchQuery)) matchedFields.push("id");
      if (includesQuery(location.addedBy, normalizedSearchQuery)) matchedFields.push("addedBy");
      if ((location.supportedNetworks || []).some((network) => includesQuery(network, normalizedSearchQuery))) {
        matchedFields.push("network");
      }

      if (matchedFields.length === 0) {
        return null;
      }

      return { location, matchedFields };
    })
    .filter((item): item is { location: LocationRecord; matchedFields: string[] } => Boolean(item))
    .sort((left, right) => {
      const leftPriority = Math.min(...left.matchedFields.map((field) => MATCH_FIELD_PRIORITY[field]));
      const rightPriority = Math.min(...right.matchedFields.map((field) => MATCH_FIELD_PRIORITY[field]));
      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      const updatedDelta = new Date(right.location.updatedAt).getTime() - new Date(left.location.updatedAt).getTime();
      if (updatedDelta !== 0) {
        return updatedDelta;
      }

      return left.location.name.localeCompare(right.location.name, "zh-CN");
    })
    .map((entry) => entry.location);
}

function incrementCount(map: Map<string, number>, key: string) {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return;
  }

  map.set(normalizedKey, (map.get(normalizedKey) || 0) + 1);
}

function toTopCountEntries<TLabel extends string>(
  map: Map<string, number>,
  keyName: TLabel,
  limit: number
): Array<{ [K in TLabel | "count"]: K extends "count" ? number : string }> {
  return Array.from(map.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0], "zh-CN");
    })
    .slice(0, limit)
    .map(([label, count]) => ({
      [keyName]: label,
      count
    })) as Array<{ [K in TLabel | "count"]: K extends "count" ? number : string }>;
}

function clampLimit(value: number | undefined, fallback: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(Math.trunc(value as number), max));
}

async function fetchBrandMap(brandIds: string[]): Promise<Map<string, string>> {
  if (brandIds.length === 0) {
    return new Map<string, string>();
  }

  const { data } = await supabase.from("brands").select("id, name").in("id", brandIds);
  const brandMap = new Map<string, string>();
  ((data || []) as BrandRow[]).forEach((brand) => {
    brandMap.set(brand.id, brand.name);
  });
  return brandMap;
}

async function fetchUserMap(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const { data, error } = await supabase.from("users").select("id, username, email").in("id", userIds);
  if (error) {
    if (isIgnorableError(error)) {
      return new Map<string, string>();
    }
    throw error;
  }

  const userMap = new Map<string, string>();
  ((data || []) as UserRow[]).forEach((user) => {
    userMap.set(user.id, normalizeString(user.username) || normalizeString(user.email) || user.id);
  });
  return userMap;
}

async function fetchCurrentUserRecord(userId: string): Promise<RecordValue | null> {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).maybeSingle();

  if (error) {
    if (isIgnorableError(error)) {
      return null;
    }
    throw error;
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  return data as RecordValue;
}

async function countByUser(table: string, column: string, userId: string): Promise<number> {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true }).eq(column, userId);

  if (error) {
    if (isIgnorableError(error)) {
      return 0;
    }
    throw error;
  }

  return count || 0;
}

async function fetchHistoryPreview(userId: string): Promise<Array<{ id: string; title: string; meta: string; time: string; sortValue: number }>> {
  const { data, error } = await supabase
    .from("user_history")
    .select(`
      id,
      visited_at,
      pos_machines (
        id,
        merchant_name,
        address
      )
    `)
    .eq("user_id", userId)
    .order("visited_at", { ascending: false })
    .limit(4);

  if (error) {
    if (isIgnorableError(error)) {
      return [];
    }
    throw error;
  }

  return ((data as UserHistoryRow[] | null) || []).map((item) => {
    const posMachine = normalizeRelatedRow(item.pos_machines);
    const sortValue = item.visited_at ? new Date(item.visited_at).getTime() : 0;
    return {
      id: `history-${item.id}`,
      title: `Visited ${normalizeString(posMachine?.merchant_name) || "saved place"}`,
      meta: normalizeString(posMachine?.address) || "No address recorded.",
      time: formatActivityTime(item.visited_at),
      sortValue
    };
  });
}

async function fetchContributionPreview(userId: string): Promise<Array<{ id: string; title: string; meta: string; time: string; sortValue: number }>> {
  const { data, error } = await supabase
    .from("pos_machines")
    .select("id, merchant_name, address, status, created_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(4);

  if (error) {
    if (isIgnorableError(error)) {
      return [];
    }
    throw error;
  }

  return ((data as ContributionPreviewRow[] | null) || []).map((item) => ({
    id: `contribution-${item.id}`,
    title: `Added ${normalizeString(item.merchant_name) || "new location"}`,
    meta: normalizeString(item.address) || normalizeString(item.status) || "No address recorded.",
    time: formatActivityTime(item.created_at),
    sortValue: item.created_at ? new Date(item.created_at).getTime() : 0
  }));
}

async function buildViewerProfileRecord(user: User): Promise<ViewerProfileRecord> {
  const userRecord = await fetchCurrentUserRecord(user.id);
  const [contributionCount, reviewCount, favoriteCount, historyCount, historyPreview, contributionPreview] = await Promise.all([
    countByUser("pos_machines", "created_by", user.id),
    countByUser("reviews", "user_id", user.id),
    countByUser("user_favorites", "user_id", user.id),
    countByUser("user_history", "user_id", user.id),
    fetchHistoryPreview(user.id),
    fetchContributionPreview(user.id)
  ]);

  const recentActivity = [...historyPreview, ...contributionPreview]
    .sort((left, right) => right.sortValue - left.sortValue)
    .map(({ sortValue: _sortValue, ...item }) => item)
    .slice(0, 4);

  return {
    name: deriveProfileName(user, userRecord),
    email: user.email || readUserRecordValue(userRecord, "email") || "Unknown",
    location: deriveProfileLocation(user),
    joined: formatJoinedDate(user.created_at),
    bio: deriveProfileBio(user),
    stats: [
      { label: "Added Locations", value: String(contributionCount) },
      { label: "Reviews", value: String(reviewCount) },
      { label: "Favorites", value: String(favoriteCount) }
    ],
    quickAccessItems: [
      { id: "favorites", label: "Favorites", count: favoriteCount },
      { id: "history", label: "History", count: historyCount },
      { id: "contributions", label: "Contributions", count: contributionCount }
    ],
    recentActivity:
      recentActivity.length > 0
        ? recentActivity
        : [{ id: "empty-activity", title: "No recent profile activity yet.", meta: "Your account activity will appear here once data is available.", time: "Just now" }]
  };
}

async function resolveBrandId(brandName: string): Promise<string | null> {
  const normalizedBrandName = brandName.trim();
  if (!normalizedBrandName) {
    return null;
  }

  const { data, error } = await supabase
    .from("brands")
    .select("id, name")
    .ilike("name", normalizedBrandName)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id || null;
}

async function getCurrentUserIdentity(userId: string): Promise<{ id: string; label: string }> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error || !data.user) {
    throw error || new Error("Unable to resolve current user.");
  }

  const user = data.user;
  const label =
    normalizeOptionalString(user.user_metadata?.display_name) ||
    normalizeOptionalString(user.user_metadata?.full_name) ||
    normalizeOptionalString(user.user_metadata?.name) ||
    normalizeOptionalString(user.email) ||
    user.id;

  return {
    id: user.id,
    label
  };
}

function buildPosMachineInsertPayload(input: CreateLocationInput, userId: string, brandId: string | null) {
  const paymentMethod = normalizePaymentMethod(input.paymentMethod);
  const acquiringMode = normalizeAcquiringMode(input.acquiringMode);
  const checkoutLocation = normalizeCheckoutLocation(input.checkoutLocation);
  const normalizedNetwork = normalizeString(input.network);
  const city = inferCity(input.address, input.city);
  const trimmedBrand = input.brand.trim() || "Unknown";

  return {
    name: input.name.trim(),
    merchant_name: input.name.trim(),
    address: input.address.trim(),
    latitude: Number(input.lat.toFixed(6)),
    longitude: Number(input.lng.toFixed(6)),
    brand_id: brandId,
    created_by: userId,
    status: input.status,
    remarks: input.notes?.trim() || null,
    merchant_info: {
      brand: trimmedBrand,
      brand_name: trimmedBrand,
      bin: input.bin.trim() || "N/A",
      city,
      transaction_name: input.name.trim(),
      transaction_type: trimmedBrand
    },
    basic_info: {
      model: normalizeOptionalString(input.posModel),
      acquiring_institution: normalizeOptionalString(input.acquirer),
      checkout_location: checkoutLocation,
      acquiring_modes: acquiringMode !== "unknown" ? [acquiringMode] : [],
      supported_card_networks: normalizedNetwork ? [normalizedNetwork] : [],
      supports_apple_pay: paymentMethod === "apple_pay",
      supports_google_pay: paymentMethod === "google_pay",
      supports_contactless: paymentMethod === "tap" || paymentMethod === "apple_pay" || paymentMethod === "google_pay" || paymentMethod === "hce",
      supports_hce_simulation: paymentMethod === "hce",
      supports_dcc: acquiringMode === "DCC",
      supports_edc: acquiringMode === "EDC"
    },
    extended_fields: {
      source_app: "fluxa_map",
      source_flow: "mcp",
      city,
      bin: input.bin.trim() || "N/A",
      transaction_status: input.transactionStatus || "Unknown"
    }
  };
}

function buildPosAttemptInsertPayload(input: CreateLocationInput, posId: string, userId: string) {
  const attemptResult = normalizeAttemptResult(input.transactionStatus);

  return {
    pos_id: posId,
    user_id: userId,
    created_by: userId,
    attempt_number: 1,
    result: attemptResult,
    attempt_result: attemptResult,
    card_network: normalizeOptionalString(input.network),
    payment_method: normalizePaymentMethod(input.paymentMethod),
    cvm: normalizeCvm(input.cvm),
    acquiring_mode: normalizeAcquiringMode(input.acquiringMode),
    device_status: input.status,
    acquiring_institution: normalizeOptionalString(input.acquirer),
    checkout_location: normalizeCheckoutLocation(input.checkoutLocation),
    card_name: normalizeOptionalString(input.brand) || normalizeOptionalString(input.name),
    notes: input.notes?.trim() || null,
    attempted_at: input.attemptedAt || new Date().toISOString(),
    is_conclusive_failure: input.transactionStatus === "Fault"
  };
}

async function getNextAttemptNumber(posId: string): Promise<number> {
  const { data, error } = await supabase
    .from("pos_attempts")
    .select("attempt_number")
    .eq("pos_id", posId)
    .order("attempt_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const currentAttemptNumber = typeof data?.attempt_number === "number" ? data.attempt_number : Number(data?.attempt_number || 0);
  return Number.isFinite(currentAttemptNumber) ? currentAttemptNumber + 1 : 1;
}

async function createPosMachineAttempt(userId: string, location: LocationRecord, input: CreateLocationAttemptInput): Promise<LocationAttemptRecord> {
  const user = await getCurrentUserIdentity(userId);
  const attemptNumber = await getNextAttemptNumber(location.id);
  const attemptResult = normalizeAttemptResult(input.transactionStatus);

  const insertPayload = {
    pos_id: location.id,
    user_id: user.id,
    created_by: user.id,
    attempt_number: attemptNumber,
    result: attemptResult,
    attempt_result: attemptResult,
    card_name: normalizeOptionalString(input.cardName) || normalizeOptionalString(location.brand) || normalizeOptionalString(location.name),
    card_network: normalizeOptionalString(input.network),
    payment_method: normalizePaymentMethod(input.paymentMethod),
    cvm: normalizeCvm(input.cvm),
    acquiring_mode: normalizeAcquiringMode(input.acquiringMode),
    device_status: input.deviceStatus || location.status,
    acquiring_institution: normalizeOptionalString(input.acquirer),
    checkout_location: normalizeCheckoutLocation(input.checkoutLocation),
    notes: input.notes?.trim() || null,
    attempted_at: input.attemptedAt || new Date().toISOString(),
    is_conclusive_failure: attemptResult === "failure" && Boolean(input.isConclusiveFailure)
  };

  const { data, error } = await supabase.from("pos_attempts").insert(insertPayload).select(POS_ATTEMPT_COLUMNS).single();

  if (error) {
    throw error;
  }

  const usersById = new Map([[user.id, user.label]]);
  const attempt = data as PosAttemptRow;

  return {
    id: attempt.id,
    occurredAt: attempt.attempted_at || attempt.created_at || undefined,
    dateTime: formatDateTime(attempt.attempted_at || attempt.created_at),
    addedBy: resolveUserName(attempt.created_by || attempt.user_id, usersById),
    cardName: normalizeString(attempt.card_name, "Unknown card"),
    network: normalizeString(attempt.card_network, "Unknown"),
    method: normalizeString(attempt.payment_method, "Unknown"),
    status: mapAttemptStatus(attempt.result || attempt.attempt_result),
    notes: normalizeString(attempt.notes)
  };
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
    const city = normalizeOptionalString(merchantInfo.city) || inferCity(normalizeString(row.address), "");
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
    isSystemBrand: row.is_system_brand === true,
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

export class FluxaService {
  private async loadPosLocations(): Promise<LocationRecord[]> {
    const { data, error } = await supabase.from("pos_machines").select(POS_MACHINE_COLUMNS).order("updated_at", { ascending: false });
    if (error) {
      throw error;
    }

    const posRows = (data || []) as PosMachineRow[];
    const brandIds = Array.from(new Set(posRows.map((row) => row.brand_id).filter((brandId): brandId is string => Boolean(brandId))));
    const userIds = Array.from(new Set(posRows.map((row) => row.created_by).filter((userId): userId is string => Boolean(userId))));
    const posIds = posRows.map((row) => row.id).filter(Boolean);

    const [brandsById, usersById] = await Promise.all([fetchBrandMap(brandIds), fetchUserMap(userIds)]);
    const networksByPosId = new Map<string, string[]>();

    if (posIds.length > 0) {
      const { data: attemptRows } = await supabase.from("pos_attempts").select("pos_id, card_network").in("pos_id", posIds);
      ((attemptRows || []) as Array<{ pos_id: string; card_network: string | null }>).forEach((attempt) => {
        if (!attempt?.pos_id || !attempt.card_network?.trim()) {
          return;
        }

        const existing = networksByPosId.get(attempt.pos_id) || [];
        if (!existing.includes(attempt.card_network.trim())) {
          existing.push(attempt.card_network.trim());
        }
        networksByPosId.set(attempt.pos_id, existing);
      });
    }

    return posRows.map((row) => mapPosMachineToLocation(row, brandsById, usersById, networksByPosId));
  }

  private async loadMergedLocations(): Promise<LocationRecord[]> {
    const [fluxaResult, posLocations] = await Promise.all([
      supabase.from("fluxa_locations").select(LOCATION_COLUMNS).order("updated_at", { ascending: false }),
      this.loadPosLocations()
    ]);

    if (fluxaResult.error) {
      throw fluxaResult.error;
    }

    const mergedById = new Map<string, LocationRecord>();
    [...posLocations, ...((fluxaResult.data || []) as FluxaLocationRow[]).map(mapFluxaRowToLocation)].forEach((location) => {
      if (!mergedById.has(location.id)) {
        mergedById.set(location.id, location);
      }
    });

    return Array.from(mergedById.values()).sort(
      (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
    );
  }

  private filterLocations(
    locations: LocationRecord[],
    filters: {
      query?: string;
      city?: string;
      brand?: string;
      status?: "active" | "inactive";
      source?: "fluxa_locations" | "pos_machines";
    }
  ): LocationRecord[] {
    let filtered = [...locations];

    if (filters.source) {
      filtered = filtered.filter((location) => location.source === filters.source);
    }
    if (filters.status) {
      filtered = filtered.filter((location) => location.status === filters.status);
    }
    if (filters.city?.trim()) {
      const city = filters.city.trim().toLocaleLowerCase();
      filtered = filtered.filter((location) => location.city.toLocaleLowerCase().includes(city));
    }
    if (filters.brand?.trim()) {
      const brand = filters.brand.trim().toLocaleLowerCase();
      filtered = filtered.filter((location) => location.brand.toLocaleLowerCase().includes(brand));
    }

    return buildLocationSearchResults(filtered, filters.query || "");
  }

  async searchLocations(filters: {
    query?: string;
    city?: string;
    brand?: string;
    status?: "active" | "inactive";
    source?: "fluxa_locations" | "pos_machines";
    limit?: number;
  }): Promise<LocationRecord[]> {
    const locations = this.filterLocations(await this.loadMergedLocations(), filters);
    const safeLimit = clampLimit(filters.limit, 20, 100);
    return locations.slice(0, safeLimit);
  }

  async collectLocationsDataset(filters: {
    query?: string;
    city?: string;
    brand?: string;
    status?: "active" | "inactive";
    source?: "fluxa_locations" | "pos_machines";
    limit?: number;
  }): Promise<{ summary: DatasetSummary; results: LocationRecord[] }> {
    const locations = this.filterLocations(await this.loadMergedLocations(), filters);
    const safeLimit = clampLimit(filters.limit, 100, 500);
    const results = locations.slice(0, safeLimit);

    return {
      summary: {
        totalMatched: locations.length,
        returned: results.length,
        filters: {
          query: filters.query || null,
          city: filters.city || null,
          brand: filters.brand || null,
          status: filters.status || null,
          source: filters.source || null
        }
      },
      results
    };
  }

  async getSiteStatistics(options?: { topN?: number }): Promise<SiteStatisticsRecord> {
    const topN = clampLimit(options?.topN, 10, 25);
    const [locations, brandCountResult, cardScopeRows, userCountResult] = await Promise.all([
      this.loadMergedLocations(),
      supabase.from("brands").select("id", { count: "exact", head: true }),
      supabase.from("card_album_cards").select("scope"),
      supabase.from("users").select("id", { count: "exact", head: true })
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

    const publicCards = ((cardScopeRows.data || []) as Array<{ scope: CardAlbumScope }>).filter((row) => row.scope === "public").length;
    const personalCards = ((cardScopeRows.data || []) as Array<{ scope: CardAlbumScope }>).filter((row) => row.scope === "personal").length;

    return {
      generatedAt: new Date().toISOString(),
      totals: {
        locations: locations.length,
        posLocations: locations.filter((location) => location.source === "pos_machines").length,
        fluxaLocations: locations.filter((location) => location.source === "fluxa_locations").length,
        brands: brandCountResult.count || 0,
        publicCards,
        personalCards,
        users: userCountResult.count || 0
      },
      locationStatusBreakdown: toTopCountEntries(statusCounts, "status", 10),
      locationSourceBreakdown: toTopCountEntries(sourceCounts, "source", 10),
      topCities: toTopCountEntries(cityCounts, "city", topN),
      topBrands: toTopCountEntries(brandCounts, "brand", topN)
    };
  }

  async rankLocationContributors(filters?: {
    city?: string;
    brand?: string;
    status?: "active" | "inactive";
    limit?: number;
    since?: string;
  }): Promise<ContributorRankingRecord[]> {
    const { data, error } = await supabase.from("pos_machines").select(POS_MACHINE_COLUMNS).order("created_at", { ascending: false });
    if (error) {
      throw error;
    }

    const posRows = (data || []) as PosMachineRow[];
    const brandIds = Array.from(new Set(posRows.map((row) => row.brand_id).filter((brandId): brandId is string => Boolean(brandId))));
    const userIds = Array.from(new Set(posRows.map((row) => row.created_by).filter((userId): userId is string => Boolean(userId))));
    const [brandsById, usersById] = await Promise.all([fetchBrandMap(brandIds), fetchUserMap(userIds)]);
    const filteredLocations = this.filterLocations(
      posRows.map((row) => mapPosMachineToLocation(row, brandsById, usersById)),
      {
        city: filters?.city,
        brand: filters?.brand,
        status: filters?.status
      }
    );
    const locationsById = new Map(filteredLocations.map((location) => [location.id, location]));

    const sinceTimestamp = filters?.since ? new Date(filters.since).getTime() : null;
    const contributorMap = new Map<
      string,
      {
        userId: string;
        userLabel: string;
        locationCount: number;
        activeLocationCount: number;
        inactiveLocationCount: number;
        latestContributionAt: string | null;
        cityCounts: Map<string, number>;
        brandCounts: Map<string, number>;
      }
    >();

    posRows.forEach((row) => {
      if (!row.created_by) {
        return;
      }

      const location = locationsById.get(row.id);
      if (!location) {
        return;
      }

      const createdAtTimestamp = new Date(location.createdAt).getTime();
      if (sinceTimestamp && (!Number.isFinite(createdAtTimestamp) || createdAtTimestamp < sinceTimestamp)) {
        return;
      }

      const existing = contributorMap.get(row.created_by) || {
        userId: row.created_by,
        userLabel: resolveUserName(row.created_by, usersById),
        locationCount: 0,
        activeLocationCount: 0,
        inactiveLocationCount: 0,
        latestContributionAt: null,
        cityCounts: new Map<string, number>(),
        brandCounts: new Map<string, number>()
      };

      existing.locationCount += 1;
      if (location.status === "inactive") {
        existing.inactiveLocationCount += 1;
      } else {
        existing.activeLocationCount += 1;
      }
      if (!existing.latestContributionAt || new Date(existing.latestContributionAt).getTime() < createdAtTimestamp) {
        existing.latestContributionAt = location.createdAt;
      }
      incrementCount(existing.cityCounts, location.city || "Unknown");
      incrementCount(existing.brandCounts, location.brand || "Unknown");
      contributorMap.set(row.created_by, existing);
    });

    const safeLimit = clampLimit(filters?.limit, 10, 100);
    return Array.from(contributorMap.values())
      .sort((left, right) => {
        if (right.locationCount !== left.locationCount) {
          return right.locationCount - left.locationCount;
        }

        const rightLatest = right.latestContributionAt ? new Date(right.latestContributionAt).getTime() : 0;
        const leftLatest = left.latestContributionAt ? new Date(left.latestContributionAt).getTime() : 0;
        if (rightLatest !== leftLatest) {
          return rightLatest - leftLatest;
        }

        return left.userLabel.localeCompare(right.userLabel, "zh-CN");
      })
      .slice(0, safeLimit)
      .map((entry) => ({
        userId: entry.userId,
        userLabel: entry.userLabel,
        locationCount: entry.locationCount,
        activeLocationCount: entry.activeLocationCount,
        inactiveLocationCount: entry.inactiveLocationCount,
        latestContributionAt: entry.latestContributionAt,
        topCities: toTopCountEntries(entry.cityCounts, "city", 3).map((item) => item.city),
        topBrands: toTopCountEntries(entry.brandCounts, "brand", 3).map((item) => item.brand)
      }));
  }

  async getLocationDetail(locationId: string): Promise<LocationDetailRecord> {
    const normalizedId = locationId.trim();
    if (!normalizedId) {
      throw new Error("location_id is required.");
    }

    const { data: fluxaLocationData } = await supabase.from("fluxa_locations").select(LOCATION_COLUMNS).eq("id", normalizedId).maybeSingle();
    if (fluxaLocationData) {
      const base = mapFluxaRowToLocation(fluxaLocationData as FluxaLocationRow);
      return buildDetailRecord(base, "Fluxa Location", [], [], buildMetaLine(base.brand, base.city, `BIN：${base.bin}`));
    }

    const { data: posData, error: posError } = await supabase.from("pos_machines").select(POS_MACHINE_COLUMNS).eq("id", normalizedId).maybeSingle();
    if (posError) {
      throw posError;
    }
    if (!posData) {
      throw new Error("Location not found.");
    }

    const row = posData as PosMachineRow;
    const brandIds = row.brand_id ? [row.brand_id] : [];
    const creatorIds = row.created_by ? [row.created_by] : [];
    const [brandsById, creatorMap] = await Promise.all([fetchBrandMap(brandIds), fetchUserMap(creatorIds)]);
    const base = mapPosMachineToLocation(row, brandsById, creatorMap);

    const [attemptResult, reviewResult, commentResult] = await Promise.allSettled([
      supabase.from("pos_attempts").select(POS_ATTEMPT_COLUMNS).eq("pos_id", normalizedId).order("attempted_at", { ascending: false }),
      supabase.from("reviews").select(REVIEW_COLUMNS).eq("pos_machine_id", normalizedId).order("created_at", { ascending: false }),
      supabase.from("comments").select(COMMENT_COLUMNS).eq("pos_id", normalizedId).order("created_at", { ascending: false })
    ]);

    const attemptRows = attemptResult.status === "fulfilled" && !attemptResult.value.error ? ((attemptResult.value.data || []) as PosAttemptRow[]) : [];
    const reviewRows = reviewResult.status === "fulfilled" && !reviewResult.value.error ? ((reviewResult.value.data || []) as ReviewRow[]) : [];
    const commentRows = commentResult.status === "fulfilled" && !commentResult.value.error ? ((commentResult.value.data || []) as CommentRow[]) : [];
    const relatedUserIds = Array.from(
      new Set(
        [
          ...attemptRows.flatMap((rowItem) => [rowItem.user_id, rowItem.created_by]),
          ...reviewRows.map((rowItem) => rowItem.user_id),
          ...commentRows.map((rowItem) => rowItem.user_id)
        ].filter((value): value is string => Boolean(value))
      )
    );
    const usersById = await fetchUserMap(relatedUserIds);

    const attempts = attemptRows.map((attempt) => ({
      id: attempt.id,
      occurredAt: attempt.attempted_at || attempt.created_at || undefined,
      dateTime: formatDateTime(attempt.attempted_at || attempt.created_at),
      addedBy: resolveUserName(attempt.created_by || attempt.user_id, usersById),
      cardName: normalizeString(attempt.card_name, "Unknown card"),
      network: normalizeString(attempt.card_network, "Unknown"),
      method: normalizeString(attempt.payment_method, "Unknown"),
      status: mapAttemptStatus(attempt.result || attempt.attempt_result),
      notes: normalizeString(attempt.notes)
    }));

    const reviews = [
      ...reviewRows.map((review) => {
        const name = resolveUserName(review.user_id, usersById);
        const timestamp = review.created_at || review.updated_at;
        return {
          sortKey: timestamp ? new Date(timestamp).getTime() : 0,
          item: {
            id: review.id,
            initials: buildInitials(name),
            name,
            time: formatDateTime(timestamp),
            content: normalizeString(review.comment, "No review content."),
            rating: review.rating
          } satisfies LocationReviewRecord
        };
      }),
      ...commentRows.map((comment) => {
        const name = resolveUserName(comment.user_id, usersById);
        const timestamp = comment.created_at || comment.updated_at;
        return {
          sortKey: timestamp ? new Date(timestamp).getTime() : 0,
          item: {
            id: comment.id,
            initials: buildInitials(name),
            name,
            time: formatDateTime(timestamp),
            content: normalizeString(comment.content, "No comment content."),
            rating: comment.rating
          } satisfies LocationReviewRecord
        };
      })
    ]
      .sort((left, right) => right.sortKey - left.sortKey)
      .map((entry) => entry.item);

    const deviceName = normalizeString(row.name, "POS Device");
    return buildDetailRecord(base, deviceName, attempts, reviews, buildMetaLine(base.brand, base.city, `设备：${deviceName}`));
  }

  async createLocation(userId: string, input: CreateLocationInput): Promise<LocationRecord> {
    const user = await getCurrentUserIdentity(userId);
    const brandId = await resolveBrandId(input.brand);
    const insertPayload = buildPosMachineInsertPayload(input, userId, brandId);

    const { data, error } = await supabase.from("pos_machines").insert(insertPayload).select(POS_MACHINE_COLUMNS).single();
    if (error || !data) {
      throw error || new Error("Failed to create location.");
    }

    const createdRow = data as PosMachineRow;
    try {
      const { error: attemptError } = await supabase.from("pos_attempts").insert(buildPosAttemptInsertPayload(input, createdRow.id, userId));
      if (attemptError) {
        throw attemptError;
      }
    } catch (attemptError) {
      await supabase.from("pos_machines").delete().eq("id", createdRow.id);
      throw attemptError;
    }

    const brandMap = brandId && input.brand.trim() ? new Map([[brandId, input.brand.trim()]]) : new Map<string, string>();
    const userMap = new Map([[user.id, user.label]]);
    return mapPosMachineToLocation(createdRow, brandMap, userMap);
  }

  async createLocationAttempt(userId: string, locationId: string, input: CreateLocationAttemptInput): Promise<LocationAttemptRecord> {
    const detail = await this.getLocationDetail(locationId);
    if (detail.source !== "pos_machines") {
      throw new Error("Only POS-backed locations can accept new attempt records.");
    }

    return createPosMachineAttempt(userId, detail, input);
  }

  async listBrands(filters: { query?: string; segment?: BrandRecord["uiSegment"]; status?: BrandRecord["status"]; limit?: number }): Promise<BrandRecord[]> {
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
    let brands = ((brandData || []) as BrandRow[])
      .map((row) => mapBrandRowToRecord(row, statsByBrandId.get(row.id)))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

    if (filters.segment) {
      brands = brands.filter((brand) => brand.uiSegment === filters.segment);
    }
    if (filters.status) {
      brands = brands.filter((brand) => brand.status === filters.status);
    }
    if (filters.query?.trim()) {
      const query = filters.query.trim().toLocaleLowerCase();
      brands = brands.filter((brand) =>
        [brand.name, brand.description, brand.website, brand.category, brand.primaryCity]
          .filter(Boolean)
          .some((value) => String(value).toLocaleLowerCase().includes(query))
      );
    }

    const safeLimit = Number.isFinite(filters.limit) ? Math.max(1, Math.min(Math.trunc(filters.limit as number), 100)) : 50;
    return brands.slice(0, safeLimit);
  }

  async listCardAlbumCards(userId: string, filters: { scope?: "all" | "public" | "personal"; query?: string; limit?: number }): Promise<CardAlbumCard[]> {
    const publicPromise =
      filters.scope === "personal"
        ? Promise.resolve<{ data: CardAlbumRow[]; error: null }>({ data: [], error: null })
        : supabase.from("card_album_cards").select(CARD_ALBUM_COLUMNS).eq("scope", "public").order("updated_at", { ascending: false });
    const personalPromise =
      filters.scope === "public"
        ? Promise.resolve<{ data: CardAlbumRow[]; error: null }>({ data: [], error: null })
        : supabase.from("card_album_cards").select(CARD_ALBUM_COLUMNS).eq("scope", "personal").eq("user_id", userId).order("updated_at", { ascending: false });

    const [publicResult, personalResult] = await Promise.all([publicPromise, personalPromise]);
    if (publicResult.error) throw publicResult.error;
    if (personalResult.error) throw personalResult.error;

    let cards = [...((publicResult.data || []) as CardAlbumRow[]), ...((personalResult.data || []) as CardAlbumRow[])].map(mapRowToCard);
    if (filters.query?.trim()) {
      const query = filters.query.trim().toLocaleLowerCase();
      cards = cards.filter((card) =>
        [card.issuer, card.title, card.bin, card.organization, card.groupName, card.description]
          .filter(Boolean)
          .some((value) => value.toLocaleLowerCase().includes(query))
      );
    }

    const safeLimit = Number.isFinite(filters.limit) ? Math.max(1, Math.min(Math.trunc(filters.limit as number), 100)) : 50;
    return cards.slice(0, safeLimit);
  }

  private async getAccessibleCardById(userId: string, cardId: string): Promise<CardAlbumCard> {
    const normalizedCardId = cardId.trim();
    if (!normalizedCardId) {
      throw new Error("card_id is required.");
    }

    const { data, error } = await supabase
      .from("card_album_cards")
      .select(CARD_ALBUM_COLUMNS)
      .eq("id", normalizedCardId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error("Card not found.");
    }

    const card = mapRowToCard(data as CardAlbumRow);
    if (card.scope === "public") {
      return card;
    }

    if (card.userId !== userId) {
      throw new Error("Card not found.");
    }

    return card;
  }

  async createCardAlbumCard(userId: string, input: CreateCardAlbumCardInput & { scope?: CardAlbumScope }): Promise<CardAlbumCard> {
    const normalizedInput = {
      issuer: input.issuer.trim(),
      title: input.title.trim(),
      bin: input.bin.trim(),
      organization: input.organization.trim(),
      groupName: input.groupName.trim(),
      description: input.description?.trim() || "",
      scope: normalizeCardAlbumScope(input.scope)
    };

    if (!normalizedInput.issuer || !normalizedInput.title || !normalizedInput.bin || !normalizedInput.organization || !normalizedInput.groupName) {
      throw new Error("请完整填写发卡行、卡片名称、BIN、卡组织和卡片等级。");
    }

    const duplicateQuery = supabase
      .from("card_album_cards")
      .select(CARD_ALBUM_COLUMNS)
      .eq("scope", normalizedInput.scope);

    if (normalizedInput.scope === "personal") {
      duplicateQuery.eq("user_id", userId);
    }

    const { data: existingRows, error: duplicateError } = await duplicateQuery;

    if (duplicateError) {
      throw duplicateError;
    }

    const exists = ((existingRows || []) as CardAlbumRow[])
      .map(mapRowToCard)
      .some((item) => getCardIdentityKey(item) === getCardIdentityKey(normalizedInput));

    if (exists) {
      throw new Error(
        normalizedInput.scope === "public" ? "这张卡已经在公共卡册里。" : "这张卡已经在我的卡册里。"
      );
    }

    const { data, error } = await supabase
      .from("card_album_cards")
      .insert({
        user_id: userId,
        issuer: normalizedInput.issuer,
        title: normalizedInput.title,
        bin: normalizedInput.bin,
        organization: normalizedInput.organization,
        group_name: normalizedInput.groupName,
        description: normalizedInput.description || null,
        scope: normalizedInput.scope
      })
      .select(CARD_ALBUM_COLUMNS)
      .single();

    if (error || !data) {
      throw error || new Error(`Failed to create card in ${getCardScopeLabel(normalizedInput.scope)}.`);
    }

    return mapRowToCard(data as CardAlbumRow);
  }

  async createPersonalCard(userId: string, input: CreateCardAlbumCardInput): Promise<CardAlbumCard> {
    return this.createCardAlbumCard(userId, { ...input, scope: "personal" });
  }

  async addCardToAlbum(
    userId: string,
    cardId: string,
    targetScope: CardAlbumScope = "personal"
  ): Promise<{ added: boolean; card?: CardAlbumCard }> {
    const sourceCard = await this.getAccessibleCardById(userId, cardId);
    const normalizedTargetScope = normalizeCardAlbumScope(targetScope);

    const duplicateQuery = supabase
      .from("card_album_cards")
      .select(CARD_ALBUM_COLUMNS)
      .eq("scope", normalizedTargetScope);

    if (normalizedTargetScope === "personal") {
      duplicateQuery.eq("user_id", userId);
    }

    const { data: existingRows, error: duplicateError } = await duplicateQuery;

    if (duplicateError) {
      throw duplicateError;
    }

    const exists = ((existingRows || []) as CardAlbumRow[])
      .map(mapRowToCard)
      .some((item) => getCardIdentityKey(item) === getCardIdentityKey(sourceCard));

    if (exists) {
      return { added: false };
    }

    const { data, error } = await supabase
      .from("card_album_cards")
      .insert({
        user_id: userId,
        issuer: sourceCard.issuer,
        title: sourceCard.title,
        bin: sourceCard.bin,
        organization: sourceCard.organization,
        group_name: sourceCard.groupName,
        description: sourceCard.description || null,
        scope: normalizedTargetScope
      })
      .select(CARD_ALBUM_COLUMNS)
      .single();

    if (error || !data) {
      throw error || new Error(`Failed to copy card to ${getCardScopeLabel(normalizedTargetScope)}.`);
    }

    return {
      added: true,
      card: mapRowToCard(data as CardAlbumRow)
    };
  }

  async addPublicCardToPersonal(userId: string, cardId: string): Promise<{ added: boolean; card?: CardAlbumCard }> {
    const card = await this.getAccessibleCardById(userId, cardId);
    if (card.scope !== "public") {
      throw new Error("Public card not found.");
    }

    return this.addCardToAlbum(userId, cardId, "personal");
  }

  async listBrowsingHistory(userId: string, limit = 100): Promise<BrowsingHistoryRecord[]> {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(Math.trunc(limit), 500)) : 100;
    const { data, error } = await supabase
      .from("user_history")
      .select(`
        id,
        visited_at,
        pos_machine_id,
        pos_machines (
          id,
          merchant_name,
          address,
          merchant_info
        )
      `)
      .eq("user_id", userId)
      .order("visited_at", { ascending: false })
      .limit(safeLimit);

    if (error) {
      if (isIgnorableError(error)) {
        return [];
      }
      throw error;
    }

    return ((data as UserHistoryRow[] | null) || [])
      .map((row) => {
        const posMachine = normalizeRelatedRow(row.pos_machines);
        const locationId = normalizeString(posMachine?.id) || normalizeString(row.pos_machine_id);
        if (!locationId) {
          return null;
        }
        const merchantInfo = normalizeRecord(posMachine?.merchant_info);
        return {
          id: row.id,
          locationId,
          title: normalizeString(posMachine?.merchant_name) || "Untitled location",
          address: normalizeString(posMachine?.address) || "No address recorded.",
          city: normalizeString(merchantInfo.city),
          brand: normalizeString(merchantInfo.brand_name) || normalizeString(merchantInfo.brand),
          visitedAt: row.visited_at || new Date().toISOString()
        } satisfies BrowsingHistoryRecord;
      })
      .filter((item): item is BrowsingHistoryRecord => Boolean(item));
  }

  async clearBrowsingHistory(userId: string): Promise<void> {
    const { error } = await supabase.from("user_history").delete().eq("user_id", userId);
    if (error) {
      throw error;
    }
  }

  async getProfile(userId: string): Promise<ViewerProfileRecord> {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data.user) {
      throw error || new Error("Unable to load profile.");
    }

    return buildViewerProfileRecord(data.user);
  }

  async updateProfile(userId: string, input: UpdateViewerProfileInput): Promise<ViewerProfileRecord> {
    const { data, error } = await supabase.auth.admin.getUserById(userId);
    if (error || !data.user) {
      throw error || new Error("Unable to load profile.");
    }

    const user = data.user;
    const metadata = normalizeMetadata(user);
    const trimmedName = input.name.trim() || deriveProfileName(user, null);
    const trimmedLocation = input.location.trim();
    const trimmedBio = input.bio.trim();

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...metadata,
        display_name: trimmedName,
        location: trimmedLocation,
        bio: trimmedBio
      }
    });

    if (updateError) {
      throw updateError;
    }

    const { data: refreshedData, error: refreshedError } = await supabase.auth.admin.getUserById(userId);
    if (refreshedError || !refreshedData.user) {
      throw refreshedError || new Error("Unable to refresh profile.");
    }

    return buildViewerProfileRecord(refreshedData.user);
  }

  async recordVisit(userId: string, posMachineId: string): Promise<void> {
    const normalizedPosMachineId = posMachineId.trim();
    if (!normalizedPosMachineId) {
      return;
    }

    const { error } = await supabase.rpc("upsert_user_history", {
      p_user_id: userId,
      p_pos_machine_id: normalizedPosMachineId
    });

    if (!error) {
      return;
    }

    if (!isMissingRpcError(error)) {
      throw error;
    }

    const now = new Date().toISOString();
    const { data, error: selectError } = await supabase
      .from("user_history")
      .select("id")
      .eq("user_id", userId)
      .eq("pos_machine_id", normalizedPosMachineId)
      .order("visited_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (selectError && !isIgnorableError(selectError)) {
      throw selectError;
    }

    if (data?.id) {
      const { error: updateError } = await supabase.from("user_history").update({ visited_at: now }).eq("id", data.id);
      if (updateError) {
        throw updateError;
      }
      return;
    }

    const { error: insertError } = await supabase.from("user_history").insert({
      user_id: userId,
      pos_machine_id: normalizedPosMachineId,
      visited_at: now
    });
    if (insertError) {
      throw insertError;
    }
  }
}
