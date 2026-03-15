const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_PRIMARY_MODEL = "openrouter/healer-alpha";

type RuntimeEnvironment = "development" | "preview" | "production";
type ModelFamily = "gai" | "openai" | "meta" | "google" | "other";

const FAMILY_PRIORITY: ModelFamily[] = ["gai", "openai", "meta", "google", "other"];

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

class NonRetryableAiError extends Error {}

const MODEL_CATALOG: ModelDescriptor[] = [
  { id: "openrouter/healer-alpha", family: "gai" },
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

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseModelList(value: string | undefined): string[] {
  return normalizeString(value)
    .split(",")
    .map((entry) => entry.trim())
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

function dedupeModels(models: string[]): string[] {
  const seen = new Set<string>();
  const catalogIds = new Set(MODEL_CATALOG.map((entry) => entry.id));

  return models.filter((model) => {
    const normalized = normalizeString(model);
    if (!normalized || seen.has(normalized) || !catalogIds.has(normalized)) {
      return false;
    }

    seen.add(normalized);
    return true;
  });
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

function resolveModelOrder(): {
  environment: RuntimeEnvironment;
  models: string[];
} {
  const environment = detectEnvironment();
  const legacyPrimary = normalizeString(Deno.env.get("OPENROUTER_MODEL"));
  const configuredPrimary = normalizeString(Deno.env.get("OPENROUTER_MODEL_PRIMARY"));
  const primaryModel = configuredPrimary || legacyPrimary || DEFAULT_PRIMARY_MODEL;
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
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
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
  return resolveModelOrder().models[0] || DEFAULT_PRIMARY_MODEL;
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

  const { environment, models } = resolveModelOrder();
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
        if (isRetryableStatus(response.status)) {
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
        failures.push(`${model}: invalid structured response`);
        continue;
      }

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

      failures.push(`${model}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(buildFailureMessage(attemptedModels, failures));
}
