import { useMemo } from 'react'
import { useNavigate, useRouteError, isRouteErrorResponse } from 'react-router-dom'

const RouteError = () => {
  const navigate = useNavigate()
  const error = useRouteError()

  const { title, description } = useMemo(() => {
    if (isRouteErrorResponse(error)) {
      return {
        title: `请求出错 (${error.status})`,
        description: error.statusText || '发生未知错误，请稍后重试。'
      }
    }

    if (error instanceof Error) {
      const message = error.message || ''
      if (message.includes('Failed to fetch dynamically imported module')) {
        return {
          title: '页面加载失败',
          description: '网络或缓存异常，无法加载页面资源。请刷新页面或清理缓存后重试。'
        }
      }
      if (message.toLowerCase().includes('chunk') || message.toLowerCase().includes('module')) {
        return {
          title: '资源加载异常',
          description: '部分资源加载失败，请刷新页面后重试。'
        }
      }
      return {
        title: '发生错误',
        description: message
      }
    }

    return {
      title: '发生错误',
      description: '页面加载时出现未知问题，请重试。'
    }
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-50 via-white to-gray-50 p-6 text-soft-black dark:text-gray-100">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 p-8 space-y-4 text-center">
        <div className="text-2xl font-bold">{title}</div>
        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{description}</p>

        {error instanceof Error && error.message && (
          <pre className="mt-2 bg-gray-100 dark:bg-slate-800 rounded-xl p-3 text-xs text-left text-gray-700 dark:text-gray-300 overflow-auto">
            {error.message}
          </pre>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => window.location.reload()}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-soft-black text-white hover:bg-accent-yellow transition-colors"
          >
            刷新页面
          </button>
          <button
            onClick={() => navigate('/app/map')}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    </div>
  )
}

export default RouteError
