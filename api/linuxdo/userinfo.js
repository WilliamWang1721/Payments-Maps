import {
  applyApiSecurityHeaders,
  enforceRateLimit,
  ensureAllowedOrigin,
  getClientIp,
  getSafeErrorMessage
} from '../_security.js'

const isProduction = process.env.NODE_ENV === 'production'
const USERINFO_ENDPOINT = 'https://connect.linux.do/oauth2/userinfo'

const extractBearerToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization
  if (typeof header !== 'string') return ''
  if (!header.startsWith('Bearer ')) return ''
  return header.slice(7).trim()
}

const sanitizeUserInfo = (payload) => {
  if (!payload || typeof payload !== 'object') return {}
  const clone = { ...payload }
  delete clone.api_key
  delete clone.access_token
  delete clone.refresh_token
  return clone
}

export default async function handler(req, res) {
  applyApiSecurityHeaders(req, res)

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ensureAllowedOrigin(req, res, { allowNoOrigin: !isProduction })) {
    return
  }

  if (
    !enforceRateLimit(req, res, {
      prefix: 'linuxdo-userinfo-ip',
      identifier: getClientIp(req),
      limit: 60,
      windowMs: 60_000
    })
  ) {
    return
  }

  try {
    const accessToken = extractBearerToken(req)
    if (!accessToken) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    if (accessToken.length > 4096) {
      return res.status(400).json({ error: 'Invalid access token' })
    }

    const response = await fetch(USERINFO_ENDPOINT, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'User-Agent': 'PaymentsMaps/1.0.0'
      }
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return res.status(401).json({ error: 'Failed to fetch LinuxDO user info' })
    }

    return res.status(200).json(sanitizeUserInfo(payload))
  } catch (error) {
    console.error('LinuxDO userinfo proxy error:', getSafeErrorMessage(error))
    return res.status(500).json({ error: 'Internal server error' })
  }
}
