function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function sanitizeString(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 180) {
    return trimmed;
  }

  return `${trimmed.slice(0, 177)}...`;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return sanitizeString(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 12).map(sanitizeValue);
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value).slice(0, 20).map(([key, entryValue]) => {
      if (/token|secret|authorization|password/i.test(key)) {
        return [key, "[redacted]"];
      }

      return [key, sanitizeValue(entryValue)];
    });

    return Object.fromEntries(entries);
  }

  return String(value);
}

export function sanitizePayload(payload: unknown): Record<string, unknown> {
  if (!isPlainObject(payload)) {
    return { value: sanitizeValue(payload) };
  }

  return sanitizeValue(payload) as Record<string, unknown>;
}

export function summarizeResult(result: unknown): Record<string, unknown> {
  if (Array.isArray(result)) {
    return {
      kind: "array",
      count: result.length
    };
  }

  if (isPlainObject(result)) {
    const keys = Object.keys(result);
    return {
      kind: "object",
      keys: keys.slice(0, 12),
      preview: sanitizePayload(result)
    };
  }

  return {
    kind: typeof result,
    value: sanitizeValue(result)
  };
}
