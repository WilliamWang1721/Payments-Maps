import { parseJsonCompletion, requestStructuredCompletion } from "../_shared/ai-provider.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface MerchantInferenceInput {
  formattedAddress: string;
  city?: string;
  poiCandidates?: Array<{
    name?: string;
    type?: string;
    distance?: number | null;
  }>;
}

interface MerchantInferenceResult {
  merchantName: string | null;
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

function parseCompletionContent(content: unknown): MerchantInferenceResult | null {
  return parseJsonCompletion<MerchantInferenceResult>(content);
}

function buildPromptPayload(input: MerchantInferenceInput) {
  return {
    task: "Infer whether this reverse-geocoded address belongs to a merchant, and if yes return the merchant/store name only.",
    locale: "zh-CN",
    address: input.formattedAddress,
    city: input.city || null,
    poiCandidates: (input.poiCandidates || []).slice(0, 5).map((poi) => ({
      name: typeof poi?.name === "string" ? poi.name.trim() : "",
      type: typeof poi?.type === "string" ? poi.type.trim() : null,
      distance: typeof poi?.distance === "number" ? poi.distance : Number.isFinite(Number(poi?.distance)) ? Number(poi?.distance) : null
    }))
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  let input: MerchantInferenceInput;

  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!input?.formattedAddress || typeof input.formattedAddress !== "string") {
    return jsonResponse({ error: "formattedAddress is required." }, { status: 400 });
  }

  try {
    const completion = await requestStructuredCompletion<MerchantInferenceResult>({
      request,
      temperature: 0,
      maxTokens: 120,
      parse: parseCompletionContent,
      messages: [
        {
          role: "system",
          content:
            "You extract merchant names from AMap reverse-geocoded addresses. Return strict JSON only. " +
            'If the location is clearly a merchant/store/restaurant/brand outlet, return {"merchantName":"...","confidence":0.xx}. ' +
            'If it is only a street, building, park, gate, neighborhood, school, station, or other non-merchant place, return {"merchantName":null,"confidence":0.xx}. ' +
            "Do not invent names. Prefer exact merchant/store names that appear in the address or POI candidates."
        },
        {
          role: "user",
          content: JSON.stringify(buildPromptPayload(input))
        }
      ]
    });
    const merchantName = normalizeMerchantName(completion.parsed.merchantName);

    return jsonResponse({
      merchantName,
      confidence: typeof completion.parsed.confidence === "number" ? completion.parsed.confidence : null,
      model: completion.model
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Merchant inference request failed.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
});
