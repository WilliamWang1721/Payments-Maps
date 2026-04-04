export interface MastercardNuccBridgeSession {
  sessionToken: string;
  captchaImageDataUrl: string;
}

export class MastercardNuccBridgeError extends Error {
  session: MastercardNuccBridgeSession | null;

  constructor(message: string, session: MastercardNuccBridgeSession | null = null) {
    super(message);
    this.name = "MastercardNuccBridgeError";
    this.session = session;
  }
}

interface SessionEnvelope {
  session: MastercardNuccBridgeSession;
}

interface SubmitFeedbackInput {
  sessionToken: string;
  phone?: string;
  businessName: string;
  merchantCity: string;
  businessAddress: string;
  date: string;
  time?: string;
  cardNumber?: string;
  problemDescription: string;
  captchaResponse: string;
  privacyAccepted: boolean;
}

interface SubmitFeedbackResponse {
  message?: string;
  error?: string;
  session?: MastercardNuccBridgeSession;
}

async function requestJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}.`);
  }

  return payload;
}

export async function createMastercardNuccBridgeSession(): Promise<MastercardNuccBridgeSession> {
  const payload = await requestJson<SessionEnvelope>("/api/mastercard-nucc/session", {});
  return payload.session;
}

export async function refreshMastercardNuccBridgeSession(sessionToken: string): Promise<MastercardNuccBridgeSession> {
  const payload = await requestJson<SessionEnvelope>("/api/mastercard-nucc/refresh", { sessionToken });
  return payload.session;
}

export async function submitMastercardNuccFeedback(input: SubmitFeedbackInput): Promise<string> {
  const response = await fetch("/api/mastercard-nucc/submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const payload = (await response.json()) as SubmitFeedbackResponse;

  if (!response.ok) {
    throw new MastercardNuccBridgeError(
      payload.error || "Unable to submit the Mastercard NUCC feedback right now.",
      payload.session || null
    );
  }

  return payload.message || "Mastercard NUCC submission completed successfully.";
}
