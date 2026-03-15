import { parseJsonCompletion, requestStructuredCompletion } from "../_shared/ai-provider.ts";
import { resolveSmartAddMerchantKnowledge, SMART_ADD_FIELD_GUIDE } from "../_shared/smart-add-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface AssistantMessageInput {
  role: "assistant" | "user";
  content: string;
}

interface DraftInput {
  name?: string;
  address?: string;
  brand?: string;
  city?: string;
  bin?: string;
  status?: string;
  transactionStatus?: string;
  lat?: number;
  lng?: number;
  network?: string;
  paymentMethod?: string;
  cvm?: string;
  acquiringMode?: string;
  acquirer?: string;
  posModel?: string;
  checkoutLocation?: string;
  attemptYear?: string;
  attemptMonth?: string;
  attemptDay?: string;
  notes?: string;
}

interface CardCandidateInput {
  id?: string;
  issuer?: string;
  title?: string;
  bin?: string;
  organization?: string;
  groupName?: string;
  description?: string;
  scope?: string;
}

interface AssistantRequest {
  brandCandidates?: string[];
  draft?: DraftInput;
  messages?: AssistantMessageInput[];
  cardCandidates?: CardCandidateInput[];
}

interface ConfirmationPromptInput {
  title?: string;
  description?: string;
  confirmLabel?: string;
  reviseLabel?: string;
}

interface AssistantCompletionResult {
  assistantMessage?: string;
  draftPatch?: Record<string, unknown>;
  missingFields?: string[];
  readyToSubmit?: boolean;
  searchQuery?: string | null;
  matchedCardId?: string | null;
  confirmationPrompt?: ConfirmationPromptInput | null;
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

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeString(item)).filter(Boolean);
}

function normalizeCardCandidates(value: unknown): CardCandidateInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => item as CardCandidateInput)
    .map((candidate) => ({
      id: normalizeString(candidate.id),
      issuer: normalizeString(candidate.issuer),
      title: normalizeString(candidate.title),
      bin: normalizeString(candidate.bin),
      organization: normalizeString(candidate.organization),
      groupName: normalizeString(candidate.groupName),
      description: normalizeString(candidate.description),
      scope: normalizeString(candidate.scope)
    }))
    .filter((candidate) => candidate.id && (candidate.title || candidate.issuer || candidate.bin));
}

function parseCompletionContent(content: unknown): AssistantCompletionResult | null {
  return parseJsonCompletion<AssistantCompletionResult>(content);
}

function normalizeNetwork(value: unknown): string | null {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("visa")) return "Visa";
  if (normalized.includes("master")) return "MasterCard";
  if (normalized.includes("union") || normalized.includes("银联")) return "UnionPay";
  if (normalized.includes("american express") || normalized.includes("amex")) return "American Express";
  if (normalized.includes("discover")) return "Discover";
  if (normalized === "jcb" || normalized.includes("jcb")) return "JCB";
  return null;
}

function normalizePaymentMethod(value: unknown): string | null {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("apple")) return "Apple Pay";
  if (normalized.includes("google")) return "Google Pay";
  if (normalized.includes("tap") || normalized.includes("contactless") || normalized.includes("挥卡")) return "Tap";
  if (normalized.includes("insert") || normalized.includes("插卡")) return "Insert";
  if (normalized.includes("swipe") || normalized.includes("刷卡")) return "Swipe";
  if (normalized.includes("hce")) return "HCE";
  return null;
}

function normalizeCvm(value: unknown): string | null {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("no cvm") || normalized.includes("免密")) return "No CVM";
  if (normalized.includes("pin")) return "PIN";
  if (normalized.includes("signature") || normalized.includes("签名")) return "Signature";
  return null;
}

function normalizeAcquiringMode(value: unknown): string | null {
  const normalized = normalizeString(value).toUpperCase();
  if (normalized === "EDC" || normalized === "DCC" || normalized === "UNKNOWN") {
    return normalized === "UNKNOWN" ? "Unknown" : normalized;
  }
  return null;
}

