import { supabase } from "@/lib/supabase";
import type {
  CreateLocationAttemptInput,
  CreateLocationInput,
  LocationBusinessHours,
  LocationAttemptRecord,
  LocationDetailRecord,
  LocationRecord,
  LocationReviewRecord,
  LocationSpecialDateHours,
  LocationSupportEvidenceItem,
  LocationSupportInsight,
  LocationSupportInsights,
  LocationSource,
  LocationStatus,
  StaffProficiencyLevel,
  SupportEvidenceStatus
} from "@/types/location";

interface FluxaLocationRow {
  id: string;
  merchant_name: string;
  address: string;
  brand: string | null;
  city: string | null;
  status: LocationStatus;
  latitude: number | string;
  longitude: number | string;
  notes: string | null;
  staff_proficiency_level: number | null;
  staff_proficiency_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

interface FluxaLocationMapIndexRow {
  id: string;
  latitude: number | string;
  longitude: number | string;
  updated_at: string;
}

interface FluxaLocationSearchRow {
  id: string;
  merchant_name: string;
  address: string;
  brand: string | null;
  city: string | null;
  status: LocationStatus;
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
  basic_info: Record<string, unknown> | null;
  status: string | null;
  remarks: string | null;
  merchant_info: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

interface PosMachineMapIndexRow {
  id: string;
  latitude: number | string;
  longitude: number | string;
  created_at: string | null;
  updated_at: string | null;
}

interface PosMachineSearchRow {
  id: string;
  name: string;
  merchant_name: string;
  address: string;
  brand_id: string | null;
  created_by: string | null;
  status: string | null;
  updated_at: string | null;
}

interface PosMachineDirectoryRow {
  id: string;
  name: string;
  merchant_name: string;
  address: string;
  brand_id: string | null;
  created_by: string | null;
  latitude: number | string;
  longitude: number | string;
  status: string | null;
  remarks: string | null;
  merchant_info: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
}

interface BrandRow {
  id: string;
  name: string;
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
  cvm: string | null;
  acquiring_mode: string | null;
  device_status: string | null;
  checkout_location: string | null;
  is_conclusive_failure: boolean | null;
  result: string | null;
  attempt_result: string | null;
  notes: string | null;
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
  username: string;
  email: string;
}

interface SourceResult<T> {
  data: T;
  error: unknown | null;
}

export interface LocationBounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

export interface LocationMapIndexRecord {
  id: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

export interface LocationSearchRecord {
  id: string;
  name: string;
  address: string;
  brand: string;
  city: string;
  addedBy?: string;
  status: LocationStatus;
  updatedAt: string;
}

export interface LocationCounts {
  total: number;
  active: number;
  inactive: number;
}

export interface BrandLocationDirectoryQuery {
  brandId?: string | null;
  brandName?: string | null;
}

let cachedBrandsById: Map<string, string> | null = null;
let cachedBrandsPromise: Promise<Map<string, string>> | null = null;
const FLUXA_LOCATION_META_PREFIX = "__fluxa_meta__:";
type FluxaLocationSchemaMode = "unknown" | "current" | "legacy";
let fluxaLocationSchemaMode: FluxaLocationSchemaMode = "unknown";

const LOCATION_COLUMNS = `
  id,
  merchant_name,
  address,
  brand,
  city,
  status,
  latitude,
  longitude,
  notes,
  staff_proficiency_level,
  staff_proficiency_updated_at,
  created_at,
  updated_at
`;

const LEGACY_LOCATION_COLUMNS = `
  id,
  merchant_name,
  address,
  brand,
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

const LOCATION_MAP_INDEX_COLUMNS = `
  id,
  latitude,
  longitude,
  updated_at
`;

const LOCATION_SEARCH_COLUMNS = `
  id,
  merchant_name,
  address,
  brand,
  city,
  status,
  updated_at
`;

const POS_MACHINE_MAP_INDEX_COLUMNS = `
  id,
  latitude,
  longitude,
  created_at,
  updated_at
`;

const POS_MACHINE_SEARCH_COLUMNS = `
  id,
  name,
  merchant_name,
  address,
  brand_id,
  created_by,
  status,
  updated_at
`;

const POS_MACHINE_DIRECTORY_COLUMNS = `
  id,
  name,
  merchant_name,
  address,
  brand_id,
  created_by,
  latitude,
  longitude,
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
  cvm,
  acquiring_mode,
  device_status,
  checkout_location,
  is_conclusive_failure,
  result,
  attempt_result,
  notes
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

const FULL_SCAN_BATCH_SIZE = 1000;
const ADMIN_ROLE_NAMES = new Set(["admin", "super_admin", "superadmin"]);

function normalizeString(value: string | null | undefined, fallback = ""): string {
  return value?.trim() || fallback;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeSpecialDateHours(value: unknown): LocationSpecialDateHours[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const entry = item as Record<string, unknown>;
      const date = normalizeOptionalString(entry.date);
      const hours = normalizeOptionalString(entry.hours);

      if (!date || !hours) {
        return null;
      }

      return {
        date,
        hours
      } satisfies LocationSpecialDateHours;
    })
    .filter((item): item is LocationSpecialDateHours => Boolean(item));
}

function normalizeLocationBusinessHours(value: unknown): LocationBusinessHours | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const weekday = normalizeOptionalString(record.weekday);
  const weekend = normalizeOptionalString(record.weekend);
  const specialDates = normalizeSpecialDateHours(record.specialDates);

  if (!weekday && !weekend && specialDates.length === 0) {
    return undefined;
  }

  return {
    ...(weekday ? { weekday } : {}),
    ...(weekend ? { weekend } : {}),
    ...(specialDates.length > 0 ? { specialDates } : {})
  };
}

function serializeLocationBusinessHours(value: LocationBusinessHours | undefined): Record<string, unknown> | null {
  const normalized = normalizeLocationBusinessHours(value);

  if (!normalized) {
    return null;
  }

  return {
    ...(normalized.weekday ? { weekday: normalized.weekday } : {}),
    ...(normalized.weekend ? { weekend: normalized.weekend } : {}),
    ...(normalized.specialDates && normalized.specialDates.length > 0 ? { specialDates: normalized.specialDates } : {})
  };
}

function normalizeStaffProficiencyLevel(value: unknown): StaffProficiencyLevel | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5) {
    return value as StaffProficiencyLevel;
  }

  if (typeof value === "string") {
    const numericValue = Number.parseInt(value.trim(), 10);
    if (Number.isInteger(numericValue) && numericValue >= 1 && numericValue <= 5) {
      return numericValue as StaffProficiencyLevel;
    }
  }

  return null;
}

function parseFluxaLocationMeta(
  value: string | null | undefined
): Pick<LocationRecord, "contactInfo" | "businessHours" | "notes" | "staffProficiencyLevel" | "staffProficiencyUpdatedAt"> {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    return {};
  }

  if (!normalized.startsWith(FLUXA_LOCATION_META_PREFIX)) {
    return {
      notes: normalized
    };
  }

  try {
    const parsed = JSON.parse(normalized.slice(FLUXA_LOCATION_META_PREFIX.length)) as Record<string, unknown>;
    const contactInfo = normalizeOptionalString(parsed.contactInfo) || undefined;
    const businessHours = normalizeLocationBusinessHours(parsed.businessHours);
    const notes = normalizeOptionalString(parsed.notes) || undefined;
    const staffProficiencyLevel = normalizeStaffProficiencyLevel(parsed.staffProficiencyLevel);
    const staffProficiencyUpdatedAt = normalizeOptionalString(parsed.staffProficiencyUpdatedAt) || undefined;

    return {
      ...(notes ? { notes } : {}),
      ...(contactInfo ? { contactInfo } : {}),
      ...(businessHours ? { businessHours } : {}),
      ...(staffProficiencyLevel !== null ? { staffProficiencyLevel } : {}),
      ...(staffProficiencyUpdatedAt ? { staffProficiencyUpdatedAt } : {})
    };
  } catch {
    return {
      notes: normalized
    };
  }
}

function serializeFluxaLocationMeta(
  notes: string | undefined,
  contactInfo: string | undefined,
  businessHours: LocationBusinessHours | undefined,
  staffProficiencyLevel?: StaffProficiencyLevel | null,
  staffProficiencyUpdatedAt?: string
): string | null {
  const normalizedNotes = normalizeOptionalString(notes);
  const normalizedContactInfo = normalizeOptionalString(contactInfo);
  const normalizedBusinessHours = serializeLocationBusinessHours(businessHours);
  const normalizedStaffProficiencyLevel = normalizeStaffProficiencyLevel(staffProficiencyLevel);
  const normalizedStaffProficiencyUpdatedAt = normalizeOptionalString(staffProficiencyUpdatedAt);

  if (!normalizedContactInfo && !normalizedBusinessHours && normalizedStaffProficiencyLevel === null) {
    return normalizedNotes;
  }

  return `${FLUXA_LOCATION_META_PREFIX}${JSON.stringify({
    ...(normalizedNotes ? { notes: normalizedNotes } : {}),
    ...(normalizedContactInfo ? { contactInfo: normalizedContactInfo } : {}),
    ...(normalizedBusinessHours ? { businessHours: normalizedBusinessHours } : {}),
    ...(normalizedStaffProficiencyLevel !== null ? { staffProficiencyLevel: normalizedStaffProficiencyLevel } : {}),
    ...(normalizedStaffProficiencyUpdatedAt ? { staffProficiencyUpdatedAt: normalizedStaffProficiencyUpdatedAt } : {})
  })}`;
}

