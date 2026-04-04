import { createHmac, timingSafeEqual } from "node:crypto";

const CONTACT_FORM_URL = "https://mastercardnucc.com/contact-us";
const CAPTCHA_REFRESH_PATH = "/image-captcha-refresh/webform_submission_contact_node_16_add_form";
const SESSION_TOKEN_SECRET_ENV = "MASTERCARD_NUCC_SESSION_SECRET";
const USER_AGENT = "fluxa-map-mastercard-nucc-bridge/1.0";

export interface MastercardNuccBridgeSessionPayload {
  cookieHeader: string;
  formBuildId: string;
  formId: string;
  captchaSid: string;
  captchaToken: string;
  captchaImagePath: string;
  issuedAt: string;
}

export interface MastercardNuccBridgeSessionResponse {
  sessionToken: string;
  captchaImageDataUrl: string;
}

interface ParsedContactForm {
  formBuildId: string;
  formId: string;
  captchaSid: string;
  captchaToken: string;
  captchaImagePath: string;
}

export function sendJson(res: any, status: number, payload: unknown): void {
  res.status(status);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(JSON.stringify(payload));
}

export function getContactFormUrl(): string {
  return CONTACT_FORM_URL;
}

export function getCaptchaRefreshUrl(): string {
  return new URL(CAPTCHA_REFRESH_PATH, CONTACT_FORM_URL).toString();
}

export function getCaptchaImageUrl(imagePath: string): string {
  return new URL(imagePath, CONTACT_FORM_URL).toString();
}

export function createUpstreamHeaders(cookieHeader?: string): Record<string, string> {
  return {
    Accept: "application/json, text/javascript, */*; q=0.01",
    ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    Referer: CONTACT_FORM_URL,
    "User-Agent": USER_AGENT,
    "X-Requested-With": "XMLHttpRequest"
  };
}

export async function parseJsonBody<T>(req: any): Promise<T> {
  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body) as T;
  }

  if (req.body && typeof req.body === "object") {
    return req.body as T;
  }

  const rawBody = await new Promise<string>((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer | string) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });

  return (rawBody ? JSON.parse(rawBody) : {}) as T;
}

export async function createBridgeSession(): Promise<MastercardNuccBridgeSessionResponse> {
  const upstreamResponse = await fetch(CONTACT_FORM_URL, {
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "User-Agent": USER_AGENT
    }
  });
  const html = await upstreamResponse.text();

  if (!upstreamResponse.ok) {
    throw new Error(`Mastercard NUCC contact form request failed with ${upstreamResponse.status}.`);
  }

  const parsed = parseContactForm(html);
  const cookieHeader = buildCookieHeader(extractSetCookieHeaders(upstreamResponse.headers));
  const captchaImageDataUrl = await fetchCaptchaImageDataUrl(parsed.captchaImagePath, cookieHeader);

  return {
    sessionToken: encodeSessionToken({
      cookieHeader,
      formBuildId: parsed.formBuildId,
      formId: parsed.formId,
      captchaSid: parsed.captchaSid,
      captchaToken: parsed.captchaToken,
      captchaImagePath: parsed.captchaImagePath,
      issuedAt: new Date().toISOString()
    }),
    captchaImageDataUrl
  };
}

export function decodeSessionToken(sessionToken: string): MastercardNuccBridgeSessionPayload {
  try {
    const [encodedPayload, signature, ...rest] = sessionToken.split(".");

    if (!encodedPayload || !signature || rest.length > 0) {
      throw new Error("Invalid Mastercard NUCC bridge session.");
    }

    const expectedSignature = signSessionTokenPayload(encodedPayload);
    const providedSignature = Buffer.from(signature, "utf8");
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");

    if (
      providedSignature.length !== expectedSignatureBuffer.length
      || !timingSafeEqual(providedSignature, expectedSignatureBuffer)
    ) {
      throw new Error("Invalid Mastercard NUCC bridge session.");
    }

    const raw = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(raw) as Partial<MastercardNuccBridgeSessionPayload>;

    if (
      !payload
      || typeof payload.cookieHeader !== "string"
      || typeof payload.formBuildId !== "string"
      || typeof payload.formId !== "string"
      || typeof payload.captchaSid !== "string"
      || typeof payload.captchaToken !== "string"
      || typeof payload.captchaImagePath !== "string"
    ) {
      throw new Error("Invalid Mastercard NUCC bridge session.");
    }

    return {
      cookieHeader: payload.cookieHeader,
      formBuildId: payload.formBuildId,
      formId: payload.formId,
      captchaSid: payload.captchaSid,
      captchaToken: payload.captchaToken,
      captchaImagePath: payload.captchaImagePath,
      issuedAt: typeof payload.issuedAt === "string" ? payload.issuedAt : new Date().toISOString()
    };
  } catch (error) {
    throw new Error(
      error instanceof Error && error.message
        ? error.message
        : "Invalid Mastercard NUCC bridge session."
    );
  }
}

export function buildSessionResponse(
  payload: MastercardNuccBridgeSessionPayload,
  captchaImageDataUrl: string
): MastercardNuccBridgeSessionResponse {
  return {
    sessionToken: encodeSessionToken(payload),
    captchaImageDataUrl
  };
}

