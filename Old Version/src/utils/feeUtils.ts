import type { FeesConfiguration, CardNetworkFee } from '@/types/fees'

/**
 * 计算手续费金额
 * @param amount 交易金额
 * @param fee 手续费配置
 * @returns 手续费金额
 */
export function calculateFee(amount: number, fee: CardNetworkFee): number {
  if (!fee.enabled) return 0
  
  if (fee.type === 'percentage') {
    return (amount * fee.value) / 100
  } else {
    return fee.value
  }
}

/**
 * 格式化手续费显示
 * @param fee 手续费配置
 * @returns 格式化后的手续费字符串
 */
export function formatFeeDisplay(fee: CardNetworkFee): string {
  if (!fee.enabled) return '未启用'
  
  if (fee.type === 'percentage') {
    return `${fee.value}%`
  } else {
    return `${fee.currency} ${fee.value.toFixed(2)}`
  }
}

/**
 * 获取手续费显示信息
 * @param fee 手续费配置
 * @returns 手续费显示信息对象
 */
export function getFeeDisplayInfo(fee: CardNetworkFee) {
  return {
    enabled: fee.enabled,
    type: fee.type,
    formattedValue: formatFeeDisplay(fee),
    currency: fee.currency,
    value: fee.value
  }
}

/**
 * 计算示例手续费（用于百分比费率的预览）
 * @param fee 手续费配置
 * @param exampleAmount 示例金额，默认100
 * @returns 示例手续费金额
 */
export function calculateExampleFee(fee: CardNetworkFee, exampleAmount: number = 100): number {
  return calculateFee(exampleAmount, fee)
}

/**
 * 检查手续费配置是否有效
 * @param fee 手续费配置
 * @returns 是否有效
 */
export function isValidFee(fee: CardNetworkFee): boolean {
  if (!fee.enabled) return true
  return fee.value > 0
}

/**
 * 获取所有启用的手续费配置
 * @param fees 完整的手续费配置
 * @returns 启用的手续费配置数组
 */
export function getEnabledFees(fees: FeesConfiguration): Array<{ network: string; fee: CardNetworkFee }> {
  const enabledFees: Array<{ network: string; fee: CardNetworkFee }> = []
  
  Object.entries(fees).forEach(([network, fee]) => {
    if (fee.enabled) {
      enabledFees.push({ network, fee })
    }
  })
  
  return enabledFees
}