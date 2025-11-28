import { useEffect, useState, useRef } from 'react'
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  MapPin,
  CreditCard,
  Globe2,
  Shield,
  Sparkles,
  Users,
  Zap,
  Check,
  Star,
  TrendingUp,
  Clock,
  Layers,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import LanguageSelector from '@/components/LanguageSelector'
import LanguageBanner from '@/components/LanguageBanner'
import { supportedLanguages } from '@/lib/i18n'

const LandingPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [showLanguageBanner, setShowLanguageBanner] = useState(false)
  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const isInView = useInView(featuresRef, { once: true, margin: "-100px" })

  const { scrollYProgress } = useScroll()
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95])

  // 智能语言检测 - 只在无法识别浏览器语言时才显示横条
  useEffect(() => {
    const hasSelectedLanguage = localStorage.getItem('hasSelectedLanguage')

    if (!hasSelectedLanguage) {
      // 获取浏览器语言
      const browserLanguage = navigator.language.split('-')[0]

      // 检查浏览器语言是否在支持列表中
      if (Object.keys(supportedLanguages).includes(browserLanguage)) {
        // 浏览器语言被支持，自动设置并标记为已选择
        localStorage.setItem('hasSelectedLanguage', 'true')
        setShowLanguageBanner(false)
      } else {
        // 浏览器语言不支持，显示语言选择横条
        setShowLanguageBanner(true)
      }
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    if (user) {
      navigate('/app/map', { replace: true })
    }
  }, [user, navigate])

  // 特性数据 - Bento Grid 布局
  const features = [
    {
      icon: Globe2,
      title: t('landingPage.features.globalNetwork.title'),
      description: t('landingPage.features.globalNetwork.description'),
      className: 'md:col-span-2 md:row-span-1',
      gradient: 'from-blue-500/10 via-cyan-500/10 to-blue-500/10',
      delay: 0
    },
    {
      icon: Zap,
      title: t('landingPage.features.instantResponse.title'),
      description: t('landingPage.features.instantResponse.description'),
      className: 'md:col-span-1 md:row-span-1',
      gradient: 'from-yellow-500/10 via-orange-500/10 to-yellow-500/10',
      delay: 0.1
    },
    {
      icon: Shield,
      title: t('landingPage.features.enterpriseSecurity.title'),
      description: t('landingPage.features.enterpriseSecurity.description'),
      className: 'md:col-span-1 md:row-span-2',
      gradient: 'from-green-500/10 via-emerald-500/10 to-green-500/10',
      delay: 0.2
    },
    {
      icon: Users,
      title: t('landingPage.features.communityDriven.title'),
      description: t('landingPage.features.communityDriven.description'),
      className: 'md:col-span-1 md:row-span-1',
      gradient: 'from-purple-500/10 via-pink-500/10 to-purple-500/10',
      delay: 0.3
    },
    {
      icon: Layers,
      title: t('landingPage.features.smartRecommendation.title'),
      description: t('landingPage.features.smartRecommendation.description'),
      className: 'md:col-span-1 md:row-span-1',
      gradient: 'from-indigo-500/10 via-blue-500/10 to-indigo-500/10',
      delay: 0.4
    }
  ]

  // 统计数据
  const stats = [
    {
      value: '10,000',
      suffix: '+',
      label: t('landingPage.stats.terminals'),
      icon: CreditCard
    },
    {
      value: '50',
      suffix: '+',
      label: t('landingPage.stats.cities'),
      icon: MapPin
    },
    {
      value: '99.9',
      suffix: '%',
      label: t('landingPage.stats.uptime'),
      icon: TrendingUp
    },
    {
      value: '24',
      suffix: '/7',
      label: t('landingPage.stats.support'),
      icon: Clock
    }
  ]

  // 动态数字组件
  const AnimatedNumber = ({ value, suffix = '' }: { value: string, suffix?: string }) => {
    const [displayValue, setDisplayValue] = useState('0')
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true })

    useEffect(() => {
      if (isInView) {
        const numericValue = parseFloat(value.replace(',', ''))
        const duration = 2000
        const steps = 60
        const stepValue = numericValue / steps
        let current = 0

        const timer = setInterval(() => {
          current += stepValue
          if (current >= numericValue) {
            setDisplayValue(value)
            clearInterval(timer)
          } else {
            setDisplayValue(
              value.includes(',')
                ? Math.floor(current).toLocaleString()
                : current.toFixed(value.includes('.') ? 1 : 0)
            )
          }
        }, duration / steps)

        return () => clearInterval(timer)
      }
    }, [isInView, value])

    return (
      <span ref={ref} className="tabular-nums">
        {displayValue}{suffix}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 overflow-x-hidden">
      {/* 语言选择横条 - Apple 风格 - 固定在最顶部 */}
      <AnimatePresence>
        {showLanguageBanner && (
          <div className="fixed top-0 left-0 right-0 z-[60]">
            <LanguageBanner onClose={() => setShowLanguageBanner(false)} />
          </div>
        )}
      </AnimatePresence>

      {/* 导航栏 - 当有语言横条时向下移动 */}
      <nav className={`fixed left-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-slate-800 transition-all duration-300 ${
        showLanguageBanner ? 'top-[52px]' : 'top-0'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/web_logo.JPG" alt="Payments Maps Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                Payments Maps
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 sm:px-6 py-2.5 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors"
                >
                  {t('landingPage.nav.getStarted')}
                </motion.button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - 根据是否显示语言选择条调整 padding */}
      <section ref={heroRef} className={`relative min-h-screen flex items-center justify-center px-4 sm:px-6 pb-12 sm:pb-0 transition-all duration-300 ${
        showLanguageBanner ? 'pt-32 sm:pt-36' : 'pt-16 sm:pt-20'
      }`}>
        {/* 微妙的背景动画 */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(59, 130, 246, 0.03), transparent 50%)`
            }}
          />
          {/* 网格背景 */}
          <div className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to right, rgb(229, 231, 235, 0.3) 1px, transparent 1px),
                               linear-gradient(to bottom, rgb(229, 231, 235, 0.3) 1px, transparent 1px)`,
              backgroundSize: '64px 64px'
            }}
          />
        </div>

        <motion.div
          style={{ opacity, scale }}
          className="relative z-10 max-w-5xl mx-auto text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* 小标签 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-800 dark:to-slate-700 rounded-full mb-8 border border-blue-100 dark:border-slate-600 text-sm"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-100">{t('landingPage.badge')}</span>
            </motion.div>

            {/* 主标题 - 更大更简洁 */}
            <h1 className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight leading-tight">
              <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-200 dark:to-white bg-clip-text text-transparent">
                {t('landingPage.hero.title1')}
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 dark:from-blue-400 dark:via-purple-400 dark:to-blue-400 bg-clip-text text-transparent animate-gradient bg-300">
                {t('landingPage.hero.title2')}
              </span>
            </h1>

            {/* 副标题 - 更简洁 */}
            <p className="text-base sm:text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-10 sm:mb-12 max-w-2xl mx-auto font-light">
              {t('landingPage.hero.subtitle')}
            </p>

            {/* CTA 按钮组 */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center w-full sm:w-auto">
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="group px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {t('landingPage.hero.getStarted')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </Link>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => featuresRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-3 sm:py-4 text-gray-700 dark:text-gray-100 rounded-xl font-medium text-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-300 w-full sm:w-auto"
              >
                {t('landingPage.hero.learnMore')}
              </motion.button>
            </div>

            {/* 信任标识 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-12 sm:mt-16 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-500 dark:text-gray-400"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>{t('landingPage.trust.bankLevel')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{t('landingPage.trust.compliance')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                <span>{t('landingPage.trust.rating')}</span>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section - Bento Grid */}
      <section ref={featuresRef} className="py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
              {t('landingPage.features.title')}
            </h2>
            <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('landingPage.features.subtitle')}
            </p>
          </motion.div>

          {/* Bento Grid 布局 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: feature.delay }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`${feature.className} relative group`}
              >
                <div className="h-full p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 transition-all duration-300 hover:shadow-xl">
                  {/* 背景渐变 */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />

                  <div className="relative">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>

                    <h3 className="text-xl sm:text-2xl font-bold mb-3 text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-300 text-base sm:text-lg leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section - 更简洁的设计 */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white dark:from-slate-950 dark:to-slate-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
              {t('landingPage.stats.title')}
            </h2>
            <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('landingPage.stats.subtitle')}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6 lg:gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl mb-4">
                  <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700 dark:text-gray-200" />
                </div>
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-2">
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                </div>
                <div className="text-gray-600 dark:text-gray-300 font-medium">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - 更简洁 */}
      <section className="py-24 sm:py-32 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* 背景装饰 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-3xl opacity-5" />

            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 sm:p-14 lg:p-16 text-center overflow-hidden">
              {/* 装饰性背景 */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

              <div className="relative">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white">
                  {t('landingPage.cta.title')}
                </h2>
                <p className="text-base sm:text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                  {t('landingPage.cta.subtitle')}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Link to="/login">
                    <motion.button
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="group px-8 py-4 bg-white text-gray-900 rounded-xl font-medium text-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      {t('landingPage.cta.start')}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  </Link>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-8 py-4 text-white border border-white/20 rounded-xl font-medium text-lg hover:bg-white/10 transition-all duration-300 w-full sm:w-auto"
                  >
                    {t('landingPage.cta.learnMore')}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 语言选择 - 底部 Apple 风格 */}
      <section className="border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-3 text-gray-800 dark:text-gray-100">
              <Globe2 className="w-5 h-5" />
              <div>
                <p className="text-sm font-semibold">{t('landingPage.language.title')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('landingPage.language.subtitle')}</p>
              </div>
            </div>
            <div className="w-full md:w-auto flex justify-start md:justify-end">
              <LanguageSelector />
            </div>
          </div>
        </div>
      </section>

      {/* Footer - 极简风格 */}
      <footer className="py-10 px-4 sm:px-6 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/80">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <img src="/web_logo.JPG" alt="Payments Maps Logo" className="w-8 h-8 object-contain" />
              <span className="text-lg font-semibold text-gray-900 dark:text-white">Payments Maps</span>
            </div>

            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {t('landingPage.footer.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
