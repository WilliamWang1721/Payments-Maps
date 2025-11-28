import { handleError, requireAuth } from './_utils.js'

const parseBody = (req) => {
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  }
  return {}
}

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authContext = await requireAuth(req, res)
  if (!authContext) return

  const { user, supabaseAdmin } = authContext

  try {
    const body = parseBody(req)
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
