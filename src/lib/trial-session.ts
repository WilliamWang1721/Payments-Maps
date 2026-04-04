import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import type { CardAlbumCard } from "@/types/card-album";

const TRIAL_SESSION_STORAGE_KEY = "fluxa_trial_session";
const TRIAL_PROFILE_STORAGE_KEY = "fluxa_trial_profile";
const TRIAL_HISTORY_STORAGE_KEY = "fluxa_trial_history";
const TRIAL_CARDS_STORAGE_KEY = "fluxa_trial_cards";
const TRIAL_CONTRIBUTIONS_STORAGE_KEY = "fluxa_trial_contributions";
const TRIAL_LOCATION_REVIEWS_STORAGE_KEY = "fluxa_trial_location_reviews";
const TRIAL_SESSION_CHANGE_EVENT = "fluxa-trial-session-change";

export const TRIAL_MODE_UNLOCK_TEXT = "FluxaMap";
export const TRIAL_VIEWER_NAME = "Unknown";
export const TRIAL_VIEWER_EMAIL = "trial@fluxamap.local";
export const TRIAL_USER_ID = "00000000-0000-4000-8000-000000000042";

interface TrialSessionRecord {
  active: true;
  activatedAt: string;
}

export interface ViewerSessionUser {
  id: string;
  email: string | null;
  created_at: string;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
}

export interface TrialProfileDraft {
  name: string;
  email: string;
  location: string;
  joined: string;
  bio: string;
}

export interface TrialBrowsingHistoryEntry {
  id: string;
  locationId: string;
  title: string;
  address: string;
  city: string;
  brand: string;
  visitedAt: string;
}

export interface TrialContributionEntry {
  id: string;
  title: string;
  meta: string;
  createdAt: string;
}

export interface TrialLocationReviewEntry {
  id: string;
  locationId: string;
  kind: "review" | "comment";
  content: string;
  rating: number | null;
  createdAt: string;
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseSessionStorage()) {
    return fallback;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.setItem(key, JSON.stringify(value));
}

function removeKey(key: string): void {
  if (!canUseSessionStorage()) {
    return;
  }

  window.sessionStorage.removeItem(key);
}

function emitTrialSessionChange(): void {
  if (!canUseSessionStorage()) {
    return;
  }

  window.dispatchEvent(new Event(TRIAL_SESSION_CHANGE_EVENT));
}