function clampNumber(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

async function fetchAllRows<T>(queryFactory: () => any): Promise<SourceResult<T[]>> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await queryFactory()
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + FULL_SCAN_BATCH_SIZE - 1);

    if (error) {
      return { data: [], error };
    }

    const batch = (data || []) as T[];
    rows.push(...batch);

    if (batch.length < FULL_SCAN_BATCH_SIZE) {
      return { data: rows, error: null };
    }

    offset += FULL_SCAN_BATCH_SIZE;
  }
}

function isFluxaLocationStaffColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as Record<string, unknown>;
  const message = [record.message, record.details, record.hint]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .toLowerCase();

  return message.includes("staff_proficiency_level") || message.includes("staff_proficiency_updated_at");
}

async function executeFluxaLocationSelect<T>(queryFactory: (columns: string) => any): Promise<{ data: T | null; error: any }> {
  const preferredColumns = fluxaLocationSchemaMode === "legacy" ? LEGACY_LOCATION_COLUMNS : LOCATION_COLUMNS;
  const preferredResult = await queryFactory(preferredColumns);

  if (!preferredResult.error) {
    if (preferredColumns === LOCATION_COLUMNS) {
      fluxaLocationSchemaMode = "current";
    }

    return preferredResult;
  }

  if (preferredColumns === LEGACY_LOCATION_COLUMNS || !isFluxaLocationStaffColumnError(preferredResult.error)) {
    return preferredResult;
  }

  fluxaLocationSchemaMode = "legacy";
  return queryFactory(LEGACY_LOCATION_COLUMNS);
}

async function fetchAllFluxaRows<T>(queryFactory: (columns: string) => any): Promise<SourceResult<T[]>> {
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await executeFluxaLocationSelect<T[]>((columns) =>
      queryFactory(columns)
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + FULL_SCAN_BATCH_SIZE - 1)
    );

    if (error) {
      return { data: [], error };
    }

    const batch = (data || []) as T[];
    rows.push(...batch);

    if (batch.length < FULL_SCAN_BATCH_SIZE) {
      return { data: rows, error: null };
    }

    offset += FULL_SCAN_BATCH_SIZE;
  }
}

function stripFluxaLocationStaffColumns<T extends Record<string, unknown>>(payload: T): Omit<T, "staff_proficiency_level" | "staff_proficiency_updated_at"> {
  const { staff_proficiency_level, staff_proficiency_updated_at, ...rest } = payload;
  void staff_proficiency_level;
  void staff_proficiency_updated_at;
  return rest;
}

function normalizeBounds(bounds: LocationBounds): LocationBounds {
  return {
    south: clampNumber(Math.min(bounds.south, bounds.north), -90, 90),
    west: clampNumber(Math.min(bounds.west, bounds.east), -180, 180),
    north: clampNumber(Math.max(bounds.south, bounds.north), -90, 90),
    east: clampNumber(Math.max(bounds.west, bounds.east), -180, 180)
  };
}

function applyBoundsFilters(query: any, bounds: LocationBounds, latitudeColumn: string, longitudeColumn: string): any {
  return query
    .gte(latitudeColumn, bounds.south)
    .lte(latitudeColumn, bounds.north)
    .gte(longitudeColumn, bounds.west)
    .lte(longitudeColumn, bounds.east);
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function readBooleanFlag(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
}

function normalizeRoleValues(value: unknown): string[] {
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
      .filter(Boolean);
  }

  return [];
}

function isAdminMetadataRecord(value: unknown): boolean {
  const metadata = normalizeRecord(value);

  if (
    readBooleanFlag(metadata.is_admin)
    || readBooleanFlag(metadata.admin)
  ) {
    return true;
  }

  return [
    ...normalizeRoleValues(metadata.role),
    ...normalizeRoleValues(metadata.roles)
  ].some((role) => ADMIN_ROLE_NAMES.has(role));
}

