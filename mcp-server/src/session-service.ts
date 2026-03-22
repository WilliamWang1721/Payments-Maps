import type { User } from "@supabase/supabase-js";

import {
  DEFAULT_CLIENT_TYPE,
  DEFAULT_SCOPE_TEMPLATE,
  DEFAULT_SESSION_LABEL,
  SESSION_TTL_DAYS,
  STANDARD_USER_SCOPES,
  type MCPClientType,
  type MCPScopeKey,
  type MCPScopeTemplate,
  resolveScopesForTemplate
} from "./constants.js";
import { supabase } from "./supabase.js";
import type { AuthenticatedSession, MCPSessionRecord } from "./types.js";
import { buildTokenHint, generateSessionToken, hashToken } from "./utils/hash.js";

interface CreateSessionOptions {
  sessionLabel?: string;
  clientType?: MCPClientType;
  scopeTemplate?: MCPScopeTemplate;
}

interface LegacyPermissionsShape {
  search?: boolean;
  add_pos?: boolean;
  delete_pos?: boolean;
  update_pos?: boolean;
  view_details?: boolean;
  _fluxa_scope_template?: MCPScopeTemplate;
  _fluxa_scopes?: MCPScopeKey[];
}

function normalizeSessionLabel(value?: string): string {
  return value?.trim() || DEFAULT_SESSION_LABEL;
}

function addDaysIso(base: string | Date, days: number): string {
  const date = typeof base === "string" ? new Date(base) : new Date(base.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}

function getPostgrestMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return "";
}

function shouldFallbackToLegacySchema(error: unknown): boolean {
  const message = getPostgrestMessage(error);
  return (
    message.includes("session_label")
    || message.includes("scope_template")
    || message.includes("session_token_hash")
    || message.includes("token_hint")
    || message.includes("last_used_at")
    || message.includes("revoked_at")
  );
}

function parseLegacyScopes(permissions: unknown): MCPScopeKey[] {
  if (permissions && typeof permissions === "object") {
    const fluxaScopes = (permissions as LegacyPermissionsShape)._fluxa_scopes;
    if (Array.isArray(fluxaScopes) && fluxaScopes.every((scope) => typeof scope === "string")) {
      return fluxaScopes as MCPScopeKey[];
    }

    const legacy = permissions as LegacyPermissionsShape;
    const scopes = new Set<MCPScopeKey>();
    if (legacy.search || legacy.view_details) {
      scopes.add("locations.read");
      scopes.add("brands.read");
    }
    if (legacy.add_pos) {
      scopes.add("locations.write");
    }
    if (legacy.update_pos) {
      scopes.add("attempts.write");
    }
    return [...scopes];
  }

  return [];
}

function buildLegacyPermissions(scopeTemplate: MCPScopeTemplate, scopes: MCPScopeKey[]): LegacyPermissionsShape {
  return {
    search: scopes.includes("locations.read"),
    add_pos: scopes.includes("locations.write"),
    delete_pos: false,
    update_pos: scopes.includes("attempts.write"),
    view_details: scopes.includes("locations.read"),
    _fluxa_scope_template: scopeTemplate,
    _fluxa_scopes: scopes
  };
}

function mapSessionRow(row: Record<string, unknown>): MCPSessionRecord {
  if ("session_name" in row || "session_token" in row || "permissions" in row) {
    const createdAt = typeof row.created_at === "string" ? row.created_at : new Date().toISOString();
    const scopes = parseLegacyScopes(row.permissions);
    const sessionToken = typeof row.session_token === "string" ? row.session_token : "";
    const expiresAt =
      typeof row.expires_at === "string" && row.expires_at
        ? row.expires_at
        : addDaysIso(createdAt, SESSION_TTL_DAYS);

    return {
      id: String(row.id),
      sessionLabel: String(row.session_name || DEFAULT_SESSION_LABEL),
      clientType: String(row.client_type || DEFAULT_CLIENT_TYPE) as MCPClientType,
      scopeTemplate: String(
        (row.permissions as LegacyPermissionsShape | undefined)?._fluxa_scope_template || DEFAULT_SCOPE_TEMPLATE
      ) as MCPScopeTemplate,
      scopes: scopes.length > 0 ? scopes : [...STANDARD_USER_SCOPES],
      tokenHint: buildTokenHint(sessionToken),
      lastUsedAt: typeof row.last_active === "string" ? row.last_active : null,
      expiresAt,
      revokedAt: row.is_active === false ? createdAt : null,
      createdAt
    };
  }

  return {
    id: String(row.id),
    sessionLabel: String(row.session_label || DEFAULT_SESSION_LABEL),
    clientType: String(row.client_type || DEFAULT_CLIENT_TYPE) as MCPClientType,
    scopeTemplate: String(row.scope_template || DEFAULT_SCOPE_TEMPLATE) as MCPScopeTemplate,
    scopes: Array.isArray(row.scopes) ? (row.scopes as MCPScopeKey[]) : [],
    tokenHint: String(row.token_hint || ""),
    lastUsedAt: typeof row.last_used_at === "string" ? row.last_used_at : null,
    expiresAt: String(row.expires_at || new Date().toISOString()),
    revokedAt: typeof row.revoked_at === "string" ? row.revoked_at : null,
    createdAt: String(row.created_at || new Date().toISOString())
  };
}

