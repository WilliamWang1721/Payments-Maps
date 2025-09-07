import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import Loading from '@/components/ui/Loading'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const location = useLocation()

  // 开发环境下，允许通过 URL 参数跳过鉴权，便于本地预览受保护页面
  if (import.meta.env.DEV) {
    try {
      const params = new URLSearchParams(window.location.search)
      if (params.get('skipAuth') === '1') {
        return <>{children}</>
      }
    } catch (_) {}
  }

  const { user, loading, initialized } = useAuthStore()

  // 允许游客访问的只读路由
  const path = location.pathname || ''
  const isGuestAllowed =
    path === '/app' ||
    path === '/app/map' ||
    path === '/app/list' ||
    path === '/app/brands' ||
    path === '/app/help' ||
    path.startsWith('/app/pos/')

  // 尚未初始化时：对游客允许的页面直接放行，提升首屏体验；其余保持加载态
  if (!initialized || loading) {
    if (isGuestAllowed) {
      return <>{children}</>
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" text="正在验证登录状态..." />
      </div>
    )
  }

  // 未登录：只读页面放行，其余跳转登录
  if (!user) {
    if (isGuestAllowed) {
      return <>{children}</>
    }
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // 用户已登录，渲染子组件
  return <>{children}</>
}

export default ProtectedRoute