import { useCallback, useState } from 'react'
import { getErrorDetails, notify } from '@/lib/notify'

type ErrorFeedback = 'none' | 'error' | 'critical'

type RunAsyncActionOptions<T> = {
  logLabel?: string
  errorMessage?: string
  errorTitle?: string
  feedback?: ErrorFeedback
  onSuccess?: (result: T) => void
  onError?: (error: unknown) => void
}

export const useAsyncAction = (initialLoading = false) => {
  const [loading, setLoading] = useState(initialLoading)
  const [error, setError] = useState<unknown>(null)

  const run = useCallback(
    async <T>(action: () => Promise<T>, options: RunAsyncActionOptions<T> = {}) => {
      setLoading(true)
      setError(null)

      try {
        const result = await action()
        options.onSuccess?.(result)
        return result
      } catch (caughtError) {
        setError(caughtError)

        if (options.logLabel) {
          console.error(`${options.logLabel}:`, caughtError)
        }

        const feedback = options.feedback ?? 'none'
        if (feedback === 'critical') {
          notify.critical(options.errorMessage || '操作失败，请重试', {
            title: options.errorTitle || '操作失败',
            details: getErrorDetails(caughtError),
          })
        } else if (feedback === 'error') {
          notify.error(options.errorMessage || '操作失败，请重试')
        }

        options.onError?.(caughtError)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    setLoading,
    run,
  }
}

