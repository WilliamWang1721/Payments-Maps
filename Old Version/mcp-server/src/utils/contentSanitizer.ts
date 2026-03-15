const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/gi;
const INLINE_WHITESPACE_PATTERN = /[^\S\n]+/g;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const SAFE_CALLBACK_PROTOCOLS = new Set(["http:", "https:"]);

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const HTML_ESCAPE_PATTERN = /[&<>"']/g;

type AnyRecord = Record<string, unknown>;

export interface SanitizePlainTextOptions {
  maxLength?: number;
  preserveLineBreaks?: boolean;
}

const isPlainObject = (value: unknown): value is AnyRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stripControlCharacters = (value: string): string => {
  let output = "";

  for (const char of value) {
    const code = char.charCodeAt(0);
    const isAllowed = code === 0x09 || code === 0x0a || code === 0x0d || (code >= 0x20 && code !== 0x7f);
    if (isAllowed) {
      output += char;
    }
  }

  return output;
};

export const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).replace(HTML_ESCAPE_PATTERN, (char) => HTML_ESCAPE_MAP[char] ?? char);
};

export const sanitizePlainText = (
  value: unknown,
  options: SanitizePlainTextOptions = {}
): string => {
  if (value === null || value === undefined) return "";

  const { maxLength, preserveLineBreaks = false } = options;

  let normalized = String(value)
    .replace(/\r\n?/g, "\n")
    .split("\u0000")
    .join("");

  normalized = stripControlCharacters(normalized).replace(HTML_TAG_PATTERN, "");

  normalized = preserveLineBreaks
    ? normalized
        .split("\n")
        .map((line) => line.replace(INLINE_WHITESPACE_PATTERN, " ").trim())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
    : normalized.replace(/\s+/g, " ");

  normalized = normalized.trim();

  if (typeof maxLength === "number" && maxLength > 0 && normalized.length > maxLength) {
    normalized = normalized.slice(0, maxLength).trim();
  }

  return normalized;
};

const sanitizeStringList = (value: unknown, maxLength: number, maxItems: number): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  return value
    .map((item) => sanitizePlainText(item, { maxLength }))
    .filter(Boolean)
    .slice(0, maxItems);
};

export const sanitizePOSMachineData = <T extends AnyRecord>(payload: T): T => {
  const sanitized: AnyRecord = { ...payload };

  if ("merchant_name" in sanitized) {
    sanitized.merchant_name = sanitizePlainText(sanitized.merchant_name, { maxLength: 120 });
  }

  if ("address" in sanitized) {
    sanitized.address = sanitizePlainText(sanitized.address, { maxLength: 320 });
  }

  if ("remarks" in sanitized) {
    sanitized.remarks = sanitizePlainText(sanitized.remarks, {
      maxLength: 2000,
      preserveLineBreaks: true,
    });
  }

  if (isPlainObject(sanitized.basic_info)) {
    sanitized.basic_info = {
      ...sanitized.basic_info,
      model: sanitizePlainText(sanitized.basic_info.model, { maxLength: 120 }),
      acquiring_institution: sanitizePlainText(sanitized.basic_info.acquiring_institution, { maxLength: 120 }),
      acquiring_modes: sanitizeStringList(sanitized.basic_info.acquiring_modes, 40, 20),
      supported_card_networks: sanitizeStringList(sanitized.basic_info.supported_card_networks, 40, 20),
    };
  }

  return sanitized as T;
};

export const isSafeLoopbackCallback = (value: unknown): boolean => {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    if (!SAFE_CALLBACK_PROTOCOLS.has(url.protocol)) {
      return false;
    }

    return LOOPBACK_HOSTS.has(url.hostname) || url.hostname.endsWith(".localhost");
  } catch {
    return false;
  }
};
