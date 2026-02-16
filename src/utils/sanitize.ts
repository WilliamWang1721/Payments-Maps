const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;'
}

const HTML_ESCAPE_PATTERN = /[&<>"'`]/g
const HTML_TAG_PATTERN = /<\/?[a-z][^>]*>/gi
const INLINE_WHITESPACE_PATTERN = /[^\S\n]+/g
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+.-]*:/
const SAFE_EXTERNAL_PROTOCOLS = new Set(['http:', 'https:'])

export interface SanitizePlainTextOptions {
  maxLength?: number
  preserveLineBreaks?: boolean
}

const stripControlCharacters = (value: string): string => {
  let output = ''

  for (const char of value) {
    const code = char.charCodeAt(0)
    const isAllowed = code === 0x09 || code === 0x0a || code === 0x0d || (code >= 0x20 && code !== 0x7f)

    if (isAllowed) {
      output += char
    }
  }

  return output
}

export const escapeHtml = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).replace(HTML_ESCAPE_PATTERN, (char) => HTML_ESCAPE_MAP[char] ?? char)
}

export const sanitizePlainText = (
  value: unknown,
  options: SanitizePlainTextOptions = {}
): string => {
  if (value === null || value === undefined) {
    return ''
  }

  const { maxLength, preserveLineBreaks = false } = options

  let normalized = String(value)
    .replace(/\r\n?/g, '\n')
    .split('\u0000')
    .join('')

  normalized = stripControlCharacters(normalized).replace(HTML_TAG_PATTERN, '')

  normalized = preserveLineBreaks
    ? normalized
        .split('\n')
        .map((line) => line.replace(INLINE_WHITESPACE_PATTERN, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
    : normalized.replace(/\s+/g, ' ')

  normalized = normalized.trim()

  if (typeof maxLength === 'number' && maxLength > 0 && normalized.length > maxLength) {
    normalized = normalized.slice(0, maxLength).trim()
  }

  return normalized
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
