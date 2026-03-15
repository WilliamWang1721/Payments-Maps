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

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/hunter-alpha";

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

function safeJsonParse<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parseCompletionContent(content: unknown): MerchantInferenceResult | null {
  if (typeof content !== "string" || !content.trim()) {
    return null;
  }

  const parsed = safeJsonParse<MerchantInferenceResult>(content);
  if (parsed) {
    return parsed;
  }

  const fencedMatch = content.match(/```json\s*([\s\S]*?)```/i) || content.match(/```\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return safeJsonParse<MerchantInferenceResult>(fencedMatch[1]);
  }

  return null;
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

  const openRouterApiKey = Deno.env.get("OPENROUTER_API_KEY");
  const openRouterModel = Deno.env.get("OPENROUTER_MODEL") || DEFAULT_MODEL;

  if (!openRouterApiKey) {
    return jsonResponse({ error: "Missing OPENROUTER_API_KEY secret." }, { status: 500 });
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

  const origin = request.headers.get("origin") || request.headers.get("referer") || "https://supabase.com";

  try {
    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": origin,
        "X-Title": "Fluxa Map"
      },
      body: JSON.stringify({
        model: openRouterModel,
        temperature: 0,
        max_tokens: 120,
        response_format: { type: "json_object" },
        plugins: [{ id: "response-healing" }],
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
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return jsonResponse(
        {
          error: `OpenRouter request failed with status ${response.status}.`,
          details: errorText.slice(0, 800)
        },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = parseCompletionContent(content);
    const merchantName = normalizeMerchantName(parsed?.merchantName);

    return jsonResponse({
      merchantName,
      confidence: typeof parsed?.confidence === "number" ? parsed.confidence : null,
      model: openRouterModel
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
