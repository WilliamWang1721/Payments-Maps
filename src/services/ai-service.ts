import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  AddLocationAssistantRequest,
  AddLocationAssistantPatch,
  AddLocationAssistantResult
} from "@/types/add-location-assistant";
import { buildDefaultSmartAddReviewPrompt } from "@/lib/smart-add-review";

export interface MerchantInferenceInput {
  city?: string;
  formattedAddress: string;
  poiCandidates: Array<{
    distance?: number | null;
    name: string;
    type?: string;
  }>;
}

interface MerchantInferenceResponse {
  merchantName: string | null;
}

export interface MerchantInferenceOutcome {
  error: string | null;
  merchantName: string | null;
}

export interface BrandMatchInput {
  brandCandidates: string[];
  city?: string;
  formattedAddress?: string;
  merchantName: string;
}

interface BrandMatchResponse {
  matchedBrand: string | null;
}

export interface BrandMatchOutcome {
  error: string | null;
  matchedBrand: string | null;
}

interface SmartAddAssistantResponse {
  assistantMessage?: unknown;
  draftPatch?: unknown;
  missingFields?: unknown;
  readyToSubmit?: unknown;
  searchQuery?: unknown;
  matchedCardId?: unknown;
  confirmationPrompt?: unknown;
}

const merchantInferenceCache = new Map<string, Promise<MerchantInferenceOutcome>>();
const brandMatchCache = new Map<string, Promise<BrandMatchOutcome>>();

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeString(item)).filter(Boolean);
}

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return fallback;
}

function normalizeMerchantName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || null;
}

function normalizeMatchedBrand(value: unknown, brandCandidates: string[]): string | null {
  const raw = normalizeString(value);
  if (!raw) {
    return null;
  }

  const exact = brandCandidates.find((candidate) => candidate === raw);
  if (exact) {
    return exact;
  }

  const normalized = raw.toLocaleLowerCase("en-US");
  return brandCandidates.find((candidate) => candidate.toLocaleLowerCase("en-US") === normalized) || null;
}

function normalizeDraftPatch(value: unknown): AddLocationAssistantPatch {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const patch = value as Record<string, unknown>;
  const nextPatch: AddLocationAssistantPatch = {};
  const stringFields = [
    "name",
    "address",
    "brand",
    "city",
    "bin",
    "network",
    "paymentMethod",
    "cvm",
    "acquiringMode",
    "acquirer",
    "posModel",
    "checkoutLocation",
    "attemptYear",
    "attemptMonth",
    "attemptDay",
    "notes",
    "transactionStatus"
  ] as const;

  stringFields.forEach((field) => {
    const normalized = normalizeString(patch[field]);
    if (normalized) {
      (nextPatch as Record<string, string>)[field] = normalized;
    }
  });

  const status = normalizeString(patch.status);
  if (status === "active" || status === "inactive") {
    nextPatch.status = status;
  }

  const lat = Number(patch.lat);
  if (Number.isFinite(lat)) {
    nextPatch.lat = lat;
  }

  const lng = Number(patch.lng);
  if (Number.isFinite(lng)) {
    nextPatch.lng = lng;
  }

  return nextPatch;
}

function normalizeConfirmationPrompt(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const prompt = value as Record<string, unknown>;
  const title = normalizeString(prompt.title);
  const description = normalizeString(prompt.description);
  const confirmLabel = normalizeString(prompt.confirmLabel);
  const reviseLabel = normalizeString(prompt.reviseLabel);

  if (!title && !description && !confirmLabel && !reviseLabel) {
    return null;
  }

  const fallback = buildDefaultSmartAddReviewPrompt();
  return {
    title: title || fallback.title,
    description: description || fallback.description,
    confirmLabel: confirmLabel || fallback.confirmLabel,
    reviseLabel: reviseLabel || fallback.reviseLabel
  };
}

function buildMerchantInferenceCacheKey(input: MerchantInferenceInput): string {
  return JSON.stringify({
    formattedAddress: input.formattedAddress,
    city: input.city || "",
    poiCandidates: input.poiCandidates
  });
}

