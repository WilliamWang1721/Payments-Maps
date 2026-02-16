import clsx from 'clsx'
import { Bell, BookOpen, List, Map, Plus, Shield, Tag, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { usePermissions } from '@/hooks/usePermissions'

const MobileNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const permissions = usePermissions()
  const [mounted, setMounted] = useState(false)

  const navItems = [
    { icon: Map, label: 'Map', to: '/app/map' },
    { icon: List, label: 'List', to: '/app/list' },
    { icon: BookOpen, label: '卡册', to: '/app/card-album' },
    { icon: Tag, label: 'Brands', to: '/app/brands' },
    ...(permissions.isAdmin ? [{ icon: Shield, label: '管理', to: '/app/role-management' }] : []),
    { icon: Bell, label: 'Notify', to: '/app/notifications' },
    { icon: User, label: 'Profile', to: '/app/profile' },
  ]

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const isActive = (path: string) => location.pathname.startsWith(path)

  if (!mounted) return null

  if (location.pathname.startsWith('/app/pos') || location.pathname.startsWith('/app/pos-detail')) {
    return null
  }

  const navContent = (
    <div
      className="md:hidden px-4 pointer-events-none"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
      }}
    >
      <div className="max-w-xl mx-auto relative">
        <div className="absolute inset-0 blur-2xl bg-gray-900/10 dark:bg-black/20" aria-hidden />

        <div className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/60 dark:border-slate-800 rounded-3xl shadow-2xl px-4 py-2 pointer-events-auto">
          <div
            className="grid gap-1 sm:gap-2"
            style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
          >
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.to)

              return (
                <button
                  key={item.to}
                  type="button"
                  onClick={() => navigate(item.to)}
                  className={clsx(
                    'flex flex-col items-center justify-center gap-1 text-[10px] font-semibold leading-tight min-w-0 transition-colors',
                    active ? 'text-accent-yellow' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  )}
                  aria-label={item.label}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="truncate max-w-full">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/app/add-pos')}
          className="absolute -top-6 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-soft-black text-white shadow-xl shadow-blue-900/20 border-4 border-white dark:border-slate-900 flex items-center justify-center transition-transform duration-300 hover:scale-105 active:scale-95 pointer-events-auto"
          aria-label="Add POS"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  )

  return createPortal(navContent, document.body)
}

export default MobileNav
