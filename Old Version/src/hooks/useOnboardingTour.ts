import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

export const useOnboardingTour = () => {
  const [showTour, setShowTour] = useState(false)
  const [tourStep, setTourStep] = useState(0)
  const { user } = useAuthStore()

  useEffect(() => {
    // 检查是否是新用户
    if (user) {
      const hasCompletedOnboarding = localStorage.getItem('onboarding_completed')
      const userCreatedAt = new Date(user.created_at).getTime()
      const now = Date.now()
      const isNewUser = now - userCreatedAt < 24 * 60 * 60 * 1000 // 24小时内注册的用户

      if (!hasCompletedOnboarding && isNewUser) {
        // 延迟显示，让用户先看到界面
        setTimeout(() => {
          setShowTour(true)
        }, 1500)
      }
    }
  }, [user])

  const startTour = () => {
    setShowTour(true)
    setTourStep(0)
  }

  const completeTour = () => {
    setShowTour(false)
    localStorage.setItem('onboarding_completed', 'true')
  }

  const resetTour = () => {
    localStorage.removeItem('onboarding_completed')
    setTourStep(0)
    setShowTour(true)
  }

  return {
    showTour,
    tourStep,
    setTourStep,
    startTour,
    completeTour,
    resetTour
  }
}