function normalizeStatus(value: unknown): "active" | "inactive" | null {
  const normalized = normalizeString(value).toLowerCase();
  if (normalized === "active" || normalized.includes("可用")) return "active";
  if (normalized === "inactive" || normalized.includes("不可用") || normalized.includes("故障")) return "inactive";
  return null;
}

function normalizeTransactionStatus(value: unknown): "Success" | "Fault" | "Unknown" | null {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("success") || normalized.includes("成功") || normalized.includes("可用")) return "Success";
  if (normalized.includes("fault") || normalized.includes("失败") || normalized.includes("故障") || normalized.includes("declin")) return "Fault";
  if (normalized.includes("unknown") || normalized.includes("未知")) return "Unknown";
  return null;
}

function normalizeCheckoutLocation(value: unknown): "Staffed Checkout" | "Self-checkout" | null {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("self")) return "Self-checkout";
  if (normalized.includes("staff") || normalized.includes("人工")) return "Staffed Checkout";
  return null;
}

function normalizeBrand(value: unknown, brandCandidates: string[]): string | null {
  const raw = normalizeString(value);
  if (!raw) return null;

  const exact = brandCandidates.find((candidate) => candidate === raw);
  if (exact) {
    return exact;
  }

  const normalized = raw.toLocaleLowerCase("en-US");
  return brandCandidates.find((candidate) => candidate.toLocaleLowerCase("en-US") === normalized) || raw;
}

function normalizeMatchedCardId(value: unknown, cardCandidates: CardCandidateInput[]): string | null {
  const id = normalizeString(value);
  if (!id) {
    return null;
  }

  return cardCandidates.find((candidate) => candidate.id === id)?.id || null;
}

function normalizeConfirmationPrompt(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const prompt = value as Record<string, unknown>;
  const title = normalizeString(prompt.title) || "请确认这条地点信息";
  const description = normalizeString(prompt.description) || "所有关键字段已经收齐。确认无误后即可直接提交。";
  const confirmLabel = normalizeString(prompt.confirmLabel) || "确认并提交";
  const reviseLabel = normalizeString(prompt.reviseLabel) || "继续补充";

  return {
    title,
    description,
    confirmLabel,
    reviseLabel
  };
}

function inferDefaultStatusFromConversation(messages: AssistantMessageInput[]): "active" | "inactive" {
  const text = messages
    .filter((message) => message.role === "user")
    .map((message) => normalizeString(message.content).toLowerCase())
    .join(" ");

  return text.includes("不可用") || text.includes("故障") || text.includes("失败") ? "inactive" : "active";
}

function inferDefaultTransactionStatus(messages: AssistantMessageInput[]): "Success" | "Fault" {
  const text = messages
    .filter((message) => message.role === "user")
    .map((message) => normalizeString(message.content).toLowerCase())
    .join(" ");

  return text.includes("失败") || text.includes("fault") || text.includes("declin") || text.includes("不可用") ? "Fault" : "Success";
}

function mergeDraftSnapshot(currentDraft: DraftInput | undefined, draftPatch: Record<string, unknown>, messages: AssistantMessageInput[]) {
  const mergedDraft = {
    ...(currentDraft || {}),
    ...draftPatch
  };

  if (!normalizeString(mergedDraft.status)) {
    mergedDraft.status = inferDefaultStatusFromConversation(messages);
  }

  if (!normalizeString(mergedDraft.transactionStatus)) {
    mergedDraft.transactionStatus = inferDefaultTransactionStatus(messages);
  }

  return mergedDraft;
}

function requiresAcquirerConfirmation(mergedDraft: Record<string, unknown>, messages: AssistantMessageInput[]): boolean {
  const text = [mergedDraft.brand, mergedDraft.name, ...messages.map((message) => message.content)]
    .map((value) => normalizeString(String(value || "")).toLowerCase())
    .join(" ");

  return text.includes("mcdonald") || text.includes("麦当劳");
}

