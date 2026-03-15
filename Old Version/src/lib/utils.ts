import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 获取验证模式标签
export function getVerificationModeLabel(mode: string): string {
  const labels: { [key: string]: string } = {
    'pin': 'PIN验证',
    'signature': '签名验证',
    'no_verification': '无需验证',
    'pin_signature': 'PIN+签名',
    'contactless': '免密支付',
    'biometric': '生物识别'
  }
  return labels[mode] || mode
}

// 获取结果状态标签
export function getResultLabel(result: string): string {
  const labels: { [key: string]: string } = {
    'success': '成功',
    'failure': '失败',
    'declined': '拒绝',
    'timeout': '超时',
    'error': '错误',
    'cancelled': '取消',
    'pending': '处理中'
  }
  return labels[result] || result
}

// 获取支付方式标签
export function getPaymentMethodLabel(method: string): string {
  const labels: { [key: string]: string } = {
    'apple_pay': 'Apple Pay',
    'google_pay': 'Google Pay',
    'hce': 'HCE',
    'tap': '实体卡 Tap',
    'insert': '实体卡 Insert',
    'swipe': '实体卡 Swipe',
    'contactless': '非接触式',
    'chip': '芯片卡',
    'magnetic': '磁条卡'
  }
  return labels[method] || method
}