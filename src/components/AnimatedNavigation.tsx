import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { LucideIcon } from 'lucide-react'

interface AnimatedTabProps {
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}

export const AnimatedTab: React.FC<AnimatedTabProps> = ({
  isActive,
  onClick,
  children,
  className = ''
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={`relative px-4 py-2 rounded-lg transition-colors tab-animation safari-animation-optimize ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      {children}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-blue-500 rounded-lg -z-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}

interface AnimatedNavItemProps {
  icon: LucideIcon
  label: string
  isActive: boolean
  onClick: () => void
  className?: string
  showLabel?: boolean
}

export const AnimatedNavItem: React.FC<AnimatedNavItemProps> = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  className = '',
  showLabel = true
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-2 rounded-lg transition-colors min-h-touch min-w-touch touch-manipulation webkit-tap-highlight-none nav-item-animation safari-animation-optimize ${
        isActive ? 'text-blue-500' : 'text-gray-600'
      } ${className}`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }}
      style={{
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation'
      }}
    >
      <motion.div
        animate={{
          y: isActive ? -2 : 0,
          scale: isActive ? 1.1 : 1
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Icon className="w-6 h-6" />
      </motion.div>
      
      {showLabel && (
        <motion.span
          className="text-xs mt-1"
          animate={{
            opacity: isActive ? 1 : 0.7,
            fontWeight: isActive ? 600 : 400
          }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.span>
      )}
      
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute bottom-0 left-1/2 w-1 h-1 bg-blue-500 rounded-full"
            initial={{ opacity: 0, scale: 0, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, scale: 0, x: '-50%' }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}

interface AnimatedBottomNavProps {
  children: React.ReactNode
  className?: string
}

export const AnimatedBottomNav: React.FC<AnimatedBottomNavProps> = ({
  children,
  className = ''
}) => {
  return (
    <motion.nav
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 pb-safe-bottom webkit-overflow-scrolling nav-slide-animation safari-animation-optimize ${className}`}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
      style={{
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden'
      }}
    >
      <div className="flex justify-around items-center max-w-md mx-auto">
        {children}
      </div>
    </motion.nav>
  )
}

interface AnimatedTopNavProps {
  children: React.ReactNode
  className?: string
  title?: string
}

export const AnimatedTopNav: React.FC<AnimatedTopNavProps> = ({
  children,
  className = '',
  title
}) => {
  return (
    <motion.nav
      className={`bg-white border-b border-gray-200 px-4 py-3 pt-safe-top webkit-overflow-scrolling nav-slide-animation safari-animation-optimize ${className}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0.0, 0.2, 1] }}
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden'
      }}
    >
      <div className="flex items-center justify-between">
        {title && (
          <motion.h1
            className="text-lg font-semibold text-gray-900"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
          >
            {title}
          </motion.h1>
        )}
        <div className="flex items-center space-x-2">
          {children}
        </div>
      </div>
    </motion.nav>
  )
}

interface AnimatedTabBarProps {
  tabs: Array<{
    id: string
    label: string
    content?: React.ReactNode
  }>
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
  variant?: 'default' | 'dashboard'
  ariaLabel?: string
}

export const AnimatedTabBar: React.FC<AnimatedTabBarProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className = '',
  variant = 'default',
  ariaLabel = '内容分区'
}) => {
  const isDashboard = variant === 'dashboard'
  const activeClass = isDashboard ? 'text-soft-black dark:text-gray-100' : 'text-blue-600'
  const inactiveClass = isDashboard
    ? 'text-gray-400 hover:text-soft-black dark:text-gray-500 dark:hover:text-gray-200'
    : 'text-gray-500 hover:text-gray-700'
  const indicatorClass = isDashboard ? 'bg-accent-yellow' : 'bg-blue-600'

  return (
    <div className={`w-full ${className}`}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={`flex border-b ${isDashboard ? 'border-white/60 dark:border-slate-800 overflow-x-auto' : 'border-gray-200'}`}
      >
        {tabs.map((tab, index) => (
          <motion.button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative px-6 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? activeClass
                : inactiveClass
            }`}
            whileHover={{ y: -1 }}
            whileTap={{ y: 0 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
          >
            {tab.label}
            <AnimatePresence>
              {activeTab === tab.id && (
                <motion.div
                  className={`absolute bottom-0 left-0 right-0 h-0.5 ${indicatorClass}`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  exit={{ scaleX: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tabs.map((tab) => {
          if (tab.id === activeTab && tab.content) {
            return (
              <motion.div
                key={tab.id}
                role="tabpanel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="py-4"
              >
                {tab.content}
              </motion.div>
            )
          }
          return null
        })}
      </AnimatePresence>
    </div>
  )
}

// 侧边栏动画组件
interface AnimatedSidebarProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  side?: 'left' | 'right'
}

export const AnimatedSidebar: React.FC<AnimatedSidebarProps> = ({
  isOpen,
  onClose,
  children,
  className = '',
  side = 'left'
}) => {
  useEffect(() => {
    if (typeof document === 'undefined' || !isOpen) return

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [isOpen])

  const sidebarContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* 侧边栏 */}
          <motion.div
            className={`fixed top-0 ${side === 'left' ? 'left-0' : 'right-0'} h-full w-80 bg-white shadow-lg z-50 drawer-animation safari-animation-optimize ${className}`}
            initial={{ x: side === 'left' ? '-100%' : '100%' }}
            animate={{ x: 0 }}
            exit={{ x: side === 'left' ? '-100%' : '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(sidebarContent, document.body)
}