function computeMissingFields(mergedDraft: Record<string, unknown>, messages: AssistantMessageInput[]): string[] {
  const missing = new Set<string>();

  if (!normalizeString(mergedDraft.name)) {
    missing.add("merchantName");
  }

  if (!normalizeString(mergedDraft.address) || !normalizeString(mergedDraft.city)) {
    missing.add("location");
  }

  if (!normalizeString(mergedDraft.paymentMethod)) {
    missing.add("paymentMethod");
  }

  if (!normalizeString(mergedDraft.network)) {
    missing.add("network");
  }

  if (!normalizeString(mergedDraft.transactionStatus)) {
    missing.add("transactionStatus");
  }

  if (!normalizeString(mergedDraft.status)) {
    missing.add("deviceStatus");
  }

  if (requiresAcquirerConfirmation(mergedDraft, messages) && !normalizeString(mergedDraft.acquirer)) {
    missing.add("acquirer");
  }

  return [...missing];
}

function normalizeDraftPatch(value: unknown, brandCandidates: string[]): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const patch = value as Record<string, unknown>;
  const nextPatch: Record<string, unknown> = {};

  const plainStringFields = [
    "name",
    "address",
    "city",
    "bin",
    "acquirer",
    "posModel",
    "attemptYear",
    "attemptMonth",
    "attemptDay",
    "notes"
  ] as const;

  plainStringFields.forEach((field) => {
    const normalized = normalizeString(patch[field]);
    if (normalized) {
      nextPatch[field] = normalized;
    }
  });

  const brand = normalizeBrand(patch.brand, brandCandidates);
  if (brand) nextPatch.brand = brand;

  const network = normalizeNetwork(patch.network);
  if (network) nextPatch.network = network;

  const paymentMethod = normalizePaymentMethod(patch.paymentMethod);
  if (paymentMethod) nextPatch.paymentMethod = paymentMethod;

  const cvm = normalizeCvm(patch.cvm);
  if (cvm) nextPatch.cvm = cvm;

  const acquiringMode = normalizeAcquiringMode(patch.acquiringMode);
  if (acquiringMode) nextPatch.acquiringMode = acquiringMode;

  const status = normalizeStatus(patch.status);
  if (status) nextPatch.status = status;

  const transactionStatus = normalizeTransactionStatus(patch.transactionStatus);
  if (transactionStatus) nextPatch.transactionStatus = transactionStatus;

  const checkoutLocation = normalizeCheckoutLocation(patch.checkoutLocation);
  if (checkoutLocation) nextPatch.checkoutLocation = checkoutLocation;

  return nextPatch;
}

