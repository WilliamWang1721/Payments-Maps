import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { 
  ChevronLeft, 
  ChevronRight, 
  Globe, 
  Users, 
  CreditCard, 
  MapPin, 
  Smartphone, 
  Shield, 
  CheckCircle,
  Play,
  Book,
  MessageCircle
} from 'lucide-react'

interface OnboardingStep {
  id: string
  title: string
  description: string
  component: React.ReactNode
  canSkip: boolean
}

const OnboardingFlow: React.FC = () => {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  const [userSelections, setUserSelections] = useState({
    language: i18n.language,
    userType: '',
    paymentMethods: [] as string[]
  })

  // 定义引导步骤
  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      title: t('onboardingFlow.steps.welcome.title'),
      description: t('onboardingFlow.steps.welcome.description'),
      component: <WelcomeStep />,
      canSkip: false
    },
    {
      id: 'language',
      title: t('onboardingFlow.steps.language.title'),
      description: t('onboardingFlow.steps.language.description'),
      component: <LanguageStep />,
      canSkip: true
    },
    {
      id: 'userType',
      title: t('onboardingFlow.steps.userType.title'),
      description: t('onboardingFlow.steps.userType.description'),
      component: <UserTypeStep />,
      canSkip: true
    },
    {
      id: 'paymentIntro',
      title: t('onboardingFlow.steps.paymentIntro.title'),
      description: t('onboardingFlow.steps.paymentIntro.description'),
      component: <PaymentIntroStep />,
      canSkip: false
    },
    {
      id: 'tutorial',
      title: t('onboardingFlow.steps.tutorial.title'),
      description: t('onboardingFlow.steps.tutorial.description'),
      component: <TutorialStep />,
      canSkip: true
    },
    {
      id: 'complete',
      title: t('onboardingFlow.steps.complete.title'),
      description: t('onboardingFlow.steps.complete.description'),
      component: <CompleteStep />,
      canSkip: false
    }
  ]

  // 欢迎步骤组件
  function WelcomeStep() {
    return (
      <div className="text-center">
        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Globe className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {t('onboardingFlow.welcome.title')}
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          {t('onboardingFlow.welcome.description')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-blue-50 p-6 rounded-lg">
            <MapPin className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              {t('onboardingFlow.welcome.features.findStores')}
            </h3>
            <p className="text-gray-600 text-sm">
              {t('onboardingFlow.welcome.features.findStoresDesc')}
            </p>
          </div>
          <div className="bg-green-50 p-6 rounded-lg">
            <CreditCard className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              {t('onboardingFlow.welcome.features.paymentGuide')}
            </h3>
            <p className="text-gray-600 text-sm">
              {t('onboardingFlow.welcome.features.paymentGuideDesc')}
            </p>
          </div>
          <div className="bg-purple-50 p-6 rounded-lg">
            <Shield className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">
              {t('onboardingFlow.welcome.features.security')}
            </h3>
            <p className="text-gray-600 text-sm">
              {t('onboardingFlow.welcome.features.securityDesc')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // 语言选择步骤
  function LanguageStep() {
    const languages = [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'zh', name: '中文', flag: '🇨🇳' },
      { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
    ]

    const handleLanguageChange = (langCode: string) => {
      setUserSelections(prev => ({ ...prev, language: langCode }))
      i18n.changeLanguage(langCode)
    }

    return (
      <div className="text-center">
        <Globe className="w-16 h-16 text-blue-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('onboardingFlow.language.title')}
        </h2>
        <p className="text-gray-600 mb-8">
          {t('onboardingFlow.language.description')}
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`p-4 rounded-lg border-2 transition-all ${
                userSelections.language === lang.code
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-2xl mb-2">{lang.flag}</div>
              <div className="font-medium text-gray-900">{lang.name}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 用户类型选择步骤
  function UserTypeStep() {
    const userTypes = [
      {
        id: 'tourist',
        icon: <MapPin className="w-8 h-8" />,
        title: t('onboardingFlow.userType.tourist.title'),
        description: t('onboardingFlow.userType.tourist.description')
      },
      {
        id: 'student',
        icon: <Book className="w-8 h-8" />,
        title: t('onboardingFlow.userType.student.title'),
        description: t('onboardingFlow.userType.student.description')
      },
      {
        id: 'business',
        icon: <Users className="w-8 h-8" />,
        title: t('onboardingFlow.userType.business.title'),
        description: t('onboardingFlow.userType.business.description')
      },
      {
        id: 'resident',
        icon: <Smartphone className="w-8 h-8" />,
        title: t('onboardingFlow.userType.resident.title'),
        description: t('onboardingFlow.userType.resident.description')
      }
    ]

    const handleUserTypeSelect = (type: string) => {
      setUserSelections(prev => ({ ...prev, userType: type }))
    }

    return (
      <div className="text-center">
        <Users className="w-16 h-16 text-blue-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('onboardingFlow.userType.title')}
        </h2>
        <p className="text-gray-600 mb-8">
          {t('onboardingFlow.userType.description')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
          {userTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => handleUserTypeSelect(type.id)}
              className={`p-6 rounded-lg border-2 text-left transition-all ${
                userSelections.userType === type.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`mb-3 ${
                userSelections.userType === type.id ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {type.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{type.title}</h3>
              <p className="text-gray-600 text-sm">{type.description}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // 支付方式介绍步骤
  function PaymentIntroStep() {
    const paymentMethods = [
      {
        id: 'alipay',
        name: t('onboardingFlow.paymentIntro.alipay.name'),
        description: t('onboardingFlow.paymentIntro.alipay.description'),
        features: [
          t('onboardingFlow.paymentIntro.alipay.features.qr'),
          t('onboardingFlow.paymentIntro.alipay.features.international'),
          t('onboardingFlow.paymentIntro.alipay.features.secure')
        ],
        color: 'blue'
      },
      {
        id: 'wechat',
        name: t('onboardingFlow.paymentIntro.wechat.name'),
        description: t('onboardingFlow.paymentIntro.wechat.description'),
        features: [
          t('onboardingFlow.paymentIntro.wechat.features.integrated'),
          t('onboardingFlow.paymentIntro.wechat.features.social'),
          t('onboardingFlow.paymentIntro.wechat.features.widespread')
        ],
        color: 'green'
      }
    ]

    return (
      <div className="text-center">
        <CreditCard className="w-16 h-16 text-blue-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('onboardingFlow.paymentIntro.title')}
        </h2>
        <p className="text-gray-600 mb-8">
          {t('onboardingFlow.paymentIntro.description')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {paymentMethods.map((method) => (
            <div key={method.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{method.name}</h3>
              <p className="text-gray-600 mb-4">{method.description}</p>
              <ul className="space-y-2">
                {method.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl mx-auto">
          <p className="text-yellow-800 text-sm">
            <strong>{t('onboardingFlow.paymentIntro.tip.title')}</strong><br />
            {t('onboardingFlow.paymentIntro.tip.description')}
          </p>
        </div>
      </div>
    )
  }

  // 教程步骤
  function TutorialStep() {
    const tutorials = [
      {
        id: 'map-usage',
        title: t('onboardingFlow.tutorial.mapUsage.title'),
        description: t('onboardingFlow.tutorial.mapUsage.description'),
        icon: <MapPin className="w-6 h-6" />
      },
      {
        id: 'payment-setup',
        title: t('onboardingFlow.tutorial.paymentSetup.title'),
        description: t('onboardingFlow.tutorial.paymentSetup.description'),
        icon: <CreditCard className="w-6 h-6" />
      },
      {
        id: 'help-support',
        title: t('onboardingFlow.tutorial.helpSupport.title'),
        description: t('onboardingFlow.tutorial.helpSupport.description'),
        icon: <MessageCircle className="w-6 h-6" />
      }
    ]

    return (
      <div className="text-center">
        <Play className="w-16 h-16 text-blue-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('onboardingFlow.tutorial.title')}
        </h2>
        <p className="text-gray-600 mb-8">
          {t('onboardingFlow.tutorial.description')}
        </p>
        <div className="space-y-4 max-w-2xl mx-auto">
          {tutorials.map((tutorial) => (
            <div key={tutorial.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  {tutorial.icon}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">{tutorial.title}</h3>
                  <p className="text-gray-600 text-sm">{tutorial.description}</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {t('onboardingFlow.tutorial.watch')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 完成步骤
  function CompleteStep() {
    return (
      <div className="text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          {t('onboardingFlow.complete.title')}
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          {t('onboardingFlow.complete.description')}
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto mb-8">
          <h3 className="font-semibold text-blue-900 mb-3">
            {t('onboardingFlow.complete.nextSteps.title')}
          </h3>
          <ul className="text-left space-y-2 text-blue-800">
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />
              {t('onboardingFlow.complete.nextSteps.exploreMap')}
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />
              {t('onboardingFlow.complete.nextSteps.setupPayment')}
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 text-blue-600 mr-2" />
              {t('onboardingFlow.complete.nextSteps.getHelp')}
            </li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/app/map')}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t('onboardingFlow.complete.startExploring')}
          </button>
          <button
            onClick={() => navigate('/app/help')}
            className="px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            {t('onboardingFlow.complete.visitHelpCenter')}
          </button>
        </div>
      </div>
    )
  }

  // 下一步
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      setCurrentStep(prev => prev + 1)
    }
  }

  // 上一步
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  // 跳过
  const handleSkip = () => {
    if (steps[currentStep].canSkip) {
      handleNext()
    }
  }

  // 完成引导
  const handleFinish = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    localStorage.setItem('userPreferences', JSON.stringify(userSelections))
    navigate('/app/map')
  }

  // 保存进度
  useEffect(() => {
    localStorage.setItem('onboardingProgress', JSON.stringify({
      currentStep,
      completedSteps: Array.from(completedSteps),
      userSelections
    }))
  }, [currentStep, completedSteps, userSelections])

  // 恢复进度
  useEffect(() => {
    const savedProgress = localStorage.getItem('onboardingProgress')
    if (savedProgress) {
      try {
        const progress = JSON.parse(savedProgress)
        setCurrentStep(progress.currentStep || 0)
        setCompletedSteps(new Set(progress.completedSteps || []))
        setUserSelections(progress.userSelections || {
          language: i18n.language,
          userType: '',
          paymentMethods: []
        })
      } catch (error) {
        console.error('Error restoring onboarding progress:', error)
      }
    }
  }, [i18n.language])

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 进度条 */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-semibold text-gray-900">
              {t('onboardingFlow.title')}
            </h1>
            <span className="text-sm text-gray-500">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* 步骤标题 */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h2>
            <p className="text-gray-600">
              {currentStepData.description}
            </p>
          </div>

          {/* 步骤内容 */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            {currentStepData.component}
          </div>

          {/* 导航按钮 */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              {t('onboardingFlow.navigation.previous')}
            </button>

            <div className="flex space-x-4">
              {currentStepData.canSkip && !isLastStep && (
                <button
                  onClick={handleSkip}
                  className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium"
                >
                  {t('onboardingFlow.navigation.skip')}
                </button>
              )}
              
              {isLastStep ? (
                <button
                  onClick={handleFinish}
                  className="flex items-center px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  {t('onboardingFlow.navigation.finish')}
                  <CheckCircle className="w-5 h-5 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  {t('onboardingFlow.navigation.next')}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OnboardingFlow