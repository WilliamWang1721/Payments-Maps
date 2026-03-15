import { useEffect, useState } from "react";
import type React from "react";
import { AlertCircle, Copy, PlugZap, RefreshCw, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  buildClaudeCherryConfig,
  buildGenericRemoteSnippet,
  createMcpSession,
  listMcpSessions,
  revokeMcpSession
} from "@/lib/mcp-session-service";
import {
  MCP_SESSION_TEMPLATE_OPTIONS,
  type MCPClientType,
  type MCPScopeTemplate,
  type MCPSessionRecord
} from "@/types/mcp";

interface WebMcpSettingsProps {
  mcpEnabled: boolean;
  onMcpEnabledChange: (enabled: boolean) => void;
}

function Toggle({
  checked,
  onClick,
  ariaLabel
}: {
  checked: boolean;
  onClick: () => void;
  ariaLabel: string;
}): React.JSX.Element {
  return (
    <button
      aria-label={ariaLabel}
      className={`ui-hover-shadow relative inline-flex h-10 w-[68px] items-center rounded-pill border px-1 transition-colors duration-200 ${
        checked
          ? "border-[var(--primary)] bg-[var(--primary)]"
          : "border-[var(--input)] bg-white"
      }`}
      onClick={onClick}
      type="button"
    >
      <span
        className={`absolute left-1 h-8 w-8 rounded-full shadow-[0_8px_18px_-14px_rgba(15,23,42,0.45)] transition-transform duration-200 ${
          checked ? "translate-x-[28px] bg-white" : "translate-x-0 bg-[var(--accent)]"
        }`}
      />
    </button>
  );
}

function SelectControl({
  value,
  options,
  onChange
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <div className="relative w-full sm:w-[220px]">
      <select
        className="h-10 w-full appearance-none rounded-pill border border-[var(--input)] bg-white px-4 pr-10 text-sm text-[var(--foreground)] outline-none transition-colors duration-200 hover:border-[var(--border-hover)]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)]">▼</span>
    </div>
  );
}

