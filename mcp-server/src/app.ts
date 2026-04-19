import { Readable } from "node:stream";
import express, { type Request as ExpressRequest } from "express";
import cors from "cors";
import * as z from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { AuditLogService } from "./audit-log-service.js";
import { type MCPScopeKey, SESSION_TEMPLATE_DEFINITIONS } from "./constants.js";
import { FluxaService } from "./fluxa-service.js";
import { StatisticsService } from "./statistics-service.js";
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
const statisticsService = new StatisticsService(fluxaService);
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

function resolvePublicBaseUrl(request?: ExpressRequest): string {
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

function getBearerToken(request: ExpressRequest): string {
  const authorization = request.headers.authorization || "";
  if (!authorization.startsWith("Bearer ")) {
    throw new Error("Missing Authorization bearer token.");
  }

  return authorization.slice("Bearer ".length).trim();
}

async function authenticateUserRequest(request: ExpressRequest) {
  const accessToken = getBearerToken(request);
  const user = await sessionService.authenticateBearerToken(accessToken);
  return user;
}

function getSessionIdFromRequest(request: ExpressRequest): string {
  const bodyId =
    request.body && typeof request.body === "object" && "id" in (request.body as Record<string, unknown>)
      ? (request.body as Record<string, unknown>).id
      : null;
  const queryId = request.query?.id;
  const candidates = [
    typeof bodyId === "string" ? bodyId : null,
    typeof queryId === "string" ? queryId : Array.isArray(queryId) ? queryId[0] : null
  ];

  const sessionId = candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (!sessionId) {
    throw new Error("Missing MCP session id.");
  }

  return sessionId.trim();
}

function buildSessionConnectionUrl(request: ExpressRequest, sessionToken: string): string {
  return `${resolvePublicBaseUrl(request)}/mcp/${sessionToken}`;
}

function getMcpSessionTokenFromRequest(request: ExpressRequest): string {
  const pathToken = request.params.sessionToken;
  const queryToken = request.query?.sessionToken;
  const candidates = [
    Array.isArray(pathToken) ? pathToken[0] : pathToken,
    typeof queryToken === "string" ? queryToken : Array.isArray(queryToken) ? queryToken[0] : null
  ];

  const sessionToken = candidates.find((value): value is string => typeof value === "string" && value.trim().length > 0);
  if (!sessionToken) {
    throw new Error("Missing MCP session token.");
  }

  return sessionToken.trim();
}

function normalizeMcpAcceptHeader(method: string, headers: Headers): void {
  const currentAccept = headers.get("accept") || "";
  const normalizedAccept = currentAccept.toLowerCase();
  const upperMethod = method.toUpperCase();

  if (upperMethod === "GET" || upperMethod === "HEAD") {
    if (!normalizedAccept.includes("text/event-stream")) {
      headers.set("accept", currentAccept ? `${currentAccept}, text/event-stream` : "text/event-stream");
    }
    return;
  }

  if (upperMethod === "POST") {
    const acceptsJson = normalizedAccept.includes("application/json");
    const acceptsEventStream = normalizedAccept.includes("text/event-stream");
    if (!acceptsJson || !acceptsEventStream) {
      headers.set(
        "accept",
        currentAccept ? `${currentAccept}, application/json, text/event-stream` : "application/json, text/event-stream"
      );
    }
  }
}

function buildWebRequestFromExpress(request: ExpressRequest): globalThis.Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  normalizeMcpAcceptHeader(request.method, headers);
  const url = new URL(request.originalUrl || request.url, resolvePublicBaseUrl(request));
  return new Request(url.toString(), {
    method: request.method,
    headers
  });
}

async function sendWebResponseToExpress(webResponse: Response, response: express.Response): Promise<void> {
  response.status(webResponse.status);
  webResponse.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });

  if (!webResponse.body) {
    response.end();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const nodeStream = Readable.fromWeb(webResponse.body as any);
    nodeStream.on("error", reject);
    response.on("close", resolve);
    response.on("finish", resolve);
    response.on("error", reject);
    nodeStream.pipe(response);
  });
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