function mapAuthenticatedSession(row: Record<string, unknown>): AuthenticatedSession {
  if ("session_name" in row || "session_token" in row || "permissions" in row) {
    const createdAt = typeof row.created_at === "string" ? row.created_at : new Date().toISOString();
    const scopes = parseLegacyScopes(row.permissions);
    const expiresAt =
      typeof row.expires_at === "string" && row.expires_at
        ? row.expires_at
        : addDaysIso(createdAt, SESSION_TTL_DAYS);
    const sessionToken = typeof row.session_token === "string" ? row.session_token : "";

    return {
      id: String(row.id),
      userId: String(row.user_id),
      sessionLabel: String(row.session_name || DEFAULT_SESSION_LABEL),
      clientType: String(row.client_type || DEFAULT_CLIENT_TYPE) as MCPClientType,
      scopeTemplate: String(
        (row.permissions as LegacyPermissionsShape | undefined)?._fluxa_scope_template || DEFAULT_SCOPE_TEMPLATE
      ) as MCPScopeTemplate,
      scopes: scopes.length > 0 ? scopes : [...STANDARD_USER_SCOPES],
      tokenHint: buildTokenHint(sessionToken),
      expiresAt,
      revokedAt: row.is_active === false ? createdAt : null
    };
  }

  return {
    id: String(row.id),
    userId: String(row.user_id),
    sessionLabel: String(row.session_label || DEFAULT_SESSION_LABEL),
    clientType: String(row.client_type || DEFAULT_CLIENT_TYPE) as MCPClientType,
    scopeTemplate: String(row.scope_template || DEFAULT_SCOPE_TEMPLATE) as MCPScopeTemplate,
    scopes: Array.isArray(row.scopes) ? (row.scopes as MCPScopeKey[]) : [],
    tokenHint: String(row.token_hint || ""),
    expiresAt: String(row.expires_at || new Date().toISOString()),
    revokedAt: typeof row.revoked_at === "string" ? row.revoked_at : null
  };
}

export class SessionService {
  async authenticateBearerToken(token: string): Promise<User> {
    const accessToken = token.trim();
    if (!accessToken) {
      throw new Error("Missing Fluxa access token.");
    }

    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      throw new Error("Invalid Fluxa access token.");
    }