function BetaBadge(): React.JSX.Element {
  return (
    <span className="inline-flex h-6 items-center rounded-pill border border-[rgba(234,179,8,0.32)] bg-[rgba(254,249,195,0.9)] px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#854d0e]">
      Beta
    </span>
  );
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "尚未使用";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

export function WebMcpSettings({
  mcpEnabled,
  onMcpEnabledChange
}: WebMcpSettingsProps): React.JSX.Element {
  const [mcpSessions, setMcpSessions] = useState<MCPSessionRecord[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);
  const [mcpBusyAction, setMcpBusyAction] = useState<string | null>(null);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState("Fluxa 桌面会话");
  const [clientType, setClientType] = useState<MCPClientType>("claude_desktop");
  const [scopeTemplate, setScopeTemplate] = useState<MCPScopeTemplate>("standard_user");
  const [generatedConnectionUrl, setGeneratedConnectionUrl] = useState("");
  const [copiedState, setCopiedState] = useState<"claude" | "remote" | null>(null);

  const clientTypeOptions: Array<{ value: MCPClientType; label: string }> = [
    { value: "claude_desktop", label: "Claude Desktop" },
    { value: "cherry_studio", label: "Cherry Studio" },
    { value: "codex", label: "Codex" },
    { value: "generic", label: "通用 Remote MCP 客户端" }
  ];

  const selectedTemplate =
    MCP_SESSION_TEMPLATE_OPTIONS.find((option) => option.key === scopeTemplate) || MCP_SESSION_TEMPLATE_OPTIONS[0];
  const claudeCherryConfig = generatedConnectionUrl ? JSON.stringify(buildClaudeCherryConfig(generatedConnectionUrl), null, 2) : "";
  const genericRemoteSnippet = generatedConnectionUrl ? JSON.stringify(buildGenericRemoteSnippet(generatedConnectionUrl), null, 2) : "";

  const loadMcpSessions = async (): Promise<void> => {
    setMcpLoading(true);
    setMcpError(null);

    try {
      const result = await listMcpSessions();
      setMcpSessions(result.sessions);
    } catch (error) {
      console.error("Failed to load MCP sessions.", error);
      setMcpError(error instanceof Error ? error.message : "加载 MCP 会话失败。");
    } finally {
      setMcpLoading(false);
    }
  };

  useEffect(() => {
    if (!mcpEnabled) {
      setMcpError(null);
      return;
    }

    void loadMcpSessions();
  }, [mcpEnabled]);

  useEffect(() => {
    if (!copiedState || typeof window === "undefined") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedState(null);
    }, 1400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copiedState]);

  const copyText = async (value: string, target: "claude" | "remote"): Promise<void> => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedState(target);
  };

  const handleCreateMcpSession = async (): Promise<void> => {
    setMcpBusyAction("create");
    setMcpError(null);

    try {
      const result = await createMcpSession({
        sessionLabel,
        clientType,
        scopeTemplate
      });
      setGeneratedConnectionUrl(result.connectionUrl);
      setMcpSessions((prev) => [result.session, ...prev]);
    } catch (error) {
      console.error("Failed to create MCP session.", error);
      setMcpError(error instanceof Error ? error.message : "创建 MCP 会话失败。");
    } finally {
      setMcpBusyAction(null);
    }
  };

  const handleRevokeMcpSession = async (sessionId: string): Promise<void> => {
    setMcpBusyAction(sessionId);
    setMcpError(null);

    try {
      await revokeMcpSession(sessionId);
      setMcpSessions((prev) =>
        prev.map((session) => (session.id === sessionId ? { ...session, revokedAt: new Date().toISOString() } : session))
      );
    } catch (error) {
      console.error("Failed to revoke MCP session.", error);
      setMcpError(error instanceof Error ? error.message : "撤销 MCP 会话失败。");
    } finally {
      setMcpBusyAction(null);
    }
  };

  return (
    <section className="tab-switch-enter flex min-h-0 min-w-0 flex-1 flex-col bg-[#FAFAFA] p-3 sm:p-4">
      <header className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:px-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[28px] font-semibold leading-[1.2] text-[var(--foreground)]">MCP 设置</h1>
            <BetaBadge />
          </div>
          <p className="text-sm leading-[1.5] text-[var(--muted-foreground)]">
            让支持 MCP 的 AI 客户端直接读取和写入你授权的 Fluxa 业务数据。这里包含开关、连接配置、使用教程和会话管理。
          </p>
        </div>
      </header>

      <div className="h-px w-full bg-[var(--input)]" />

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-4 py-4 sm:px-6 lg:px-10 lg:py-5">
        <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <PlugZap className="h-5 w-5 text-[var(--primary)]" />
                <p className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">启用 MCP</p>
              </div>
              <p className="text-sm leading-[1.6] text-[var(--muted-foreground)]">
                开启后，你可以创建 MCP 会话并把它接入 Claude、Cherry Studio、Codex 或其他支持 Remote MCP 的客户端。
              </p>
            </div>

            <Toggle
              ariaLabel="切换 MCP"
              checked={mcpEnabled}
              onClick={() => onMcpEnabledChange(!mcpEnabled)}
            />
          </div>
        </article>

        {!mcpEnabled ? (
          <article className="rounded-[24px] border border-dashed border-[var(--input)] bg-white px-6 py-8">
            <p className="text-base font-medium text-[var(--foreground)]">MCP 当前已关闭</p>
            <p className="mt-2 text-sm leading-[1.7] text-[var(--muted-foreground)]">
              打开上方开关后，这里会显示中文配置说明、客户端接入教程，以及你当前账号的 MCP 会话列表。
            </p>
          </article>
        ) : (
          <>
            <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
              <p className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">如何使用</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  {
                    title: "1. 保持 Fluxa 登录",
                    description: "MCP 会话复用你当前的 Fluxa 登录身份。未登录时无法创建或撤销会话。"
                  },
                  {
                    title: "2. 创建 MCP 会话",
                    description: "填写会话名称，选择客户端类型，点击创建。Token 只会通过连接地址展示一次。"
                  },
                  {
                    title: "3. 粘贴到 AI 客户端",
                    description: "把下方生成的配置复制到 Claude、Cherry Studio、Codex 或其他支持 Remote MCP 的客户端中。"
                  }
                ].map((step) => (
                  <div className="rounded-[18px] border border-[var(--input)] bg-[var(--background)] p-4" key={step.title}>
                    <p className="text-sm font-medium text-[var(--foreground)]">{step.title}</p>
                    <p className="mt-2 text-xs leading-[1.7] text-[var(--muted-foreground)]">{step.description}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <p className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">创建与配置会话</p>
                  <p className="text-sm leading-[1.6] text-[var(--muted-foreground)]">
                    创建后即可复制配置。Claude / Cherry 推荐走 `mcp-remote`，其他 Remote MCP 客户端可以直接使用远程地址。
                  </p>
                </div>

                <button
                  className="ui-hover-shadow inline-flex h-10 items-center justify-center gap-1.5 rounded-pill border border-[var(--input)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors duration-200 hover:border-[var(--border-hover)] hover:bg-[var(--card-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={mcpLoading || mcpBusyAction === "create"}
                  onClick={() => void loadMcpSessions()}
                  type="button"
                >
                  <RefreshCw className={`h-4 w-4 ${mcpLoading ? "animate-spin" : ""}`} />
                  <span>刷新会话</span>
                </button>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <div className="rounded-[20px] border border-[var(--input)] bg-[var(--background)] p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">会话名称</span>
                      <Input
                        onChange={(event) => setSessionLabel(event.target.value)}
                        placeholder="例如：Fluxa 桌面会话"
                        value={sessionLabel}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">客户端类型</span>
                      <SelectControl
                        onChange={(value) => setClientType(value as MCPClientType)}
                        options={clientTypeOptions.map((option) => ({ label: option.label, value: option.value }))}
                        value={clientType}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted-foreground)]">权限模板</span>
                      <SelectControl
                        onChange={(value) => setScopeTemplate(value as MCPScopeTemplate)}
                        options={MCP_SESSION_TEMPLATE_OPTIONS.map((option) => ({ label: option.label, value: option.key }))}
                        value={scopeTemplate}
                      />
                    </label>
                  </div>

                  <div className="mt-4 rounded-[18px] border border-dashed border-[var(--input)] bg-white p-4">
                    <p className="text-sm font-medium text-[var(--foreground)]">权限模板说明</p>
                    <p className="mt-2 text-xs leading-[1.6] text-[var(--muted-foreground)]">{selectedTemplate.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedTemplate.scopes.map((scope) => (
                        <span
                          className="inline-flex items-center rounded-pill border border-[var(--input)] bg-[var(--background)] px-3 py-1 text-[11px] font-medium text-[var(--foreground)]"
                          key={scope}
                        >
                          {scope}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      className="ui-hover-shadow inline-flex h-10 items-center justify-center rounded-pill bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] transition-colors duration-200 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={mcpBusyAction === "create" || !sessionLabel.trim()}
                      onClick={() => void handleCreateMcpSession()}
                      type="button"
                    >
                      {mcpBusyAction === "create" ? "创建中..." : "创建 MCP 会话"}
                    </button>
                    <p className="text-xs leading-[1.6] text-[var(--muted-foreground)]">会话默认 30 天过期，可随时在下方撤销。</p>
                  </div>

                  {mcpError ? (
                    <div className="mt-4 flex items-start gap-2 rounded-[16px] border border-[rgba(220,38,38,0.18)] bg-[rgba(254,242,242,0.88)] px-4 py-3 text-sm text-[#991b1b]">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{mcpError}</span>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[20px] border border-[var(--input)] bg-[var(--background)] p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">客户端配置</p>
                  <p className="mt-1 text-xs leading-[1.6] text-[var(--muted-foreground)]">
                    创建成功后，复制下面任一配置。Claude / Cherry 使用 `mcp-remote`，其他支持 Remote MCP 的客户端使用通用配置。
                  </p>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-[18px] border border-[var(--input)] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--foreground)]">Claude / Cherry 配置</p>
                        <button
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-pill border border-[var(--input)] bg-[var(--background)] px-3 text-xs font-medium text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!claudeCherryConfig}
                          onClick={() => void copyText(claudeCherryConfig, "claude")}
                          type="button"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>{copiedState === "claude" ? "已复制" : "复制"}</span>
                        </button>
                      </div>
                      <pre className="mt-3 overflow-x-auto rounded-[14px] bg-[var(--background)] p-3 text-[11px] leading-[1.6] text-[var(--foreground)]">
                        {claudeCherryConfig || "创建会话后，这里会生成可直接粘贴的配置。"}
                      </pre>
                    </div>

                    <div className="rounded-[18px] border border-[var(--input)] bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--foreground)]">通用 Remote MCP 配置</p>
                        <button
                          className="inline-flex h-8 items-center justify-center gap-1 rounded-pill border border-[var(--input)] bg-[var(--background)] px-3 text-xs font-medium text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={!genericRemoteSnippet}
                          onClick={() => void copyText(genericRemoteSnippet, "remote")}
                          type="button"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>{copiedState === "remote" ? "已复制" : "复制"}</span>
                        </button>
                      </div>
                      <pre className="mt-3 overflow-x-auto rounded-[14px] bg-[var(--background)] p-3 text-[11px] leading-[1.6] text-[var(--foreground)]">
                        {genericRemoteSnippet || "创建会话后，这里会显示远程 MCP 地址配置。"}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
              <p className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">接入示例</p>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[18px] border border-[var(--input)] bg-[var(--background)] p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">常见使用方式</p>
                  <div className="mt-3 space-y-3 text-xs leading-[1.7] text-[var(--muted-foreground)]">
                    <p>1. 在上方创建会话。</p>
                    <p>2. 把配置复制到 AI 客户端的 MCP 设置页面。</p>
                    <p>3. 重载 MCP 连接。</p>
                    <p>4. 之后可以直接让 AI 搜索地点、创建地点、补录 attempt、查看卡册，或做全站统计、抓取地点数据并更新资料。</p>
                  </div>
                </div>

                <div className="rounded-[18px] border border-[var(--input)] bg-[var(--background)] p-4">
                  <p className="text-sm font-medium text-[var(--foreground)]">中文提示词示例</p>
                  <div className="mt-3 space-y-3 text-xs leading-[1.7] text-[var(--muted-foreground)]">
                    <p>`帮我查一下上海徐汇区已收录的瑞幸地点。`</p>
                    <p>`新增一个地点，并写入第一条支付 attempt。`</p>
                    <p>`统计一下全站添加地点最多的 10 个用户。`</p>
                    <p>`抓取深圳地区的已收录地点数据，整理成分析用列表。`</p>
                    <p>`把这张卡片加入我的公共卡册。`</p>
                    <p>`帮我新建一张卡，并直接保存到公共卡册。`</p>
                    <p>`帮我读取我的浏览历史并总结最近看过的门店。`</p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[24px] border border-[var(--input)] bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[18px] font-semibold leading-[1.2] text-[var(--foreground)]">会话管理</p>
                  <p className="mt-1 text-sm leading-[1.6] text-[var(--muted-foreground)]">
                    查看最近使用时间、权限范围和状态。你可以随时撤销任何会话。
                  </p>
                </div>
                <span className="rounded-pill border border-[var(--input)] bg-[var(--background)] px-3 py-1 text-xs font-medium text-[var(--foreground)]">
                  {mcpLoading ? "加载中..." : `${mcpSessions.length} 个会话`}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {mcpSessions.map((session) => {
                  const isRevoked = Boolean(session.revokedAt);
                  const isExpired = !isRevoked && new Date(session.expiresAt).getTime() <= Date.now();

                  return (
                    <div className="rounded-[18px] border border-[var(--input)] bg-[var(--background)] p-4" key={session.id}>
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-medium text-[var(--foreground)]">{session.sessionLabel}</p>
                            <span className="rounded-pill border border-[var(--input)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                              {session.clientType}
                            </span>
                            <span className="rounded-pill border border-[var(--input)] bg-white px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)]">
                              {session.tokenHint}
                            </span>
                            <span
                              className={`rounded-pill px-2.5 py-1 text-[11px] font-medium ${
                                isRevoked
                                  ? "border border-[rgba(220,38,38,0.18)] bg-[rgba(254,242,242,0.88)] text-[#991b1b]"
                                  : isExpired
                                    ? "border border-[rgba(217,119,6,0.2)] bg-[rgba(255,247,237,0.95)] text-[#9a3412]"
                                    : "border border-[rgba(34,197,94,0.18)] bg-[rgba(240,253,244,0.92)] text-[#166534]"
                              }`}
                            >
                              {isRevoked ? "已撤销" : isExpired ? "已过期" : "正常"}
                            </span>
                          </div>

                          <div className="grid gap-2 text-xs leading-[1.6] text-[var(--muted-foreground)] md:grid-cols-2">
                            <p>权限模板：{session.scopeTemplate}</p>
                            <p>创建时间：{formatDateTime(session.createdAt)}</p>
                            <p>最后使用：{formatDateTime(session.lastUsedAt)}</p>
                            <p>到期时间：{formatDateTime(session.expiresAt)}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {session.scopes.map((scope) => (
                              <span
                                className="inline-flex items-center rounded-pill border border-[var(--input)] bg-white px-3 py-1 text-[11px] font-medium text-[var(--foreground)]"
                                key={`${session.id}-${scope}`}
                              >
                                {scope}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-pill border border-[rgba(220,38,38,0.18)] bg-[rgba(254,242,242,0.88)] px-4 py-2 text-sm font-medium text-[#991b1b] transition-colors duration-200 hover:bg-[rgba(254,226,226,0.96)] disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isRevoked || mcpBusyAction === session.id}
                          onClick={() => void handleRevokeMcpSession(session.id)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>{mcpBusyAction === session.id ? "撤销中..." : "撤销会话"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {!mcpLoading && mcpSessions.length === 0 ? (
                  <div className="rounded-[18px] border border-dashed border-[var(--input)] bg-[var(--background)] px-4 py-6 text-sm text-[var(--muted-foreground)]">
                    暂无 MCP 会话。创建一个新会话后，再把配置粘贴到你的 AI 客户端中。
                  </div>
                ) : null}
              </div>
            </article>
          </>
        )}
      </div>
    </section>
  );
}
