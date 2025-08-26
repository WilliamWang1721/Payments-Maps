import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useTranslation } from 'react-i18next'

interface OnboardingDetectorProps {
  children: React.ReactNode
}

const OnboardingDetector: React.FC<OnboardingDetectorProps> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const { i18n } = useTranslation()
  const [hasChecked, setHasChecked] = useState(false)

  useEffect(() => {
    if (hasChecked) return

    const checkOnboardingStatus = () => {
      try {
        // 检查当前路径是否已经在引导流程中
        const isInOnboardingFlow = location.pathname.startsWith('/onboarding') || 
                                  location.pathname === '/welcome'
        
        // 如果已经在引导流程中，不需要重定向
        if (isInOnboardingFlow) {
          setHasChecked(true)
          return
        }

        // 如果用户已登录，跳过新手引导
        if (user) {
          console.log('User is logged in, skipping onboarding')
          setHasChecked(true)
          return
        }

        // 未登录用户的处理逻辑
        const onboardingCompleted = localStorage.getItem('onboardingCompleted')
        const hasVisited = localStorage.getItem('hasVisited')
        const languageSelected = localStorage.getItem('languageSelected')
        
        // 检查是否是新用户
        const isNewUser = !hasVisited || !onboardingCompleted
        
        // 如果是新用户且未选择语言，先进行语言选择
        if (isNewUser) {
          if (!languageSelected) {
            // 显示语言选择页面（可以是智能欢迎页面的一部分）
            navigate('/welcome', { replace: true })
          } else {
            // 语言已选择，进行新手引导
            navigate('/onboarding', { replace: true })
          }
        }
        
        setHasChecked(true)
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        setHasChecked(true)
      }
    }

    // 延迟检查，确保用户认证状态已稳定
    const timer = setTimeout(checkOnboardingStatus, 500)
    
    return () => clearTimeout(timer)
  }, [user, navigate, location.pathname, i18n.language, hasChecked])

  // 在检查完成前显示加载状态
  if (!hasChecked && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在初始化...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default OnboardingDetector