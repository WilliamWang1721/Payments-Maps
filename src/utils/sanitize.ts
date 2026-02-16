const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;'
}

const HTML_ESCAPE_PATTERN = /[&<>"'`]/g
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/
const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:'])

export const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).replace(HTML_ESCAPE_PATTERN, (char) => HTML_ESCAPE_MAP[char] ?? char)
}

export const sanitizeExternalUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  let normalized = trimmed
  if (!URL_SCHEME_PATTERN.test(trimmed)) {
    normalized = trimmed.startsWith('//') ? `https:${trimmed}` : `https://${trimmed}`
  }

  try {
    const parsed = new URL(normalized)
    if (!SAFE_EXTERNAL_PROTOCOLS.has(parsed.protocol)) {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}
