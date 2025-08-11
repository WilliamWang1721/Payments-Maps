import { Outlet, useLocation, Link } from 'react-router-dom'
import { Map, List, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/useAuthStore'

const Layout = () => {
  const location = useLocation()
  const { user } = useAuthStore()

  const navItems = [
    {
      path: '/map',
      icon: Map,
      label: '地图',
    },
    {
      path: '/list',
      icon: List,
      label: '列表',
    },
    {
      path: '/add-pos',
      icon: Plus,
      label: '添加',
    },
    {
      path: '/profile',
      icon: User,
      label: '我的',
    },
  ]

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 px-4 py-3 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Payments Maps</h1>
          <div className="flex items-center space-x-2">
            {user?.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                alt={user.user_metadata?.display_name || user.email || 'User'}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-gray-600">{user?.user_metadata?.display_name || user?.email}</span>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-hidden pt-16 pb-16">
        <div className="h-full">
          <Outlet />
        </div>
      </main>

      {/* 底部导航栏 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-50">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

export default Layout