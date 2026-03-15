import { handleError, requireAuth } from './_utils.js'
import {
  applyApiSecurityHeaders,
  ensureCsrfProtection,
  enforceRateLimit,
  ensureAllowedOrigin,
  getClientIp,
  parseJsonBody,
  sanitizePlainText
} from '../_security.js'

const isProduction = process.env.NODE_ENV === 'production'

export default async function handler(req, res) {
  applyApiSecurityHeaders(req, res)

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ensureAllowedOrigin(req, res, { allowNoOrigin: !isProduction })) {
    return
  }

  if (!ensureCsrfProtection(req, res)) {
    return
  }

  const authContext = await requireAuth(req, res)
  if (!authContext) return

  const { user, supabaseAdmin } = authContext

  const identity = `${getClientIp(req)}:${user.id}`
  if (
    !enforceRateLimit(req, res, {
      prefix: 'passkey-rename',
      identifier: identity,
      limit: 20,
      windowMs: 60_000
    })
  ) {
    return
  }

  try {
    const body = parseJsonBody(req)
    const passkeyId = body?.id || body?.passkeyId
    const friendlyName = sanitizePlainText(body?.friendlyName, { maxLength: 120 })

    if (!passkeyId || !friendlyName) {
      return res.status(400).json({ error: 'Passkey id and friendly name are required' })
    }

    const { data, error } = await supabaseAdmin
      .from('passkey_credentials')
      .update({ friendly_name: friendlyName, updated_at: new Date().toISOString() })
      .eq('id', passkeyId)
      .eq('user_id', user.id)
      .select('id,friendly_name')
      .maybeSingle()

    if (error) {
      return handleError(res, error, 'Failed to rename passkey')
    }

    if (!data) {
      return res.status(404).json({ error: 'Passkey not found' })
    }

    return res.status(200).json({ success: true, passkey: data })
  } catch (error) {
    return handleError(res, error, 'Unable to rename passkey')
  }
}
