import { useEffect } from 'react'
import { Outlet, useLocation, Link } from 'react-router-dom'
import { Map, List, User, Plus, Building2, HelpCircle } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import PageTransition from '@/components/PageTransition'
import { AnimatedBottomNav, AnimatedNavItem, AnimatedTopNav } from '@/components/AnimatedNavigation'
import { useTranslation } from 'react-i18next'
import OnboardingDetector from '@/components/OnboardingDetector'
import useDynamicViewportHeight from '@/hooks/useDynamicViewportHeight'

const Layout = () => {
  const location = useLocation()
  const { user } = useAuthStore()
  const { t } = useTranslation()

  const navItems = [
    {
      path: '/app/map',
      icon: Map,
      label: t('navigation.map'),
    },
    {
      path: '/app/list',
      icon: List,
      label: t('navigation.list'),
    },
    {
      path: '/app/brands',
      icon: Building2,
      label: t('navigation.brands'),
    },
    {
      path: '/app/add-pos',
      icon: Plus,
      label: t('navigation.add'),
    },
    {
      path: '/app/profile',
      icon: User,
      label: t('navigation.profile'),
    },
  ]

  useDynamicViewportHeight()

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    const updateLayoutOffsets = () => {
      const topNav = document.querySelector<HTMLElement>('.nav-top')
      const bottomNav = document.querySelector<HTMLElement>('.nav-bottom')

      const topHeight = topNav?.offsetHeight ?? 0
      const bottomHeight = bottomNav?.offsetHeight ?? 0

      document.documentElement.style.setProperty('--layout-top-offset', `${topHeight}px`)
      document.documentElement.style.setProperty('--layout-bottom-offset', `${bottomHeight}px`)
    }

    updateLayoutOffsets()

    window.addEventListener('resize', updateLayoutOffsets)
    window.addEventListener('orientationchange', updateLayoutOffsets)
    window.visualViewport?.addEventListener('resize', updateLayoutOffsets)
    window.visualViewport?.addEventListener('scroll', updateLayoutOffsets)

    return () => {
      window.removeEventListener('resize', updateLayoutOffsets)
      window.removeEventListener('orientationchange', updateLayoutOffsets)
      window.visualViewport?.removeEventListener('resize', updateLayoutOffsets)
      window.visualViewport?.removeEventListener('scroll', updateLayoutOffsets)
    }
  }, [])

  return (
    <OnboardingDetector>
      <div
        className="flex flex-col bg-gray-50 safe-area-padding min-h-screen"
        style={{ minHeight: 'var(--app-height, 100vh)' }}
      >
        {/* 顶部导航栏 */}
        <AnimatedTopNav
          title="Payments Maps"
          className="nav-top fixed top-0 left-0 right-0 webkit-overflow-scrolling"
        >
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/web_logo.JPG" alt="Payments Maps Logo" className="w-8 h-8" />
          </Link>
          <div className="flex items-center space-x-2">
            <Link
              to="/app/help"
              className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
              title={t('navigation.help')}
            >
              <HelpCircle className="w-5 h-5" />
            </Link>
            {user?.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata?.avatar_url || '/default-avatar.png'}
                alt={user.user_metadata?.display_name || user.email || 'User'}
                className="w-8 h-8 rounded-full"
              />
            )}
            <span className="text-sm text-gray-600">
              {user?.user_metadata?.display_name || user?.email}
            </span>
          </div>
        </AnimatedTopNav>

        {/* 主内容区域 */}
        <main
          className="flex-1 overflow-x-hidden overflow-y-auto"
          style={{
            paddingTop: 'var(--layout-top-offset, calc(4rem + env(safe-area-inset-top)))',
            paddingBottom: 'var(--layout-bottom-offset, calc(4rem + env(safe-area-inset-bottom)))',
            minHeight: 'calc(var(--app-height, 100vh) - var(--layout-top-offset, 4rem) - var(--layout-bottom-offset, 4rem))',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'contain',
          }}
        >
          <PageTransition variant="fadeIn">
            <Outlet />
          </PageTransition>
        </main>

        {/* 底部导航栏 */}
        <AnimatedBottomNav className="nav-bottom webkit-overflow-scrolling">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <Link key={item.path} to={item.path}>
                <AnimatedNavItem
                  icon={Icon}
                  label={item.label}
                  isActive={isActive}
                  onClick={() => {}}
                  className="relative"
                />
              </Link>
            )
          })}
        </AnimatedBottomNav>
      </div>
    </OnboardingDetector>
  )
}

export default Layout