function buildPromptPayload(input: AssistantRequest, brandCandidates: string[]) {
  const cardCandidates = normalizeCardCandidates(input.cardCandidates);
  const conversation = (input.messages || []).slice(-12).map((message) => ({
    role: message.role,
    content: normalizeString(message.content)
  }));
  const merchantKnowledge = resolveSmartAddMerchantKnowledge({
    brand: normalizeString(input.draft?.brand),
    merchantName: normalizeString(input.draft?.name),
    conversationText: conversation.map((message) => message.content).join(" ")
  });

  return {
    task:
      "Help the user add a payment acceptance location to Fluxa Map. " +
      "Infer structured fields, produce one concise Chinese assistant reply, and decide whether the record is ready for a final user confirmation card.",
    locale: "zh-CN",
    canonicalEnums: {
      status: ["active", "inactive"],
      transactionStatus: ["Success", "Fault", "Unknown"],
      network: ["Visa", "MasterCard", "UnionPay", "American Express", "Discover", "JCB"],
      paymentMethod: ["Apple Pay", "Google Pay", "Tap", "Insert", "Swipe", "HCE"],
      cvm: ["No CVM", "PIN", "Signature"],
      acquiringMode: ["EDC", "DCC", "Unknown"],
      checkoutLocation: ["Staffed Checkout", "Self-checkout"]
    },
    brandCandidates,
    fieldGuide: SMART_ADD_FIELD_GUIDE,
    currentDraft: input.draft || {},
    cardCandidates,
    merchantKnowledge,
    conversation
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  let input: AssistantRequest;

  try {
    input = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = Array.isArray(input?.messages) ? input.messages : [];
  if (messages.length === 0) {
    return jsonResponse({ error: "messages is required." }, { status: 400 });
  }

  const brandCandidates = normalizeStringList(input?.brandCandidates).slice(0, 250);
  const cardCandidates = normalizeCardCandidates(input?.cardCandidates);

  try {
    const completion = await requestStructuredCompletion<AssistantCompletionResult>({
      request,
      temperature: 0.1,
      maxTokens: 420,
      parse: parseCompletionContent,
      messages: [
        {
          role: "system",
          content:
            "You are a Chinese AI assistant for adding payment locations. Return strict JSON only with keys: " +
            '{"assistantMessage":string,"searchQuery":string|null,"draftPatch":object,"missingFields":string[],"readyToSubmit":boolean,"matchedCardId":string|null,"confirmationPrompt":{"title":string,"description":string,"confirmLabel":string,"reviseLabel":string}|null}. ' +
            "The assistantMessage must be concise, natural Chinese and ask at most one follow-up question. Never output Markdown tables, code blocks, or bullet lists for final confirmation. " +
            "When the user mentions a merchant, district, road, mall, station, airport, or any location clue, generate a short searchQuery for AMap place search. " +
            "Only fill fields you are confident about. Do not invent coordinates or addresses. " +
            "Field semantics: brand is merchant brand; bin is the user's payment card BIN; network is the card organization; paymentMethod is how the payment was presented; transactionStatus is the payment result; status is the device availability; acquirer is the merchant's acquiring institution or POS service provider; acquiringMode is EDC/DCC; posModel is hardware model. cardCandidates describe cards in the user's card album, where issuer means the card issuer. Never confuse issuer with acquirer. " +
            "Unless the user explicitly says the transaction failed, default transactionStatus to Success. Unless the user explicitly says the device is broken or unavailable, default status to active. " +
            "If cardCandidates are provided and one candidate is clearly the card the user means, set matchedCardId to that exact id. In that case prefer leaving BIN/network exact values to the client instead of guessing. If ambiguous, keep matchedCardId null and ask which card they mean. " +
            "Respect merchantKnowledge. If a rule says to confirm a likely acquirer or special POS, ask that follow-up before final confirmation unless the user already clarified it or said unknown. " +
            "Set readyToSubmit to true only when the record has enough info to show a final confirmation card: merchant/location intent is clear, payment result is clear or defaulted, payment method/network are known, and any merchantKnowledge follow-up is already resolved. " +
            "When readyToSubmit is true, confirmationPrompt must be an object for UI rendering, and assistantMessage should only briefly state that the card is ready for confirmation. Do not say that you have already submitted anything. " +
            'Use missingFields values only from this set: ["location","merchantName","transactionStatus","paymentMethod","network","acquirer","deviceStatus"].'
        },
        {
          role: "user",
          content: JSON.stringify(buildPromptPayload(input, brandCandidates))
        }
      ]
    });
    const normalizedDraftPatch = normalizeDraftPatch(completion.parsed.draftPatch, brandCandidates);
    const mergedDraft = mergeDraftSnapshot(input.draft, normalizedDraftPatch, messages);
    const normalizedMissingFields = computeMissingFields(mergedDraft, messages);
    const assistantMessage = normalizeString(completion.parsed.assistantMessage) || "我已经整理了你的描述，请继续补充地点和支付信息。";
    const searchQuery = normalizeString(completion.parsed.searchQuery) || null;
    const matchedCardId = normalizeMatchedCardId(completion.parsed.matchedCardId, cardCandidates);
    const confirmationPrompt = normalizeConfirmationPrompt(completion.parsed.confirmationPrompt);
    const readyToSubmit = Boolean(completion.parsed.readyToSubmit) && normalizedMissingFields.length === 0;

    return jsonResponse({
      assistantMessage,
      searchQuery,
      draftPatch: normalizedDraftPatch,
      missingFields: normalizedMissingFields.length > 0 ? normalizedMissingFields : normalizeStringList(completion.parsed.missingFields),
      readyToSubmit,
      matchedCardId,
      confirmationPrompt: readyToSubmit ? confirmationPrompt : null,
      model: completion.model
    });
  } catch (error) {
    return jsonResponse(
      {
        error: "Smart add assistant request failed.",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
});
