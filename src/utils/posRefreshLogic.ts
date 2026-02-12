import type { POSMachine } from '@/lib/supabase'

export interface AttemptRefreshSource {
  id: string
  created_at: string
  result: 'success' | 'failure' | 'unknown'
  card_network?: string | null
  payment_method?: string | null
  cvm?: string | null
  acquiring_mode?: string | null
  device_status?: string | null
  acquiring_institution?: string | null
  checkout_location?: string | null
  is_conclusive_failure?: boolean | null
  attempted_at?: string | null
}

type CvmKey = 'no_pin' | 'pin' | 'signature'
type CvmState = 'supported' | 'unsupported' | 'unknown'
type AcquiringModeKey = 'DCC' | 'EDC'

const CVM_KEYS: readonly CvmKey[] = ['no_pin', 'pin', 'signature']
const ACQUIRING_MODE_KEYS: readonly AcquiringModeKey[] = ['DCC', 'EDC']
const DEVICE_STATUS_KEYS: readonly POSMachine['status'][] = ['active', 'inactive', 'maintenance', 'disabled']

export const POS_ATTEMPT_REFRESH_FLAG_KEY = 'attempt_logic_refreshed_once'
export const POS_ATTEMPT_REFRESH_AT_KEY = 'attempt_logic_refreshed_at'
export const POS_ATTEMPT_REFRESH_BY_KEY = 'attempt_logic_refreshed_by'
export const POS_ATTEMPT_REFRESH_COUNT_KEY = 'attempt_logic_refreshed_attempt_count'

const isConclusiveFailure = (attempt: AttemptRefreshSource) => attempt.result === 'failure' && Boolean(attempt.is_conclusive_failure)

const isDecisiveAttempt = (attempt: AttemptRefreshSource) => attempt.result === 'success' || isConclusiveFailure(attempt)

