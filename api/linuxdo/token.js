import {
  applyApiSecurityHeaders,
  enforceRateLimit,
  ensureAllowedOrigin,
  getClientIp,
  getSafeErrorMessage,
  parseJsonBody
} from '../_security.js'

const isProduction = process.env.NODE_ENV === 'production'
const LINUXDO_TOKEN_ENDPOINT = 'https://connect.linux.do/oauth2/token'

const normalizeUri = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return new URL(value.trim()).toString()
  } catch {
    return null
  }
}

const resolveRedirectUri = (req, body) => {
  const configured = normalizeUri(process.env.LINUXDO_REDIRECT_URI)
  if (configured) return configured

  const fromRequest = normalizeUri(body?.redirectUri)
  if (fromRequest && !isProduction) {
    return fromRequest
  }

  const host = req.headers?.host || req.headers?.['x-forwarded-host']
  if (!host) return null
  const protocol = isProduction ? 'https' : 'http'
  return `${protocol}://${host}/auth/linuxdo/callback`
}

const resolveClientId = (body) => {
  const envClientId = (process.env.LINUXDO_CLIENT_ID || '').trim()
  if (envClientId) return envClientId
  const requestClientId = (body?.clientId || '').trim()
  if (!isProduction) return requestClientId
  return ''
}

const resolveClientSecret = () => {
  return (process.env.LINUXDO_CLIENT_SECRET || '').trim()
}

export default async function handler(req, res) {
  applyApiSecurityHeaders(req, res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ensureAllowedOrigin(req, res, { allowNoOrigin: !isProduction })) {
    return
  }

  if (
    !enforceRateLimit(req, res, {
      prefix: 'linuxdo-token-ip',
      identifier: getClientIp(req),
      limit: 20,
      windowMs: 60_000
    })
  ) {
    return
  }

  try {
    const body = parseJsonBody(req)
    const code = typeof body?.code === 'string' ? body.code.trim() : ''
    const clientId = resolveClientId(body)
    const clientSecret = resolveClientSecret()
    const redirectUri = resolveRedirectUri(req, body)

    if (!code || !clientId || !clientSecret || !redirectUri) {
      return res.status(400).json({
        error: 'LinuxDO OAuth server configuration is incomplete'
      })
    }

    if (code.length > 2048) {
      return res.status(400).json({ error: 'Invalid authorization code' })
    }

    const tokenResponse = await fetch(LINUXDO_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'User-Agent': 'PaymentsMaps/1.0.0'
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString()
    })

    const payload = await tokenResponse.json().catch(() => ({}))

    if (!tokenResponse.ok) {
      const upstreamStatus = Number(tokenResponse.status) || 502
      const status = upstreamStatus >= 500 ? 502 : 400
      return res.status(status).json({
        error: 'Failed to exchange LinuxDO authorization code'
      })
    }

    return res.status(200).json({
      access_token: payload.access_token,
      token_type: payload.token_type,
      expires_in: payload.expires_in,
      refresh_token: payload.refresh_token,
      scope: payload.scope
    })
  } catch (error) {
    console.error('LinuxDO token proxy error:', getSafeErrorMessage(error))
    return res.status(500).json({ error: 'Internal server error' })
  }
}
