import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react'
import { createPortal } from 'react-dom'

export interface TourStep {
  target: string
  title: string
  icon?: React.ComponentType<any>
  action?: string
  spotlightRadius?: number
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  offset?: { x: number; y: number }
  gesture?: 'click' | 'swipe' | 'drag' | 'long-press'
}

interface OnboardingTourLabels {
  previous: string
  next: string
  skip: string
  done: string
}

interface OnboardingTourProps {
  steps: TourStep[]
  isOpen: boolean
  onComplete: () => void
  labels: OnboardingTourLabels
}

const OnboardingTour = ({ steps, isOpen, onComplete, labels }: OnboardingTourProps) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const totalSteps = steps.length
  const currentTourStep = steps[currentStep]

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0)
      setIsVisible(false)
      return
    }

    if (currentStep >= steps.length) {
      setCurrentStep(0)
    }
  }, [isOpen, steps.length, currentStep])

  const updateTargetPosition = useCallback(() => {
    if (!currentTourStep) return

    const element = document.querySelector(currentTourStep.target)
    if (element) {
      const rect = element.getBoundingClientRect()
      setTargetRect(rect)
      setIsVisible(true)
    } else {
      setTimeout(() => {
        if (currentStep < totalSteps - 1) {
          setCurrentStep((step) => Math.min(step + 1, totalSteps - 1))
        }
      }, 500)
    }
  }, [currentTourStep, currentStep, totalSteps])

  useEffect(() => {
    if (!isOpen) return
    const timeout = setTimeout(updateTargetPosition, 100)
    return () => clearTimeout(timeout)
  }, [isOpen, updateTargetPosition])

  useEffect(() => {
    if (!isOpen) return

    const handleResize = () => updateTargetPosition()
    const handleScroll = () => updateTargetPosition()

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('orientationchange', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [isOpen, updateTargetPosition])

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentStep((prev) => Math.min(prev + 1, totalSteps - 1))
      }, 200)
    } else {
      handleComplete()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentStep((prev) => Math.max(prev - 1, 0))
      }, 200)
    }
  }

  const handleComplete = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem('onboarding_completed', 'true')
    setTimeout(onComplete, 200)
  }, [onComplete])

  const handleSkip = useCallback(() => {
    handleComplete()
  }, [handleComplete])

  const tooltipPosition = useMemo(() => {
    if (!targetRect) return { x: 0, y: 0 }

    const tooltipWidth = 320
    const tooltipHeight = 280
    const margin = 20
    const screenPadding = 16

    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    const targetCenterX = targetRect.left + targetRect.width / 2
    const targetBottom = targetRect.bottom + margin

    let x = targetCenterX
    let y = targetBottom

    if (y + tooltipHeight > windowHeight - screenPadding) {
      y = targetRect.top - tooltipHeight - margin

      if (y < screenPadding) {
        y = Math.max(
          screenPadding,
          Math.min(windowHeight / 2 - tooltipHeight / 2, windowHeight - tooltipHeight - screenPadding)
        )
      }
    }

    if (x + tooltipWidth / 2 > windowWidth - screenPadding) {
      x = windowWidth - tooltipWidth / 2 - screenPadding
    }

    if (x - tooltipWidth / 2 < screenPadding) {
      x = tooltipWidth / 2 + screenPadding
    }

    y = Math.max(screenPadding, Math.min(y, windowHeight - tooltipHeight - screenPadding))

    return { x, y }
  }, [targetRect])

  const GestureIndicator = ({ type }: { type?: string }) => {
    if (!type || !targetRect) return null

    switch (type) {
      case 'click':
        return (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: targetRect.left + targetRect.width / 2 - 20,
              top: targetRect.top + targetRect.height / 2 - 20,
            }}
            initial={{ scale: 1, opacity: 0 }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
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
              top: targetRect.top + targetRect.height / 2 - 20,
            }}
            animate={{ x: [0, 50, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.5 }}
          >
            <ChevronRight className="w-10 h-10 text-blue-500" />
          </motion.div>
        )
      default:
        return null
    }
  }

  if (!isOpen || !currentTourStep || totalSteps === 0) {
    return null
  }

  const spotlightRadius = currentTourStep.spotlightRadius || 50

  return createPortal(
    <AnimatePresence>
      {isVisible && targetRect && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999]"
        >
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
            <rect x="0" y="0" width="100%" height="100%" fill="rgba(0, 0, 0, 0.7)" mask="url(#spotlight-mask)" />
          </svg>

          <motion.div
            className="absolute border-2 border-blue-500 rounded-lg pointer-events-none"
            style={{
              left: targetRect.left - 4,
              top: targetRect.top - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
            }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.05, 1], opacity: 1 }}
            transition={{
              scale: { duration: 2, repeat: Infinity },
              opacity: { duration: 0.3 },
            }}
          />

          <GestureIndicator type={currentTourStep.gesture} />

          <motion.div
            className="absolute bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-[calc(100vw-32px)] max-w-sm"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
              transform: 'translate(-50%, 0)',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
            }}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <button
              onClick={handleSkip}
              className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

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

            <div className="flex items-center justify-center gap-1 mt-3 sm:mt-4 mb-3 sm:mb-4">
              {steps.map((_, index) => (
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

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  currentStep === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{labels.previous}</span>
              </button>

              <button
                onClick={handleSkip}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors px-2"
              >
                {labels.skip}
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:shadow-lg transition-all"
              >
                {currentStep === totalSteps - 1 ? (
                  <>
                    <span className="hidden sm:inline">{labels.done}</span>
                    <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">{labels.next}</span>
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
