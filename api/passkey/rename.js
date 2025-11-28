import { handleError, requireAuth } from './_utils.js'

const parseBody = (req) => {
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  }
  return {}
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authContext = await requireAuth(req, res)
  if (!authContext) return

  const { user, supabaseAdmin } = authContext

  try {
    const body = parseBody(req)
    const passkeyId = body?.id || body?.passkeyId
    const friendlyName = (body?.friendlyName || '').trim().slice(0, 120)

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
