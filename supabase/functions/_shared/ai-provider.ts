const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_ENDPOINT = "https://openrouter.ai/api/v1/models";
const DEFAULT_PRIMARY_MODEL = "xiaomi/mimo-v2-omni";
const DEFAULT_DISCOVERED_FREE_MODEL_LIMIT = 12;
const DEFAULT_DISCOVERED_FREE_MODEL_CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_MODEL_UNAVAILABLE_TTL_MS = 30 * 60 * 1000;

type RuntimeEnvironment = "development" | "preview" | "production";
type ModelFamily = "gai" | "openai" | "meta" | "google" | "other";

const FAMILY_PRIORITY: ModelFamily[] = ["gai", "openai", "meta", "google", "other"];

const MODEL_ALIASES: Record<string, string> = {
  "openrouter/healer-alpha": "xiaomi/mimo-v2-omni"
};

export interface OpenRouterMessage {
  role: "assistant" | "system" | "user";
  content: string;
}

export interface StructuredCompletionOptions<T> {
  maxTokens: number;
  messages: OpenRouterMessage[];
  parse: (content: unknown) => T | null;
  request: Request;
  responseFormat?: { type: "json_object" };
  temperature?: number;
  title?: string;
}

export interface StructuredCompletionResult<T> {
  attemptedModels: string[];
  content: string;
  environment: RuntimeEnvironment;
  model: string;
  parsed: T;
  payload: Record<string, unknown>;
}

interface ModelDescriptor {
  family: ModelFamily;
  id: string;
}

interface DiscoveredModelDescriptor {
  contextLength: number;
  id: string;
  inputModalities: string[];
  isModerated: boolean;
  maxCompletionTokens: number;
  outputModalities: string[];
  promptPrice: number | null;
  completionPrice: number | null;
  supportedParameters: string[];
}

interface DiscoveredFreeModelCacheEntry {
  expiresAt: number;
  models: string[];
}

class NonRetryableAiError extends Error {}

