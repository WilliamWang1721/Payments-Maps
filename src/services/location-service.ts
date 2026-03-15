import { supabase } from "@/lib/supabase";
import type {
  CreateLocationAttemptInput,
  CreateLocationInput,
  LocationAttemptRecord,
  LocationDetailRecord,
  LocationRecord,
  LocationReviewRecord,
  LocationSource,
  LocationStatus
} from "@/types/location";

interface FluxaLocationRow {
  id: string;
  merchant_name: string;
  address: string;
  brand: string | null;
  bin: string | null;
  city: string | null;
  status: LocationStatus;
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
  basic_info: Record<string, unknown> | null;
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

function normalizeString(value: string | null | undefined, fallback = ""): string {
  return value?.trim() || fallback;
}

function normalizeOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
    source: base.source || "fluxa_locations",
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
      source_flow: "add_location_wizard",
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
    status,
    notes: normalizeString(attempt.notes)
  };
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

  const { data } = await supabase.from("users").select("id, username, email").in("id", userIds);
  const userMap = new Map<string, string>();
  ((data || []) as UserRow[]).forEach((user) => {
    userMap.set(user.id, user.username || user.email);
  });
  return userMap;
}

async function listFluxaLocations(): Promise<SourceResult<LocationRecord[]>> {
  const { data, error } = await supabase.from("fluxa_locations").select(LOCATION_COLUMNS).order("updated_at", { ascending: false });

  if (error) {
    return { data: [], error };
  }

  return {
    data: ((data || []) as FluxaLocationRow[]).map(mapFluxaRowToLocation),
    error: null
  };
}

async function listPosMachineLocations(): Promise<SourceResult<LocationRecord[]>> {
  const { data, error } = await supabase.from("pos_machines").select(POS_MACHINE_COLUMNS).order("updated_at", { ascending: false });

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

  if (posIds.length > 0) {
    const { data: attemptRows } = await supabase.from("pos_attempts").select("pos_id, card_network").in("pos_id", posIds);
    ((attemptRows || []) as Array<{ pos_id: string; card_network: string | null }>).forEach((attempt) => {
      if (!attempt?.pos_id || !attempt.card_network?.trim()) return;
      const existing = networksByPosId.get(attempt.pos_id) || [];
      if (!existing.includes(attempt.card_network.trim())) {
        existing.push(attempt.card_network.trim());
      }
      networksByPosId.set(attempt.pos_id, existing);
    });
  }

  return {
    data: rows.map((row) => mapPosMachineToLocation(row, brandsById, usersById, networksByPosId)),
    error: null
  };
}

async function getFluxaLocationDetail(id: string): Promise<LocationDetailRecord | null> {
  const { data, error } = await supabase.from("fluxa_locations").select(LOCATION_COLUMNS).eq("id", id).maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const base = mapFluxaRowToLocation(data as FluxaLocationRow);
  return buildDetailRecord(base, "Fluxa Location", [], [], buildMetaLine(base.brand, base.city, `BIN：${base.bin}`));
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
      status,
      notes: normalizeString(attempt.notes)
    };
  });

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

function buildFallbackDetail(location: LocationRecord): LocationDetailRecord {
  const source: LocationSource = location.source || "fluxa_locations";
  return {
    ...buildDetailRecord(location, location.name, [], [], buildMetaLine(location.brand, location.city, `BIN：${location.bin}`)),
    source
  };
}

export const locationService = {
  async listLocations(): Promise<LocationRecord[]> {
    const [fluxaResult, posResult] = await Promise.all([listFluxaLocations(), listPosMachineLocations()]);
    const mergedById = new Map<string, LocationRecord>();

    [...posResult.data, ...fluxaResult.data].forEach((location) => {
      if (!mergedById.has(location.id)) {
        mergedById.set(location.id, location);
      }
    });

    const mergedLocations = Array.from(mergedById.values()).sort((left, right) => {
      const leftTime = new Date(left.updatedAt).getTime();
      const rightTime = new Date(right.updatedAt).getTime();
      return rightTime - leftTime;
    });

    if (mergedLocations.length > 0) {
      return mergedLocations;
    }

    if (fluxaResult.error && posResult.error) {
      throw posResult.error;
    }

    return [];
  },

  async getLocationDetail(location: LocationRecord): Promise<LocationDetailRecord> {
    const loaders =
      location.source === "pos_machines"
        ? [() => getPosMachineDetail(location.id), () => getFluxaLocationDetail(location.id)]
        : [() => getFluxaLocationDetail(location.id), () => getPosMachineDetail(location.id)];

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

  async createLocationAttempt(location: LocationRecord, input: CreateLocationAttemptInput): Promise<LocationAttemptRecord> {
    if ((location.source || "fluxa_locations") !== "pos_machines") {
      throw new Error("Only POS-backed locations can accept new attempt records.");
    }

    return createPosMachineAttempt(location, input);
  }
};
