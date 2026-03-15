import { CARD_NETWORKS } from '@/lib/cardNetworks'

// 手续费类型枚举
export enum FeeType {
  PERCENTAGE = 'percentage', // 百分比
  FIXED = 'fixed' // 固定金额
}

// 单个卡组织的手续费配置
export interface CardNetworkFee {
  network: string // 卡组织代码 (visa, mastercard, etc.)
  type: FeeType // 手续费类型
  value: number // 手续费值 (百分比时为0-100的数字，固定金额时为具体金额)
  currency?: string // 货币单位，固定金额时使用
  enabled: boolean // 是否启用该卡组织的手续费
}

// 完整的手续费配置
export interface FeesConfiguration {
  [key: string]: CardNetworkFee
}

// 手续费显示信息
export interface FeeDisplayInfo {
  network: string
  networkLabel: string
  type: FeeType
  value: number
  currency?: string
  enabled: boolean
  formattedValue: string // 格式化后的显示值
}

// 默认手续费配置
export const DEFAULT_FEES_CONFIG: FeesConfiguration = {
  mastercard: {
    network: 'mastercard',
    type: FeeType.PERCENTAGE,
    value: 0,
    enabled: false
  },
  visa: {
    network: 'visa',
    type: FeeType.PERCENTAGE,
    value: 0,
    enabled: false
  },
  unionpay: {
    network: 'unionpay',
    type: FeeType.PERCENTAGE,
    value: 0,
    enabled: false
  },
  amex_cn: {
    network: 'amex_cn',
    type: FeeType.PERCENTAGE,
    value: 0,
    enabled: false
  },
  amex: {
    network: 'amex',
    type: FeeType.PERCENTAGE,
    value: 0,
    enabled: false
  },
  mastercard_cn: {
    network: 'mastercard_cn',
    type: FeeType.PERCENTAGE,
    value: 0,
    enabled: false
  },
  jcb: {
    network: 'jcb',
    type: FeeType.PERCENTAGE,
    value: 0,
    enabled: false
  },
  discover: {
    network: 'discover',
    type: FeeType.PERCENTAGE,
    value: 0,
    enabled: false
  },
  diners: {
    network: 'diners',
    type: FeeType.PERCENTAGE,
    value: 0,
    enabled: false
  }
}

// 手续费工具函数
export const feeUtils = {
  // 格式化手续费显示值
  formatFeeValue: (fee: CardNetworkFee): string => {
    if (!fee.enabled) return '未设置'
    
    if (fee.type === FeeType.PERCENTAGE) {
      return `${fee.value}%`
    } else {
      return `${fee.currency || '$'}${fee.value.toFixed(2)}`
    }
  },

  // 获取卡组织的显示信息
  getFeeDisplayInfo: (fee: CardNetworkFee): FeeDisplayInfo => {
    const networkInfo = CARD_NETWORKS.find(n => n.value === fee.network)
    return {
      network: fee.network,
      networkLabel: networkInfo?.label || fee.network.toUpperCase(),
      type: fee.type,
      value: fee.value,
      currency: fee.currency,
      enabled: fee.enabled,
      formattedValue: feeUtils.formatFeeValue(fee)
    }
  },

  // 验证手续费配置
  validateFeeConfig: (fee: CardNetworkFee): boolean => {
    if (!fee.enabled) return true
    
    if (fee.type === FeeType.PERCENTAGE) {
      return fee.value >= 0 && fee.value <= 100
    } else {
      return fee.value >= 0
    }
  },

  // 计算手续费金额
  calculateFeeAmount: (fee: CardNetworkFee, transactionAmount: number): number => {
    if (!fee.enabled) return 0
    
    if (fee.type === FeeType.PERCENTAGE) {
      return (transactionAmount * fee.value) / 100
    } else {
      return fee.value
    }
  }
}