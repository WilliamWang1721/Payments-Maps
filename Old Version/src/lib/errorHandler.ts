import { getErrorDetails, getErrorMessage, notify } from '@/lib/notify'

type ErrorNotifyMode = 'error' | 'critical'

interface ReportErrorOptions {
  context: string
  userMessage?: string
  fallbackMessage?: string
  title?: string
  mode?: ErrorNotifyMode
}

const reportErrorByMode = (
  error: unknown,
  {
    context,
    userMessage,
    fallbackMessage = '操作失败，请重试',
    title = '操作失败',
    mode = 'error',
  }: ReportErrorOptions
) => {
  console.error(context, error)

  const message = userMessage ?? getErrorMessage(error, fallbackMessage)
  if (mode === 'critical') {
    notify.critical(message, {
      title,
      details: getErrorDetails(error),
    })
    return
  }

  notify.error(message)
}

export const reportError = (error: unknown, options: ReportErrorOptions) => {
  reportErrorByMode(error, { ...options, mode: 'error' })
}

export const reportCriticalError = (error: unknown, options: Omit<ReportErrorOptions, 'mode'>) => {
  reportErrorByMode(error, { ...options, mode: 'critical' })
}