    return data.user;
  }

  async listSessions(userId: string): Promise<MCPSessionRecord[]> {
    const modernResult = await supabase
      .from("mcp_sessions")
      .select("id, session_label, client_type, scope_template, scopes, token_hint, last_used_at, expires_at, revoked_at, created_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (!modernResult.error) {
      return ((modernResult.data || []) as Record<string, unknown>[]).map(mapSessionRow);
    }

    if (!shouldFallbackToLegacySchema(modernResult.error)) {
      throw modernResult.error;
    }

    const legacyResult = await supabase
      .from("mcp_sessions")
      .select("id, user_id, session_name, session_token, client_type, permissions, is_active, last_active, expires_at, created_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (legacyResult.error) {
      throw legacyResult.error;
    }

    return ((legacyResult.data || []) as Record<string, unknown>[]).map(mapSessionRow);
  }

  async createSession(userId: string, options: CreateSessionOptions): Promise<{ session: MCPSessionRecord; sessionToken: string }> {
    const scopeTemplate = options.scopeTemplate || DEFAULT_SCOPE_TEMPLATE;
    const scopes = resolveScopesForTemplate(scopeTemplate);
    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);
    const tokenHint = buildTokenHint(sessionToken);

    const insertPayload = {
      user_id: userId,
      session_label: normalizeSessionLabel(options.sessionLabel),
      client_type: options.clientType || DEFAULT_CLIENT_TYPE,
      scope_template: scopeTemplate,
      scopes,
      token_hint: tokenHint,
      session_token_hash: tokenHash
    };

    const modernResult = await supabase
      .from("mcp_sessions")
      .insert(insertPayload)
      .select("id, session_label, client_type, scope_template, scopes, token_hint, last_used_at, expires_at, revoked_at, created_at")
      .single();

    if (!modernResult.error && modernResult.data) {
      return {
        session: mapSessionRow(modernResult.data as Record<string, unknown>),
        sessionToken
      };
    }

    if (!shouldFallbackToLegacySchema(modernResult.error)) {
      throw modernResult.error || new Error("Failed to create MCP session.");
    }

    const legacyInsertPayload = {
      user_id: userId,
      session_name: normalizeSessionLabel(options.sessionLabel),
      client_type: options.clientType || DEFAULT_CLIENT_TYPE,
      session_token: sessionToken,
      permissions: buildLegacyPermissions(scopeTemplate, scopes),
      is_active: true,
      last_active: new Date().toISOString(),
      expires_at: addDaysIso(new Date(), SESSION_TTL_DAYS)
    };

    const legacyResult = await supabase
      .from("mcp_sessions")
      .insert(legacyInsertPayload)
      .select("id, user_id, session_name, session_token, client_type, permissions, is_active, last_active, expires_at, created_at")
      .single();

    if (legacyResult.error || !legacyResult.data) {
      throw legacyResult.error || new Error("Failed to create MCP session.");
    }

    return {
      session: mapSessionRow(legacyResult.data as Record<string, unknown>),
      sessionToken
    };
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const modernResult = await supabase
      .from("mcp_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .is("revoked_at", null);

    if (!modernResult.error) {
      return;
    }

    if (!shouldFallbackToLegacySchema(modernResult.error)) {
      throw modernResult.error;
    }

    const legacyResult = await supabase
      .from("mcp_sessions")
      .update({ is_active: false })
      .eq("id", sessionId)
      .eq("user_id", userId)
      .eq("is_active", true);

    if (legacyResult.error) {
      throw legacyResult.error;
    }
  }

  async authenticateMcpSession(sessionToken: string): Promise<AuthenticatedSession> {
    const hashedToken = hashToken(sessionToken.trim());
    if (!hashedToken) {
      throw new Error("Missing MCP session token.");
    }

    const modernResult = await supabase
      .from("mcp_sessions")
      .select("id, user_id, session_label, client_type, scope_template, scopes, token_hint, expires_at, revoked_at")
      .eq("session_token_hash", hashedToken)
      .maybeSingle();

    if (!modernResult.error && modernResult.data) {
      const data = modernResult.data;
      const expiresAt = new Date(String(data.expires_at));
      if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
        throw new Error("MCP session has expired.");
      }

      if (data.revoked_at) {
        throw new Error("MCP session has been revoked.");
      }

      const { error: updateError } = await supabase
        .from("mcp_sessions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", data.id);

      if (updateError) {
        console.error("Failed to update last_used_at for MCP session.", updateError);
      }

      return mapAuthenticatedSession(data as Record<string, unknown>);
    }

    if (!shouldFallbackToLegacySchema(modernResult.error)) {
      throw new Error("Invalid MCP session token.");
    }

    const legacyResult = await supabase
      .from("mcp_sessions")
      .select("id, user_id, session_name, session_token, client_type, permissions, is_active, last_active, expires_at, created_at")
      .eq("session_token", sessionToken.trim())
      .maybeSingle();

    if (legacyResult.error || !legacyResult.data) {
      throw new Error("Invalid MCP session token.");
    }

    const legacy = legacyResult.data as Record<string, unknown>;
    if (legacy.is_active === false) {
      throw new Error("MCP session has been revoked.");
    }

    const expiresAt = legacy.expires_at ? new Date(String(legacy.expires_at)) : null;
    if (expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
      throw new Error("MCP session has expired.");
    }

    const { error: updateError } = await supabase
      .from("mcp_sessions")
      .update({ last_active: new Date().toISOString() })
      .eq("id", legacy.id);

    if (updateError) {
      console.error("Failed to update session activity for MCP session.", updateError);
    }

    return mapAuthenticatedSession(legacy);
  }

  requireScope(session: AuthenticatedSession, scope: MCPScopeKey): void {
    if (!session.scopes.includes(scope)) {
      throw new Error(`Missing required scope: ${scope}`);
    }
  }
}
