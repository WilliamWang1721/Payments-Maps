import { supabase } from "@/lib/supabase";
import { isTrialSessionActive } from "@/lib/trial-session";
import type {
  MCPClientType,
  MCPScopeTemplate,
  MCPSessionCreateResult,
  MCPSessionRecord
} from "@/types/mcp";

const DEFAULT_MCP_SERVER_URL = typeof window !== "undefined" ? window.location.origin : "http://localhost:3030";

interface SessionListResponse {
  sessions: MCPSessionRecord[];
  publicBaseUrl?: string;
}

interface SessionCreateResponse {
  session: MCPSessionRecord;
  sessionToken: string;
  connectionUrl: string;
  publicBaseUrl?: string;
}

function getMcpServerUrl(): string {
  const configured = typeof import.meta.env.VITE_MCP_SERVER_URL === "string" ? import.meta.env.VITE_MCP_SERVER_URL.trim() : "";
  return (configured || DEFAULT_MCP_SERVER_URL).replace(/\/$/, "");
}

async function getAccessToken(): Promise<string> {
  if (isTrialSessionActive()) {
    throw new Error("Trial mode does not support MCP sessions.");
  }

  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session?.access_token) {
    throw new Error("You need to sign in before managing MCP sessions.");
  }

  return session.access_token;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${getMcpServerUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error || `MCP request failed with status ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listMcpSessions(): Promise<SessionListResponse> {
  return request<SessionListResponse>("/api/mcp/sessions", {
    method: "GET"
  });
}

export async function createMcpSession(input: {
  sessionLabel: string;
  clientType: MCPClientType;
  scopeTemplate: MCPScopeTemplate;
}): Promise<MCPSessionCreateResult & { connectionUrl: string; publicBaseUrl?: string }> {
  const result = await request<SessionCreateResponse>("/api/mcp/sessions", {
    method: "POST",
    body: JSON.stringify(input)
  });

  return {
    session: result.session,
    sessionToken: result.sessionToken,
    connectionUrl: result.connectionUrl,
    publicBaseUrl: result.publicBaseUrl
  };
}

export async function revokeMcpSession(sessionId: string): Promise<void> {
  await request<void>("/api/mcp/sessions/revoke", {
    method: "POST",
    body: JSON.stringify({ id: sessionId })
  });
}

export function buildClaudeCherryConfig(connectionUrl: string) {
  return {
    mcpServers: {
      "fluxa-map": {
        command: "npx",
        args: ["-y", "mcp-remote", connectionUrl]
      }
    }
  };
}

export function buildGenericRemoteSnippet(connectionUrl: string) {
  return {
    transport: "streamable_http",
    url: connectionUrl
  };
}
