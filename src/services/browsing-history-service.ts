import { supabase } from "@/lib/supabase";

interface UserHistoryRow {
  id: string;
  visited_at: string | null;
  pos_machine_id: string | null;
  pos_machines:
    | {
        id: string;
        merchant_name: string | null;
        address: string | null;
        merchant_info: Record<string, unknown> | null;
      }
    | Array<{
        id: string;
        merchant_name: string | null;
        address: string | null;
        merchant_info: Record<string, unknown> | null;
      }>
    | null;
}

export interface BrowsingHistoryRecord {
  id: string;
  locationId: string;
  title: string;
  address: string;
  city: string;
  brand: string;
  visitedAt: string;
}

const IGNORABLE_ERROR_CODES = new Set(["PGRST116", "PGRST205", "42P01", "42703", "406"]);
const MISSING_RPC_ERROR_CODES = new Set(["PGRST202", "42883"]);

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeRelatedRow<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function isIgnorableError(error: unknown): boolean {
  const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code: string }).code) : "";
  return IGNORABLE_ERROR_CODES.has(code);
}

function isMissingRpcError(error: unknown): boolean {
  const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code: string }).code) : "";
  return MISSING_RPC_ERROR_CODES.has(code);
}

async function requireCurrentUserId(): Promise<string> {
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user?.id) {
    throw new Error("You need to sign in before browsing history is available.");
  }

  return user.id;
}

function mapHistoryRow(row: UserHistoryRow): BrowsingHistoryRecord | null {
  const posMachine = normalizeRelatedRow(row.pos_machines);
  const locationId = readString(posMachine?.id) || readString(row.pos_machine_id);

  if (!locationId) {
    return null;
  }

  const merchantInfo = normalizeRecord(posMachine?.merchant_info);
  const title = readString(posMachine?.merchant_name) || "Untitled location";
  const address = readString(posMachine?.address) || "No address recorded.";
  const city = readString(merchantInfo.city) || "";
  const brand = readString(merchantInfo.brand_name) || readString(merchantInfo.brand) || "";

  return {
    id: row.id,
    locationId,
    title,
    address,
    city,
    brand,
    visitedAt: row.visited_at || new Date().toISOString()
  };
}

async function fallbackRecordVisit(userId: string, posMachineId: string): Promise<void> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("user_history")
    .select("id")
    .eq("user_id", userId)
    .eq("pos_machine_id", posMachineId)
    .order("visited_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && !isIgnorableError(error)) {
    throw error;
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
    pos_machine_id: posMachineId,
    visited_at: now
  });

  if (insertError) {
    throw insertError;
  }
}

export const browsingHistoryService = {
  async list(limit = 100): Promise<BrowsingHistoryRecord[]> {
    const userId = await requireCurrentUserId();
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

    return ((data as UserHistoryRow[] | null) || []).map(mapHistoryRow).filter((item): item is BrowsingHistoryRecord => Boolean(item));
  },

  async clear(): Promise<void> {
    const userId = await requireCurrentUserId();
    const { error } = await supabase.from("user_history").delete().eq("user_id", userId);

    if (error) {
      throw error;
    }
  },

  async recordVisit(posMachineId: string): Promise<void> {
    const normalizedPosMachineId = posMachineId.trim();
    if (!normalizedPosMachineId) {
      return;
    }

    const userId = await requireCurrentUserId();
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

    await fallbackRecordVisit(userId, normalizedPosMachineId);
  }
};
