import clsx from 'clsx'
import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, BookOpen, Clock, List, LogOut, Map, Plus, Settings, Shield, Tag } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePermissions } from '@/hooks/usePermissions'

const ModernSidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const logout = useAuthStore((state) => state.logout)
  const permissions = usePermissions()

  const navItems = [
    { icon: Map, label: 'Map', to: '/app/map', delay: 0.3 },
    { icon: List, label: 'List', to: '/app/list', delay: 0.4 },
    { icon: BookOpen, label: '卡册', to: '/app/card-album', delay: 0.5 },
    { icon: Tag, label: 'Brands', to: '/app/brands', delay: 0.6 },
  ]

  const secondaryNav = [
    { icon: Bell, label: 'Notifications', to: '/app/notifications', delay: 0.8 },
    { icon: Clock, label: 'History', to: '/app/history', delay: 0.9 },
    ...(permissions.isAdmin
      ? [{ icon: Shield, label: '管理', to: '/app/role-management', delay: 1.0 }]
      : []),
    { icon: Settings, label: 'Settings', to: '/app/settings', delay: permissions.isAdmin ? 1.1 : 1.0 },
  ]

  const handleNavigate = (path: string) => {
    navigate(path)
  }

  const handleAddPOS = () => {
    navigate('/app/add-pos')
  }

  const handleLogout = useCallback(async () => {
    try {
      await logout()
      navigate('/login')
    } catch (error) {
      console.error('登出失败', error)
    }
  }, [logout, navigate])

  const isActive = (path: string) => {
    if (path === '/app/map') {
      return location.pathname.startsWith('/app/map')
    }
    return location.pathname.startsWith(path)
  }

  return (
    <div className="hidden md:flex flex-col items-center w-20 h-[95vh] sticky top-4 ml-4 z-50 animate-slide-in-left gap-4 text-soft-black dark:text-gray-200">
      <button
        type="button"
        onClick={() => navigate('/app/home')}
        className="w-14 h-14 flex-shrink-0 flex items-center justify-center animate-scale-in cursor-pointer hover:rotate-12 transition-transform duration-300"
        style={{ animationDelay: '0.1s' }}
      >
        <img src="/web_logo.JPG" alt="Payments Maps" className="w-full h-full object-contain drop-shadow-lg" />
      </button>

      <div
        className="flex-1 w-full flex flex-col items-center justify-between py-6 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl rounded-[30px] shadow-soft border border-white/50 dark:border-slate-800 animate-fade-in-up"
        style={{ animationDelay: '0.2s' }}
      >
        <div className="flex flex-col items-center gap-6 w-full">
          <nav className="flex flex-col gap-5 w-full items-center">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.to)
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleNavigate(item.to)}
                  className={clsx(
                    'p-3 rounded-xl transition-all animate-fade-in-up',
                    active
                      ? 'bg-accent-yellow text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-400 dark:text-gray-500 hover:text-accent-yellow hover:bg-blue-50 dark:hover:bg-slate-800'
                  )}
                  title={item.label}
                  style={{ animationDelay: `${item.delay}s` }}
                >
                  <Icon className="w-5 h-5" />
                </button>
              )
            })}
          </nav>

          <div className="w-full flex justify-center py-1 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
            <button
              type="button"
              onClick={handleAddPOS}
              className="relative group w-12 h-12 flex items-center justify-center rounded-full bg-soft-black shadow-lg shadow-blue-900/20 transition-all duration-500 hover:scale-110 hover:shadow-accent-yellow/40 active:scale-95"
            >
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-accent-yellow to-accent-purple opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <Plus className="w-5 h-5 text-white relative z-10 transition-transform duration-500 group-hover:rotate-90" />
            </button>
          </div>

          <div className="w-8 h-px bg-gray-200 my-1 animate-fade-in" style={{ animationDelay: '0.7s' }}></div>

          <nav className="flex flex-col gap-5 w-full items-center">
            {secondaryNav.map((item) => {
              const Icon = item.icon
              const active = isActive(item.to)
              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => handleNavigate(item.to)}
                  className={clsx(
                    'p-3 rounded-xl transition-all animate-fade-in-up relative',
                    active
                      ? 'bg-blue-50 dark:bg-slate-800 text-accent-yellow'
                      : 'text-gray-400 dark:text-gray-500 hover:text-accent-yellow hover:bg-blue-50 dark:hover:bg-slate-800'
                  )}
                  title={item.label}
                  style={{ animationDelay: `${item.delay}s` }}
                >
                  <Icon className="w-5 h-5" />
                  {item.icon === Bell && (
                    <span className="absolute top-2 right-3 w-1.5 h-1.5 bg-accent-salmon rounded-full ring-2 ring-white" />
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex flex-col items-center gap-4 animate-fade-in-up mb-2" style={{ animationDelay: '1s' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="p-3 text-gray-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
            title="Log Out"
          >
            <LogOut className="w-5 h-5" />
          </button>

          <button type="button" onClick={() => navigate('/app/profile')} className="relative">
            <img
              src="https://picsum.photos/100/100?grayscale"
              alt="Profile avatar"
              className="w-10 h-10 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-md"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white dark:border-slate-900 rounded-full" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModernSidebar
