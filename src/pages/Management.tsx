import { Navigate, useNavigate } from 'react-router-dom'
import { Shield } from 'lucide-react'
import AdminMainMenu from '@/components/profile/AdminMainMenu'
import Loading from '@/components/ui/Loading'
import { usePermissions } from '@/hooks/usePermissions'

const Management = () => {
  const navigate = useNavigate()
  const permissions = usePermissions()

  if (permissions.isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loading size="lg" text="正在加载..." />
      </div>
    )
  }

  if (!permissions.isAdmin) {
    return <Navigate to="/app/profile" replace />
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar pb-24">
      <div className="max-w-3xl space-y-6">
        <section className="bg-white rounded-[32px] border border-white shadow-soft p-6 sm:p-8 animate-fade-in-up">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-accent-yellow/10 text-accent-yellow flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-soft-black">管理中心</h1>
              <p className="text-sm text-gray-500 mt-1">
                管理入口已独立为一级页面，可从右侧边栏直接进入。
              </p>
            </div>
          </div>
        </section>

        <AdminMainMenu role={permissions.role} onNavigate={navigate} />
      </div>
    </div>
  )
}

export default Management
