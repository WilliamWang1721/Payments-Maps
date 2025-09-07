import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { MapPin, CreditCard, Users, Globe, ArrowRight, Star, Clock, Shield } from 'lucide-react'

interface UserProfile {
  location: string
  userType: 'tourist' | 'student' | 'business' | 'resident'
  language: string
  isFirstTime: boolean
}

interface Recommendation {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  action: string
  priority: 'high' | 'medium' | 'low'
}

const SmartWelcome: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showLanguageSelection, setShowLanguageSelection] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language)

  // 智能用户检测
  useEffect(() => {
    const detectUserProfile = async () => {
      try {
        // 模拟用户检测逻辑
        const profile: UserProfile = {
          location: await detectUserLocation(),
          userType: detectUserType(),
          language: i18n.language,
          isFirstTime: !localStorage.getItem('hasVisited')
        }
        
        setUserProfile(profile)
        generateRecommendations(profile)
        
        // 标记用户已访问
        localStorage.setItem('hasVisited', 'true')
      } catch (error) {
        console.error('Error detecting user profile:', error)
      } finally {
        setIsLoading(false)
      }
    }

    detectUserProfile()
  }, [i18n.language])

  // 检测用户位置
  const detectUserLocation = async (): Promise<string> => {
    try {
      const response = await fetch('https://ipapi.co/json/')
      const data = await response.json()
      return data.country_name || 'Unknown'
    } catch {
      return 'Unknown'
    }
  }

  // 检测用户类型
  const detectUserType = (): UserProfile['userType'] => {
    const hour = new Date().getHours()
    const userAgent = navigator.userAgent
    
    // 简单的启发式检测
    if (userAgent.includes('Mobile')) {
      return hour >= 9 && hour <= 17 ? 'business' : 'tourist'
    }
    return 'resident'
  }

  // 生成个性化推荐
  const generateRecommendations = (profile: UserProfile) => {
    const baseRecommendations: Recommendation[] = [
      {
        id: 'payment-setup',
        title: t('smartWelcome.recommendations.paymentSetup.title'),
        description: t('smartWelcome.recommendations.paymentSetup.description'),
        icon: <CreditCard className="w-6 h-6" />,
        action: 'setup-payment',
        priority: 'high'
      },
      {
        id: 'explore-map',
        title: t('smartWelcome.recommendations.exploreMap.title'),
        description: t('smartWelcome.recommendations.exploreMap.description'),
        icon: <MapPin className="w-6 h-6" />,
        action: 'explore-map',
        priority: 'high'
      },
      {
        id: 'language-settings',
        title: t('smartWelcome.recommendations.languageSettings.title'),
        description: t('smartWelcome.recommendations.languageSettings.description'),
        icon: <Globe className="w-6 h-6" />,
        action: 'language-settings',
        priority: 'medium'
      },
      {
        id: 'community',
        title: t('smartWelcome.recommendations.community.title'),
        description: t('smartWelcome.recommendations.community.description'),
        icon: <Users className="w-6 h-6" />,
        action: 'join-community',
        priority: 'low'
      }
    ]

    // 根据用户类型调整推荐优先级
    const filteredRecommendations = baseRecommendations.filter(rec => {
      if (profile.userType === 'tourist') {
        return rec.id !== 'community'
      }
      if (profile.userType === 'business') {
        return rec.id !== 'language-settings'
      }
      return true
    })

    setRecommendations(filteredRecommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    }))
  }

  // 处理推荐操作
  const handleRecommendationAction = (action: string) => {
    switch (action) {
      case 'setup-payment':
        handleStartOnboarding()
        break
      case 'explore-map':
        navigate('/app/map')
        break
      case 'language-settings':
        setShowLanguageSelection(true)
        break
      case 'join-community':
        navigate('/app/help')
        break
      default:
        break
    }
  }

  // 处理语言选择
  const handleLanguageSelect = (languageCode: string) => {
    setSelectedLanguage(languageCode)
    i18n.changeLanguage(languageCode)
    localStorage.setItem('languageSelected', 'true')
    localStorage.setItem('selectedLanguage', languageCode)
    setShowLanguageSelection(false)
  }

  // 处理开始新手引导
  const handleStartOnboarding = () => {
    // 检查是否已选择语言
    const languageSelected = localStorage.getItem('languageSelected')
    if (!languageSelected) {
      setShowLanguageSelection(true)
      return
    }
    navigate('/onboarding')
  }

  // 检查初始语言选择状态
  useEffect(() => {
    const languageSelected = localStorage.getItem('languageSelected')
    if (!languageSelected) {
      setShowLanguageSelection(true)
    }
  }, [])

  // 获取用户类型显示文本
  const getUserTypeDisplay = (type: UserProfile['userType']) => {
    return t(`smartWelcome.userTypes.${type}`)
  }

  // 获取状态显示
  const getStatusDisplay = (isFirstTime: boolean) => {
    return isFirstTime 
      ? t('smartWelcome.status.firstTime')
      : t('smartWelcome.status.returning')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('smartWelcome.loading')}</p>
        </div>
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">{t('smartWelcome.error')}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('smartWelcome.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 头部欢迎区域 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-6">
            <Globe className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {t('smartWelcome.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('smartWelcome.subtitle')}
          </p>
        </div>

        {/* 用户信息卡片 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">{t('smartWelcome.location')}</h3>
              <p className="text-gray-600">{userProfile.location}</p>
            </div>
            <div className="text-center">
              <Users className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">{t('smartWelcome.userType')}</h3>
              <p className="text-gray-600">{getUserTypeDisplay(userProfile.userType)}</p>
            </div>
            <div className="text-center">
              <Clock className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900">{t('smartWelcome.status')}</h3>
              <p className="text-gray-600">{getStatusDisplay(userProfile.isFirstTime)}</p>
            </div>
          </div>
        </div>

        {/* 个性化推荐 */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {t('smartWelcome.recommendationsTitle')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((recommendation) => (
              <div 
                key={recommendation.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handleRecommendationAction(recommendation.action)}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${
                    recommendation.priority === 'high' ? 'bg-red-100 text-red-600' :
                    recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {recommendation.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {recommendation.title}
                      </h3>
                      {recommendation.priority === 'high' && (
                        <Star className="w-5 h-5 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <p className="text-gray-600 mb-4">
                      {recommendation.description}
                    </p>
                    <div className="flex items-center text-blue-600 font-medium">
                      <span>{t('smartWelcome.getStarted')}</span>
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 语言选择模态框 */}
        {showLanguageSelection && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4">
              <div className="text-center mb-6">
                <Globe className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {t('smartWelcome.languageSelection.title')}
                </h3>
                <p className="text-gray-600">
                  {t('smartWelcome.languageSelection.subtitle')}
                </p>
              </div>
              
              <div className="space-y-3">
                {[
                  { code: 'en', name: 'English', flag: '🇺🇸' },
                  { code: 'zh', name: '中文', flag: '🇨🇳' },
                  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
                  { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
                ].map((language) => (
                  <button
                    key={language.code}
                    onClick={() => handleLanguageSelect(language.code)}
                    className={`w-full flex items-center space-x-4 p-4 rounded-lg border-2 transition-colors ${
                      selectedLanguage === language.code
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl">{language.flag}</span>
                    <span className="font-medium text-gray-900">{language.name}</span>
                    {selectedLanguage === language.code && (
                      <div className="ml-auto w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="mt-6 text-center">
                <button
                  onClick={() => handleLanguageSelect(selectedLanguage)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {t('smartWelcome.languageSelection.continue')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 底部操作区域 */}
        <div className="text-center mt-12">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleStartOnboarding}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {t('smartWelcome.actions.startOnboarding')}
            </button>
            <button
              onClick={() => navigate('/app/map')}
              className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              {t('smartWelcome.actions.exploreNow')}
            </button>
          </div>
          <p className="text-gray-500 mt-4 text-sm">
            {t('smartWelcome.skipMessage')}
          </p>
        </div>

        {/* 安全提示 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8 max-w-2xl mx-auto">
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6 text-blue-600" />
            <div>
              <h4 className="font-medium text-blue-900">
                {t('smartWelcome.security.title')}
              </h4>
              <p className="text-blue-700 text-sm">
                {t('smartWelcome.security.message')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SmartWelcome