const isProduction = process.env.NODE_ENV === 'production'

const normalizeOrigin = (value) => {
  if (typeof value !== 'string' || !value.trim()) return null
  try {
    return new URL(value.trim()).origin
  } catch {
    return null
  }
}

const inferRpId = () => {
  if (process.env.PASSKEY_RP_ID) {
    return process.env.PASSKEY_RP_ID
  }
  if (process.env.PASSKEY_ORIGIN) {
    try {
      return new URL(process.env.PASSKEY_ORIGIN).hostname
    } catch {
      // ignore
    }
  }
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL.replace(/^https?:\/\//, '')
  }
  if (process.env.SUPABASE_URL) {
    try {
      return new URL(process.env.SUPABASE_URL).hostname
    } catch {
      // ignore
    }
  }
  return 'localhost'
}

const rpID = inferRpId()
const rpName = process.env.PASSKEY_RP_NAME || 'Payments Maps'
const origin = normalizeOrigin(
  process.env.PASSKEY_ORIGIN ||
  (rpID.startsWith('http') ? rpID : `https://${rpID}`)
)

if (!origin) {
  throw new Error('PASSKEY_ORIGIN is invalid or missing')
}

if (isProduction && !origin.startsWith('https://')) {
  throw new Error('PASSKEY_ORIGIN must use HTTPS in production')
}

export const passkeyConfig = {
  rpID,
  rpName,
  origin
}
