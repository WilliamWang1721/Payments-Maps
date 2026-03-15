export const CARD_NETWORKS = [
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'visa', label: 'Visa' },
  { value: 'unionpay', label: 'UnionPay 银联' },
  { value: 'amex_cn', label: 'American Express CN' },
  { value: 'amex', label: 'American Express GL' },
  { value: 'mastercard_cn', label: 'Mastercard CN 万事网联' },
  { value: 'jcb', label: 'JCB' },
  { value: 'discover', label: 'Discover' },
  { value: 'diners', label: 'Diners Club' },
] as const

export type CardNetwork = typeof CARD_NETWORKS[number]['value']

export type CardLevelOption = {
  value: string
  label: string
}

const VISA_LEVELS: CardLevelOption[] = [
  { value: 'Classic', label: 'Classic' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Platinum', label: 'Platinum' },
  { value: 'Signature', label: 'Signature' },
  { value: 'Infinite', label: 'Infinite' },
]

const MASTERCARD_LEVELS: CardLevelOption[] = [
  { value: 'Standard', label: 'Standard' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Platinum', label: 'Platinum' },
  { value: 'World', label: 'World' },
  { value: 'World Elite', label: 'World Elite' },
  { value: 'World Legend', label: 'World Legend' },
]

const UNIONPAY_LEVELS: CardLevelOption[] = [
  { value: 'Platinum', label: 'Platinum' },
  { value: 'Diamond', label: 'Diamond' },
  { value: 'Diamond Prestige', label: 'Diamond Prestige' },
]

const AMEX_LEVELS: CardLevelOption[] = [
  { value: 'Green', label: 'Green' },
  { value: 'Gold', label: 'Gold' },
  { value: 'Platinum', label: 'Platinum' },
  { value: 'Centurion', label: 'Centurion（邀请制）' },
]

const JCB_LEVELS: CardLevelOption[] = [
  { value: 'JCB Card S', label: 'JCB Card S' },
  { value: 'JCB Card W', label: 'JCB Card W' },
  { value: 'JCB Gold', label: 'JCB Gold' },
  { value: 'JCB Gold The Premier', label: 'JCB Gold The Premier' },
  { value: 'JCB Platinum', label: 'JCB Platinum' },
  { value: 'JCB The Class', label: 'JCB The Class（邀请制）' },
]

const DISCOVER_LEVELS: CardLevelOption[] = [
  { value: 'Cash Back', label: 'Cash Back' },
  { value: 'Miles', label: 'Miles' },
  { value: 'Student', label: 'Student' },
  { value: 'Secured', label: 'Secured' },
]

const DINERS_LEVELS: CardLevelOption[] = [
  { value: 'Consumer', label: 'Consumer' },
  { value: 'Premium', label: 'Premium' },
  { value: 'Corporate', label: 'Corporate' },
]

export const DEFAULT_CARD_LEVEL_OPTIONS: CardLevelOption[] = [
  { value: '普卡', label: '普卡' },
  { value: '金卡', label: '金卡' },
  { value: '白金卡', label: '白金卡' },
  { value: '钻石卡', label: '钻石卡' },
]

const CARD_LEVELS_BY_NETWORK: Record<CardNetwork, CardLevelOption[]> = {
  mastercard: MASTERCARD_LEVELS,
  visa: VISA_LEVELS,
  unionpay: UNIONPAY_LEVELS,
  amex_cn: AMEX_LEVELS,
  amex: AMEX_LEVELS,
  mastercard_cn: MASTERCARD_LEVELS,
  jcb: JCB_LEVELS,
  discover: DISCOVER_LEVELS,
  diners: DINERS_LEVELS,
}

const ORGANIZATION_MATCHERS: Array<{ network: CardNetwork; keywords: string[] }> = [
  { network: 'mastercard_cn', keywords: ['mastercard cn', '万事网联'] },
  { network: 'amex_cn', keywords: ['american express cn'] },
  { network: 'amex', keywords: ['american express', 'amex'] },
  { network: 'mastercard', keywords: ['mastercard'] },
  { network: 'visa', keywords: ['visa'] },
  { network: 'unionpay', keywords: ['unionpay', '银联'] },
  { network: 'jcb', keywords: ['jcb'] },
  { network: 'discover', keywords: ['discover'] },
  { network: 'diners', keywords: ['diners'] },
]

const normalizeOrganization = (organization: string) => organization.trim().toLowerCase()

export const getCardNetworkValue = (valueOrLabel: string): CardNetwork | null => {
  const normalized = normalizeOrganization(valueOrLabel)
  if (!normalized) return null

  const directMatch = CARD_NETWORKS.find((network) => {
    return network.value === normalized || network.label.toLowerCase() === normalized
  })
  if (directMatch) {
    return directMatch.value
  }

  for (const matcher of ORGANIZATION_MATCHERS) {
    if (matcher.keywords.some((keyword) => normalized.includes(keyword))) {
      return matcher.network
    }
  }

  return null
}

export const getCardNetworkLabel = (value: string): string => {
  const network = CARD_NETWORKS.find((item) => item.value === value)
  return network?.label || value
}

export const getCardNetworkLabels = (values: string[]): string[] => {
  return values.map((value) => getCardNetworkLabel(value))
}

export const getCardLevelOptionsByNetwork = (network: CardNetwork | string): CardLevelOption[] => {
  const resolvedNetwork = getCardNetworkValue(network)
  if (!resolvedNetwork) {
    return DEFAULT_CARD_LEVEL_OPTIONS
  }
  return CARD_LEVELS_BY_NETWORK[resolvedNetwork]
}

export const getCardLevelOptionsByOrganization = (organization: string): CardLevelOption[] => {
  const resolvedNetwork = getCardNetworkValue(organization)
  if (!resolvedNetwork) {
    return DEFAULT_CARD_LEVEL_OPTIONS
  }
  return CARD_LEVELS_BY_NETWORK[resolvedNetwork]
}
