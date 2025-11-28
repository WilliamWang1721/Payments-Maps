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
const origin =
  process.env.PASSKEY_ORIGIN ||
  (rpID.startsWith('http') ? rpID : `https://${rpID}`)

export const passkeyConfig = {
  rpID,
  rpName,
  origin
}
