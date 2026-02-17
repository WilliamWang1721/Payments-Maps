import { toast } from 'sonner'
import { useNotificationStore } from '@/stores/useNotificationStore'

export interface CriticalNotifyOptions {
  title?: string
  details?: string
}

export interface CriticalErrorOptions {
  title?: string
  fallbackMessage?: string
}

export function getErrorMessage(error: unknown, fallbackMessage = '操作失败，请重试') {
  if (error instanceof Error) return error.message || fallbackMessage
  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message?: unknown }).message || '').trim()
    if (message) return message
  }
  if (typeof error === 'string') return error
  return fallbackMessage
}

export function isLikelyNetworkError(error: unknown) {
  if (!error || typeof error !== 'object') return false

  const message = getErrorMessage(error, '').toLowerCase()
  const code = String((error as { code?: string }).code || '').toLowerCase()

  return (
    message.includes('network') ||
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    code.includes('network') ||
    code.includes('timeout')
  )
}

export function getFriendlyErrorMessage(
  error: unknown,
  fallbackMessage = '操作失败，请重试',
  networkFallback = '网络异常，请检查网络后重试'
) {
  if (isLikelyNetworkError(error)) {
    return networkFallback
  }
  return getErrorMessage(error, fallbackMessage)
}

export function getErrorDetails(error: unknown) {
  if (!import.meta.env.DEV) return undefined

  if (error instanceof Error) return error.stack || error.message
  try {
    return JSON.stringify(error, null, 2)
  } catch {
    return String(error)
  }
}

export const notify = {
  // Banner (Sonner)
  success: (...args: Parameters<typeof toast.success>) => toast.success(...args),
  info: (...args: Parameters<typeof toast.info>) => toast.info(...args),
  warning: (...args: Parameters<typeof toast.warning>) => toast.warning(...args),
  error: (...args: Parameters<typeof toast.error>) => toast.error(...args),
  message: (...args: Parameters<typeof toast.message>) => toast.message(...args),
  loading: (...args: Parameters<typeof toast.loading>) => toast.loading(...args),
  dismiss: (...args: Parameters<typeof toast.dismiss>) => toast.dismiss(...args),

  // Modal (Critical)
  critical: (message: string, options?: CriticalNotifyOptions) => {
    useNotificationStore.getState().showCritical({
      title: options?.title ?? '重要提示',
      message,
      details: options?.details,
    })
  },

  criticalError: (error: unknown, options?: CriticalErrorOptions) => {
    const message = getErrorMessage(error, options?.fallbackMessage ?? '操作失败，请重试')
    const details = getErrorDetails(error)

    useNotificationStore.getState().showCritical({
      title: options?.title ?? '重要提示',
      message,
      details,
    })
  },
}
