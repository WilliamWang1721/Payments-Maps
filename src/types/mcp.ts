export const MCP_SCOPE_KEYS = [
  "locations.read",
  "locations.write",
  "attempts.write",
  "brands.read",
  "cards.read",
  "cards.write",
  "history.read",
  "history.write",
  "profile.read",
  "profile.write"
] as const;

export type MCPScopeKey = (typeof MCP_SCOPE_KEYS)[number];
export type MCPScopeTemplate = "standard_user";
export type MCPClientType = "generic" | "claude_desktop" | "cherry_studio" | "codex";

export interface MCPSessionRecord {
  id: string;
  sessionLabel: string;
  clientType: MCPClientType;
  scopeTemplate: MCPScopeTemplate;
  scopes: MCPScopeKey[];
  tokenHint: string;
  lastUsedAt: string | null;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface MCPSessionCreateResult {
  session: MCPSessionRecord;
  sessionToken: string;
}

export interface MCPSessionTemplateOption {
  key: MCPScopeTemplate;
  label: string;
  description: string;
  scopes: MCPScopeKey[];
}

export const STANDARD_USER_SCOPES: MCPScopeKey[] = [
  "locations.read",
  "locations.write",
  "attempts.write",
  "brands.read",
  "cards.read",
  "cards.write",
  "history.read",
  "history.write",
  "profile.read",
  "profile.write"
];

export const MCP_SESSION_TEMPLATE_OPTIONS: MCPSessionTemplateOption[] = [
  {
    key: "standard_user",
    label: "标准用户",
    description: "读取当前 Fluxa 的全部业务对象，并在一次授权会话内写入属于当前用户的数据。",
    scopes: STANDARD_USER_SCOPES
  }
];
