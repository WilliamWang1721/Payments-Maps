import { handleError, requireAuth } from './_utils.js'
import {
  applyApiSecurityHeaders,
  ensureCsrfProtection,
  enforceRateLimit,
  ensureAllowedOrigin,
  getClientIp,
  parseJsonBody
} from '../_security.js'

const isProduction = process.env.NODE_ENV === 'production'

export default async function handler(req, res) {
  applyApiSecurityHeaders(req, res)

  if (req.method !== 'DELETE') {
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
      prefix: 'passkey-delete',
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

    if (!passkeyId) {
      return res.status(400).json({ error: 'Passkey id is required' })
    }

    const { data, error } = await supabaseAdmin
      .from('passkey_credentials')
      .delete()
      .eq('id', passkeyId)
      .eq('user_id', user.id)
      .select('id')
      .maybeSingle()

    if (error) {
      return handleError(res, error, 'Failed to delete passkey')
    }

    if (!data) {
      return res.status(404).json({ error: 'Passkey not found' })
    }

    return res.status(200).json({ success: true })
  } catch (error) {
    return handleError(res, error, 'Unable to delete passkey')
  }
}