const createLocationInputShape = {
  name: z.string().min(1),
  address: z.string().min(1),
  brand: z.string().min(1),
  bin: z.string().min(1),
  city: z.string().optional(),
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
} satisfies z.ZodRawShape;

const mapBrandSearchInputShape = {
  brand: z.string().min(1),
  area: z.string().min(1),
  brand_aliases: z.array(z.string().min(1)).max(5).optional(),
  country_code: z.string().length(2).optional(),
  limit: z.number().int().min(1).max(1000).optional()
} satisfies z.ZodRawShape;

const mapBrandImportInputShape = {
  ...mapBrandSearchInputShape,
  bin: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().optional(),
  transactionStatus: z.enum(["Success", "Fault", "Unknown"]).optional(),
  network: z.string().optional(),
  paymentMethod: z.string().optional(),
  cvm: z.string().optional(),
  acquiringMode: z.string().optional(),
  acquirer: z.string().optional(),
  posModel: z.string().optional(),
  checkoutLocation: z.enum(["Staffed Checkout", "Self-checkout"]).optional(),
  attemptedAt: z.string().optional(),
  skip_existing: z.boolean().optional(),
  create_as_shell: z.boolean().optional()
} satisfies z.ZodRawShape;

const adminMapBrandSearchRequestSchema = z.object({
  brand: z.string().trim().min(1),
  area: z.string().trim().min(1),
  brandAliases: z.array(z.string().trim().min(1)).max(5).optional(),
  countryCode: z.string().trim().length(2).optional(),
  limit: z.number().int().min(1).max(1000).optional()
});

const adminMapBrandImportRequestSchema = adminMapBrandSearchRequestSchema.extend({
  bin: z.string().trim().optional(),
  status: z.enum(["active", "inactive"]).optional(),
  notes: z.string().trim().optional(),
  transactionStatus: z.enum(["Success", "Fault", "Unknown"]).optional(),
  network: z.string().trim().optional(),
  paymentMethod: z.string().trim().optional(),
  cvm: z.string().trim().optional(),
  acquiringMode: z.string().trim().optional(),
  acquirer: z.string().trim().optional(),
  posModel: z.string().trim().optional(),
  checkoutLocation: z.enum(["Staffed Checkout", "Self-checkout"]).optional(),
  attemptedAt: z.string().trim().optional(),
  skipExisting: z.boolean().optional(),
  createAsShell: z.boolean().optional()
});

const adminUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  query: z.string().trim().optional()
});

