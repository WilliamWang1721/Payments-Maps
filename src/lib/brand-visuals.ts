const HTTP_PROTOCOL_RE = /^https?:$/i;
const SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeUrlCandidate(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeExternalUrl(value: unknown): string | null {
  const trimmed = normalizeUrlCandidate(value);
  if (!trimmed) {
    return null;
  }

  const candidate = SCHEME_RE.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (!HTTP_PROTOCOL_RE.test(url.protocol)) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeHexColor(value: unknown): string | null {
  const trimmed = normalizeUrlCandidate(value);
  if (!trimmed) {
    return null;
  }

  if (!HEX_COLOR_RE.test(trimmed)) {
    return null;
  }

  if (trimmed.length === 4) {
    const [, red, green, blue] = trimmed;
    return `#${red}${red}${green}${green}${blue}${blue}`.toUpperCase();
  }

  return trimmed.toUpperCase();
}

export function buildBrandInitials(name: string, fallback = "BR"): string {
  const normalized = name.trim();
  if (!normalized) {
    return fallback;
  }

  const words = normalized.split(/\s+/).filter(Boolean).slice(0, 2);
  const initials = words.map((word) => word[0]?.toUpperCase() || "").join("");
  return initials || normalized.slice(0, 2).toUpperCase() || fallback;
}

export function buildBrandHostname(website: string | null | undefined): string | null {
  const normalizedWebsite = normalizeExternalUrl(website);
  if (!normalizedWebsite) {
    return null;
  }

  try {
    return new URL(normalizedWebsite).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

export function buildBrandPreviewImage(
  iconUrl: string | null | undefined,
  website: string | null | undefined
): { imageUrl: string | null; source: "icon" | "favicon" | "none" } {
  const normalizedIconUrl = normalizeExternalUrl(iconUrl);
  if (normalizedIconUrl) {
    return {
      imageUrl: normalizedIconUrl,
      source: "icon"
    };
  }

  const normalizedWebsite = normalizeExternalUrl(website);
  if (normalizedWebsite) {
    return {
      imageUrl: `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(normalizedWebsite)}`,
      source: "favicon"
    };
  }

  return {
    imageUrl: null,
    source: "none"
  };
}
