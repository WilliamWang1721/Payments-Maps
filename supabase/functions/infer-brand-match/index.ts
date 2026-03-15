import {
  getPrimaryOpenRouterModel,
  parseJsonCompletion,
  requestStructuredCompletion
} from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface BrandMatchInput {
  merchantName: string;
  formattedAddress?: string;
  city?: string;
  brandCandidates?: string[];
}

interface BrandMatchResult {
  matchedBrand: string | null;
  confidence?: number | null;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init?.headers || {})
    }
  });
}

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseCompletionContent(content: unknown): BrandMatchResult | null {
  return parseJsonCompletion<BrandMatchResult>(content);
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

function buildPromptPayload(input: BrandMatchInput, brandCandidates: string[]) {
  return {
    task:
      "Match this merchant/store to one brand from the existing brand catalog if and only if the match is clearly supported.",
    locale: "zh-CN",
    merchantName: normalizeString(input.merchantName),
    address: normalizeString(input.formattedAddress) || null,
    city: normalizeString(input.city) || null,
    brandCandidates
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  let input: BrandMatchInput;

  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  const merchantName = normalizeString(input?.merchantName);
  const brandCandidates = Array.isArray(input?.brandCandidates)
    ? input.brandCandidates.map((candidate) => normalizeString(candidate)).filter(Boolean).slice(0, 250)
    : [];

  if (!merchantName) {
    return jsonResponse({ error: "merchantName is required." }, { status: 400 });
  }

  if (brandCandidates.length === 0) {
    return jsonResponse({ matchedBrand: null, confidence: null, model: getPrimaryOpenRouterModel() });
  }

  try {
    const completion = await requestStructuredCompletion<BrandMatchResult>({
      request,
      temperature: 0,
      maxTokens: 160,
      parse: parseCompletionContent,
      messages: [
        {
          role: "system",
          content:
            "You match merchant names to an existing brand catalog. Return strict JSON only. " +
            'If the merchant/store clearly belongs to one candidate brand, return {"matchedBrand":"EXACT_CANDIDATE","confidence":0.xx}. ' +
            'If there is no confident match, return {"matchedBrand":null,"confidence":0.xx}. ' +
            "Use semantic understanding, translation, transliteration, punctuation differences, number substitutions, and branch suffix removal. " +
            "Examples: '711 商店' can match '7-Eleven'; '麦当劳中山店' can match 'McDonald\\'s'; '星巴克臻选' can match 'Starbucks'. " +
            "Do not invent brands and do not return any string that is not exactly one of the provided candidates."
        },
        {
          role: "user",
          content: JSON.stringify(buildPromptPayload(input, brandCandidates))
        }
      ]
    });
    const matchedBrand = normalizeMatchedBrand(completion.parsed.matchedBrand, brandCandidates);

    return jsonResponse({
      matchedBrand,
      confidence: typeof completion.parsed.confidence === "number" ? completion.parsed.confidence : null,
      model: completion.model
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Brand match request failed.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
});
