import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { passkeyConfig } from '../config.js'
import {
  base64UrlToBuffer,
  getSupabaseAdminClient,
  handleError
} from '../_utils.js'

const parseBody = async (req) => {
  if (!req.body) return {}
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body
}

const normalizeEmail = (email = '') => email.trim().toLowerCase()

const findAuthUsersByEmail = async (supabaseAdmin, email) => {
  if (typeof supabaseAdmin.auth?.admin?.getUserByEmail === 'function') {
    const { data, error } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    if (error) {
      throw new Error(error.message || '无法根据邮箱查询用户')
    }
    return data?.user ? [data.user] : []
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error('缺少 Supabase 服务端配置')
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users?email=${encodeURIComponent(email)}`
  const response = await fetch(endpoint, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`
    }
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error_description || data?.error || '无法根据邮箱查询用户')
  }
  if (!Array.isArray(data?.users)) {
    return []
  }
  return data.users
}

const createSupabaseSession = async (userId) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    throw new Error('缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  }

  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/admin/users/${userId}/tokens`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      data?.error_description ||
        data?.error ||
        'Supabase 无法创建会话，请检查服务端配置'
    )
  }

  return data
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
  } catch (error) {
    return handleError(res, error, 'Supabase admin client not configured')
  }

  try {
    const body = await parseBody(req)
    const email = normalizeEmail(body?.email || '')
    const assertionResponse = body?.assertionResponse

    if (!email || !assertionResponse?.id) {
      return res.status(400).json({ error: '参数不完整，无法完成 Passkey 登录' })
    }

    const authUsers = await findAuthUsersByEmail(supabaseAdmin, email)
    if (!authUsers.length) {
      return res.status(404).json({ error: '未找到对应的用户，请确认邮箱是否正确' })
    }

    const userIds = authUsers.map((user) => user.id)

    const credentialId = assertionResponse.id

    const { data: credential, error: credentialError } = await supabaseAdmin
      .from('passkey_credentials')
      .select('*')
      .eq('credential_id', credentialId)
      .in('user_id', userIds)
      .maybeSingle()

    if (credentialError) {
      return handleError(res, credentialError, '无法查询 Passkey 信息')
    }

    if (!credential) {
      return res.status(400).json({ error: 'Passkey 未注册或已被删除' })
    }

    const { data: challengeRow, error: challengeError } = await supabaseAdmin
      .from('passkey_challenges')
      .select('*')
      .eq('user_id', credential.user_id)
      .eq('type', 'authentication')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (challengeError) {
      return handleError(res, challengeError, '无法读取 Passkey 挑战数据')
    }

    if (!challengeRow) {
      return res.status(400).json({ error: '未找到可用的 Passkey 挑战' })
    }

    if (challengeRow.expires_at && new Date(challengeRow.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Passkey 挑战已过期，请重试' })
    }

    const authenticator = {
      credentialID: base64UrlToBuffer(credential.credential_id),
      credentialPublicKey: base64UrlToBuffer(credential.public_key),
      counter: credential.counter || 0
    }

    const verification = await verifyAuthenticationResponse({
      response: assertionResponse,
      expectedChallenge: challengeRow.challenge,
      expectedOrigin: passkeyConfig.origin,
      expectedRPID: passkeyConfig.rpID,
      authenticator,
      requireUserVerification: true
    })

    if (!verification.verified || !verification.authenticationInfo) {
      return res.status(400).json({ error: 'Passkey 验证失败，请重试' })
    }

    const { newCounter } = verification.authenticationInfo

    await supabaseAdmin
      .from('passkey_credentials')
      .update({
        counter: newCounter,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', credential.id)

    await supabaseAdmin
      .from('passkey_challenges')
      .delete()
      .eq('id', challengeRow.id)

    const session = await createSupabaseSession(credential.user_id)

    return res.status(200).json({
      verified: true,
      session
    })
  } catch (error) {
    return handleError(res, error, 'Unable to verify authentication')
  }
}
