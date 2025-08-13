// 支持的卡组织类型
export const CARD_NETWORKS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex_cn', label: 'AMEX CN' },
  { value: 'amex', label: 'AMEX' },
  { value: 'maestro', label: '万事网联' },
  { value: 'jcb', label: 'JCB' },
  { value: 'discover', label: 'Discover' },
  { value: 'unionpay', label: '银联' }
] as const

// 卡组织类型
export type CardNetwork = typeof CARD_NETWORKS[number]['value']

// 获取卡组织标签
export const getCardNetworkLabel = (value: string): string => {
  const network = CARD_NETWORKS.find(n => n.value === value)
  return network?.label || value
}

// 获取多个卡组织标签
export const getCardNetworkLabels = (values: string[]): string[] => {
  return values.map(value => getCardNetworkLabel(value))
}