import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import Loading from '@/components/ui/Loading'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, initialized } = useAuthStore()

  // 如果还在初始化，显示加载状态
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading size="lg" text="正在验证登录状态..." />
      </div>
    )
  }

  // 如果用户未登录，重定向到登录页
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // 用户已登录，渲染子组件
  return <>{children}</>
}

export default ProtectedRoute