function buildBrandMatchCacheKey(input: BrandMatchInput): string {
  return JSON.stringify({
    merchantName: input.merchantName,
    formattedAddress: input.formattedAddress || "",
    city: input.city || "",
    brandCandidates: input.brandCandidates
  });
}

async function requestMerchantInference(input: MerchantInferenceInput): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<MerchantInferenceResponse>("infer-merchant-name", {
    body: input
  });

  if (error) {
    throw error;
  }

  return normalizeMerchantName(data?.merchantName);
}

async function requestBrandMatch(input: BrandMatchInput): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<BrandMatchResponse>("infer-brand-match", {
    body: input
  });

  if (error) {
    throw error;
  }

  return normalizeMatchedBrand(data?.matchedBrand, input.brandCandidates);
}

async function requestSmartAddAssistant(input: AddLocationAssistantRequest): Promise<AddLocationAssistantResult> {
  const { data, error } = await supabase.functions.invoke<SmartAddAssistantResponse>("assist-add-location", {
    body: input
  });

  if (error) {
    throw error;
  }

  return {
    assistantMessage: normalizeString(data?.assistantMessage) || "我已经分析了你的输入，请继续补充地点和支付信息。",
    draftPatch: normalizeDraftPatch(data?.draftPatch),
    missingFields: normalizeStringList(data?.missingFields),
    readyToSubmit: Boolean(data?.readyToSubmit),
    searchQuery: normalizeString(data?.searchQuery) || null,
    matchedCardId: normalizeString(data?.matchedCardId) || null,
    confirmationPrompt: normalizeConfirmationPrompt(data?.confirmationPrompt)
  };
}

async function inferMerchantName(input: MerchantInferenceInput): Promise<MerchantInferenceOutcome> {
  if (!isSupabaseConfigured) {
    return {
      merchantName: null,
      error: "Supabase is not configured."
    };
  }

  const cacheKey = buildMerchantInferenceCacheKey(input);
  const cached = merchantInferenceCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const task = requestMerchantInference(input)
    .then((merchantName) => ({
      merchantName,
      error: null
    }))
    .catch((error) => {
      console.warn("[ai-service] Merchant inference failed:", error);
      return {
        merchantName: null,
        error: normalizeErrorMessage(error, "Merchant inference request failed.")
      };
    })
    .finally(() => {
      merchantInferenceCache.delete(cacheKey);
    });

  merchantInferenceCache.set(cacheKey, task);
  return task;
}

async function inferBrandMatch(input: BrandMatchInput): Promise<BrandMatchOutcome> {
  if (!isSupabaseConfigured) {
    return {
      matchedBrand: null,
      error: "Supabase is not configured."
    };
  }

  const merchantName = normalizeString(input.merchantName);
  const brandCandidates = input.brandCandidates.map((candidate) => normalizeString(candidate)).filter(Boolean);
  if (!merchantName || brandCandidates.length === 0) {
    return {
      matchedBrand: null,
      error: null
    };
  }

  const normalizedInput: BrandMatchInput = {
    merchantName,
    formattedAddress: normalizeString(input.formattedAddress),
    city: normalizeString(input.city),
    brandCandidates
  };

  const cacheKey = buildBrandMatchCacheKey(normalizedInput);
  const cached = brandMatchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const task = requestBrandMatch(normalizedInput)
    .then((matchedBrand) => ({
      matchedBrand,
      error: null
    }))
    .catch((error) => {
      console.warn("[ai-service] Brand match failed:", error);
      return {
        matchedBrand: null,
        error: normalizeErrorMessage(error, "Brand match request failed.")
      };
    })
    .finally(() => {
      brandMatchCache.delete(cacheKey);
    });

  brandMatchCache.set(cacheKey, task);
  return task;
}

async function runSmartAddAssistant(input: AddLocationAssistantRequest): Promise<AddLocationAssistantResult> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase 尚未配置，无法使用智能添加。");
  }

  try {
    return await requestSmartAddAssistant(input);
  } catch (error) {
    throw new Error(normalizeErrorMessage(error, "智能添加请求失败。"));
  }
}

export const aiService = {
  inferBrandMatch,
  inferMerchantName,
  runSmartAddAssistant
};

export { inferBrandMatch, inferMerchantName, runSmartAddAssistant };