function getTrialSessionRecord(): TrialSessionRecord | null {
  const record = readJson<TrialSessionRecord | null>(TRIAL_SESSION_STORAGE_KEY, null);
  return record?.active ? record : null;
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function toViewerSessionUser(user: User): ViewerSessionUser {
  return {
    id: user.id,
    email: user.email ?? null,
    created_at: user.created_at,
    user_metadata: normalizeRecord(user.user_metadata),
    app_metadata: normalizeRecord(user.app_metadata)
  };
}

function isAuthSessionMissingError(error: unknown): boolean {
  const name = typeof (error as { name?: unknown })?.name === "string" ? String((error as { name: string }).name) : "";
  const message = typeof (error as { message?: unknown })?.message === "string" ? String((error as { message: string }).message) : "";

  return name === "AuthSessionMissingError" || message.includes("Auth session missing");
}

function buildDefaultTrialProfile(activatedAt: string): TrialProfileDraft {
  return {
    name: TRIAL_VIEWER_NAME,
    email: TRIAL_VIEWER_EMAIL,
    location: "Trial Mode",
    joined: activatedAt,
    bio: "Trial access is active for this browser session."
  };
}

function generateRecordId(prefix: string): string {
  const suffix =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `${prefix}-${suffix}`;
}

export function addTrialSessionChangeListener(listener: () => void): () => void {
  if (!canUseSessionStorage()) {
    return () => undefined;
  }

  const handleChange = (): void => {
    listener();
  };

  window.addEventListener(TRIAL_SESSION_CHANGE_EVENT, handleChange);
  return () => {
    window.removeEventListener(TRIAL_SESSION_CHANGE_EVENT, handleChange);
  };
}

export function isTrialSessionActive(): boolean {
  return Boolean(getTrialSessionRecord());
}

export function activateTrialSession(): void {
  const activatedAt = new Date().toISOString();
  writeJson(TRIAL_SESSION_STORAGE_KEY, { active: true, activatedAt } satisfies TrialSessionRecord);
  writeJson(TRIAL_PROFILE_STORAGE_KEY, buildDefaultTrialProfile(activatedAt));
  emitTrialSessionChange();
}

export function clearTrialSession(): void {
  removeKey(TRIAL_SESSION_STORAGE_KEY);
  removeKey(TRIAL_PROFILE_STORAGE_KEY);
  removeKey(TRIAL_HISTORY_STORAGE_KEY);
  removeKey(TRIAL_CARDS_STORAGE_KEY);
  removeKey(TRIAL_CONTRIBUTIONS_STORAGE_KEY);
  removeKey(TRIAL_LOCATION_REVIEWS_STORAGE_KEY);
  emitTrialSessionChange();
}

export function getTrialSessionUser(): ViewerSessionUser | null {
  const record = getTrialSessionRecord();

  if (!record) {
    return null;
  }

  return {
    id: TRIAL_USER_ID,
    email: readTrialProfileDraft().email,
    created_at: record.activatedAt,
    user_metadata: {
      display_name: TRIAL_VIEWER_NAME,
      name: TRIAL_VIEWER_NAME,
      preferred_username: TRIAL_VIEWER_NAME,
      location: readTrialProfileDraft().location,
      bio: readTrialProfileDraft().bio,
      trial_mode: true
    },
    app_metadata: {
      trial_mode: true
    }
  };
}

export async function getViewerSessionUser(): Promise<ViewerSessionUser | null> {
  const trialUser = getTrialSessionUser();
  const {
    data: { user },
    error
  } = await supabase.auth.getUser();

  if (error) {
    if (trialUser && isAuthSessionMissingError(error)) {
      return trialUser;
    }
    throw error;
  }

  if (user) {
    return toViewerSessionUser(user);
  }

  return trialUser;
}

export function isTrialViewerUser(user: ViewerSessionUser | null | undefined): boolean {
  return user?.id === TRIAL_USER_ID;
}

export function readTrialProfileDraft(): TrialProfileDraft {
  const activatedAt = getTrialSessionRecord()?.activatedAt || new Date().toISOString();
  const stored = readJson<Partial<TrialProfileDraft>>(TRIAL_PROFILE_STORAGE_KEY, {});

  return {
    name: TRIAL_VIEWER_NAME,
    email: typeof stored.email === "string" && stored.email.trim() ? stored.email.trim() : TRIAL_VIEWER_EMAIL,
    location: typeof stored.location === "string" && stored.location.trim() ? stored.location.trim() : "Trial Mode",
    joined: typeof stored.joined === "string" && stored.joined.trim() ? stored.joined : activatedAt,
    bio:
      typeof stored.bio === "string" && stored.bio.trim()
        ? stored.bio.trim()
        : "Trial access is active for this browser session."
  };
}

export function writeTrialProfileDraft(input: Partial<TrialProfileDraft>): TrialProfileDraft {
  const current = readTrialProfileDraft();
  const nextProfile: TrialProfileDraft = {
    name: TRIAL_VIEWER_NAME,
    email: typeof input.email === "string" && input.email.trim() ? input.email.trim() : current.email,
    location: typeof input.location === "string" ? input.location.trim() || "Trial Mode" : current.location,
    joined: current.joined,
    bio: typeof input.bio === "string" ? input.bio.trim() : current.bio
  };

  writeJson(TRIAL_PROFILE_STORAGE_KEY, nextProfile);
  return nextProfile;
}

export function readTrialBrowsingHistory(): TrialBrowsingHistoryEntry[] {
  const entries = readJson<TrialBrowsingHistoryEntry[]>(TRIAL_HISTORY_STORAGE_KEY, []);
  return entries
    .filter((entry) => Boolean(entry?.locationId))
    .sort((left, right) => new Date(right.visitedAt).getTime() - new Date(left.visitedAt).getTime());
}

export function writeTrialBrowsingHistory(entries: TrialBrowsingHistoryEntry[]): void {
  writeJson(TRIAL_HISTORY_STORAGE_KEY, entries);
}

export function upsertTrialBrowsingHistory(
  entry: Omit<TrialBrowsingHistoryEntry, "id" | "visitedAt"> & { visitedAt?: string }
): TrialBrowsingHistoryEntry[] {
  const visitedAt = entry.visitedAt || new Date().toISOString();
  const nextEntry: TrialBrowsingHistoryEntry = {
    ...entry,
    id: generateRecordId("trial-history"),
    visitedAt
  };

  const nextEntries = [nextEntry, ...readTrialBrowsingHistory().filter((item) => item.locationId !== entry.locationId)].slice(0, 100);
  writeTrialBrowsingHistory(nextEntries);
  return nextEntries;
}

export function clearTrialBrowsingHistory(): void {
  writeTrialBrowsingHistory([]);
}

export function readTrialPersonalCards(): CardAlbumCard[] {
  return readJson<CardAlbumCard[]>(TRIAL_CARDS_STORAGE_KEY, [])
    .filter((card) => card?.scope === "personal")
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function writeTrialPersonalCards(cards: CardAlbumCard[]): void {
  writeJson(TRIAL_CARDS_STORAGE_KEY, cards);
}

export function createTrialPersonalCardRecord(
  input: Pick<CardAlbumCard, "issuer" | "title" | "bin" | "organization" | "groupName" | "description">
): CardAlbumCard {
  const timestamp = new Date().toISOString();

  return {
    id: generateRecordId("trial-card"),
    userId: TRIAL_USER_ID,
    issuer: input.issuer,
    title: input.title,
    bin: input.bin,
    organization: input.organization,
    groupName: input.groupName,
    description: input.description,
    scope: "personal",
    updatedAt: timestamp,
    createdAt: timestamp
  };
}

export function readTrialContributions(): TrialContributionEntry[] {
  return readJson<TrialContributionEntry[]>(TRIAL_CONTRIBUTIONS_STORAGE_KEY, [])
    .filter((entry) => Boolean(entry?.id))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

export function recordTrialContribution(title: string, meta: string): TrialContributionEntry[] {
  const nextEntry: TrialContributionEntry = {
    id: generateRecordId("trial-contribution"),
    title,
    meta,
    createdAt: new Date().toISOString()
  };

  const nextEntries = [nextEntry, ...readTrialContributions()].slice(0, 50);
  writeJson(TRIAL_CONTRIBUTIONS_STORAGE_KEY, nextEntries);
  return nextEntries;
}

export function readTrialLocationReviews(locationId?: string): TrialLocationReviewEntry[] {
  const entries = readJson<TrialLocationReviewEntry[]>(TRIAL_LOCATION_REVIEWS_STORAGE_KEY, [])
    .filter((entry) => Boolean(entry?.id) && Boolean(entry?.locationId))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  if (!locationId) {
    return entries;
  }

  return entries.filter((entry) => entry.locationId === locationId);
}

export function recordTrialLocationReview(
  input: Omit<TrialLocationReviewEntry, "id" | "createdAt">
): TrialLocationReviewEntry {
  const parsedRating = typeof input.rating === "number" && Number.isFinite(input.rating) ? Math.round(input.rating) : null;
  const nextEntry: TrialLocationReviewEntry = {
    id: generateRecordId("trial-location-review"),
    locationId: input.locationId,
    kind: input.kind,
    content: input.content.trim(),
    rating: parsedRating === null ? null : Math.max(1, Math.min(5, parsedRating)),
    createdAt: new Date().toISOString()
  };

  const nextEntries = [nextEntry, ...readTrialLocationReviews()].slice(0, 200);
  writeJson(TRIAL_LOCATION_REVIEWS_STORAGE_KEY, nextEntries);
  return nextEntry;
}

export function deleteTrialLocationReview(entryId: string): TrialLocationReviewEntry[] {
  const nextEntries = readTrialLocationReviews().filter((entry) => entry.id !== entryId);
  writeJson(TRIAL_LOCATION_REVIEWS_STORAGE_KEY, nextEntries);
  return nextEntries;
}
