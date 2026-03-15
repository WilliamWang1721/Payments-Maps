import { supabase } from "./supabase.js";
import { sanitizePayload, summarizeResult } from "./utils/sanitize.js";

interface LogCallInput {
  sessionId: string;
  userId: string;
  toolName: string;
  status: "success" | "error";
  startedAt: string;
  finishedAt: string;
  argumentsPayload?: unknown;
  resultPayload?: unknown;
  errorMessage?: string;
}

export class AuditLogService {
  private loggingAvailable = true;

  async logToolCall(input: LogCallInput): Promise<void> {
    if (!this.loggingAvailable) {
      return;
    }

    const { error } = await supabase.from("mcp_tool_logs").insert({
      session_id: input.sessionId,
      user_id: input.userId,
      tool_name: input.toolName,
      status: input.status,
      tool_arguments_summary: sanitizePayload(input.argumentsPayload || {}),
      result_summary: summarizeResult(input.resultPayload || {}),
      error_message: input.errorMessage || null,
      started_at: input.startedAt,
      finished_at: input.finishedAt
    });

    if (error) {
      const message = typeof error.message === "string" ? error.message : "";
      if (error.code === "PGRST205" || message.includes("mcp_tool_logs")) {
        this.loggingAvailable = false;
        console.warn("MCP tool logging disabled because mcp_tool_logs is not available on the remote schema.");
        return;
      }

      console.error("Failed to write MCP tool log.", error);
    }
  }
}
