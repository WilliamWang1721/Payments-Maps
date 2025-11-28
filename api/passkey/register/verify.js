import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { passkeyConfig } from '../config.js'
import {
  bufferToBase64Url,
  handleError,
  requireAuth
} from '../_utils.js'

const parseBody = (req) => {
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  }
  return {}
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authContext = await requireAuth(req, res)
  if (!authContext) return

  const { user, supabaseAdmin } = authContext

  try {
    const body = parseBody(req)
    const { attestationResponse, friendlyName } = body || {}

    if (!attestationResponse) {
      return res.status(400).json({ error: 'Missing attestationResponse' })
    }

    const { data: challengeRow, error: challengeError } = await supabaseAdmin
      .from('passkey_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'registration')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (challengeError) {
      return handleError(res, challengeError, 'Failed to load challenge')
    }

    if (!challengeRow) {
      return res.status(400).json({ error: 'Registration challenge not found' })
    }

    if (challengeRow.expires_at && new Date(challengeRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Registration challenge expired' })
    }

    const verification = await verifyRegistrationResponse({
      response: attestationResponse,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: passkeyConfig.origin,
      expectedRPID: passkeyConfig.rpID,
      requireUserVerification: true
    })

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: 'Passkey verification failed' })
    }

    const {
      credentialID,
      credentialPublicKey,
      counter,
      credentialDeviceType,
      credentialBackedUp
    } = verification.registrationInfo

    const nameToStore = (friendlyName || '').trim().slice(0, 120)
    const normalizedEmail = (user.email || '').toLowerCase()

    const credentialPayload = {
      user_id: user.id,
      user_email: normalizedEmail || null,
      credential_id: bufferToBase64Url(credentialID),
      public_key: bufferToBase64Url(credentialPublicKey),
      counter,
      device_type: credentialDeviceType || null,
      backed_up: credentialBackedUp ?? null,
      friendly_name: nameToStore || `Passkey ${new Date().toLocaleString()}`,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data: upserted, error: upsertError } = await supabaseAdmin
      .from('passkey_credentials')
      .upsert(credentialPayload, { onConflict: 'credential_id' })
      .select()
      .single()

    if (upsertError) {
      return handleError(res, upsertError, 'Failed to save passkey')
    }

    await supabaseAdmin
      .from('passkey_challenges')
      .delete()
      .eq('id', challengeRow.id)

    return res.status(200).json({
      verified: true,
      passkey: {
        id: upserted.id,
        friendly_name: upserted.friendly_name,
        device_type: upserted.device_type,
        backed_up: upserted.backed_up,
        created_at: upserted.created_at,
        last_used_at: upserted.last_used_at
      }
    })
  } catch (error) {
    return handleError(res, error, 'Unable to verify registration')
  }
}