export async function fetchCaptchaImageDataUrl(imagePath: string, cookieHeader: string): Promise<string> {
  const captchaResponse = await fetch(getCaptchaImageUrl(imagePath), {
    headers: createUpstreamHeaders(cookieHeader)
  });

  if (!captchaResponse.ok) {
    throw new Error(`Mastercard NUCC captcha image request failed with ${captchaResponse.status}.`);
  }

  const contentType = captchaResponse.headers.get("content-type") || "image/png";
  const imageBuffer = Buffer.from(await captchaResponse.arrayBuffer());
  return `data:${contentType};base64,${imageBuffer.toString("base64")}`;
}

export function mergeCookieHeaders(existingCookieHeader: string, incomingSetCookieHeaders: string[]): string {
  const cookieMap = new Map<string, string>();

  parseCookieHeader(existingCookieHeader).forEach(({ name, value }) => {
    cookieMap.set(name, value);
  });

  incomingSetCookieHeaders.forEach((cookieLine) => {
    const [pair] = cookieLine.split(";", 1);
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex <= 0) return;

    const name = pair.slice(0, separatorIndex).trim();
    const value = pair.slice(separatorIndex + 1).trim();
    if (!name) return;

    cookieMap.set(name, value);
  });

  return Array.from(cookieMap.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

export function extractSetCookieHeaders(headers: Headers): string[] {
  const headerBag = headers as Headers & { getSetCookie?: () => string[] };

  if (typeof headerBag.getSetCookie === "function") {
    return headerBag.getSetCookie();
  }

  const raw = headers.get("set-cookie");
  if (!raw) return [];

  return raw
    .split(/,(?=[^;,\s]+=)/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function extractAjaxErrorMessage(insertedHtml: string): string | null {
  const fieldErrorMatch = insertedHtml.match(/form-item--error-message">\s*([^<]+)\s*</);
  if (fieldErrorMatch?.[1]) {
    return cleanHtmlText(fieldErrorMatch[1]);
  }

  const alertMatch = insertedHtml.match(/role="alert">([\s\S]*?)<\/div>/);
  if (alertMatch?.[1]) {
    const alertText = cleanHtmlText(alertMatch[1]);
    return alertText || null;
  }

  return null;
}

export function extractUpdatedSessionFromAjaxHtml(
  insertedHtml: string,
  previous: MastercardNuccBridgeSessionPayload,
  nextFormBuildId?: string
): MastercardNuccBridgeSessionPayload {
  return {
    cookieHeader: previous.cookieHeader,
    formBuildId: nextFormBuildId || extractInputValue(insertedHtml, "form_build_id") || previous.formBuildId,
    formId: extractInputValue(insertedHtml, "form_id") || previous.formId,
    captchaSid: extractInputValue(insertedHtml, "captcha_sid") || previous.captchaSid,
    captchaToken: extractInputValue(insertedHtml, "captcha_token") || previous.captchaToken,
    captchaImagePath: extractCaptchaImagePath(insertedHtml) || previous.captchaImagePath,
    issuedAt: new Date().toISOString()
  };
}

export function cleanHtmlText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function encodeSessionToken(payload: MastercardNuccBridgeSessionPayload): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${signSessionTokenPayload(encodedPayload)}`;
}

function getSessionTokenSecret(): string {
  const configuredSecret = process.env[SESSION_TOKEN_SECRET_ENV]?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV !== "production" && process.env.VERCEL_ENV !== "production") {
    return "fluxa-map-mastercard-nucc-dev-session-secret";
  }

  throw new Error(`Missing ${SESSION_TOKEN_SECRET_ENV}.`);
}

function signSessionTokenPayload(encodedPayload: string): string {
  return createHmac("sha256", getSessionTokenSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function parseContactForm(html: string): ParsedContactForm {
  const formBuildId = extractInputValue(html, "form_build_id");
  const formId = extractInputValue(html, "form_id");
  const captchaSid = extractInputValue(html, "captcha_sid");
  const captchaToken = extractInputValue(html, "captcha_token");
  const captchaImagePath = extractCaptchaImagePath(html);

  if (!formBuildId || !formId || !captchaSid || !captchaToken || !captchaImagePath) {
    throw new Error("Failed to parse the Mastercard NUCC contact form fields.");
  }

  return {
    formBuildId,
    formId,
    captchaSid,
    captchaToken,
    captchaImagePath
  };
}

function extractInputValue(html: string, inputName: string): string | null {
  const escapedName = inputName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = html.match(new RegExp(`name="${escapedName}"[^>]*value="([^"]*)"`, "i"));
  return match?.[1] || null;
}

function extractCaptchaImagePath(html: string): string | null {
  const match = html.match(/data-drupal-selector="edit-captcha-image"[^>]*src="([^"]+)"/i);
  return match?.[1] || null;
}

function buildCookieHeader(setCookieHeaders: string[]): string {
  return setCookieHeaders
    .map((cookieLine) => cookieLine.split(";", 1)[0]?.trim() || "")
    .filter(Boolean)
    .join("; ");
}

function parseCookieHeader(cookieHeader: string): Array<{ name: string; value: string }> {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf("=");
      return separatorIndex > 0
        ? { name: entry.slice(0, separatorIndex).trim(), value: entry.slice(separatorIndex + 1).trim() }
        : null;
    })
    .filter((entry): entry is { name: string; value: string } => Boolean(entry?.name));
}