const MODEL_CATALOG: ModelDescriptor[] = [
  { id: "xiaomi/mimo-v2-omni", family: "gai" },
  { id: "openai/gpt-oss-120b:free", family: "openai" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", family: "meta" },
  { id: "google/gemma-3-27b-it:free", family: "google" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", family: "other" },
  { id: "stepfun/step-3.5-flash:free", family: "other" },
  { id: "arcee-ai/trinity-large-preview:free", family: "other" },
  { id: "liquid/lfm-2.5-1.2b-thinking:free", family: "other" },
  { id: "liquid/lfm-2.5-1.2b-instruct:free", family: "other" },
  { id: "arcee-ai/trinity-mini:free", family: "other" },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", family: "other" },
  { id: "z-ai/glm-4.5-air:free", family: "other" },
  { id: "qwen/qwen3-coder:free", family: "other" }
];

const DEFAULT_OTHER_MODELS_BY_ENV: Record<RuntimeEnvironment, string[]> = {
  development: [
    "qwen/qwen3-coder:free",
    "stepfun/step-3.5-flash:free",
    "arcee-ai/trinity-mini:free",
    "liquid/lfm-2.5-1.2b-instruct:free",
    "liquid/lfm-2.5-1.2b-thinking:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "arcee-ai/trinity-large-preview:free",
    "z-ai/glm-4.5-air:free"
  ],
  preview: [
    "stepfun/step-3.5-flash:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "arcee-ai/trinity-large-preview:free",
    "z-ai/glm-4.5-air:free",
    "qwen/qwen3-coder:free",
    "arcee-ai/trinity-mini:free",
    "liquid/lfm-2.5-1.2b-thinking:free",
    "liquid/lfm-2.5-1.2b-instruct:free"
  ],
  production: [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "z-ai/glm-4.5-air:free",
    "stepfun/step-3.5-flash:free",
    "arcee-ai/trinity-large-preview:free",
    "qwen/qwen3-coder:free",
    "arcee-ai/trinity-mini:free",
    "liquid/lfm-2.5-1.2b-thinking:free",
    "liquid/lfm-2.5-1.2b-instruct:free"
  ]
};

let fallbackRotationCursor = 0;
let discoveredFreeModelCache: DiscoveredFreeModelCacheEntry | null = null;
const unavailableModels = new Map<string, number>();

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .map((entry) => normalizeString(entry))
        .filter(Boolean)
    : [];
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function canonicalizeModelId(value: string): string {
  const normalized = normalizeString(value);
  return MODEL_ALIASES[normalized] || normalized;
}

function parseModelList(value: string | undefined): string[] {
  return normalizeString(value)
    .split(",")
    .map((entry) => canonicalizeModelId(entry))
    .filter(Boolean);
}

function normalizeEnvironment(value: string | undefined): RuntimeEnvironment | null {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (["dev", "development", "local", "test"].includes(normalized)) {
    return "development";
  }

  if (["preview", "preprod", "qa", "staging", "stage"].includes(normalized)) {
    return "preview";
  }

  if (["live", "prod", "production"].includes(normalized)) {
    return "production";
  }

  return null;
}

function detectEnvironment(): RuntimeEnvironment {
  const explicitEnvironment = normalizeEnvironment(Deno.env.get("OPENROUTER_MODEL_ENV"));
  if (explicitEnvironment) {
    return explicitEnvironment;
  }

  const inferredEnvironment =
    normalizeEnvironment(Deno.env.get("APP_ENV")) ||
    normalizeEnvironment(Deno.env.get("SUPABASE_ENV")) ||
    normalizeEnvironment(Deno.env.get("ENVIRONMENT")) ||
    normalizeEnvironment(Deno.env.get("NODE_ENV")) ||
    normalizeEnvironment(Deno.env.get("DENO_ENV"));

  if (inferredEnvironment) {
    return inferredEnvironment;
  }

  return Deno.env.get("DENO_DEPLOYMENT_ID") ? "production" : "development";
}

function getBooleanEnv(name: string, fallback: boolean): boolean {
  const normalized = normalizeString(Deno.env.get(name)).toLowerCase();
  if (!normalized) {
    return fallback;
  }

  return !["0", "false", "off", "no"].includes(normalized);
}

function getPositiveIntegerEnv(name: string, fallback: number): number {
  const parsed = Number(normalizeString(Deno.env.get(name)));
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function shouldDiscoverFreeModels(): boolean {
  return getBooleanEnv("OPENROUTER_DISCOVER_FREE_MODELS", true);
}

function getDiscoveredFreeModelLimit(): number {
  return getPositiveIntegerEnv("OPENROUTER_DISCOVER_FREE_MODEL_LIMIT", DEFAULT_DISCOVERED_FREE_MODEL_LIMIT);
}

function getDiscoveredFreeModelCacheTtlMs(): number {
  return getPositiveIntegerEnv("OPENROUTER_DISCOVER_FREE_MODEL_CACHE_MS", DEFAULT_DISCOVERED_FREE_MODEL_CACHE_TTL_MS);
}

function getModelUnavailableTtlMs(): number {
  return getPositiveIntegerEnv("OPENROUTER_MODEL_UNAVAILABLE_TTL_MS", DEFAULT_MODEL_UNAVAILABLE_TTL_MS);
}

function dedupeModels(models: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const model of models) {
    const normalized = canonicalizeModelId(model);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(normalized);
  }

  return deduped;
}

function shouldRotateFallbacks(): boolean {
  const value = normalizeString(Deno.env.get("OPENROUTER_ROTATE_FALLBACKS")).toLowerCase();
  if (!value) {
    return true;
  }

  return !["0", "false", "off", "no"].includes(value);
}

function rotateFallbacks(models: string[]): string[] {
  if (!shouldRotateFallbacks() || models.length <= 1) {
    return models;
  }

  const offset = fallbackRotationCursor % models.length;
  fallbackRotationCursor = (fallbackRotationCursor + 1) % models.length;
  return [...models.slice(offset), ...models.slice(0, offset)];
}

function getDefaultModelPool(environment: RuntimeEnvironment): string[] {
  return FAMILY_PRIORITY.flatMap((family) => {
    if (family === "other") {
      return DEFAULT_OTHER_MODELS_BY_ENV[environment];
    }

    return MODEL_CATALOG.filter((entry) => entry.family === family).map((entry) => entry.id);
  });
}

function getConfiguredBasePool(environment: RuntimeEnvironment): string[] {
  const envSuffix = environment.toUpperCase();
  const envSpecificPool = parseModelList(Deno.env.get(`OPENROUTER_MODEL_POOL_${envSuffix}`));
  if (envSpecificPool.length > 0) {
    return envSpecificPool;
  }

  const sharedPool = parseModelList(Deno.env.get("OPENROUTER_MODEL_POOL"));
  if (sharedPool.length > 0) {
    return sharedPool;
  }

  return getDefaultModelPool(environment);
}

function resolveConfiguredModelOrder(): {
  environment: RuntimeEnvironment;
  models: string[];
} {
  const environment = detectEnvironment();
  const legacyPrimary = normalizeString(Deno.env.get("OPENROUTER_MODEL"));
  const configuredPrimary = normalizeString(Deno.env.get("OPENROUTER_MODEL_PRIMARY"));
  const primaryModel = canonicalizeModelId(configuredPrimary || legacyPrimary || DEFAULT_PRIMARY_MODEL);
  const disabledModels = new Set(parseModelList(Deno.env.get("OPENROUTER_DISABLED_MODELS")));
  const basePool = getConfiguredBasePool(environment);
  const dedupedModels = dedupeModels([primaryModel, ...basePool]).filter((model) => !disabledModels.has(model));

  if (dedupedModels.length === 0) {
    return {
      environment,
      models: [DEFAULT_PRIMARY_MODEL]
    };
  }

  const [firstModel, ...fallbackModels] = dedupedModels;
  return {
    environment,
    models: [firstModel, ...rotateFallbacks(fallbackModels)]
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 404 || status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function isRetryableOpenRouterFailure(status: number, errorText: string): boolean {
  if (isRetryableStatus(status)) {
    return true;
  }

  if (status !== 400) {
    return false;
  }

  const normalized = errorText.toLowerCase();
  return (
    normalized.includes("provider returned error") ||
    normalized.includes("developer instruction") ||
    normalized.includes("invalid_argument") ||
    normalized.includes("not enabled for") ||
    normalized.includes("unsupported") ||
    normalized.includes("does not support") ||
    normalized.includes("response_format") ||
    normalized.includes("structured_outputs")
  );
}

function markModelUnavailable(model: string): void {
  unavailableModels.set(canonicalizeModelId(model), Date.now() + getModelUnavailableTtlMs());
}

function clearModelUnavailable(model: string): void {
  unavailableModels.delete(canonicalizeModelId(model));
}

function isModelUnavailable(model: string): boolean {
  const normalized = canonicalizeModelId(model);
  const expiresAt = unavailableModels.get(normalized);
  if (!expiresAt) {
    return false;
  }

  if (expiresAt <= Date.now()) {
    unavailableModels.delete(normalized);
    return false;
  }

  return true;
}

function filterUnavailableModels(models: string[]): string[] {
  const availableModels = models.filter((model) => !isModelUnavailable(model));
  return availableModels.length > 0 ? availableModels : models;
}

function normalizeDiscoveredModel(record: unknown): DiscoveredModelDescriptor | null {
  if (!record || typeof record !== "object") {
    return null;
  }

  const payload = record as Record<string, unknown>;
  const id = canonicalizeModelId(normalizeString(payload.id));
  if (!id || id.startsWith("openrouter/")) {
    return null;
  }

  const architecture =
    payload.architecture && typeof payload.architecture === "object"
      ? (payload.architecture as Record<string, unknown>)
      : null;
  const topProvider =
    payload.top_provider && typeof payload.top_provider === "object"
      ? (payload.top_provider as Record<string, unknown>)
      : null;
  const pricing =
    payload.pricing && typeof payload.pricing === "object"
      ? (payload.pricing as Record<string, unknown>)
      : null;

  return {
    contextLength: normalizeNumber(payload.context_length) || normalizeNumber(topProvider?.context_length) || 0,
    id,
    inputModalities: normalizeStringList(architecture?.input_modalities),
    isModerated: Boolean(topProvider?.is_moderated),
    maxCompletionTokens: normalizeNumber(topProvider?.max_completion_tokens) || 0,
    outputModalities: normalizeStringList(architecture?.output_modalities),
    promptPrice: normalizeNumber(pricing?.prompt),
    completionPrice: normalizeNumber(pricing?.completion),
    supportedParameters: normalizeStringList(payload.supported_parameters)
  };
}

function supportsStructuredResponses(model: DiscoveredModelDescriptor): boolean {
  return (
    model.supportedParameters.includes("response_format") ||
    model.supportedParameters.includes("structured_outputs")
  );
}

function isEligibleDiscoveredModel(model: DiscoveredModelDescriptor): boolean {
  return (
    model.promptPrice === 0 &&
    model.completionPrice === 0 &&
    model.inputModalities.includes("text") &&
    model.outputModalities.includes("text") &&
    supportsStructuredResponses(model)
  );
}

function isTextOnlyModel(model: DiscoveredModelDescriptor): boolean {
  return model.inputModalities.length === 1 && model.inputModalities[0] === "text";
}

function getStaticPoolPriority(environment: RuntimeEnvironment, modelId: string): number {
  const index = getDefaultModelPool(environment).indexOf(modelId);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function compareDiscoveredModels(
  environment: RuntimeEnvironment,
  left: DiscoveredModelDescriptor,
  right: DiscoveredModelDescriptor
): number {
  const leftStaticPriority = getStaticPoolPriority(environment, left.id);
  const rightStaticPriority = getStaticPoolPriority(environment, right.id);
  if (leftStaticPriority !== rightStaticPriority) {
    return leftStaticPriority - rightStaticPriority;
  }

  const textOnlyDelta = Number(isTextOnlyModel(right)) - Number(isTextOnlyModel(left));
  if (textOnlyDelta !== 0) {
    return textOnlyDelta;
  }

  const moderationDelta = Number(left.isModerated) - Number(right.isModerated);
  if (moderationDelta !== 0) {
    return moderationDelta;
  }

  if (left.maxCompletionTokens !== right.maxCompletionTokens) {
    return right.maxCompletionTokens - left.maxCompletionTokens;
  }

  if (left.contextLength !== right.contextLength) {
    return right.contextLength - left.contextLength;
  }

  return left.id.localeCompare(right.id);
}

async function discoverFreeModels(
  request: Request,
  openRouterApiKey: string,
  environment: RuntimeEnvironment
): Promise<string[]> {
  if (!shouldDiscoverFreeModels()) {
    return [];
  }

  const now = Date.now();
  if (discoveredFreeModelCache && discoveredFreeModelCache.expiresAt > now) {
    return discoveredFreeModelCache.models;
  }

  try {
    const response = await fetch(OPENROUTER_MODELS_ENDPOINT, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${openRouterApiKey}`,
        "HTTP-Referer": getOrigin(request),
        "X-Title": "Fluxa Map Model Discovery"
      }
    });

    if (!response.ok) {
      throw new Error(`OpenRouter returned ${response.status}`);
    }

    const payload = await response.json();
    const safePayload = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    const records = Array.isArray(safePayload.data) ? safePayload.data : [];
    const models = records
      .map((entry) => normalizeDiscoveredModel(entry))
      .filter((entry): entry is DiscoveredModelDescriptor => Boolean(entry))
      .filter((entry) => isEligibleDiscoveredModel(entry))
      .sort((left, right) => compareDiscoveredModels(environment, left, right))
      .slice(0, getDiscoveredFreeModelLimit())
      .map((entry) => entry.id);

    discoveredFreeModelCache = {
      expiresAt: now + getDiscoveredFreeModelCacheTtlMs(),
      models
    };
    return models;
  } catch {
    return discoveredFreeModelCache?.models || [];
  }
}

async function resolveModelOrder(
  request: Request,
  openRouterApiKey: string
): Promise<{
  environment: RuntimeEnvironment;
  models: string[];
}> {
  const configured = resolveConfiguredModelOrder();
  const discoveredModels = await discoverFreeModels(request, openRouterApiKey, configured.environment);
  const mergedModels = dedupeModels([...configured.models, ...discoveredModels]);
  const models = filterUnavailableModels(mergedModels);

  return {
    environment: configured.environment,
    models: models.length > 0 ? models : [DEFAULT_PRIMARY_MODEL]
  };
}

function extractMessageContent(payload: Record<string, unknown>): string {
  const choice = Array.isArray(payload.choices) ? payload.choices[0] : null;
  const message = choice && typeof choice === "object" ? (choice as Record<string, unknown>).message : null;
  const content = message && typeof message === "object" ? (message as Record<string, unknown>).content : null;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (typeof entry === "string") {
          return entry;
        }

        if (entry && typeof entry === "object" && typeof (entry as Record<string, unknown>).text === "string") {
          return String((entry as Record<string, unknown>).text);
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  return "";
}

function buildFailureMessage(models: string[], failures: string[]): string {
  const summary = failures.slice(0, 3).join(" | ");
  return `AI request failed after trying ${models.join(", ")}.${summary ? ` ${summary}` : ""}`;
}

function getOrigin(request: Request): string {
  return request.headers.get("origin") || request.headers.get("referer") || "https://supabase.com";
}

export function getPrimaryOpenRouterModel(): string {
  return resolveConfiguredModelOrder().models[0] || DEFAULT_PRIMARY_MODEL;
}

export function parseJsonCompletion<T>(content: unknown): T | null {
  if (typeof content !== "string" || !content.trim()) {
    return null;
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i) || content.match(/```\s*([\s\S]*?)```/i);
    if (!fencedMatch?.[1]) {
      return null;
    }

    try {
      return JSON.parse(fencedMatch[1]) as T;
    } catch {
      return null;
    }
  }
}

export async function requestStructuredCompletion<T>(
  options: StructuredCompletionOptions<T>
): Promise<StructuredCompletionResult<T>> {
  const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!openRouterApiKey) {
    throw new NonRetryableAiError("Missing OPENROUTER_API_KEY secret.");
  }

  const { environment, models } = await resolveModelOrder(options.request, openRouterApiKey);
  const attemptedModels: string[] = [];
  const failures: string[] = [];
  const origin = getOrigin(options.request);

  for (const model of models) {
    attemptedModels.push(model);

    try {
      const response = await fetch(OPENROUTER_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": origin,
          "X-Title": options.title || "Fluxa Map"
        },
        body: JSON.stringify({
          model,
          temperature: options.temperature ?? 0,
          max_tokens: options.maxTokens,
          response_format: options.responseFormat || { type: "json_object" },
          plugins: [{ id: "response-healing" }],
          messages: options.messages
        })
      });

      if (!response.ok) {
        const errorText = (await response.text()).slice(0, 600);
        const failureMessage = `${model}: OpenRouter returned ${response.status}${errorText ? ` - ${errorText}` : ""}`;
        if (isRetryableOpenRouterFailure(response.status, errorText)) {
          markModelUnavailable(model);
          failures.push(failureMessage);
          continue;
        }

        throw new NonRetryableAiError(failureMessage);
      }

      const payload = await response.json();
      const safePayload = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
      const content = extractMessageContent(safePayload);
      const parsed = options.parse(content);

      if (!parsed) {
        markModelUnavailable(model);
        failures.push(`${model}: invalid structured response`);
        continue;
      }

      clearModelUnavailable(model);

      return {
        attemptedModels,
        content,
        environment,
        model,
        parsed,
        payload: safePayload
      };
    } catch (error) {
      if (error instanceof NonRetryableAiError) {
        throw error;
      }

      markModelUnavailable(model);
      failures.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(buildFailureMessage(attemptedModels, failures));
}
