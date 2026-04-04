import { supabase } from "@/lib/supabase";
import {
  TRIAL_USER_ID,
  TRIAL_VIEWER_NAME,
  type ViewerSessionUser,
  getViewerSessionUser,
  isTrialViewerUser,
  readTrialBrowsingHistory,
  readTrialContributions,
  readTrialProfileDraft,
  writeTrialProfileDraft
} from "@/lib/trial-session";

export interface ViewerProfileStat {
  label: string;
  value: string;
}

export interface ViewerProfileQuickAccessItem {
  id: string;
  label: string;
  count: number;
}

export interface ViewerProfileActivityItem {
  id: string;
  title: string;
  meta: string;
  time: string;
}

export interface ViewerProfileRecord {
  name: string;
  email: string;
  location: string;
  joined: string;
  bio: string;
  stats: ViewerProfileStat[];
  quickAccessItems: ViewerProfileQuickAccessItem[];
  recentActivity: ViewerProfileActivityItem[];
}

export interface UpdateViewerProfileInput {
  name: string;
  location: string;
  bio: string;
}

interface UserHistoryRow {
  id: string;
  visited_at: string | null;
  pos_machines: {
    id: string;
    merchant_name: string | null;
    address: string | null;
  } | {
    id: string;
    merchant_name: string | null;
    address: string | null;
  }[] | null;
}

interface ContributionPreviewRow {
  id: string;
  merchant_name: string | null;
  address: string | null;
  status: string | null;
  created_at: string | null;
}

interface ProfileActivitySeed extends ViewerProfileActivityItem {
  sortValue: number;
}

const IGNORABLE_ERROR_CODES = new Set(["PGRST116", "PGRST205", "42P01", "42703", "406"]);

function isIgnorableError(error: unknown): boolean {
  const code = typeof (error as { code?: unknown })?.code === "string" ? String((error as { code: string }).code) : "";
  return IGNORABLE_ERROR_CODES.has(code);
}

function normalizeMetadata(user: ViewerSessionUser): Record<string, unknown> {
  if (user.user_metadata && typeof user.user_metadata === "object" && !Array.isArray(user.user_metadata)) {
    return user.user_metadata as Record<string, unknown>;
  }

  return {};
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readUserRecordValue(record: Record<string, unknown> | null, key: string): string {
  return record ? readString(record[key]) : "";
}

function deriveProfileName(user: ViewerSessionUser, userRecord: Record<string, unknown> | null, fallbackName: string): string {
  const metadata = normalizeMetadata(user);
  const metadataName =
    readString(metadata.display_name) ||
    readString(metadata.full_name) ||
    readString(metadata.name) ||
    readString(metadata.user_name) ||
    readString(metadata.preferred_username);

  return metadataName || readUserRecordValue(userRecord, "username") || fallbackName || user.email?.split("@")[0] || "Unknown User";
}

function deriveProfileLocation(user: ViewerSessionUser): string {
  const metadata = normalizeMetadata(user);
  return readString(metadata.location) || readString(metadata.locale) || "Not set";
}

function deriveProfileBio(user: ViewerSessionUser): string {
  const metadata = normalizeMetadata(user);
  return readString(metadata.bio) || "No bio yet.";
}

function formatJoinedDate(value: string | null | undefined): string {
  if (!value) {
    return "Unknown";
  }

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
  if (!value) {
    return "Recently";
  }

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

function normalizeRelatedRow<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function requireCurrentUser(): Promise<ViewerSessionUser> {
  const user = await getViewerSessionUser();

  if (!user) {
    throw new Error("You need to sign in before viewing your profile.");
  }

  return user;
}

async function fetchCurrentUserRecord(userId: string): Promise<Record<string, unknown> | null> {
  if (userId === TRIAL_USER_ID) {
    return null;
  }

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

  return data as Record<string, unknown>;
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

async function fetchHistoryPreview(userId: string): Promise<ProfileActivitySeed[]> {
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
      title: `Visited ${readString(posMachine?.merchant_name) || "saved place"}`,
      meta: readString(posMachine?.address) || "No address recorded.",
      time: formatActivityTime(item.visited_at),
      sortValue
    };
  });
}