function inferCity(address: string, fallback: string): string {
  if (fallback.trim()) return fallback.trim();
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

function buildLocationMetaLine(brand: string, city: string): string {
  return `品牌：${brand}  •  城市：${city}`;
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

function formatSupportNetworkLabel(network: string | null | undefined): string {
  const normalized = normalizeString(network).toLowerCase();

  if (normalized === "amex cn") return "American Express 中国";
  if (normalized === "amex" || normalized === "american express") return "American Express";
  if (normalized === "jcb") return "JCB";
  if (normalized === "discover") return "Discover（发现）";
  if (normalized === "diners" || normalized === "diners club") return "Diners Club";
  if (normalized === "mastercard" || normalized === "master card") return "MasterCard";
  if (normalized === "visa") return "Visa";
  if (normalized === "unionpay" || normalized === "union pay" || normalized === "银联") return "银联 UnionPay";

  return normalizeString(network);
}

function formatSupportPaymentMethodLabel(method: string | null | undefined): string {
  const normalized = normalizeString(method).toLowerCase();

  if (normalized === "apple pay" || normalized === "apple_pay") return "Apple Pay";
  if (normalized === "google pay" || normalized === "google_pay") return "Google Pay";
  if (normalized === "contactless" || normalized === "tap") return "Contactless";
  if (normalized === "insert") return "Insert";
  if (normalized === "swipe") return "Swipe";
  if (normalized === "signature") return "Signature";
  if (normalized === "pin") return "PIN";
  if (normalized === "hce") return "HCE";
  if (normalized === "unknown") return "Unknown";

  return normalizeString(method)
    .split(/[\s_]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase())
    .join(" ");
}

function buildSupportKey(prefix: string, label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${prefix}:${normalized || "unknown"}`;
}

function mapAttemptEvidenceStatus(attempt: LocationAttemptRecord): SupportEvidenceStatus {
  if (attempt.status === "success") {
    return "supported";
  }

  if (attempt.isConclusiveFailure) {
    return "unsupported";
  }

  return "limited";
}

function summarizeInsightCounters(
  supportingAttempts: number,
  conflictingAttempts: number,
  officialSources: number
): string {
  return `${supportingAttempts} positive attempt(s) · ${conflictingAttempts} conflicting attempt(s) · ${officialSources} structured source(s)`;
}

function deriveSupportInsightStatus(
  supportingAttempts: number,
  conflictingAttempts: number,
  officialSources: number
): SupportEvidenceStatus {
  if (supportingAttempts > 0) {
    if (conflictingAttempts > supportingAttempts) {
      return "limited";
    }
    return "supported";
  }

  if (officialSources > 0) {
    return conflictingAttempts > 0 ? "limited" : "supported";
  }

  if (conflictingAttempts > 0) {
    return "unsupported";
  }

  return "unknown";
}

function buildSupportInsightRationale(
  title: string,
  status: SupportEvidenceStatus,
  supportingAttempts: number,
  conflictingAttempts: number,
  officialSources: number
): string {
  const counterSummary = summarizeInsightCounters(supportingAttempts, conflictingAttempts, officialSources);

  if (status === "supported") {
    return `${title} is currently supported by existing evidence. ${counterSummary}.`;
  }

  if (status === "limited") {
    return `${title} has mixed evidence right now. ${counterSummary}.`;
  }

  if (status === "unsupported") {
    return `${title} is currently only backed by conflicting attempts. ${counterSummary}.`;
  }

  return `${title} does not have enough evidence yet. ${counterSummary}.`;
}

function buildAttemptEvidenceTitle(attempt: LocationAttemptRecord): string {
  const fragments = [
    attempt.cardName.trim(),
    formatSupportNetworkLabel(attempt.network),
    formatSupportPaymentMethodLabel(attempt.paymentMethod || attempt.method)
  ].filter(Boolean);

  return fragments.join(" · ") || "Attempt record";
}

function buildAttemptEvidenceSummary(attempt: LocationAttemptRecord): string {
  const fragments = [
    attempt.dateTime,
    attempt.addedBy,
    attempt.checkoutLocation,
    attempt.notes?.trim() || ""
  ].filter(Boolean);

  return fragments.join(" · ");
}

function buildSupportInsights(
  base: LocationRecord,
  attempts: LocationAttemptRecord[],
  basicInfo: Record<string, unknown>,
  merchantInfo: Record<string, unknown>
): LocationSupportInsights {
  const networkMap = new Map<string, {
    title: string;
    evidence: LocationSupportEvidenceItem[];
    supportingAttempts: number;
    conflictingAttempts: number;
    officialSources: number;
  }>();
  const paymentMethodMap = new Map<string, {
    title: string;
    evidence: LocationSupportEvidenceItem[];
    supportingAttempts: number;
    conflictingAttempts: number;
    officialSources: number;
  }>();

  const ensureInsight = (
    target: typeof networkMap,
    key: string,
    title: string
  ) => {
    const existing = target.get(key);
    if (existing) {
      return existing;
    }

    const next = {
      title,
      evidence: [],
      supportingAttempts: 0,
      conflictingAttempts: 0,
      officialSources: 0
    };

    target.set(key, next);
    return next;
  };

  Array.from(
    new Set([
      ...normalizeStringArray(basicInfo.supported_card_networks),
      ...normalizeStringArray(merchantInfo.supported_card_networks),
      ...(base.supportedNetworks || [])
    ])
  )
    .map((network) => formatSupportNetworkLabel(network))
    .filter(Boolean)
    .forEach((title) => {
      const key = buildSupportKey("network", title);
      const insight = ensureInsight(networkMap, key, title);
      insight.officialSources += 1;
      insight.evidence.push({
        id: `${key}-official-${insight.officialSources}`,
        kind: "official",
        title: "Official Data",
        status: "supported"
      });
    });

  const structuredPaymentSignals = [
    {
      enabled: readBooleanFlag(basicInfo.supports_apple_pay),
      title: "Apple Pay",
      summary: "POS profile marks supports_apple_pay = true."
    },
    {
      enabled: readBooleanFlag(basicInfo.supports_google_pay),
      title: "Google Pay",
      summary: "POS profile marks supports_google_pay = true."
    },
    {
      enabled: readBooleanFlag(basicInfo.supports_contactless),
      title: "Contactless",
      summary: "POS profile marks supports_contactless = true."
    },
    {
      enabled: readBooleanFlag(basicInfo.supports_hce_simulation),
      title: "HCE",
      summary: "POS profile marks supports_hce_simulation = true."
    }
  ];

  structuredPaymentSignals
    .filter((signal) => signal.enabled)
    .forEach((signal) => {
      const key = buildSupportKey("payment-method", signal.title);
      const insight = ensureInsight(paymentMethodMap, key, signal.title);
      insight.officialSources += 1;
      insight.evidence.push({
        id: `${key}-official-${insight.officialSources}`,
        kind: "official",
        title: "Official Data",
        summary: signal.summary,
        status: "supported"
      });
    });

  attempts.forEach((attempt) => {
    const attemptStatus = mapAttemptEvidenceStatus(attempt);
    const isSupportingAttempt = attemptStatus === "supported";

    const networkTitle = formatSupportNetworkLabel(attempt.network);
    if (networkTitle && networkTitle !== "Unknown") {
      const networkKey = buildSupportKey("network", networkTitle);
      const networkInsight = ensureInsight(networkMap, networkKey, networkTitle);
      networkInsight.evidence.push({
        id: `attempt-${attempt.id}-network`,
        kind: "attempt",
        title: buildAttemptEvidenceTitle(attempt),
        summary: buildAttemptEvidenceSummary(attempt),
        status: attemptStatus,
        attemptId: attempt.id,
        cardName: attempt.cardName,
        createdAt: attempt.occurredAt,
        dateTimeLabel: attempt.dateTime,
        addedBy: attempt.addedBy,
        networkLabel: formatSupportNetworkLabel(attempt.network),
        paymentMethodLabel: formatSupportPaymentMethodLabel(attempt.paymentMethod || attempt.method),
        checkoutLocation: attempt.checkoutLocation,
        notes: attempt.notes,
        invalidated: !isSupportingAttempt && networkInsight.officialSources > 0
      });

      if (isSupportingAttempt) {
        networkInsight.supportingAttempts += 1;
      } else {
        networkInsight.conflictingAttempts += 1;
      }
    }

    const paymentMethodTitle = formatSupportPaymentMethodLabel(attempt.paymentMethod || attempt.method);
    if (paymentMethodTitle && paymentMethodTitle !== "Unknown") {
      const paymentMethodKey = buildSupportKey("payment-method", paymentMethodTitle);
      const paymentMethodInsight = ensureInsight(paymentMethodMap, paymentMethodKey, paymentMethodTitle);
      paymentMethodInsight.evidence.push({
        id: `attempt-${attempt.id}-payment-method`,
        kind: "attempt",
        title: buildAttemptEvidenceTitle(attempt),
        summary: buildAttemptEvidenceSummary(attempt),
        status: attemptStatus,
        attemptId: attempt.id,
        cardName: attempt.cardName,
        createdAt: attempt.occurredAt,
        dateTimeLabel: attempt.dateTime,
        addedBy: attempt.addedBy,
        networkLabel: formatSupportNetworkLabel(attempt.network),
        paymentMethodLabel: formatSupportPaymentMethodLabel(attempt.paymentMethod || attempt.method),
        checkoutLocation: attempt.checkoutLocation,
        notes: attempt.notes,
        invalidated: !isSupportingAttempt && paymentMethodInsight.officialSources > 0
      });

      if (isSupportingAttempt) {
        paymentMethodInsight.supportingAttempts += 1;
      } else {
        paymentMethodInsight.conflictingAttempts += 1;
      }
    }
  });

  const finalizeInsights = (target: typeof networkMap): LocationSupportInsight[] =>
    Array.from(target.entries())
      .map(([key, insight]) => {
        const status = deriveSupportInsightStatus(insight.supportingAttempts, insight.conflictingAttempts, insight.officialSources);

        return {
          key,
          title: insight.title,
          status,
          rationale: buildSupportInsightRationale(
            insight.title,
            status,
            insight.supportingAttempts,
            insight.conflictingAttempts,
            insight.officialSources
          ),
          evidence: insight.evidence,
          counters: {
            supportingAttempts: insight.supportingAttempts,
            conflictingAttempts: insight.conflictingAttempts,
            officialSources: insight.officialSources
          }
        } satisfies LocationSupportInsight;
      })
      .sort((left, right) => left.title.localeCompare(right.title, "en"));

  return {
    networks: finalizeInsights(networkMap),
    paymentMethods: finalizeInsights(paymentMethodMap)
  };
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

function calculateAttemptSuccessRate(attempts: Array<Pick<PosAttemptRow, "result" | "attempt_result">>): number | null {
  if (attempts.length === 0) {
    return null;
  }

  const successCount = attempts.reduce((count, attempt) => {
    return count + (mapAttemptStatus(attempt.result || attempt.attempt_result) === "success" ? 1 : 0);
  }, 0);

  return Number(((successCount / attempts.length) * 100).toFixed(1));
}

function mapFluxaRowToLocation(row: FluxaLocationRow): LocationRecord {
  const metadata = parseFluxaLocationMeta(row.notes);
  const staffProficiencyLevel = normalizeStaffProficiencyLevel(row.staff_proficiency_level) ?? metadata.staffProficiencyLevel;
  const staffProficiencyUpdatedAt = normalizeOptionalString(row.staff_proficiency_updated_at) || metadata.staffProficiencyUpdatedAt;

  return {
    id: row.id,
    name: normalizeString(row.merchant_name, "Untitled Location"),
    address: normalizeString(row.address, "Unknown address"),
    brand: normalizeString(row.brand, "Unknown"),
    city: inferCity(normalizeString(row.address), normalizeString(row.city)),
    addedBy: "Unknown",
    status: row.status === "inactive" ? "inactive" : "active",
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contactInfo: metadata.contactInfo,
    businessHours: metadata.businessHours,
    notes: metadata.notes || "",
    staffProficiencyLevel,
    staffProficiencyUpdatedAt,
    source: "fluxa_locations"
  };
}

function mapFluxaRowToLocationMapIndex(row: FluxaLocationMapIndexRow): LocationMapIndexRecord {
  return {
    id: row.id,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    updatedAt: row.updated_at
  };
}

function mapFluxaRowToLocationSearchRecord(row: FluxaLocationSearchRow): LocationSearchRecord {
  return {
    id: row.id,
    name: normalizeString(row.merchant_name, "Untitled Location"),
    address: normalizeString(row.address, "Unknown address"),
    brand: normalizeString(row.brand, "Unknown"),
    city: inferCity(normalizeString(row.address), normalizeString(row.city)),
    status: row.status === "inactive" ? "inactive" : "active",
    updatedAt: row.updated_at
  };
}

function mapPosMachineToLocation(
  row: PosMachineRow,
  brandsById: Map<string, string>,
  usersById?: Map<string, string>,
  networksByPosId?: Map<string, string[]>,
  successRateByPosId?: Map<string, number | null>
): LocationRecord {
  const basicInfo = normalizeRecord(row.basic_info);
  const merchantInfo = normalizeRecord(row.merchant_info);
  const brandName =
    normalizeOptionalString(brandsById.get(row.brand_id || "") || null) ||
    normalizeOptionalString(merchantInfo.brand) ||
    normalizeOptionalString(merchantInfo.brand_name) ||
    "Unknown";
  const city = normalizeOptionalString(merchantInfo.city) || inferCity(row.address, "");
  const staffProficiencyLevel =
    normalizeStaffProficiencyLevel(merchantInfo.staff_proficiency_level)
    ?? normalizeStaffProficiencyLevel(merchantInfo.staffProficiencyLevel);
  const staffProficiencyUpdatedAt =
    normalizeOptionalString(merchantInfo.staff_proficiency_updated_at)
    || normalizeOptionalString(merchantInfo.staffProficiencyUpdatedAt)
    || undefined;
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
    city: city || "Unknown",
    addedBy: usersById ? resolveUserName(row.created_by, usersById) : undefined,
    supportedNetworks,
    successRate: successRateByPosId?.get(row.id) ?? null,
    status: row.status === "inactive" ? "inactive" : "active",
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    createdAt: row.created_at || row.updated_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    contactInfo:
      normalizeOptionalString(merchantInfo.contact_info)
      || normalizeOptionalString(merchantInfo.contact)
      || normalizeOptionalString(merchantInfo.phone)
      || undefined,
    businessHours: normalizeLocationBusinessHours(merchantInfo.business_hours),
    notes: normalizeString(row.remarks),
    staffProficiencyLevel,
    staffProficiencyUpdatedAt,
    source: "pos_machines"
  };
}

function mapPosMachineDirectoryRowToLocation(
  row: PosMachineDirectoryRow,
  brandsById: Map<string, string>,
  usersById?: Map<string, string>
): LocationRecord {
  const merchantInfo = normalizeRecord(row.merchant_info);
  const brandName =
    normalizeOptionalString(brandsById.get(row.brand_id || "") || null) ||
    normalizeOptionalString(merchantInfo.brand) ||
    normalizeOptionalString(merchantInfo.brand_name) ||
    "Unknown";
  const city = normalizeOptionalString(merchantInfo.city) || inferCity(row.address, "");
  const staffProficiencyLevel =
    normalizeStaffProficiencyLevel(merchantInfo.staff_proficiency_level)
    ?? normalizeStaffProficiencyLevel(merchantInfo.staffProficiencyLevel);
  const staffProficiencyUpdatedAt =
    normalizeOptionalString(merchantInfo.staff_proficiency_updated_at)
    || normalizeOptionalString(merchantInfo.staffProficiencyUpdatedAt)
    || undefined;

  return {
    id: row.id,
    name: normalizeString(row.merchant_name, normalizeString(row.name, "Untitled Location")),
    address: normalizeString(row.address, "Unknown address"),
    brand: brandName,
    city: city || "Unknown",
    addedBy: usersById ? resolveUserName(row.created_by, usersById) : undefined,
    status: row.status === "inactive" ? "inactive" : "active",
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    createdAt: row.created_at || row.updated_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
    contactInfo:
      normalizeOptionalString(merchantInfo.contact_info)
      || normalizeOptionalString(merchantInfo.contact)
      || normalizeOptionalString(merchantInfo.phone)
      || undefined,
    businessHours: normalizeLocationBusinessHours(merchantInfo.business_hours),
    notes: normalizeString(row.remarks),
    staffProficiencyLevel,
    staffProficiencyUpdatedAt,
    source: "pos_machines"
  };
}

function mapPosMachineToLocationMapIndex(row: PosMachineMapIndexRow): LocationMapIndexRecord {
  return {
    id: row.id,
    lat: Number(row.latitude),
    lng: Number(row.longitude),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString()
  };
}

function mapPosMachineSearchRowToLocationSearchRecord(
  row: PosMachineSearchRow,
  brandsById: Map<string, string>,
  usersById?: Map<string, string>
): LocationSearchRecord {
  return {
    id: row.id,
    name: normalizeString(row.merchant_name, normalizeString(row.name, "Untitled Location")),
    address: normalizeString(row.address, "Unknown address"),
    brand: normalizeOptionalString(brandsById.get(row.brand_id || "") || null) || "Unknown",
    city: inferCity(row.address, ""),
    addedBy: usersById ? resolveUserName(row.created_by, usersById) : undefined,
    status: row.status === "inactive" ? "inactive" : "active",
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

function buildDetailRecord(
  base: LocationRecord,
  deviceName: string,
  attempts: LocationAttemptRecord[],
  reviews: LocationReviewRecord[],
  metaLine: string,
  supportInsights?: LocationSupportInsights
): LocationDetailRecord {
  const successCount = attempts.filter((attempt) => attempt.status === "success").length;
  const failedCount = attempts.length - successCount;
  const successRate = attempts.length > 0 ? Number(((successCount / attempts.length) * 100).toFixed(1)) : 0;

  return {
    ...base,
    source: base.source || "fluxa_locations",
    deviceName,
    metaLine,
    successRate,
    successCount,
    failedCount,
    totalAttempts: attempts.length,
    attempts,
    reviews,
    ...(supportInsights ? { supportInsights } : {})
  };
}

function buildLocationInputFromRecord(
  location: Pick<
    LocationRecord,
    "name" | "address" | "brand" | "city" | "status" | "lat" | "lng" | "businessHours" | "contactInfo" | "notes" | "staffProficiencyLevel"
  >
): CreateLocationInput {
  return {
    name: location.name,
    address: location.address,
    brand: location.brand,
    city: location.city,
    status: location.status,
    lat: location.lat,
    lng: location.lng,
    businessHours: location.businessHours,
    contactInfo: location.contactInfo,
    notes: location.notes,
    staffProficiencyLevel: location.staffProficiencyLevel
  };
}

function normalizeAttemptResult(status: CreateLocationInput["transactionStatus"]): string {
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

function normalizeCheckoutLocation(value: CreateLocationInput["checkoutLocation"]): string | null {
  if (value === "Self-checkout") {
    return "自助收银";
  }
  if (value === "Staffed Checkout") {
    return "人工收银";
  }
  return null;
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

async function getCurrentUserIdentity(): Promise<{ id: string; label: string }> {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user?.id) {
    throw new Error("当前登录状态已失效，请重新登录后再保存地点。");
  }

  const label =
    normalizeOptionalString(user.user_metadata?.full_name) ||
    normalizeOptionalString(user.user_metadata?.name) ||
    normalizeOptionalString(user.email) ||
    user.id;

  return {
    id: user.id,
    label
  };
}

async function requireAdminUser(): Promise<void> {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user?.id) {
    throw new Error("当前登录状态已失效，请重新登录后再操作地点。");
  }

  if (!isAdminMetadataRecord(user.user_metadata) && !isAdminMetadataRecord(user.app_metadata)) {
    throw new Error("只有管理员可以删除地点。");
  }
}

async function deleteRowsByLocationId(table: string, column: string, locationId: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq(column, locationId);

  if (error) {
    throw error;
  }
}

function buildFluxaLocationInsertPayload(input: CreateLocationInput, options?: { id?: string }) {
  const city = inferCity(input.address, input.city || "");
  const staffProficiencyLevel = normalizeStaffProficiencyLevel(input.staffProficiencyLevel);
  const staffProficiencyUpdatedAt = staffProficiencyLevel !== null ? new Date().toISOString() : undefined;

  return {
    ...(options?.id ? { id: options.id } : {}),
    merchant_name: input.name.trim(),
    address: input.address.trim(),
    brand: input.brand.trim() || "Unknown",
    city,
    status: input.status,
    latitude: Number(input.lat.toFixed(6)),
    longitude: Number(input.lng.toFixed(6)),
    notes: serializeFluxaLocationMeta(input.notes, input.contactInfo, input.businessHours, staffProficiencyLevel, staffProficiencyUpdatedAt),
    staff_proficiency_level: staffProficiencyLevel,
    staff_proficiency_updated_at: staffProficiencyUpdatedAt
  };
}

function buildPosMachineInsertPayload(
  input: CreateLocationInput,
  userId: string,
  brandId: string | null,
  options?: { id?: string; sourceFlow?: string }
) {
  const paymentMethod = normalizePaymentMethod(input.paymentMethod);
  const acquiringMode = normalizeAcquiringMode(input.acquiringMode);
  const checkoutLocation = normalizeCheckoutLocation(input.checkoutLocation);
  const normalizedNetwork = normalizeString(input.network);
  const city = inferCity(input.address, input.city || "");
  const trimmedBrand = input.brand.trim() || "Unknown";
  const businessHours = serializeLocationBusinessHours(input.businessHours);
  const contactInfo = normalizeOptionalString(input.contactInfo);
  const staffProficiencyLevel = normalizeStaffProficiencyLevel(input.staffProficiencyLevel);
  const staffProficiencyUpdatedAt = staffProficiencyLevel !== null ? new Date().toISOString() : undefined;

  return {
    ...(options?.id ? { id: options.id } : {}),
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
      city,
      ...(contactInfo ? { contact_info: contactInfo } : {}),
      ...(businessHours ? { business_hours: businessHours } : {}),
      ...(staffProficiencyLevel !== null ? { staff_proficiency_level: staffProficiencyLevel } : {}),
      ...(staffProficiencyUpdatedAt ? { staff_proficiency_updated_at: staffProficiencyUpdatedAt } : {}),
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
      source_flow: options?.sourceFlow || "add_location_wizard",
      city,
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

async function createPosMachineAttempt(location: LocationRecord, input: CreateLocationAttemptInput): Promise<LocationAttemptRecord> {
  const user = await getCurrentUserIdentity();
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
  const status = mapAttemptStatus(attempt.result || attempt.attempt_result);

  return {
    id: attempt.id,
    occurredAt: attempt.attempted_at || attempt.created_at || undefined,
    dateTime: formatDateTime(attempt.attempted_at || attempt.created_at),
    addedBy: resolveUserName(attempt.created_by || attempt.user_id, usersById),
    cardName: normalizeString(attempt.card_name, "Unknown card"),
    network: normalizeString(attempt.card_network, "Unknown"),
    method: normalizeString(attempt.payment_method, "Unknown"),
    paymentMethod: normalizeString(attempt.payment_method),
    cvm: normalizeString(attempt.cvm),
    acquiringMode: normalizeString(attempt.acquiring_mode),
    deviceStatus: attempt.device_status === "inactive" ? "inactive" : "active",
    checkoutLocation: normalizeString(attempt.checkout_location),
    status,
    notes: normalizeString(attempt.notes),
    isConclusiveFailure: Boolean(attempt.is_conclusive_failure)
  };
}

async function fetchBrandMap(brandIds: string[]): Promise<Map<string, string>> {
  if (brandIds.length === 0) {
    return new Map<string, string>();
  }

  if (!cachedBrandsById) {
    if (!cachedBrandsPromise) {
      cachedBrandsPromise = (async () => {
        const { data } = await supabase.from("brands").select("id, name");
          const nextMap = new Map<string, string>();
          ((data || []) as BrandRow[]).forEach((brand) => {
            nextMap.set(brand.id, brand.name);
          });
          cachedBrandsById = nextMap;
          return nextMap;
        })()
        .catch(() => new Map<string, string>())
        .finally(() => {
          cachedBrandsPromise = null;
        });
    }

    cachedBrandsById = await cachedBrandsPromise;
  }

  const missingBrandIds = Array.from(new Set(brandIds.filter((brandId) => !cachedBrandsById?.has(brandId))));
  if (missingBrandIds.length > 0) {
    const { data } = await supabase.from("brands").select("id, name").in("id", missingBrandIds);
    ((data || []) as BrandRow[]).forEach((brand) => {
      cachedBrandsById?.set(brand.id, brand.name);
    });
  }

  const brandMap = new Map<string, string>();
  brandIds.forEach((brandId) => {
    const brandName = cachedBrandsById?.get(brandId);
    if (brandName) {
      brandMap.set(brandId, brandName);
    }
  });
  return brandMap;
}

async function resolveBrandIdsByName(brandName: string): Promise<string[]> {
  const normalizedBrandName = brandName.trim();

  if (!normalizedBrandName) {
    return [];
  }

  const { data, error } = await supabase.from("brands").select("id").ilike("name", normalizedBrandName);

  if (error) {
    throw error;
  }

  return Array.from(new Set(((data || []) as Array<{ id: string }>).map((row) => row.id).filter(Boolean)));
}

async function fetchUserMap(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) {
    return new Map<string, string>();
  }

  const { data } = await supabase.from("users").select("id, username, email").in("id", userIds);
  const userMap = new Map<string, string>();
  ((data || []) as UserRow[]).forEach((user) => {
    userMap.set(user.id, user.username || user.email);
  });
  return userMap;
}

async function listFluxaLocations(): Promise<SourceResult<LocationRecord[]>> {
  const { data, error } = await fetchAllFluxaRows<FluxaLocationRow>((columns) => supabase.from("fluxa_locations").select(columns));

  return {
    data: ((data || []) as FluxaLocationRow[]).map(mapFluxaRowToLocation),
    error
  };
}

async function listFluxaLocationDirectory(): Promise<SourceResult<LocationRecord[]>> {
  const { data, error } = await fetchAllFluxaRows<FluxaLocationRow>((columns) => supabase.from("fluxa_locations").select(columns));

  return {
    data: ((data || []) as FluxaLocationRow[]).map(mapFluxaRowToLocation),
    error
  };
}

async function listFluxaLocationsInBounds(bounds: LocationBounds): Promise<SourceResult<LocationRecord[]>> {
  const normalizedBounds = normalizeBounds(bounds);
  const { data, error } = await executeFluxaLocationSelect<FluxaLocationRow[]>((columns) =>
    applyBoundsFilters(
      supabase.from("fluxa_locations").select(columns).order("updated_at", { ascending: false }),
      normalizedBounds,
      "latitude",
      "longitude"
    )
  );

  if (error) {
    return { data: [], error };
  }

  return {
    data: ((data || []) as FluxaLocationRow[]).map(mapFluxaRowToLocation),
    error: null
  };
}

async function listFluxaLocationMapIndex(): Promise<SourceResult<LocationMapIndexRecord[]>> {
  const { data, error } = await fetchAllRows<FluxaLocationMapIndexRow>(() =>
    supabase.from("fluxa_locations").select(LOCATION_MAP_INDEX_COLUMNS)
  );

  return {
    data: ((data || []) as FluxaLocationMapIndexRow[]).map(mapFluxaRowToLocationMapIndex),
    error
  };
}

async function listFluxaLocationMapIndexInBounds(bounds: LocationBounds): Promise<SourceResult<LocationMapIndexRecord[]>> {
  const normalizedBounds = normalizeBounds(bounds);
  const { data, error } = await executeFluxaLocationSelect<FluxaLocationMapIndexRow[]>((columns) =>
    applyBoundsFilters(
      supabase.from("fluxa_locations").select(columns).order("updated_at", { ascending: false }),
      normalizedBounds,
      "latitude",
      "longitude"
    )
  );

  return {
    data: ((data || []) as FluxaLocationMapIndexRow[]).map(mapFluxaRowToLocationMapIndex),
    error
  };
}

async function listFluxaLocationSearchDirectory(): Promise<SourceResult<LocationSearchRecord[]>> {
  const { data, error } = await fetchAllRows<FluxaLocationSearchRow>(() =>
    supabase.from("fluxa_locations").select(LOCATION_SEARCH_COLUMNS)
  );

  return {
    data: ((data || []) as FluxaLocationSearchRow[]).map(mapFluxaRowToLocationSearchRecord),
    error
  };
}

async function listPosMachineLocations(): Promise<SourceResult<LocationRecord[]>> {
  const { data, error } = await fetchAllRows<PosMachineRow>(() => supabase.from("pos_machines").select(POS_MACHINE_COLUMNS));

  if (error) {
    return { data: [], error };
  }

  const rows = (data || []) as PosMachineRow[];
  const brandIds = Array.from(new Set(rows.map((row) => row.brand_id).filter((brandId): brandId is string => Boolean(brandId))));
  const brandsById = await fetchBrandMap(brandIds);
  const userIds = Array.from(new Set(rows.map((row) => row.created_by).filter((userId): userId is string => Boolean(userId))));
  const usersById = await fetchUserMap(userIds);
  const posIds = rows.map((row) => row.id).filter(Boolean);
  const networksByPosId = new Map<string, string[]>();
  const successRateByPosId = new Map<string, number | null>();

  if (posIds.length > 0) {
    const { data: attemptRows } = await supabase
      .from("pos_attempts")
      .select("pos_id, card_network, result, attempt_result")
      .in("pos_id", posIds);
    const attemptsByPosId = new Map<string, Array<Pick<PosAttemptRow, "result" | "attempt_result">>>();

    ((attemptRows || []) as Array<{
      pos_id: string;
      card_network: string | null;
      result: string | null;
      attempt_result: string | null;
    }>).forEach((attempt) => {
      if (!attempt?.pos_id) return;

      if (attempt.card_network?.trim()) {
        const existing = networksByPosId.get(attempt.pos_id) || [];
        if (!existing.includes(attempt.card_network.trim())) {
          existing.push(attempt.card_network.trim());
        }
        networksByPosId.set(attempt.pos_id, existing);
      }

      const groupedAttempts = attemptsByPosId.get(attempt.pos_id) || [];
      groupedAttempts.push({
        result: attempt.result,
        attempt_result: attempt.attempt_result
      });
      attemptsByPosId.set(attempt.pos_id, groupedAttempts);
    });

    attemptsByPosId.forEach((groupedAttempts, posId) => {
      successRateByPosId.set(posId, calculateAttemptSuccessRate(groupedAttempts));
    });
  }

  return {
    data: rows.map((row) => mapPosMachineToLocation(row, brandsById, usersById, networksByPosId, successRateByPosId)),
    error: null
  };
}

async function listPosMachineLocationDirectory(): Promise<SourceResult<LocationRecord[]>> {
  const { data, error } = await fetchAllRows<PosMachineDirectoryRow>(() =>
    supabase.from("pos_machines").select(POS_MACHINE_DIRECTORY_COLUMNS)
  );

  if (error) {
    return { data: [], error };
  }

  const rows = (data || []) as PosMachineDirectoryRow[];
  const brandIds = Array.from(new Set(rows.map((row) => row.brand_id).filter((brandId): brandId is string => Boolean(brandId))));
  const brandsById = await fetchBrandMap(brandIds);
  const userIds = Array.from(new Set(rows.map((row) => row.created_by).filter((userId): userId is string => Boolean(userId))));
  const usersById = await fetchUserMap(userIds);

  return {
    data: rows.map((row) => mapPosMachineDirectoryRowToLocation(row, brandsById, usersById)),
    error: null
  };
}

async function listPosMachineLocationSearchDirectory(): Promise<SourceResult<LocationSearchRecord[]>> {
  const { data, error } = await fetchAllRows<PosMachineSearchRow>(() =>
    supabase.from("pos_machines").select(POS_MACHINE_SEARCH_COLUMNS)
  );

  if (error) {
    return { data: [], error };
  }

  const rows = (data || []) as PosMachineSearchRow[];
  const brandIds = Array.from(new Set(rows.map((row) => row.brand_id).filter((brandId): brandId is string => Boolean(brandId))));
  const brandsById = await fetchBrandMap(brandIds);
  const userIds = Array.from(new Set(rows.map((row) => row.created_by).filter((userId): userId is string => Boolean(userId))));
  const usersById = await fetchUserMap(userIds);

  return {
    data: rows.map((row) => mapPosMachineSearchRowToLocationSearchRecord(row, brandsById, usersById)),
    error: null
  };
}

async function listPosMachineLocationsInBounds(bounds: LocationBounds): Promise<SourceResult<LocationRecord[]>> {
  const normalizedBounds = normalizeBounds(bounds);
  const { data, error } = await applyBoundsFilters(
    supabase.from("pos_machines").select(POS_MACHINE_COLUMNS).order("updated_at", { ascending: false }),
    normalizedBounds,
    "latitude",
    "longitude"
  );

  if (error) {
    return { data: [], error };
  }

  const rows = (data || []) as PosMachineRow[];
  const brandIds = Array.from(new Set(rows.map((row) => row.brand_id).filter((brandId): brandId is string => Boolean(brandId))));
  const brandsById = await fetchBrandMap(brandIds);

  return {
    data: rows.map((row) => mapPosMachineToLocation(row, brandsById)),
    error: null
  };
}

async function listPosMachineLocationMapIndex(): Promise<SourceResult<LocationMapIndexRecord[]>> {
  const { data, error } = await fetchAllRows<PosMachineMapIndexRow>(() =>
    supabase.from("pos_machines").select(POS_MACHINE_MAP_INDEX_COLUMNS)
  );

  return {
    data: ((data || []) as PosMachineMapIndexRow[]).map(mapPosMachineToLocationMapIndex),
    error
  };
}

async function listPosMachineLocationMapIndexInBounds(bounds: LocationBounds): Promise<SourceResult<LocationMapIndexRecord[]>> {
  const normalizedBounds = normalizeBounds(bounds);
  const { data, error } = await applyBoundsFilters(
    supabase.from("pos_machines").select(POS_MACHINE_MAP_INDEX_COLUMNS).order("updated_at", { ascending: false }),
    normalizedBounds,
    "latitude",
    "longitude"
  );

  return {
    data: ((data || []) as PosMachineMapIndexRow[]).map(mapPosMachineToLocationMapIndex),
    error
  };
}

async function countRows(table: "fluxa_locations" | "pos_machines", status?: LocationStatus): Promise<number> {
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function countFluxaRowsByBrand(brandName: string, status?: LocationStatus): Promise<number> {
  const normalizedBrandName = brandName.trim();

  if (!normalizedBrandName) {
    return 0;
  }

  let query = supabase
    .from("fluxa_locations")
    .select("id", { count: "exact", head: true })
    .ilike("brand", normalizedBrandName);

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function countPosRowsByBrandIds(brandIds: string[], status?: LocationStatus): Promise<number> {
  const uniqueBrandIds = Array.from(new Set(brandIds.filter(Boolean)));

  if (uniqueBrandIds.length === 0) {
    return 0;
  }

  let query = supabase
    .from("pos_machines")
    .select("id", { count: "exact", head: true })
    .in("brand_id", uniqueBrandIds);

  if (status) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function countRowsByBrand(query: BrandLocationDirectoryQuery): Promise<LocationCounts> {
  const normalizedBrandName = query.brandName?.trim() || "";
  const posBrandIds = query.brandId?.trim()
    ? [query.brandId.trim()]
    : normalizedBrandName
      ? await resolveBrandIdsByName(normalizedBrandName)
      : [];

  const [
    fluxaTotal,
    fluxaActive,
    fluxaInactive,
    posTotal,
    posActive,
    posInactive
  ] = await Promise.all([
    countFluxaRowsByBrand(normalizedBrandName),
    countFluxaRowsByBrand(normalizedBrandName, "active"),
    countFluxaRowsByBrand(normalizedBrandName, "inactive"),
    countPosRowsByBrandIds(posBrandIds),
    countPosRowsByBrandIds(posBrandIds, "active"),
    countPosRowsByBrandIds(posBrandIds, "inactive")
  ]);

  return {
    total: fluxaTotal + posTotal,
    active: fluxaActive + posActive,
    inactive: fluxaInactive + posInactive
  };
}

function mergeLocationResults<TLocation extends { id: string; updatedAt: string }>(...results: Array<SourceResult<TLocation[]>>): TLocation[] {
  const mergedById = new Map<string, TLocation>();

  results.forEach((result) => {
    result.data.forEach((location) => {
      if (!mergedById.has(location.id)) {
        mergedById.set(location.id, location);
      }
    });
  });

  return Array.from(mergedById.values()).sort((left, right) => {
    const leftTime = new Date(left.updatedAt).getTime();
    const rightTime = new Date(right.updatedAt).getTime();
    return rightTime - leftTime;
  });
}

function mergeLocationMapIndexResults(...results: Array<SourceResult<LocationMapIndexRecord[]>>): LocationMapIndexRecord[] {
  const mergedById = new Map<string, LocationMapIndexRecord>();

  results.forEach((result) => {
    result.data.forEach((location) => {
      const existing = mergedById.get(location.id);
      if (!existing || new Date(location.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        mergedById.set(location.id, location);
      }
    });
  });

  return Array.from(mergedById.values()).sort((left, right) => {
    const leftTime = new Date(left.updatedAt).getTime();
    const rightTime = new Date(right.updatedAt).getTime();
    return rightTime - leftTime;
  });
}

async function getFluxaLocationDetail(id: string): Promise<LocationDetailRecord | null> {
  const { data, error } = await executeFluxaLocationSelect<FluxaLocationRow | null>((columns) =>
    supabase.from("fluxa_locations").select(columns).eq("id", id).maybeSingle()
  );

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const base = mapFluxaRowToLocation(data as FluxaLocationRow);
  return buildDetailRecord(base, "Fluxa Location", [], [], buildLocationMetaLine(base.brand, base.city), {
    networks: [],
    paymentMethods: []
  });
}

async function getPosMachineDetail(id: string): Promise<LocationDetailRecord | null> {
  const { data, error } = await supabase.from("pos_machines").select(POS_MACHINE_COLUMNS).eq("id", id).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as PosMachineRow;
  const brandIds = row.brand_id ? [row.brand_id] : [];
  const creatorIds = row.created_by ? [row.created_by] : [];
  const [brandsById, creatorMap] = await Promise.all([fetchBrandMap(brandIds), fetchUserMap(creatorIds)]);
  const base = mapPosMachineToLocation(row, brandsById, creatorMap);
  const basicInfo = normalizeRecord(row.basic_info);
  const merchantInfo = normalizeRecord(row.merchant_info);

  const [attemptResult, reviewResult, commentResult] = await Promise.allSettled([
    supabase.from("pos_attempts").select(POS_ATTEMPT_COLUMNS).eq("pos_id", id).order("attempted_at", { ascending: false }),
    supabase.from("reviews").select(REVIEW_COLUMNS).eq("pos_machine_id", id).order("created_at", { ascending: false }),
    supabase.from("comments").select(COMMENT_COLUMNS).eq("pos_id", id).order("created_at", { ascending: false })
  ]);

  const attemptRows =
    attemptResult.status === "fulfilled" && !attemptResult.value.error ? ((attemptResult.value.data || []) as PosAttemptRow[]) : [];
  const reviewRows =
    reviewResult.status === "fulfilled" && !reviewResult.value.error ? ((reviewResult.value.data || []) as ReviewRow[]) : [];
  const commentRows =
    commentResult.status === "fulfilled" && !commentResult.value.error ? ((commentResult.value.data || []) as CommentRow[]) : [];

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

  const attempts = attemptRows.map((attempt): LocationAttemptRecord => {
    const status = mapAttemptStatus(attempt.result || attempt.attempt_result);

    return {
      id: attempt.id,
      occurredAt: attempt.attempted_at || attempt.created_at || undefined,
      dateTime: formatDateTime(attempt.attempted_at || attempt.created_at),
      addedBy: resolveUserName(attempt.created_by || attempt.user_id, usersById),
      cardName: normalizeString(attempt.card_name, "Unknown card"),
      network: normalizeString(attempt.card_network, "Unknown"),
      method: normalizeString(attempt.payment_method, "Unknown"),
      paymentMethod: normalizeString(attempt.payment_method),
      cvm: normalizeString(attempt.cvm),
      acquiringMode: normalizeString(attempt.acquiring_mode),
      deviceStatus: attempt.device_status === "inactive" ? "inactive" : "active",
      checkoutLocation: normalizeString(attempt.checkout_location),
      status,
      notes: normalizeString(attempt.notes),
      isConclusiveFailure: Boolean(attempt.is_conclusive_failure)
    };
  });

  const supportInsights = buildSupportInsights(base, attempts, basicInfo, merchantInfo);

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
  return buildDetailRecord(base, deviceName, attempts, reviews, buildMetaLine(base.brand, base.city, `设备：${deviceName}`), supportInsights);
}

async function createPosMachineLocation(input: CreateLocationInput): Promise<LocationRecord> {
  const user = await getCurrentUserIdentity();
  const userId = user.id;
  const brandId = await resolveBrandId(input.brand);
  const insertPayload = buildPosMachineInsertPayload(input, userId, brandId);

  const { data, error } = await supabase
    .from("pos_machines")
    .insert(insertPayload)
    .select(POS_MACHINE_COLUMNS)
    .single();

  if (error) {
    throw error;
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
  const userMap = new Map([[userId, user.label]]);

  return mapPosMachineToLocation(createdRow, brandMap, userMap);
}

async function createShellLocation(input: CreateLocationInput): Promise<LocationRecord> {
  const insertPayload = buildFluxaLocationInsertPayload(input);
  const preferredColumns = fluxaLocationSchemaMode === "legacy" ? LEGACY_LOCATION_COLUMNS : LOCATION_COLUMNS;
  const preferredPayload =
    fluxaLocationSchemaMode === "legacy" ? stripFluxaLocationStaffColumns(insertPayload) : insertPayload;
  let { data, error } = await supabase
    .from("fluxa_locations")
    .insert(preferredPayload)
    .select(preferredColumns)
    .single();

  if (error && preferredColumns === LOCATION_COLUMNS && isFluxaLocationStaffColumnError(error)) {
    fluxaLocationSchemaMode = "legacy";
    ({ data, error } = await supabase
      .from("fluxa_locations")
      .insert(stripFluxaLocationStaffColumns(insertPayload))
      .select(LEGACY_LOCATION_COLUMNS)
      .single());
  }

  if (error) {
    throw error;
  }

  return mapFluxaRowToLocation(data as unknown as FluxaLocationRow);
}

async function updatePosMachineStaffProficiency(locationId: string, level: StaffProficiencyLevel | null): Promise<LocationDetailRecord> {
  const { data, error } = await supabase.from("pos_machines").select("merchant_info").eq("id", locationId).maybeSingle();

  if (error) {
    throw error;
  }

  const merchantInfo = normalizeRecord(data?.merchant_info);
  const normalizedLevel = normalizeStaffProficiencyLevel(level);
  const nextMerchantInfo = { ...merchantInfo };

  if (normalizedLevel === null) {
    delete nextMerchantInfo.staff_proficiency_level;
    delete nextMerchantInfo.staff_proficiency_updated_at;
    delete nextMerchantInfo.staffProficiencyLevel;
    delete nextMerchantInfo.staffProficiencyUpdatedAt;
  } else {
    nextMerchantInfo.staff_proficiency_level = normalizedLevel;
    nextMerchantInfo.staff_proficiency_updated_at = new Date().toISOString();
    delete nextMerchantInfo.staffProficiencyLevel;
    delete nextMerchantInfo.staffProficiencyUpdatedAt;
  }

  const { error: updateError } = await supabase.from("pos_machines").update({ merchant_info: nextMerchantInfo }).eq("id", locationId);

  if (updateError) {
    throw updateError;
  }

  const refreshedDetail = await getPosMachineDetail(locationId);

  if (!refreshedDetail) {
    throw new Error("更新后未能重新加载地点详情。");
  }

  return refreshedDetail;
}

async function updateFluxaLocationStaffProficiency(locationId: string, level: StaffProficiencyLevel | null): Promise<LocationDetailRecord> {
  const { data, error } = await executeFluxaLocationSelect<FluxaLocationRow | null>((columns) =>
    supabase.from("fluxa_locations").select(columns).eq("id", locationId).maybeSingle()
  );

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("未找到需要更新的地点。");
  }

  const row = data as FluxaLocationRow;
  const metadata = parseFluxaLocationMeta(row.notes);
  const normalizedLevel = normalizeStaffProficiencyLevel(level);
  const nextUpdatedAt = normalizedLevel !== null ? new Date().toISOString() : undefined;
  const nextNotes = serializeFluxaLocationMeta(
    metadata.notes,
    metadata.contactInfo,
    metadata.businessHours,
    normalizedLevel,
    nextUpdatedAt
  );

  const fullUpdatePayload = {
    notes: nextNotes,
    staff_proficiency_level: normalizedLevel,
    staff_proficiency_updated_at: nextUpdatedAt || null
  };
  const preferredPayload =
    fluxaLocationSchemaMode === "legacy" ? stripFluxaLocationStaffColumns(fullUpdatePayload) : fullUpdatePayload;
  let { error: updateError } = await supabase
    .from("fluxa_locations")
    .update(preferredPayload)
    .eq("id", locationId);

  if (updateError && fluxaLocationSchemaMode !== "legacy" && isFluxaLocationStaffColumnError(updateError)) {
    fluxaLocationSchemaMode = "legacy";
    ({ error: updateError } = await supabase
      .from("fluxa_locations")
      .update(stripFluxaLocationStaffColumns(fullUpdatePayload))
      .eq("id", locationId));
  }

  if (updateError) {
    throw updateError;
  }

  const refreshedDetail = await getFluxaLocationDetail(locationId);

  if (!refreshedDetail) {
    throw new Error("更新后未能重新加载地点详情。");
  }

  return refreshedDetail;
}

function isUniqueViolationError(error: unknown): boolean {
  const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code: string }).code) : "";
  return code === "23505";
}

async function materializeFluxaLocation(location: LocationRecord): Promise<LocationRecord> {
  const user = await getCurrentUserIdentity();
  const brandId = await resolveBrandId(location.brand);
  const insertPayload = buildPosMachineInsertPayload(
    {
      ...buildLocationInputFromRecord(location),
      transactionStatus: "Unknown"
    },
    user.id,
    brandId,
    {
      id: location.id,
      sourceFlow: "shell_materialization"
    }
  );

  const { data, error } = await supabase.from("pos_machines").insert(insertPayload).select(POS_MACHINE_COLUMNS).single();

  if (error) {
    if (!isUniqueViolationError(error)) {
      throw error;
    }

    const existingDetail = await getPosMachineDetail(location.id);
    if (!existingDetail) {
      throw error;
    }

    return existingDetail;
  }

  const brandMap = brandId && location.brand.trim() ? new Map([[brandId, location.brand.trim()]]) : new Map<string, string>();
  const userMap = new Map([[user.id, user.label]]);
  return mapPosMachineToLocation(data as PosMachineRow, brandMap, userMap);
}

function buildFallbackDetail(location: LocationRecord): LocationDetailRecord {
  const source: LocationSource = location.source || "fluxa_locations";
  return {
    ...buildDetailRecord(location, location.name, [], [], buildLocationMetaLine(location.brand, location.city), {
      networks: [],
      paymentMethods: []
    }),
    source
  };
}

export const locationService = {
  async listLocations(): Promise<LocationRecord[]> {
    const [fluxaResult, posResult] = await Promise.all([listFluxaLocations(), listPosMachineLocations()]);
    const mergedLocations = mergeLocationResults(posResult, fluxaResult);

    if (mergedLocations.length > 0) {
      return mergedLocations;
    }

    if (fluxaResult.error && posResult.error) {
      throw posResult.error;
    }

    return [];
  },

  async listLocationDirectory(): Promise<LocationRecord[]> {
    const [fluxaResult, posResult] = await Promise.all([listFluxaLocationDirectory(), listPosMachineLocationDirectory()]);
    const mergedLocations = mergeLocationResults(posResult, fluxaResult);

    if (mergedLocations.length > 0) {
      return mergedLocations;
    }

    if (fluxaResult.error && posResult.error) {
      throw posResult.error;
    }

    return [];
  },

  async listLocationSearchDirectory(): Promise<LocationSearchRecord[]> {
    const [fluxaResult, posResult] = await Promise.all([listFluxaLocationSearchDirectory(), listPosMachineLocationSearchDirectory()]);
    const mergedLocations = mergeLocationResults(posResult, fluxaResult);

    if (mergedLocations.length > 0) {
      return mergedLocations;
    }

    if (fluxaResult.error && posResult.error) {
      throw posResult.error;
    }

    return [];
  },

  async listLocationDirectoryByBrand({ brandId = null, brandName = null }: BrandLocationDirectoryQuery): Promise<LocationRecord[]> {
    const normalizedBrandName = brandName?.trim() || "";
    const posBrandIds = brandId?.trim()
      ? [brandId.trim()]
      : normalizedBrandName
        ? await resolveBrandIdsByName(normalizedBrandName)
        : [];

    const [fluxaResponse, posResponse] = await Promise.all([
      normalizedBrandName
        ? executeFluxaLocationSelect<FluxaLocationRow[]>((columns) =>
          supabase.from("fluxa_locations").select(columns).ilike("brand", normalizedBrandName)
        )
        : Promise.resolve({ data: [], error: null }),
      posBrandIds.length > 0
        ? supabase.from("pos_machines").select(POS_MACHINE_DIRECTORY_COLUMNS).in("brand_id", posBrandIds)
        : Promise.resolve({ data: [], error: null })
    ]);

    const fluxaRows = (fluxaResponse.data || []) as FluxaLocationRow[];
    const posRows = (posResponse.data || []) as PosMachineDirectoryRow[];
    const brandIds = Array.from(new Set(posRows.map((row) => row.brand_id).filter((rowBrandId): rowBrandId is string => Boolean(rowBrandId))));
    const brandsById = await fetchBrandMap(brandIds);
    const userIds = Array.from(new Set(posRows.map((row) => row.created_by).filter((userId): userId is string => Boolean(userId))));
    const usersById = await fetchUserMap(userIds);

    const mergedLocations = mergeLocationResults(
      {
        data: posRows.map((row) => mapPosMachineDirectoryRowToLocation(row, brandsById, usersById)),
        error: posResponse.error
      },
      {
        data: fluxaRows.map(mapFluxaRowToLocation),
        error: fluxaResponse.error
      }
    );

    if (mergedLocations.length > 0) {
      return mergedLocations;
    }

    if (fluxaResponse.error && posResponse.error) {
      throw posResponse.error;
    }

    return [];
  },

  async listLocationsByIds(ids: string[]): Promise<LocationRecord[]> {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

    if (uniqueIds.length === 0) {
      return [];
    }

    const [fluxaResponse, posResponse] = await Promise.all([
      executeFluxaLocationSelect<FluxaLocationRow[]>((columns) =>
        supabase.from("fluxa_locations").select(columns).in("id", uniqueIds)
      ),
      supabase.from("pos_machines").select(POS_MACHINE_COLUMNS).in("id", uniqueIds)
    ]);

    const fluxaRows = (fluxaResponse.data || []) as FluxaLocationRow[];
    const posRows = (posResponse.data || []) as PosMachineRow[];

    const brandIds = Array.from(new Set(posRows.map((row) => row.brand_id).filter((brandId): brandId is string => Boolean(brandId))));
    const brandsById = await fetchBrandMap(brandIds);
    const userIds = Array.from(new Set(posRows.map((row) => row.created_by).filter((userId): userId is string => Boolean(userId))));
    const usersById = await fetchUserMap(userIds);
    const posIds = posRows.map((row) => row.id).filter(Boolean);
    const networksByPosId = new Map<string, string[]>();
    const successRateByPosId = new Map<string, number | null>();

    if (posIds.length > 0) {
      const { data: attemptRows } = await supabase
        .from("pos_attempts")
        .select("pos_id, card_network, result, attempt_result")
        .in("pos_id", posIds);

      const attemptsByPosId = new Map<string, Array<Pick<PosAttemptRow, "result" | "attempt_result">>>();

      ((attemptRows || []) as Array<{
        pos_id: string;
        card_network: string | null;
        result: string | null;
        attempt_result: string | null;
      }>).forEach((attempt) => {
        if (!attempt?.pos_id) return;

        if (attempt.card_network?.trim()) {
          const existing = networksByPosId.get(attempt.pos_id) || [];
          if (!existing.includes(attempt.card_network.trim())) {
            existing.push(attempt.card_network.trim());
          }
          networksByPosId.set(attempt.pos_id, existing);
        }

        const groupedAttempts = attemptsByPosId.get(attempt.pos_id) || [];
        groupedAttempts.push({
          result: attempt.result,
          attempt_result: attempt.attempt_result
        });
        attemptsByPosId.set(attempt.pos_id, groupedAttempts);
      });

      attemptsByPosId.forEach((groupedAttempts, posId) => {
        successRateByPosId.set(posId, calculateAttemptSuccessRate(groupedAttempts));
      });
    }

    const mergedLocations = mergeLocationResults(
      {
        data: posRows.map((row) => mapPosMachineToLocation(row, brandsById, usersById, networksByPosId, successRateByPosId)),
        error: posResponse.error
      },
      {
        data: fluxaRows.map(mapFluxaRowToLocation),
        error: fluxaResponse.error
      }
    );

    if (mergedLocations.length > 0) {
      return mergedLocations;
    }

    if (fluxaResponse.error && posResponse.error) {
      throw posResponse.error;
    }

    return [];
  },

  async listLocationsInBounds(bounds: LocationBounds): Promise<LocationRecord[]> {
    const normalizedBounds = normalizeBounds(bounds);
    const [fluxaResult, posResult] = await Promise.all([
      listFluxaLocationsInBounds(normalizedBounds),
      listPosMachineLocationsInBounds(normalizedBounds)
    ]);
    const mergedLocations = mergeLocationResults(posResult, fluxaResult);

    if (mergedLocations.length > 0) {
      return mergedLocations;
    }

    if (fluxaResult.error && posResult.error) {
      throw posResult.error;
    }

    return [];
  },

  async listLocationMapIndex(): Promise<LocationMapIndexRecord[]> {
    const [fluxaResult, posResult] = await Promise.all([listFluxaLocationMapIndex(), listPosMachineLocationMapIndex()]);
    const mergedLocations = mergeLocationMapIndexResults(posResult, fluxaResult);

    if (mergedLocations.length > 0) {
      return mergedLocations;
    }

    if (fluxaResult.error && posResult.error) {
      throw posResult.error;
    }

    return [];
  },

  async listLocationMapIndexInBounds(bounds: LocationBounds): Promise<LocationMapIndexRecord[]> {
    const normalizedBounds = normalizeBounds(bounds);
    const [fluxaResult, posResult] = await Promise.all([
      listFluxaLocationMapIndexInBounds(normalizedBounds),
      listPosMachineLocationMapIndexInBounds(normalizedBounds)
    ]);
    const mergedLocations = mergeLocationMapIndexResults(posResult, fluxaResult);

    if (mergedLocations.length > 0) {
      return mergedLocations;
    }

    if (fluxaResult.error && posResult.error) {
      throw posResult.error;
    }

    return [];
  },

  async getLocationCounts(): Promise<LocationCounts> {
    const [
      fluxaTotal,
      fluxaActive,
      fluxaInactive,
      posTotal,
      posActive,
      posInactive
    ] = await Promise.all([
      countRows("fluxa_locations"),
      countRows("fluxa_locations", "active"),
      countRows("fluxa_locations", "inactive"),
      countRows("pos_machines"),
      countRows("pos_machines", "active"),
      countRows("pos_machines", "inactive")
    ]);

    return {
      total: fluxaTotal + posTotal,
      active: fluxaActive + posActive,
      inactive: fluxaInactive + posInactive
    };
  },

  async getLocationCountsByBrand(query: BrandLocationDirectoryQuery): Promise<LocationCounts> {
    return countRowsByBrand(query);
  },

  async getLocationDetail(location: LocationRecord): Promise<LocationDetailRecord> {
    const loaders = [() => getPosMachineDetail(location.id), () => getFluxaLocationDetail(location.id)];

    let lastError: unknown = null;
    for (const load of loaders) {
      try {
        const detail = await load();
        if (detail) {
          return detail;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError) {
      throw lastError;
    }

    return buildFallbackDetail(location);
  },

  async createLocation(input: CreateLocationInput): Promise<LocationRecord> {
    return createPosMachineLocation(input);
  },

  async createShellLocation(input: CreateLocationInput): Promise<LocationRecord> {
    return createShellLocation(input);
  },

  async updateLocationStaffProficiency(location: LocationRecord, level: StaffProficiencyLevel | null): Promise<LocationDetailRecord> {
    if ((location.source || "fluxa_locations") === "pos_machines") {
      return updatePosMachineStaffProficiency(location.id, level);
    }

    return updateFluxaLocationStaffProficiency(location.id, level);
  },

  async createLocationAttempt(location: LocationRecord, input: CreateLocationAttemptInput): Promise<LocationAttemptRecord> {
    const targetLocation =
      (location.source || "fluxa_locations") === "pos_machines" ? location : await materializeFluxaLocation(location);

    return createPosMachineAttempt(targetLocation, input);
  },

  async deleteLocation(locationId: string): Promise<void> {
    const normalizedLocationId = locationId.trim();

    if (!normalizedLocationId) {
      return;
    }

    await requireAdminUser();
    await Promise.all([
      deleteRowsByLocationId("pos_attempts", "pos_id", normalizedLocationId),
      deleteRowsByLocationId("reviews", "pos_machine_id", normalizedLocationId),
      deleteRowsByLocationId("comments", "pos_id", normalizedLocationId),
      deleteRowsByLocationId("user_history", "pos_machine_id", normalizedLocationId)
    ]);

    const [posDeleteResult, fluxaDeleteResult] = await Promise.all([
      supabase.from("pos_machines").delete().eq("id", normalizedLocationId),
      supabase.from("fluxa_locations").delete().eq("id", normalizedLocationId)
    ]);

    if (posDeleteResult.error && fluxaDeleteResult.error) {
      throw posDeleteResult.error;
    }
  }
};
