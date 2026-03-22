import type { User } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

export interface ViewerAccessRecord {
  isAdmin: boolean;
}

const ADMIN_ROLE_NAMES = new Set(["admin", "super_admin", "superadmin"]);

function normalizeRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
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

function isAdminUser(user: User): boolean {
  return isAdminMetadataRecord(user.user_metadata) || isAdminMetadataRecord(user.app_metadata);
}

export const viewerAccessService = {
  async getViewerAccess(): Promise<ViewerAccessRecord> {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    return {
      isAdmin: Boolean(user && isAdminUser(user))
    };
  }
};