async function fetchContributionPreview(userId: string): Promise<ProfileActivitySeed[]> {
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
    title: `Added ${readString(item.merchant_name) || "new location"}`,
    meta: readString(item.address) || readString(item.status) || "No address recorded.",
    time: formatActivityTime(item.created_at),
    sortValue: item.created_at ? new Date(item.created_at).getTime() : 0
  }));
}

function buildTrialViewerProfileRecord(fallbackEmail: string): ViewerProfileRecord {
  const profile = readTrialProfileDraft();
  const historyEntries = readTrialBrowsingHistory();
  const contributions = readTrialContributions();
  const recentActivity = [
    ...historyEntries.map((item) => ({
      id: item.id,
      title: `Visited ${item.title}`,
      meta: item.address || "No address recorded.",
      time: formatActivityTime(item.visitedAt),
      sortValue: new Date(item.visitedAt).getTime()
    })),
    ...contributions.map((item) => ({
      id: item.id,
      title: item.title,
      meta: item.meta,
      time: formatActivityTime(item.createdAt),
      sortValue: new Date(item.createdAt).getTime()
    }))
  ]
    .sort((left, right) => right.sortValue - left.sortValue)
    .map(({ sortValue: _sortValue, ...item }) => item)
    .slice(0, 4);

  return {
    name: TRIAL_VIEWER_NAME,
    email: profile.email || fallbackEmail || "Unknown",
    location: profile.location,
    joined: formatJoinedDate(profile.joined),
    bio: profile.bio,
    stats: [
      { label: "Added Locations", value: String(contributions.length) },
      { label: "Reviews", value: "0" },
      { label: "Favorites", value: "0" }
    ],
    quickAccessItems: [
      { id: "favorites", label: "Favorites", count: 0 },
      { id: "history", label: "History", count: historyEntries.length },
      { id: "contributions", label: "Contributions", count: contributions.length }
    ],
    recentActivity:
      recentActivity.length > 0
        ? recentActivity
        : [{ id: "empty-activity", title: "No recent profile activity yet.", meta: "Your trial activity will appear here once data is available.", time: "Just now" }]
  };
}

async function buildViewerProfileRecord(user: ViewerSessionUser, fallbackName: string, fallbackEmail: string): Promise<ViewerProfileRecord> {
  if (isTrialViewerUser(user)) {
    return buildTrialViewerProfileRecord(fallbackEmail);
  }

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
    name: deriveProfileName(user, userRecord, fallbackName),
    email: user.email || readUserRecordValue(userRecord, "email") || fallbackEmail || "Unknown",
    location: deriveProfileLocation(user),
    joined: formatJoinedDate(user.created_at || readUserRecordValue(userRecord, "created_at")),
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
    recentActivity: recentActivity.length > 0 ? recentActivity : [{ id: "empty-activity", title: "No recent profile activity yet.", meta: "Your account activity will appear here once data is available.", time: "Just now" }]
  };
}

export const viewerProfileService = {
  async getProfile(fallbackName = "", fallbackEmail = ""): Promise<ViewerProfileRecord> {
    const user = await requireCurrentUser();
    return buildViewerProfileRecord(user, fallbackName, fallbackEmail);
  },

  async updateProfile(input: UpdateViewerProfileInput, fallbackName = "", fallbackEmail = ""): Promise<ViewerProfileRecord> {
    const user = await requireCurrentUser();

    if (isTrialViewerUser(user)) {
      writeTrialProfileDraft({
        email: fallbackEmail,
        location: input.location,
        bio: input.bio
      });

      return buildTrialViewerProfileRecord(fallbackEmail);
    }

    const metadata = normalizeMetadata(user);
    const trimmedName = input.name.trim() || deriveProfileName(user, null, fallbackName);
    const trimmedLocation = input.location.trim();
    const trimmedBio = input.bio.trim();

    const { error } = await supabase.auth.updateUser({
      data: {
        ...metadata,
        display_name: trimmedName,
        location: trimmedLocation,
        bio: trimmedBio
      }
    });

    if (error) {
      throw error;
    }

    const refreshedUser = await requireCurrentUser();
    return buildViewerProfileRecord(refreshedUser, fallbackName, fallbackEmail);
  }
};
