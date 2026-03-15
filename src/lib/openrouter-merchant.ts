import { isSupabaseConfigured, supabase } from "@/lib/supabase";

interface MerchantInferenceInput {
  formattedAddress: string;
  city?: string;
  poiCandidates: Array<{
    name: string;
    type?: string;
    distance?: number | null;
  }>;
}

interface MerchantInferenceResponse {
  merchantName: string | null;
}

export interface MerchantInferenceOutcome {
  merchantName: string | null;
  error: string | null;
}

const inferenceCache = new Map<string, Promise<MerchantInferenceOutcome>>();

function buildCacheKey(input: MerchantInferenceInput): string {
  return JSON.stringify({
    formattedAddress: input.formattedAddress,
    city: input.city || "",
    poiCandidates: input.poiCandidates
  });
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

async function requestMerchantInference(input: MerchantInferenceInput): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke<MerchantInferenceResponse>("infer-merchant-name", {
    body: input
  });

  if (error) {
    throw error;
  }

  return normalizeMerchantName(data?.merchantName);
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  return "Merchant inference request failed.";
}

export async function inferMerchantNameWithOpenRouter(input: MerchantInferenceInput): Promise<MerchantInferenceOutcome> {
  if (!isSupabaseConfigured) {
    return {
      merchantName: null,
      error: "Supabase is not configured."
    };
  }

  const cacheKey = buildCacheKey(input);
  const cached = inferenceCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const task = requestMerchantInference(input)
    .then((merchantName) => ({
      merchantName,
      error: null
    }))
    .catch((error) => {
      console.warn("[merchant-ai] Edge Function inference failed:", error);
      return {
        merchantName: null,
        error: normalizeErrorMessage(error)
      };
    })
    .finally(() => {
      inferenceCache.delete(cacheKey);
    });

  inferenceCache.set(cacheKey, task);
  return task;
}