const adminStatisticsQuerySchema = z.object({
  topN: z.coerce.number().int().min(1).max(25).optional()
});

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
        const stats = await statisticsService.getSiteStatistics({ topN: top_n });
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
    "search_brand_locations_on_map",
    {
      description:
        "Search map POI data for all matching stores of a brand inside a named area, returning normalized addresses and coordinates.",
      inputSchema: mapBrandSearchInputShape
    },
    async ({ brand, area, brand_aliases, country_code, limit }) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "locations.read");
      return withAudit(
        liveSession,
        "search_brand_locations_on_map",
        { brand, area, brand_aliases, country_code, limit },
        async () => {
          const search = await fluxaService.searchBrandLocationsOnMap({
            brand,
            area,
            brandAliases: brand_aliases,
            countryCode: country_code,
            limit
          });
          return {
            summary: `Found ${search.total} ${brand} map matches inside ${search.resolvedArea.name}.`,
            data: search
          };
        }
      );
    }
  );

  server.registerTool(
    "bulk_import_brand_locations_from_map",
    {
      description:
        "Admin-only. Search a named area for a brand's stores on the map, then dedupe and bulk-create Fluxa locations from those results. Set create_as_shell=true to seed shell locations without any attempt record.",
      inputSchema: mapBrandImportInputShape
    },
    async ({ brand, area, brand_aliases, country_code, limit, bin, status, notes, transactionStatus, network, paymentMethod, cvm, acquiringMode, acquirer, posModel, checkoutLocation, attemptedAt, skip_existing, create_as_shell }) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "locations.write");
      return withAudit(
        liveSession,
        "bulk_import_brand_locations_from_map",
        {
          brand,
          area,
          brand_aliases,
          country_code,
          limit,
          bin,
          status,
          notes,
          transactionStatus,
          network,
          paymentMethod,
          cvm,
          acquiringMode,
          acquirer,
          posModel,
          checkoutLocation,
          attemptedAt,
          skip_existing,
          create_as_shell
        },
        async () => {
          const result = await fluxaService.bulkImportBrandLocationsFromMap(liveSession.userId, {
            brand,
            area,
            brandAliases: brand_aliases,
            countryCode: country_code,
            limit,
            bin,
            status,
            notes,
            transactionStatus,
            network,
            paymentMethod,
            cvm,
            acquiringMode,
            acquirer,
            posModel,
            checkoutLocation,
            attemptedAt,
            skipExisting: skip_existing,
            createAsShell: create_as_shell
          });
          return {
            summary: `Map import finished: ${result.createdCount} created, ${result.skippedCount} skipped, ${result.failureCount} failed.`,
            data: result
          };
        }
      );
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
      inputSchema: createLocationInputShape
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "locations.write");
      return withAudit(liveSession, "create_location", args, async () => {
        const location = await fluxaService.createLocation(liveSession.userId, args, {
          allowMissingCity: await fluxaService.isAdminUser(liveSession.userId)
        });
        return {
          summary: `Created location ${location.name}.`,
          data: location
        };
      });
    }
  );

  server.registerTool(
    "create_shell_location",
    {
      description: "Create a new shell Fluxa location in fluxa_locations without writing any payment attempt record.",
      inputSchema: createLocationInputShape
    },
    async (args) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "locations.write");
      return withAudit(liveSession, "create_shell_location", args, async () => {
        const location = await fluxaService.createShellLocation(liveSession.userId, args, {
          allowMissingCity: await fluxaService.isAdminUser(liveSession.userId)
        });
        return {
          summary: `Created shell location ${location.name}.`,
          data: location
        };
      });
    }
  );

  server.registerTool(
    "bulk_create_locations",
    {
      description:
        "Admin-only. Batch create multiple Fluxa locations in one call. City can be omitted and will be inferred from address when possible. Set create_as_shell=true to seed shell locations without any attempt record.",
      inputSchema: {
        locations: z.array(z.object(createLocationInputShape)).min(1).max(100),
        create_as_shell: z.boolean().optional()
      }
    },
    async ({ locations, create_as_shell }) => {
      const liveSession = await sessionService.authenticateMcpSession(sessionToken);
      ensureScope(liveSession, "locations.write");
      return withAudit(liveSession, "bulk_create_locations", { locations, create_as_shell }, async () => {
        const results = await fluxaService.bulkCreateLocations(liveSession.userId, locations, {
          createAsShell: create_as_shell
        });
        const successCount = results.filter((item) => item.success).length;
        return {
          summary: `Bulk create finished: ${successCount}/${results.length} locations created.`,
          data: {
            total: results.length,
            successCount,
            failureCount: results.length - successCount,
            results
          }
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

app.post("/api/mcp/sessions/revoke", async (request, response) => {
  try {
    const user = await authenticateUserRequest(request);
    const sessionId = getSessionIdFromRequest(request);
    await sessionService.revokeSession(user.id, sessionId);
    response.status(204).end();
  } catch (error) {
    response.status(getErrorStatus(error, 400)).json({
      error: getErrorMessage(error, "Unable to revoke MCP session.")
    });
  }
});

app.get("/api/admin/users", async (request, response) => {
  try {
    const user = await authenticateUserRequest(request);
    await fluxaService.requireAdminUser(user.id);
    const parsed = adminUsersQuerySchema.parse(request.query);
    const result = await fluxaService.listAdminUsers({
      limit: parsed.limit,
      query: parsed.query
    });

    response.json(result);
  } catch (error) {
    response.status(getErrorStatus(error, 400)).json({
      error: getErrorMessage(error, "Unable to load admin users.")
    });
  }
});

app.get("/api/admin/statistics", async (request, response) => {
  try {
    const user = await authenticateUserRequest(request);
    await fluxaService.requireAdminUser(user.id);
    const parsed = adminStatisticsQuerySchema.parse(request.query);
    const result = await statisticsService.getSiteStatistics({
      topN: parsed.topN
    });

    response.json(result);
  } catch (error) {
    response.status(getErrorStatus(error, 400)).json({
      error: getErrorMessage(error, "Unable to load admin statistics.")
    });
  }
});

app.post("/api/admin/brand-map-search", async (request, response) => {
  try {
    const user = await authenticateUserRequest(request);
    await fluxaService.requireAdminUser(user.id);
    const parsed = adminMapBrandSearchRequestSchema.parse(request.body);
    const result = await fluxaService.searchBrandLocationsOnMap({
      brand: parsed.brand,
      area: parsed.area,
      brandAliases: parsed.brandAliases,
      countryCode: parsed.countryCode,
      limit: parsed.limit
    });

    response.json(result);
  } catch (error) {
    response.status(getErrorStatus(error, 400)).json({
      error: getErrorMessage(error, "Unable to search brand locations on the map.")
    });
  }
});

app.post("/api/admin/brand-map-import", async (request, response) => {
  try {
    const user = await authenticateUserRequest(request);
    const parsed = adminMapBrandImportRequestSchema.parse(request.body);
    const result = await fluxaService.bulkImportBrandLocationsFromMap(user.id, {
      brand: parsed.brand,
      area: parsed.area,
      brandAliases: parsed.brandAliases,
      countryCode: parsed.countryCode,
      limit: parsed.limit,
      bin: parsed.bin,
      status: parsed.status,
      notes: parsed.notes,
      transactionStatus: parsed.transactionStatus,
      network: parsed.network,
      paymentMethod: parsed.paymentMethod,
      cvm: parsed.cvm,
      acquiringMode: parsed.acquiringMode,
      acquirer: parsed.acquirer,
      posModel: parsed.posModel,
      checkoutLocation: parsed.checkoutLocation,
      attemptedAt: parsed.attemptedAt,
      skipExisting: parsed.skipExisting,
      createAsShell: parsed.createAsShell
    });

    response.json(result);
  } catch (error) {
    response.status(getErrorStatus(error, 400)).json({
      error: getErrorMessage(error, "Unable to import brand locations from the map.")
    });
  }
});

app.all(["/mcp/:sessionToken", "/api/mcp/:sessionToken", "/mcp", "/api/mcp/connect"], async (request, response) => {
  let rawSessionToken = "";
  try {
    rawSessionToken = getMcpSessionTokenFromRequest(request);
  } catch (error) {
    response.status(getErrorStatus(error, 400)).json({
      error: getErrorMessage(error, "Missing MCP session token.")
    });
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
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });
    const server = createMcpServer(rawSessionToken);
    let isClosingServer = false;
    const closeServer = () => {
      if (isClosingServer) {
        return;
      }
      isClosingServer = true;
      void server.close().catch((closeError) => {
        console.error("Failed to close MCP server.", closeError);
      });
    };

    transport.onclose = closeServer;

    await server.connect(transport);
    const webRequest = buildWebRequestFromExpress(request);
    const webResponse = await transport.handleRequest(webRequest, {
      parsedBody: request.body
    });
    void response.on("close", () => {
      closeServer();
    });
    await sendWebResponseToExpress(webResponse, response);
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
