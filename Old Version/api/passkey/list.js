import { handleError, requireAuth } from './_utils.js'
import {
  applyApiSecurityHeaders,
  enforceRateLimit,
  ensureAllowedOrigin,
  getClientIp
} from '../_security.js'

const isProduction = process.env.NODE_ENV === 'production'

export default async function handler(req, res) {
  applyApiSecurityHeaders(req, res)

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ensureAllowedOrigin(req, res, { allowNoOrigin: !isProduction })) {
    return
  }

  const authContext = await requireAuth(req, res)
  if (!authContext) return

  const { user, supabaseAdmin } = authContext

  const identity = `${getClientIp(req)}:${user.id}`
  if (
    !enforceRateLimit(req, res, {
      prefix: 'passkey-list',
      identifier: identity,
      limit: 60,
      windowMs: 60_000
    })
  ) {
    return
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('passkey_credentials')
      .select('id,friendly_name,created_at,last_used_at,device_type,backed_up')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return handleError(res, error, 'Failed to load passkeys')
    }

    return res.status(200).json({ passkeys: data || [] })
  } catch (error) {
    return handleError(res, error, 'Unable to fetch passkeys')
  }
}
