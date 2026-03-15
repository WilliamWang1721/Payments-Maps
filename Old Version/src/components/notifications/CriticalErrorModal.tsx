import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Copy } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import { useNotificationStore } from '@/stores/useNotificationStore'

function buildCopyText(title: string, message: string, details?: string) {
  return [title, message, details].filter(Boolean).join('\n\n')
}

async function copyToClipboard(text: string) {
  if (!text) return

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  // Fallback for older browsers / non-secure contexts.
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  textarea.style.top = '0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  document.execCommand('copy')
  textarea.remove()
}

const CriticalErrorModal = () => {
  const critical = useNotificationStore((s) => s.critical)
  const closeCritical = useNotificationStore((s) => s.closeCritical)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')

  useEffect(() => {
    setCopyState('idle')
  }, [critical?.id])

  const copyText = useMemo(() => {
    if (!critical) return ''
    return buildCopyText(critical.title, critical.message, critical.details)
  }, [critical])

  const handleCopy = async () => {
    try {
      setCopyState('idle')
      await copyToClipboard(copyText)
      setCopyState('copied')
      window.setTimeout(() => setCopyState('idle'), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
      setCopyState('error')
      window.setTimeout(() => setCopyState('idle'), 2000)
    }
  }

  return (
    <Modal
      isOpen={!!critical}
      onClose={closeCritical}
      title={critical?.title ?? '发生错误'}
      size="md"
      backdropClassName="z-maximum"
    >
      {critical && (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                {critical.message}
              </p>
              {critical.details && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-gray-500 select-none">
                    错误详情
                  </summary>
                  <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-gray-50 p-3 text-xs text-gray-700 whitespace-pre-wrap break-words">
                    {critical.details}
                  </pre>
                </details>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} disabled={!copyText}>
              <Copy className="h-4 w-4 mr-2" />
              {copyState === 'copied' ? '已复制' : copyState === 'error' ? '复制失败' : '复制'}
            </Button>
            <Button variant="primary" size="sm" onClick={closeCritical}>
              我知道了
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default CriticalErrorModal
