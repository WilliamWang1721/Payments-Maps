export const MCP_SCOPE_KEYS = [
  "analytics.read",
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

export const STANDARD_USER_SCOPES: MCPScopeKey[] = [
  "analytics.read",
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

export const DEFAULT_SCOPE_TEMPLATE: MCPScopeTemplate = "standard_user";
export const DEFAULT_CLIENT_TYPE: MCPClientType = "generic";
export const DEFAULT_SESSION_LABEL = "Fluxa MCP Session";
export const SESSION_TTL_DAYS = 30;

export interface SessionTemplateDefinition {
  key: MCPScopeTemplate;
  label: string;
  description: string;
  scopes: MCPScopeKey[];
}

export const SESSION_TEMPLATE_DEFINITIONS: SessionTemplateDefinition[] = [
  {
    key: "standard_user",
    label: "标准用户",
    description: "读取并统计当前 Fluxa 的全部业务对象，并在一次授权会话内写入属于当前用户的数据。",
    scopes: STANDARD_USER_SCOPES
  }
];

export function resolveScopesForTemplate(template: MCPScopeTemplate): MCPScopeKey[] {
  if (template === "standard_user") {
    return [...STANDARD_USER_SCOPES];
  }

  return [...STANDARD_USER_SCOPES];
}
