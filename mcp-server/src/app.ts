import express, { type Request } from "express";
import cors from "cors";
import * as z from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { AuditLogService } from "./audit-log-service.js";
import { type MCPScopeKey, SESSION_TEMPLATE_DEFINITIONS } from "./constants.js";
import { FluxaService } from "./fluxa-service.js";
import { ConfigurationError, isSupabaseServerConfigured } from "./supabase.js";
import { SessionService } from "./session-service.js";
import type { AuthenticatedSession } from "./types.js";

const port = Number(process.env.PORT || 3030);
const corsOrigins = (process.env.MCP_CORS_ORIGINS || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const app = express();
app.set("trust proxy", true);
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by MCP CORS policy."));
    }
  })
);
app.use(express.json({ limit: "1mb" }));

const sessionService = new SessionService();
const fluxaService = new FluxaService();
const auditLogService = new AuditLogService();

function getConfiguredPublicBaseUrl(): string | null {
  const configured = process.env.MCP_PUBLIC_BASE_URL?.trim();
  return configured ? configured.replace(/\/$/, "") : null;
}

function getForwardedHeaderValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function resolvePublicBaseUrl(request?: Request): string {
  const configured = getConfiguredPublicBaseUrl();
  if (configured) {
    return configured;
  }

  if (request) {
    const forwardedProto = getForwardedHeaderValue(request.headers["x-forwarded-proto"]);
    const forwardedHost = getForwardedHeaderValue(request.headers["x-forwarded-host"]);
    const host = forwardedHost || request.get("host");
    const protocol = forwardedProto || request.protocol || "http";

    if (host) {
      return `${protocol}://${host}`.replace(/\/$/, "");
    }
  }

  return `http://localhost:${port}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return fallback;
}

function getErrorStatus(error: unknown, fallback: number): number {
  return error instanceof ConfigurationError ? 503 : fallback;
}

function getBearerToken(request: Request): string {
  const authorization = request.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    throw new Error("Missing Authorization bearer token.");
  }

  return authorization.slice("Bearer ".length).trim();
}

async function authenticateUserRequest(request: Request) {
  const accessToken = getBearerToken(request);
  const user = await sessionService.authenticateBearerToken(accessToken);
  return user;
}

function buildSessionConnectionUrl(request: Request, sessionToken: string): string {
  return `${resolvePublicBaseUrl(request)}/mcp/${sessionToken}`;
}

function jsonText(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

function successContent(summary: string, data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: summary
      },
      {
        type: "text" as const,
        text: jsonText(data)
      }
    ]
  };
}

function errorContent(message: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: message
      }
    ],
    isError: true
  };
}

function ensureScope(session: AuthenticatedSession, scope: MCPScopeKey): void {
  sessionService.requireScope(session, scope);
}

async function withAudit<T>(
  authSession: AuthenticatedSession,
  toolName: string,
  args: unknown,
  run: () => Promise<{ summary: string; data: T }>
) {
  const startedAt = new Date().toISOString();

  try {
    const result = await run();
    await auditLogService.logToolCall({
      sessionId: authSession.id,
      userId: authSession.userId,
      toolName,
      status: "success",
      startedAt,
      finishedAt: new Date().toISOString(),
      argumentsPayload: args,
      resultPayload: result.data
    });
    return successContent(result.summary, result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected MCP tool error.";
    await auditLogService.logToolCall({
      sessionId: authSession.id,
      userId: authSession.userId,
      toolName,
      status: "error",
      startedAt,
      finishedAt: new Date().toISOString(),
      argumentsPayload: args,
      errorMessage: message
    });
    return errorContent(message);
  }
}

function createMcpServer(sessionToken: string): McpServer {
  const server = new McpServer(
    {
      name: "fluxa-map-mcp-server",
      version: "0.1.0"
    },
    {
      instructions:
        "Fluxa Map business MCP server. Use structured tools to read, aggregate, and update Fluxa business data. " +
        "Do not attempt browser automation. Brand data is read-only."
    }
  );

  server.registerTool(
    "get_site_statistics",
    {
      description: "Aggregate whole-site Fluxa statistics such as total locations, top cities, top brands, and card counts.",
      inputSchema: {
        top_n: z.number().int().min(1).max(25).optional()
      }
    },
    async ({ top_n }) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "analytics.read");
      return withAudit(liveSession, "get_site_statistics", { top_n }, async () => {
        const stats = await fluxaService.getSiteStatistics({ topN: top_n });
        return {
          summary: `Aggregated site statistics for ${stats.totals.locations} total locations.`,
          data: stats
        };
      });
    }
  );

  server.registerTool(
    "rank_location_contributors",
    {
      description: "Rank users by how many POS-backed locations they have added, with optional filters.",
      inputSchema: {
        city: z.string().optional(),
        brand: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        since: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional()
      }
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "analytics.read");
      return withAudit(liveSession, "rank_location_contributors", args, async () => {
        const rankings = await fluxaService.rankLocationContributors(args);
        return {
          summary: `Ranked ${rankings.length} contributors.`,
          data: {
            total: rankings.length,
            results: rankings
          }
        };
      });
    }
  );

  server.registerTool(
    "collect_locations_dataset",
    {
      description: "Collect a larger filtered location dataset for downstream analysis or one-click data extraction.",
      inputSchema: {
        query: z.string().optional(),
        city: z.string().optional(),
        brand: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        source: z.enum(["fluxa_locations", "pos_machines"]).optional(),
        limit: z.number().int().min(1).max(500).optional()
      }
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "analytics.read");
      return withAudit(liveSession, "collect_locations_dataset", args, async () => {
        const dataset = await fluxaService.collectLocationsDataset(args);
        return {
          summary: `Collected ${dataset.summary.returned} rows from ${dataset.summary.totalMatched} matched locations.`,
          data: dataset
        };
      });
    }
  );

  server.registerTool(
    "search_locations",
    {
      description: "Search Fluxa locations across merged Fluxa and POS data.",
      inputSchema: {
        query: z.string().optional(),
        city: z.string().optional(),
        brand: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        source: z.enum(["fluxa_locations", "pos_machines"]).optional(),
        limit: z.number().int().min(1).max(100).optional()
      }
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "locations.read");
      return withAudit(liveSession, "search_locations", args, async () => {
        const results = await fluxaService.searchLocations(args);
        return {
          summary: `Found ${results.length} locations.`,
          data: {
            total: results.length,
            results
          }
        };
      });
    }
  );

  server.registerTool(
    "get_location_detail",
    {
      description: "Get a detailed Fluxa location record by location ID.",
      inputSchema: {
        location_id: z.string().min(1)
      }
    },
    async ({ location_id }) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "locations.read");
      return withAudit(liveSession, "get_location_detail", { location_id }, async () => {
        const detail = await fluxaService.getLocationDetail(location_id);
        return {
          summary: `Loaded detail for ${detail.name}.`,
          data: detail
        };
      });
    }
  );

  server.registerTool(
    "create_location",
    {
      description: "Create a new Fluxa location. This writes to pos_machines and creates the first attempt.",
      inputSchema: {
        name: z.string().min(1),
        address: z.string().min(1),
        brand: z.string().min(1),
        bin: z.string().min(1),
        city: z.string().min(1),
        status: z.enum(["active", "inactive"]),
        lat: z.number(),
        lng: z.number(),
        notes: z.string().optional(),
        transactionStatus: z.enum(["Success", "Fault", "Unknown"]).optional(),
        network: z.string().optional(),
        paymentMethod: z.string().optional(),
        cvm: z.string().optional(),
        acquiringMode: z.string().optional(),
        acquirer: z.string().optional(),
        posModel: z.string().optional(),
        checkoutLocation: z.enum(["Staffed Checkout", "Self-checkout"]).optional(),
        attemptedAt: z.string().optional()
      }
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "locations.write");
      return withAudit(liveSession, "create_location", args, async () => {
        const location = await fluxaService.createLocation(liveSession.userId, args);
        return {
          summary: `Created location ${location.name}.`,
          data: location
        };
      });
    }
  );

  server.registerTool(
    "create_location_attempt",
    {
      description: "Append a payment attempt record to a POS-backed Fluxa location.",
      inputSchema: {
        location_id: z.string().min(1),
        input: z.object({
          cardName: z.string().optional(),
          transactionStatus: z.enum(["Success", "Fault", "Unknown"]).optional(),
          network: z.string().optional(),
          paymentMethod: z.string().optional(),
          cvm: z.string().optional(),
          acquiringMode: z.string().optional(),
          deviceStatus: z.enum(["active", "inactive"]).optional(),
          acquirer: z.string().optional(),
          checkoutLocation: z.enum(["Staffed Checkout", "Self-checkout"]).optional(),
          notes: z.string().optional(),
          attemptedAt: z.string().optional(),
          isConclusiveFailure: z.boolean().optional()
        })
      }
    },
    async ({ location_id, input }) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "attempts.write");
      return withAudit(liveSession, "create_location_attempt", { location_id, input }, async () => {
        const attempt = await fluxaService.createLocationAttempt(liveSession.userId, location_id, input);
        return {
          summary: `Added a payment attempt to ${location_id}.`,
          data: attempt
        };
      });
    }
  );

  server.registerTool(
    "list_brands",
    {
      description: "List Fluxa brands with optional search and status filters. Read-only in V1.",
      inputSchema: {
        query: z.string().optional(),
        segment: z.enum(["Coffee", "Fast Food", "Retail", "Convenience"]).optional(),
        status: z.enum(["active", "inactive", "coming_soon"]).optional(),
        limit: z.number().int().min(1).max(100).optional()
      }
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "brands.read");
      return withAudit(liveSession, "list_brands", args, async () => {
        const brands = await fluxaService.listBrands(args);
        return {
          summary: `Loaded ${brands.length} brands.`,
          data: {
            total: brands.length,
            results: brands
          }
        };
      });
    }
  );

  server.registerTool(
    "list_card_album_cards",
    {
      description: "List public and personal card album cards.",
      inputSchema: {
        scope: z.enum(["all", "public", "personal"]).optional(),
        query: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional()
      }
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "cards.read");
      return withAudit(liveSession, "list_card_album_cards", args, async () => {
        const cards = await fluxaService.listCardAlbumCards(liveSession.userId, args);
        return {
          summary: `Loaded ${cards.length} cards.`,
          data: {
            total: cards.length,
            results: cards
          }
        };
      });
    }
  );

  server.registerTool(
    "create_card_album_card",
    {
      description: "Create a new card in the current user's public or personal card album.",
      inputSchema: {
        issuer: z.string().min(1),
        title: z.string().min(1),
        bin: z.string().min(1),
        organization: z.string().min(1),
        groupName: z.string().min(1),
        description: z.string().optional(),
        scope: z.enum(["public", "personal"]).optional()
      }
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "cards.write");
      return withAudit(liveSession, "create_card_album_card", args, async () => {
        const card = await fluxaService.createCardAlbumCard(liveSession.userId, args);
        return {
          summary: `Created ${card.scope} card ${card.title}.`,
          data: card
        };
      });
    }
  );

  server.registerTool(
    "create_personal_card",
    {
      description: "Create a new personal card in the current user's card album.",
      inputSchema: {
        issuer: z.string().min(1),
        title: z.string().min(1),
        bin: z.string().min(1),
        organization: z.string().min(1),
        groupName: z.string().min(1),
        description: z.string().optional()
      }
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "cards.write");
      return withAudit(liveSession, "create_personal_card", args, async () => {
        const card = await fluxaService.createCardAlbumCard(liveSession.userId, { ...args, scope: "personal" });
        return {
          summary: `Created personal card ${card.title}.`,
          data: card
        };
      });
    }
  );

  server.registerTool(
    "add_card_to_album",
    {
      description: "Copy an existing accessible card into the current user's public or personal card album.",
      inputSchema: {
        card_id: z.string().min(1),
        target_scope: z.enum(["public", "personal"]).optional()
      }
    },
    async ({ card_id, target_scope }) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "cards.write");
      return withAudit(liveSession, "add_card_to_album", { card_id, target_scope }, async () => {
        const resolvedTargetScope = target_scope || "personal";
        const result = await fluxaService.addCardToAlbum(liveSession.userId, card_id, resolvedTargetScope);
        return {
          summary: result.added
            ? `Copied card into ${resolvedTargetScope} album.`
            : `Card already exists in ${resolvedTargetScope} album.`,
          data: result
        };
      });
    }
  );

  server.registerTool(
    "add_public_card_to_personal",
    {
      description: "Copy a public card into the current user's personal card album.",
      inputSchema: {
        card_id: z.string().min(1)
      }
    },
    async ({ card_id }) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "cards.write");
      return withAudit(liveSession, "add_public_card_to_personal", { card_id }, async () => {
        const result = await fluxaService.addPublicCardToPersonal(liveSession.userId, card_id);
        return {
          summary: result.added ? "Copied public card into personal album." : "Card already exists in personal album.",
          data: result
        };
      });
    }
  );

  server.registerTool(
    "list_browsing_history",
    {
      description: "List the current user's browsing history.",
      inputSchema: {
        limit: z.number().int().min(1).max(500).optional()
      }
    },
    async ({ limit }) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "history.read");
      return withAudit(liveSession, "list_browsing_history", { limit }, async () => {
        const history = await fluxaService.listBrowsingHistory(liveSession.userId, limit);
        return {
          summary: `Loaded ${history.length} browsing history items.`,
          data: {
            total: history.length,
            results: history
          }
        };
      });
    }
  );

  server.registerTool(
    "clear_browsing_history",
    {
      description: "Clear the current user's browsing history."
    },
    async () => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "history.write");
      return withAudit(liveSession, "clear_browsing_history", {}, async () => {
        await fluxaService.clearBrowsingHistory(liveSession.userId);
        return {
          summary: "Cleared browsing history.",
          data: {
            cleared: true
          }
        };
      });
    }
  );

  server.registerTool(
    "get_my_profile",
    {
      description: "Get the current user's Fluxa profile."
    },
    async () => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "profile.read");
      return withAudit(liveSession, "get_my_profile", {}, async () => {
        const profile = await fluxaService.getProfile(liveSession.userId);
        return {
          summary: "Loaded current user profile.",
          data: profile
        };
      });
    }
  );

  server.registerTool(
    "update_my_profile",
    {
      description: "Update the current user's profile metadata.",
      inputSchema: {
        name: z.string(),
        location: z.string(),
        bio: z.string()
      }
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "profile.write");
      return withAudit(liveSession, "update_my_profile", args, async () => {
        const profile = await fluxaService.updateProfile(liveSession.userId, args);
        return {
          summary: "Updated current user profile.",
          data: profile
        };
      });
    }
  );

  return server;
}

app.get(["/health", "/api/health"], (_request, response) => {
  response.json({
    status: "ok",
    service: "fluxa-map-mcp-server",
    version: "0.1.0",
    configured: isSupabaseServerConfigured(),
    timestamp: new Date().toISOString()
  });
});

app.get("/api/mcp/templates", (_request, response) => {
  response.json({
    templates: SESSION_TEMPLATE_DEFINITIONS
  });
});

app.get("/api/mcp/sessions", async (request, response) => {
  try {
    const user = await authenticateUserRequest(request);
    const sessions = await sessionService.listSessions(user.id);
    response.json({
      sessions,
      publicBaseUrl: resolvePublicBaseUrl(request)
    });
  } catch (error) {
    response.status(getErrorStatus(error, 401)).json({
      error: getErrorMessage(error, "Unable to list MCP sessions.")
    });
  }
});

app.post("/api/mcp/sessions", async (request, response) => {
  try {
    const user = await authenticateUserRequest(request);
    const { sessionLabel, clientType, scopeTemplate } = request.body as {
      sessionLabel?: string;
      clientType?: "generic" | "claude_desktop" | "cherry_studio" | "codex";
      scopeTemplate?: "standard_user";
    };

    const created = await sessionService.createSession(user.id, {
      sessionLabel,
      clientType,
      scopeTemplate
    });

    response.status(201).json({
      session: created.session,
      sessionToken: created.sessionToken,
      connectionUrl: buildSessionConnectionUrl(request, created.sessionToken),
      publicBaseUrl: resolvePublicBaseUrl(request)
    });
  } catch (error) {
    response.status(getErrorStatus(error, 400)).json({
      error: getErrorMessage(error, "Unable to create MCP session.")
    });
  }
});

app.post("/api/mcp/sessions/:id/revoke", async (request, response) => {
  try {
    const user = await authenticateUserRequest(request);
    await sessionService.revokeSession(user.id, request.params.id);
    response.status(204).end();
  } catch (error) {
    response.status(getErrorStatus(error, 400)).json({
      error: getErrorMessage(error, "Unable to revoke MCP session.")
    });
  }
});

app.all(["/mcp/:sessionToken", "/api/mcp/:sessionToken"], async (request, response) => {
  const sessionTokenParam = request.params.sessionToken;
  const rawSessionToken = Array.isArray(sessionTokenParam) ? sessionTokenParam[0]?.trim() : sessionTokenParam?.trim();
  if (!rawSessionToken) {
    response.status(400).json({ error: "Missing MCP session token in path." });
    return;
  }

  try {
    await sessionService.authenticateMcpSession(rawSessionToken);
  } catch (error) {
    response.status(getErrorStatus(error, 401)).json({
      error: getErrorMessage(error, "Invalid MCP session.")
    });
    return;
  }

  try {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    const server = createMcpServer(rawSessionToken);

    transport.onclose = () => {
      void server.close();
    };

    await server.connect(transport);
    await transport.handleRequest(request, response, request.body);
  } catch (error) {
    console.error("Failed to handle MCP request.", error);
    if (!response.headersSent) {
      response.status(getErrorStatus(error, 500)).json({
        jsonrpc: "2.0",
        error: {
          code: error instanceof ConfigurationError ? -32001 : -32603,
          message: getErrorMessage(error, "Internal MCP server error.")
        },
        id: null
      });
    }
  }
});

export default app;
