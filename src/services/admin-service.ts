import { supabase } from "@/lib/supabase";
import type { AdminStatisticsRecord, AdminUserListRecord } from "@/types/admin";

const DEFAULT_ADMIN_SERVER_URL = typeof window !== "undefined" ? window.location.origin : "http://localhost:3030";

function getAdminServerUrl(): string {
  const configured = typeof import.meta.env.VITE_MCP_SERVER_URL === "string" ? import.meta.env.VITE_MCP_SERVER_URL.trim() : "";
  return (configured || DEFAULT_ADMIN_SERVER_URL).replace(/\/$/, "");
}

async function resolveAccessToken(explicitAccessToken?: string): Promise<string> {
  if (explicitAccessToken?.trim()) {
    return explicitAccessToken.trim();
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  throw new Error("Your session has expired. Please sign in again.");
}

async function requestAdminApi<T>(path: string, explicitAccessToken?: string): Promise<T> {
  const accessToken = await resolveAccessToken(explicitAccessToken);
  const response = await fetch(`${getAdminServerUrl()}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(typeof payload?.error === "string" ? payload.error : "Admin request failed.");
  }

  return response.json() as Promise<T>;
}

export const adminService = {
  async listUsers(options?: { accessToken?: string; limit?: number; query?: string }): Promise<AdminUserListRecord> {
    const searchParams = new URLSearchParams();
    searchParams.set("view", "admin-users");
    if (options?.limit) {
      searchParams.set("limit", String(options.limit));
    }
    if (options?.query?.trim()) {
      searchParams.set("query", options.query.trim());
    }

    const suffix = searchParams.toString();
    return requestAdminApi<AdminUserListRecord>(`/api/mcp/sessions${suffix ? `?${suffix}` : ""}`, options?.accessToken);
  },

  async getStatistics(options?: { accessToken?: string; topN?: number }): Promise<AdminStatisticsRecord> {
    const searchParams = new URLSearchParams();
    searchParams.set("view", "admin-statistics");
    if (options?.topN) {
      searchParams.set("topN", String(options.topN));
    }

    const suffix = searchParams.toString();
    return requestAdminApi<AdminStatisticsRecord>(`/api/mcp/sessions${suffix ? `?${suffix}` : ""}`, options?.accessToken);
  }
};
