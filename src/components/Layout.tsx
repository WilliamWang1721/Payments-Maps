import { Outlet, useLocation, Link } from 'react-router-dom'
import { Map, List, User, Plus, Building2, HelpCircle, MapPin, Search, Filter } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import PageTransition from '@/components/PageTransition'
import { AnimatedBottomNav, AnimatedNavItem, AnimatedTopNav } from '@/components/AnimatedNavigation'
import { useTranslation } from 'react-i18next'
import OnboardingDetector from '@/components/OnboardingDetector'
import useDynamicViewportHeight from '@/hooks/useDynamicViewportHeight'
import { useLocaleStore } from '@/stores/useLocaleStore'
import { useEffect, useMemo, useState } from 'react'
import OnboardingTour, { type TourStep } from '@/components/OnboardingTour'

const Layout = () => {
  const location = useLocation()
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const { experience, hasCompletedTour, hasSelectedLanguage, markTourCompleted } = useLocaleStore()
  const [isTourOpen, setIsTourOpen] = useState(false)
  const [tourTriggered, setTourTriggered] = useState(false)

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
    if (tourTriggered || !hasSelectedLanguage || hasCompletedTour) {
      return
    }

    if (location.pathname.startsWith('/app')) {
      setTourTriggered(true)
      const timer = setTimeout(() => setIsTourOpen(true), 600)
      return () => clearTimeout(timer)
    }
  }, [hasCompletedTour, hasSelectedLanguage, location.pathname, tourTriggered])

  const tourSteps: TourStep[] = useMemo(() => {
    const isInternational = experience === 'international'
    const baseText = (key: string) => t(key)
    const text = (key: string) =>
      isInternational
        ? t(`${key}_international`, { defaultValue: baseText(key) })
        : baseText(key)

    return [
      {
        target: '.nav-bottom a[href="/app/map"]',
        title: text('onboardingTour.steps.map.title'),
        action: text('onboardingTour.steps.map.action'),
      icon: MapPin,
      gesture: 'click',
      spotlightRadius: 60,
      },
      {
        target: '.search-button',
        title: text('onboardingTour.steps.search.title'),
        action: text('onboardingTour.steps.search.action'),
      icon: Search,
      gesture: 'click',
      spotlightRadius: 50,
      },
      {
        target: '.nav-bottom a[href="/app/add-pos"]',
        title: text('onboardingTour.steps.add.title'),
        action: text('onboardingTour.steps.add.action'),
      icon: Plus,
      gesture: 'click',
      spotlightRadius: 60,
      },
      {
        target: '.filter-button',
        title: text('onboardingTour.steps.filter.title'),
        action: text('onboardingTour.steps.filter.action'),
      icon: Filter,
      gesture: 'click',
      spotlightRadius: 50,
      },
      {
        target: '.nav-bottom a[href="/app/profile"]',
        title: text('onboardingTour.steps.profile.title'),
        action: text('onboardingTour.steps.profile.action'),
      icon: User,
      gesture: 'click',
      spotlightRadius: 60,
      },
    ]
  }, [experience, t])

  const tourLabels = useMemo(() => ({
    previous: t('onboardingTour.labels.previous'),
    next: t('onboardingTour.labels.next'),
    skip: t('onboardingTour.labels.skip'),
    done: t('onboardingTour.labels.done'),
  }), [t])

  const handleTourComplete = () => {
    setIsTourOpen(false)
    markTourCompleted()
  }

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
            <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
              {experience === 'domestic'
                ? t('experience.badge.domestic')
                : t('experience.badge.international')}
            </span>
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
          className="flex-1 overflow-x-hidden overflow-y-auto pt-16 pb-16"
          style={{
            paddingTop: 'calc(4rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))',
            WebkitOverflowScrolling: 'touch',
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
        <OnboardingTour
          steps={tourSteps}
          isOpen={isTourOpen && tourSteps.length > 0}
          onComplete={handleTourComplete}
          labels={tourLabels}
        />
      </div>
    </OnboardingDetector>
  )
}

export default Layout
