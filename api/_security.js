import { timingSafeEqual } from 'node:crypto'

const isProduction = process.env.NODE_ENV === 'production'
const SAFE_HTTP_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const SAME_SITE_FETCH_VALUES = new Set(['same-origin', 'same-site', 'none'])
const DEFAULT_CSRF_COOKIE_NAME = 'payments_maps_csrf'
const DEFAULT_CSRF_HEADER_NAME = 'x-csrf-token'

const readHeader = (headers, name) => {
  if (!headers) return ''
  const direct = headers[name]
  const fallback = headers[name.toLowerCase()]
  const value = direct ?? fallback
  if (Array.isArray(value)) {
    return value[0] || ''
  }
  return typeof value === 'string' ? value : ''
}

const parseCookies = (cookieHeader) => {
  if (typeof cookieHeader !== 'string' || !cookieHeader.trim()) {
    return {}
  }

  return cookieHeader.split(';').reduce((acc, item) => {
    const separatorIndex = item.indexOf('=')
    if (separatorIndex <= 0) return acc
    const key = item.slice(0, separatorIndex).trim()
    if (!key) return acc
    const rawValue = item.slice(separatorIndex + 1).trim()
    try {
      acc[key] = decodeURIComponent(rawValue)
    } catch {
      acc[key] = rawValue
    }
    return acc
  }, {})
}

const safeCompare = (left, right) => {
  if (typeof left !== 'string' || typeof right !== 'string') return false
  if (!left || !right) return false

  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }

  try {
    return timingSafeEqual(leftBuffer, rightBuffer)
  } catch {
    return false
  }
}

const normalizeOrigin = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return new URL(value.trim()).origin
  } catch {
    return null
  }
}

const resolveAllowedOrigins = () => {
  const set = new Set()

  const direct = [
    process.env.APP_ORIGIN,
    process.env.PASSKEY_ORIGIN,
    process.env.LINUXDO_REDIRECT_URI
  ]

  for (const value of direct) {
    const origin = normalizeOrigin(value)
    if (origin) set.add(origin)
  }

  const envList = process.env.ALLOWED_ORIGINS
  if (envList) {
    for (const item of envList.split(',')) {
      const origin = normalizeOrigin(item)
      if (origin) set.add(origin)
    }
  }

  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//i, '').trim()
    if (host) {
      set.add(`https://${host}`)
    }
  }

  return set
}

export const applyApiSecurityHeaders = (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader(
    'Permissions-Policy',
    'accelerometer=(), autoplay=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  )
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (isProduction) {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
  }
}

export const ensureAllowedOrigin = (req, res, options = {}) => {
  const {
    allowNoOrigin = true
  } = options

  const requestOrigin = req.headers?.origin
  if (!requestOrigin) {
    if (allowNoOrigin) return true
    res.status(403).json({ error: 'Origin header is required' })
    return false
  }

  const allowedOrigins = resolveAllowedOrigins()
  if (allowedOrigins.size === 0) {
    if (!isProduction) return true
    // In production we require explicit origin configuration.
    res.status(500).json({ error: 'Allowed origins are not configured' })
    return false
  }

  if (allowedOrigins.has(requestOrigin)) {
    return true
  }

  const requestHost = req.headers?.host || req.headers?.['x-forwarded-host']
  if (requestHost) {
    const inferredHttps = `https://${requestHost}`
    const inferredHttp = `http://${requestHost}`
    if (requestOrigin === inferredHttps || (!isProduction && requestOrigin === inferredHttp)) {
      return true
    }
  }

  res.status(403).json({ error: 'Origin is not allowed' })
  return false
}

export const ensureCsrfProtection = (req, res, options = {}) => {
  const {
    cookieName = DEFAULT_CSRF_COOKIE_NAME,
    headerName = DEFAULT_CSRF_HEADER_NAME
  } = options

  const method = String(req.method || 'GET').toUpperCase()
  if (SAFE_HTTP_METHODS.has(method)) {
    return true
  }

  const secFetchSite = readHeader(req.headers, 'sec-fetch-site').toLowerCase()
  if (secFetchSite && !SAME_SITE_FETCH_VALUES.has(secFetchSite)) {
    res.status(403).json({ error: 'CSRF validation failed' })
    return false
  }

  const cookies = parseCookies(readHeader(req.headers, 'cookie'))
  const headerToken = readHeader(req.headers, headerName).trim()
  const cookieToken = typeof cookies[cookieName] === 'string' ? cookies[cookieName].trim() : ''

  if (!safeCompare(cookieToken, headerToken)) {
    res.status(403).json({ error: 'CSRF token validation failed' })
    return false
  }

  return true
}

const getGlobalRateLimitStore = () => {
  const key = '__paymentsMapsRateLimitStore'
  if (!globalThis[key]) {
    globalThis[key] = new Map()
  }
  return globalThis[key]
}

const cleanupExpiredRateLimitEntries = (store, now) => {
  if (store.size < 2000) return
  for (const [entryKey, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(entryKey)
    }
  }
}

export const getClientIp = (req) => {
  const xff = req.headers?.['x-forwarded-for']
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}

export const enforceRateLimit = (req, res, options = {}) => {
  const {
    prefix = 'api',
    identifier = getClientIp(req),
    limit = 30,
    windowMs = 60_000
  } = options

  const key = `${prefix}:${identifier}`
  const now = Date.now()
  const store = getGlobalRateLimitStore()

  cleanupExpiredRateLimitEntries(store, now)

  let entry = store.get(key)
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + windowMs
    }
  }

  entry.count += 1
  store.set(key, entry)

  const remaining = Math.max(limit - entry.count, 0)
  const retryAfterSeconds = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1)

  res.setHeader('X-RateLimit-Limit', String(limit))
  res.setHeader('X-RateLimit-Remaining', String(remaining))
  res.setHeader('X-RateLimit-Reset', String(Math.floor(entry.resetAt / 1000)))

  if (entry.count > limit) {
    res.setHeader('Retry-After', String(retryAfterSeconds))
    res.status(429).json({ error: 'Too many requests, please try again later' })
    return false
  }

  return true
}

export const parseJsonBody = (req) => {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  if (typeof req.body === 'object') {
    return req.body
  }
  return {}
}

export const getSafeErrorMessage = (error) => {
  if (!error) return 'Unknown error'
  return error.message || String(error)
}
