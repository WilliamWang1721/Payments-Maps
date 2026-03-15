const CSRF_COOKIE_NAME = 'payments_maps_csrf'
const CSRF_STORAGE_KEY = 'payments_maps_csrf_token'

const readCookie = (name: string): string => {
  if (typeof document === 'undefined') return ''

  const cookies = document.cookie ? document.cookie.split(';') : []
  for (const item of cookies) {
    const [rawKey, ...rawValueParts] = item.trim().split('=')
    if (rawKey !== name) continue
    const rawValue = rawValueParts.join('=')
    try {
      return decodeURIComponent(rawValue)
    } catch {
      return rawValue
    }
  }
  return ''
}

const writeCookie = (name: string, value: string) => {
  if (typeof document === 'undefined') return

  const attributes = ['Path=/', 'SameSite=Strict']
  if (window.location.protocol === 'https:') {
    attributes.push('Secure')
  }

  document.cookie = `${name}=${encodeURIComponent(value)}; ${attributes.join('; ')}`
}

const generateToken = () => {
  if (globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(32)
    globalThis.crypto.getRandomValues(bytes)
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`
}

const readStoredToken = () => {
  if (typeof window === 'undefined') return ''

  try {
    const fromSession = window.sessionStorage.getItem(CSRF_STORAGE_KEY)
    if (fromSession) return fromSession
  } catch {
    // ignore storage exceptions
  }

  return readCookie(CSRF_COOKIE_NAME)
}

const storeToken = (token: string) => {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(CSRF_STORAGE_KEY, token)
  } catch {
    // ignore storage exceptions
  }
}

export const ensureCsrfToken = (): string => {
  if (typeof window === 'undefined') return ''

  let token = readStoredToken()
  if (!token) {
    token = generateToken()
  }

  storeToken(token)
  writeCookie(CSRF_COOKIE_NAME, token)
  return token
}

export const withCsrfHeaders = (headers: HeadersInit = {}) => {
  const merged = new Headers(headers)
  const token = ensureCsrfToken()

  merged.set('X-Requested-With', 'XMLHttpRequest')
  if (token) {
    merged.set('X-CSRF-Token', token)
  }

  return merged
}
