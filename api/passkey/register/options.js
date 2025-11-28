import { generateRegistrationOptions } from '@simplewebauthn/server'
import { passkeyConfig } from '../config.js'
import {
  base64UrlToBuffer,
  handleError,
  requireAuth
} from '../_utils.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authContext = await requireAuth(req, res)
  if (!authContext) return

  const { user, supabaseAdmin } = authContext

  try {
    const { data: existingCreds, error: existingError } = await supabaseAdmin
      .from('passkey_credentials')
      .select('credential_id')
      .eq('user_id', user.id)

    if (existingError) {
      return handleError(res, existingError, 'Failed to load passkey list')
    }

    const options = await generateRegistrationOptions({
      rpName: passkeyConfig.rpName,
      rpID: passkeyConfig.rpID,
      userName: user.email || user.user_metadata?.user_name || user.id,
      userDisplayName:
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        user.email ||
        'Payments Maps User',
      userID: user.id,
      attestationType: 'none',
      authenticatorSelection: {
        userVerification: 'preferred',
        residentKey: 'preferred',
        requireResidentKey: false
      },
      excludeCredentials: (existingCreds || []).map((cred) => ({
        id: base64UrlToBuffer(cred.credential_id),
        type: 'public-key'
      })),
      supportedAlgorithmIDs: [-7, -257]
    })

    await supabaseAdmin
      .from('passkey_challenges')
      .delete()
      .eq('user_id', user.id)
      .eq('type', 'registration')

    const { error: insertError } = await supabaseAdmin
      .from('passkey_challenges')
      .insert({
        user_id: user.id,
        challenge: options.challenge,
        type: 'registration'
      })

    if (insertError) {
      return handleError(res, insertError, 'Failed to persist challenge')
    }

    return res.status(200).json(options)
  } catch (error) {
    return handleError(res, error, 'Unable to create registration options')
  }
}
