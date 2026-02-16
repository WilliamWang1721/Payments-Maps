import { createClient } from '@supabase/supabase-js'
import { applyApiSecurityHeaders, getSafeErrorMessage } from '../_security.js'

let cachedAdminClient = null

export const handleError = (res, error, defaultMessage = 'Server error') => {
  console.error(defaultMessage, error)
  const payload = { error: defaultMessage }
  if (process.env.NODE_ENV !== 'production') {
    payload.detail = getSafeErrorMessage(error)
  }
  res.status(500).json(payload)
}

export const getSupabaseAdminClient = () => {
  if (cachedAdminClient) return cachedAdminClient
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase admin credentials are not configured')
  }

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })
  return cachedAdminClient
}

const extractToken = (req) => {
  const header = req.headers?.authorization || req.headers?.Authorization || ''
  if (!header) return null
  if (header.startsWith('Bearer ')) {
    return header.slice(7)
  }
  return header
}

export const requireAuth = async (req, res) => {
  applyApiSecurityHeaders(req, res)

  const token = extractToken(req)
  if (!token) {
    res.status(401).json({ error: 'Missing Authorization token' })
    return null
  }

  let supabaseAdmin
  try {
    supabaseAdmin = getSupabaseAdminClient()
  } catch (error) {
    handleError(res, error, 'Supabase admin client not configured')
    return null
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) {
    res
      .status(401)
      .json({ error: 'Invalid or expired session', detail: error?.message })
    return null
  }

  return { user: data.user, supabaseAdmin }
}

export const bufferToBase64Url = (buffer) => {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

export const base64UrlToBuffer = (value) => {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = base64.length % 4
  if (padding === 2) base64 += '=='
  else if (padding === 3) base64 += '='
  else if (padding !== 0) base64 += '==='
  return Buffer.from(base64, 'base64')
}
