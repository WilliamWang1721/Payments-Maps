import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, MapPin, Search, Plus, Filter, User, Check } from 'lucide-react'
import { createPortal } from 'react-dom'

interface TourStep {
  target: string // CSS selector for the target element
  title: string
  icon?: React.ComponentType<any>
  action?: string // 动作提示，如 "点击这里" 
  spotlightRadius?: number
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  offset?: { x: number; y: number }
  gesture?: 'click' | 'swipe' | 'drag' | 'long-press'
}

const tourSteps: TourStep[] = [
  {
    target: '.nav-bottom a[href="/app/map"]',
    title: '地图浏览',
    icon: MapPin,
    action: '点击查看附近POS机',
    position: 'top',
    gesture: 'click',
    spotlightRadius: 60
  },
  {
    target: '.search-button',
    title: '搜索功能',
    icon: Search,
    action: '搜索商户或地址',
    position: 'bottom',
    gesture: 'click',
    spotlightRadius: 50
  },
  {
    target: '.nav-bottom a[href="/app/add-pos"]',
    title: '添加POS机',
    icon: Plus,
    action: '分享你知道的POS机',
    position: 'top',
    gesture: 'click',
    spotlightRadius: 60
  },
  {
    target: '.filter-button',
    title: '筛选功能',
    icon: Filter,
    action: '按支付方式筛选',
    position: 'bottom',
    gesture: 'click',
    spotlightRadius: 50
  },
  {
    target: '.nav-bottom a[href="/app/profile"]',
    title: '个人中心',
    icon: User,
    action: '管理你的收藏和历史',
    position: 'top',
    gesture: 'click',
    spotlightRadius: 60
  }
]

interface OnboardingTourProps {
  onComplete: () => void
  isOpen: boolean
}

