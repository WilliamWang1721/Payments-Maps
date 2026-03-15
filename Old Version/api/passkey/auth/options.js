import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { passkeyConfig } from '../config.js'
import {
  base64UrlToBuffer,
  getSupabaseAdminClient,
  handleError
} from '../_utils.js'
import {
  applyApiSecurityHeaders,
  ensureCsrfProtection,
  enforceRateLimit,
  ensureAllowedOrigin,
  getClientIp,
  parseJsonBody
} from '../../_security.js'

const isProduction = process.env.NODE_ENV === 'production'

const normalizeEmail = (email = '') => email.trim().toLowerCase()

const AUTHENTICATOR_TRANSPORTS = ['internal', 'hybrid', 'usb', 'nfc', 'ble']

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

export default async function handler(req, res) {
  applyApiSecurityHeaders(req, res)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!ensureAllowedOrigin(req, res, { allowNoOrigin: !isProduction })) {
    return
  }

  if (!ensureCsrfProtection(req, res)) {
    return
  }

  if (
    !enforceRateLimit(req, res, {
      prefix: 'passkey-auth-options-ip',
      identifier: getClientIp(req),
      limit: 40,
      windowMs: 60_000
    })
  ) {
    return
  }

  const body = parseJsonBody(req)
  const email = normalizeEmail(body?.email || '')
  if (!email) {
    return res.status(400).json({ error: '请提供注册时使用的邮箱' })
  }

  if (
    !enforceRateLimit(req, res, {
      prefix: 'passkey-auth-options-email',
      identifier: `${getClientIp(req)}:${email}`,
      limit: 12,
      windowMs: 60_000
    })
  ) {
    return
  }

  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
  } catch (error) {
    return handleError(res, error, 'Supabase admin client not configured')
  }

  try {
    const authUsers = await findAuthUsersByEmail(supabaseAdmin, email)
    if (!authUsers.length) {
      return res.status(400).json({ error: '无法创建 Passkey 登录请求，请检查邮箱和 Passkey 状态' })
    }

    const userIds = authUsers.map((user) => user.id)

    const { data: credentials, error } = await supabaseAdmin
      .from('passkey_credentials')
      .select('credential_id,user_id')
      .in('user_id', userIds)

    if (error) {
      return handleError(res, error, '无法加载 Passkey 信息')
    }

    if (!credentials || credentials.length === 0) {
      return res.status(400).json({ error: '无法创建 Passkey 登录请求，请检查邮箱和 Passkey 状态' })
    }

    const allowCredentials = credentials.map((cred) => ({
      id: base64UrlToBuffer(cred.credential_id),
      type: 'public-key',
      transports: AUTHENTICATOR_TRANSPORTS
    }))

    const options = await generateAuthenticationOptions({
      rpID: passkeyConfig.rpID,
      allowCredentials,
      userVerification: 'preferred'
    })

    // Prefer built-in and hybrid authenticators (e.g. password managers) instead of only hardware keys.
    options.hints = ['client-device', 'hybrid']

    const uniqueUserIds = Array.from(new Set(credentials.map((cred) => cred.user_id)))

    await supabaseAdmin
      .from('passkey_challenges')
      .delete()
      .in('user_id', uniqueUserIds)
      .eq('type', 'authentication')

    const challengePayload = uniqueUserIds.map((id) => ({
      user_id: id,
      challenge: options.challenge,
      type: 'authentication'
    }))

    const { error: insertError } = await supabaseAdmin
      .from('passkey_challenges')
      .insert(challengePayload)

    if (insertError) {
      return handleError(res, insertError, 'Failed to persist challenge')
    }

    return res.status(200).json(options)
  } catch (error) {
    return handleError(res, error, '无法创建 Passkey 登录请求')
  }
}