const getAttemptTimestamp = (attempt: Pick<AttemptRefreshSource, 'attempted_at' | 'created_at'>) => {
  const candidate = attempt.attempted_at || attempt.created_at
  if (!candidate) return 0
  const timestamp = new Date(candidate).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

const sortByAttemptTimestampDesc = <T extends Pick<AttemptRefreshSource, 'attempted_at' | 'created_at'>>(attempts: T[]) => {
  return [...attempts].sort((left, right) => getAttemptTimestamp(right) - getAttemptTimestamp(left))
}

const isSupportedState = (attempt: AttemptRefreshSource) => attempt.result === 'success'

const isKnownDeviceStatus = (status?: string | null): status is POSMachine['status'] =>
  Boolean(status && DEVICE_STATUS_KEYS.includes(status as POSMachine['status']))

const isKnownAcquiringMode = (mode?: string | null): mode is AcquiringModeKey =>
  Boolean(mode && ACQUIRING_MODE_KEYS.includes(mode as AcquiringModeKey))

const getLatestDecisiveAttempt = (
  attempts: AttemptRefreshSource[],
  matcher: (attempt: AttemptRefreshSource) => boolean
) => {
  for (const attempt of attempts) {
    if (!isDecisiveAttempt(attempt)) continue
    if (matcher(attempt)) return attempt
  }
  return null
}

const deriveBooleanFromDecisiveAttempt = (
  attempts: AttemptRefreshSource[],
  matcher: (attempt: AttemptRefreshSource) => boolean
): boolean | undefined => {
  const latest = getLatestDecisiveAttempt(attempts, matcher)
  if (!latest) return undefined
  return latest.result === 'success'
}

const deriveCvmState = (attempts: AttemptRefreshSource[], cvm: CvmKey): CvmState => {
  const latest = getLatestDecisiveAttempt(attempts, (attempt) => attempt.cvm === cvm)
  if (!latest) return 'unknown'
  return latest.result === 'success' ? 'supported' : 'unsupported'
}

const pickLatestNonEmptyValue = (
  attempts: AttemptRefreshSource[],
  selector: (attempt: AttemptRefreshSource) => string | null | undefined
) => {
  for (const attempt of attempts) {
    const value = selector(attempt)
    if (!value) continue
    const normalized = value.trim()
    if (normalized) return normalized
  }
  return undefined
}

const buildLatestDecisiveMap = (
  attempts: AttemptRefreshSource[],
  selector: (attempt: AttemptRefreshSource) => string | null | undefined
) => {
  const latestMap = new Map<string, AttemptRefreshSource>()
  for (const attempt of attempts) {
    if (!isDecisiveAttempt(attempt)) continue
    const rawValue = selector(attempt)
    if (!rawValue) continue
    const key = rawValue.trim()
    if (!key) continue
    if (!latestMap.has(key)) {
      latestMap.set(key, attempt)
    }
  }
  return latestMap
}

const buildLatestCvmNetworkMap = (attempts: AttemptRefreshSource[]) => {
  const latestMap = new Map<string, AttemptRefreshSource>()
  for (const attempt of attempts) {
    if (!isDecisiveAttempt(attempt)) continue
    if (!attempt.cvm || !CVM_KEYS.includes(attempt.cvm as CvmKey)) continue
    if (!attempt.card_network) continue
    const networkKey = attempt.card_network.trim()
    if (!networkKey) continue
    const key = `${attempt.cvm}:${networkKey}`
    if (!latestMap.has(key)) {
      latestMap.set(key, attempt)
    }
  }
  return latestMap
}

const getSupportedNetworksByCvm = (cvmNetworkMap: Map<string, AttemptRefreshSource>, cvm: CvmKey) => {
  const networks: string[] = []
  cvmNetworkMap.forEach((attempt, key) => {
    const [attemptCvm, attemptNetwork] = key.split(':')
    if (attemptCvm !== cvm || !attemptNetwork) return
    if (!isSupportedState(attempt)) return
    networks.push(attemptNetwork)
  })
  return networks
}

export interface DerivedPOSFromAttempts {
  basicInfo: POSMachine['basic_info']
  verificationModes: POSMachine['verification_modes']
  status: POSMachine['status']
  sourceAttemptCount: number
  decisiveAttemptCount: number
}

export const derivePOSFromAttempts = (pos: POSMachine, attempts: AttemptRefreshSource[]): DerivedPOSFromAttempts => {
  const sortedAttempts = sortByAttemptTimestampDesc(attempts || [])
  const decisiveAttempts = sortedAttempts.filter(isDecisiveAttempt)

  const supportsContactless = deriveBooleanFromDecisiveAttempt(sortedAttempts, (attempt) => attempt.payment_method === 'tap')
  const supportsApplePay = deriveBooleanFromDecisiveAttempt(sortedAttempts, (attempt) => attempt.payment_method === 'apple_pay')
  const supportsGooglePay = deriveBooleanFromDecisiveAttempt(sortedAttempts, (attempt) => attempt.payment_method === 'google_pay')
  const supportsHce = deriveBooleanFromDecisiveAttempt(sortedAttempts, (attempt) => attempt.payment_method === 'hce')
  const supportsDcc = deriveBooleanFromDecisiveAttempt(sortedAttempts, (attempt) => attempt.acquiring_mode === 'DCC')
  const supportsEdc = deriveBooleanFromDecisiveAttempt(sortedAttempts, (attempt) => attempt.acquiring_mode === 'EDC')

  const latestCardNetworkMap = buildLatestDecisiveMap(sortedAttempts, (attempt) => attempt.card_network)
  const supportedCardNetworks = Array.from(latestCardNetworkMap.entries())
    .filter(([, attempt]) => isSupportedState(attempt))
    .map(([cardNetwork]) => cardNetwork)

  const latestAcquiringModeMap = buildLatestDecisiveMap(
    sortedAttempts,
    (attempt) => (isKnownAcquiringMode(attempt.acquiring_mode) ? attempt.acquiring_mode : null)
  )
  const acquiringModes = Array.from(latestAcquiringModeMap.entries())
    .filter(([, attempt]) => isSupportedState(attempt))
    .map(([mode]) => mode)

  const latestCvmNetworkMap = buildLatestCvmNetworkMap(sortedAttempts)
  const noPinState = deriveCvmState(sortedAttempts, 'no_pin')
  const pinState = deriveCvmState(sortedAttempts, 'pin')
  const signatureState = deriveCvmState(sortedAttempts, 'signature')

  const nextBasicInfo: POSMachine['basic_info'] = {
    ...(pos.basic_info || {}),
    supported_card_networks: supportedCardNetworks,
    acquiring_modes: acquiringModes,
  }

  if (typeof supportsContactless === 'boolean') nextBasicInfo.supports_contactless = supportsContactless
  if (typeof supportsApplePay === 'boolean') nextBasicInfo.supports_apple_pay = supportsApplePay
  if (typeof supportsGooglePay === 'boolean') nextBasicInfo.supports_google_pay = supportsGooglePay
  if (typeof supportsHce === 'boolean') nextBasicInfo.supports_hce_simulation = supportsHce
  if (typeof supportsDcc === 'boolean') nextBasicInfo.supports_dcc = supportsDcc
  if (typeof supportsEdc === 'boolean') nextBasicInfo.supports_edc = supportsEdc

  const latestAcquiringInstitution = pickLatestNonEmptyValue(sortedAttempts, (attempt) => attempt.acquiring_institution)
  if (latestAcquiringInstitution) nextBasicInfo.acquiring_institution = latestAcquiringInstitution

  const latestCheckoutLocation = pickLatestNonEmptyValue(sortedAttempts, (attempt) => attempt.checkout_location)
  if (latestCheckoutLocation === '自助收银' || latestCheckoutLocation === '人工收银') {
    nextBasicInfo.checkout_location = latestCheckoutLocation
  }

  const nextVerificationModes: POSMachine['verification_modes'] = {
    ...(pos.verification_modes || {}),
    small_amount_no_pin: getSupportedNetworksByCvm(latestCvmNetworkMap, 'no_pin'),
    small_amount_no_pin_unsupported: noPinState === 'unsupported',
    small_amount_no_pin_uncertain: false,
    requires_password: getSupportedNetworksByCvm(latestCvmNetworkMap, 'pin'),
    requires_password_unsupported: pinState === 'unsupported',
    requires_password_uncertain: false,
    requires_signature: getSupportedNetworksByCvm(latestCvmNetworkMap, 'signature'),
    requires_signature_unsupported: signatureState === 'unsupported',
    requires_signature_uncertain: false,
  }

  const latestDeviceStatusAttempt = sortedAttempts.find(
    (attempt): attempt is AttemptRefreshSource & { device_status: POSMachine['status'] } =>
      isKnownDeviceStatus(attempt.device_status)
  )
  const nextStatus = latestDeviceStatusAttempt?.device_status || pos.status || 'active'

  return {
    basicInfo: nextBasicInfo,
    verificationModes: nextVerificationModes,
    status: nextStatus,
    sourceAttemptCount: sortedAttempts.length,
    decisiveAttemptCount: decisiveAttempts.length,
  }
}

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export interface POSAttemptRefreshMeta {
  hasRefreshed: boolean
  refreshedAt?: string
  refreshedBy?: string
  refreshedAttemptCount?: number
}

export const readPOSAttemptRefreshMeta = (extendedFields: unknown): POSAttemptRefreshMeta => {
  const fields = asRecord(extendedFields)
  const hasRefreshed = fields[POS_ATTEMPT_REFRESH_FLAG_KEY] === true
  const refreshedAt = typeof fields[POS_ATTEMPT_REFRESH_AT_KEY] === 'string' ? (fields[POS_ATTEMPT_REFRESH_AT_KEY] as string) : undefined
  const refreshedBy = typeof fields[POS_ATTEMPT_REFRESH_BY_KEY] === 'string' ? (fields[POS_ATTEMPT_REFRESH_BY_KEY] as string) : undefined
  const refreshedAttemptCount =
    typeof fields[POS_ATTEMPT_REFRESH_COUNT_KEY] === 'number'
      ? (fields[POS_ATTEMPT_REFRESH_COUNT_KEY] as number)
      : undefined

  return {
    hasRefreshed,
    refreshedAt,
    refreshedBy,
    refreshedAttemptCount,
  }
}

export const buildRefreshedExtendedFields = (
  extendedFields: unknown,
  actorUserId: string,
  refreshedAt: string,
  attemptCount: number
) => {
  const fields = asRecord(extendedFields)
  return {
    ...fields,
    [POS_ATTEMPT_REFRESH_FLAG_KEY]: true,
    [POS_ATTEMPT_REFRESH_AT_KEY]: refreshedAt,
    [POS_ATTEMPT_REFRESH_BY_KEY]: actorUserId,
    [POS_ATTEMPT_REFRESH_COUNT_KEY]: attemptCount,
  }
}