const OnboardingTour = ({ onComplete, isOpen }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const currentTourStep = tourSteps[currentStep]

  const handleComplete = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem('onboarding_completed', 'true')
    setTimeout(onComplete, 200)
  }, [onComplete])

  const handleSkip = useCallback(() => {
    handleComplete()
  }, [handleComplete])

  const handleNext = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentStep(prev => prev + 1)
      }, 200)
    } else {
      handleComplete()
    }
  }, [currentStep, handleComplete])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentStep(prev => prev - 1)
      }, 200)
    }
  }, [currentStep])

  // 获取目标元素位置
  const updateTargetPosition = useCallback(() => {
    if (!currentTourStep) return

    const element = document.querySelector(currentTourStep.target)
    if (element) {
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)
      setIsVisible(true)
    } else {
      // 如果元素不存在，尝试下一步
      setTimeout(() => {
        if (currentStep < tourSteps.length - 1) {
          handleNext()
        }
      }, 500)
    }
  }, [currentStep, currentTourStep, handleNext])

  useEffect(() => {
    if (isOpen) {
      // 初始化和窗口调整时更新位置
      const updatePosition = () => {
        setTimeout(updateTargetPosition, 100)
      }
      
      updatePosition()
      
      // 监听窗口调整和滚动
      window.addEventListener('resize', updateTargetPosition)
      window.addEventListener('scroll', updateTargetPosition, true) // 使用捕获阶段监听滚动
      
      // 监听方向变化（移动设备）
      window.addEventListener('orientationchange', updatePosition)
      
      return () => {
        window.removeEventListener('resize', updateTargetPosition)
        window.removeEventListener('scroll', updateTargetPosition, true)
        window.removeEventListener('orientationchange', updatePosition)
      }
    }
  }, [isOpen, currentStep, updateTargetPosition])

  if (!isOpen || !targetRect || !currentTourStep) return null

  // 计算提示框位置，确保不超出屏幕边界
  const getTooltipPosition = () => {
    const tooltipWidth = 320 // 提示框预估宽度
    const tooltipHeight = 280 // 提示框预估高度
    const margin = 20
    const screenPadding = 16 // 距离屏幕边缘的最小距离
    
    // 获取窗口尺寸
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    // 目标元素中心点
    const targetCenterX = targetRect.left + targetRect.width / 2
    
    // 初始位置（优先在目标下方）
    let x = targetCenterX
    let y = targetRect.bottom + margin
    
    // 检查是否超出底部边界
    if (y + tooltipHeight > windowHeight - screenPadding) {
      // 尝试放在上方
      y = targetRect.top - tooltipHeight - margin
      
      // 如果上方也放不下，则居中显示
      if (y < screenPadding) {
        y = Math.max(
          screenPadding,
          Math.min(
            windowHeight / 2 - tooltipHeight / 2,
            windowHeight - tooltipHeight - screenPadding
          )
        )
      }
    }
    
    // 检查是否超出右边界
    if (x + tooltipWidth / 2 > windowWidth - screenPadding) {
      x = windowWidth - tooltipWidth / 2 - screenPadding
    }
    
    // 检查是否超出左边界
    if (x - tooltipWidth / 2 < screenPadding) {
      x = tooltipWidth / 2 + screenPadding
    }
    
    // 确保y值在合理范围内
    y = Math.max(screenPadding, Math.min(y, windowHeight - tooltipHeight - screenPadding))
    
    return { x, y }
  }

  const tooltipPosition = getTooltipPosition()
  const spotlightRadius = currentTourStep.spotlightRadius || 50

  // 手势动画组件
  const GestureIndicator = ({ type }: { type?: string }) => {
    if (!type) return null

    switch (type) {
      case 'click':
        return (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: targetRect.left + targetRect.width / 2 - 20,
              top: targetRect.top + targetRect.height / 2 - 20
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 0.5
            }}
          >
            <div className="w-10 h-10 rounded-full bg-blue-500" />
          </motion.div>
        )
      case 'swipe':
        return (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: targetRect.left + targetRect.width / 2 - 20,
              top: targetRect.top + targetRect.height / 2 - 20
            }}
            animate={{
              x: [0, 50, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              repeatDelay: 0.5
            }}
          >
            <ChevronRight className="w-10 h-10 text-blue-500" />
          </motion.div>
        )
      default:
        return null
    }
  }

  return createPortal(
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999]"
        >
          {/* 背景遮罩 with spotlight */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <mask id="spotlight-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                <motion.circle
                  cx={targetRect.left + targetRect.width / 2}
                  cy={targetRect.top + targetRect.height / 2}
                  r={spotlightRadius}
                  fill="black"
                  initial={{ r: 0 }}
                  animate={{ r: spotlightRadius }}
                  transition={{ duration: 0.3 }}
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.7)"
              mask="url(#spotlight-mask)"
            />
          </svg>

          {/* 高亮边框 */}
          <motion.div
            className="absolute border-2 border-blue-500 rounded-lg pointer-events-none"
            style={{
              left: targetRect.left - 4,
              top: targetRect.top - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: 1
            }}
            transition={{
              scale: {
                duration: 2,
                repeat: Infinity
              },
              opacity: {
                duration: 0.3
              }
            }}
          />

          {/* 手势指示器 */}
          <GestureIndicator type={currentTourStep.gesture} />

          {/* 提示卡片 */}
          <motion.div
            className="absolute bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-[calc(100vw-32px)] max-w-sm"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translate(-50%, 0)',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto'
            }}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleSkip}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 内容 */}
            <div className="flex items-start gap-3 sm:gap-4">
              {currentTourStep.icon && (
                <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <currentTourStep.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              )}
              <div className="flex-1 pr-4">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                  {currentTourStep.title}
                </h3>
                {currentTourStep.action && (
                  <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                    {currentTourStep.action}
                  </p>
                )}
              </div>
            </div>

            {/* 进度指示器 */}
            <div className="flex items-center justify-center gap-1 mt-3 sm:mt-4 mb-3 sm:mb-4">
              {tourSteps.map((_, index) => (
                <motion.div
                  key={index}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-blue-500'
                      : index < currentStep
                      ? 'w-1.5 bg-blue-300'
                      : 'w-1.5 bg-gray-300'
                  }`}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: index === currentStep ? 1 : 0.8 }}
                />
              ))}
            </div>

            {/* 导航按钮 */}
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  currentStep === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">上一步</span>
              </button>

              <button
                onClick={handleSkip}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors px-2"
              >
                跳过
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:shadow-lg transition-all"
              >
                {currentStep === tourSteps.length - 1 ? (
                  <>
                    <span className="hidden sm:inline">完成</span>
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">下一步</span>
                    <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default OnboardingTour
