import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Search,
  MessageCircle,
  Video,
  FileText,
  Users,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
  ShieldCheck,
  CreditCard,
  MapPin,
  LifeBuoy,
  Globe,
  Timer
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { notify } from '@/lib/notify'

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  helpful: number
  notHelpful: number
}

interface VideoTutorial {
  id: string
  title: string
  description: string
  duration: string
  thumbnail: string
  category: string
}

interface GuideArticle {
  id: string
  title: string
  description: string
  steps: string[]
  tips?: string[]
  estimatedTime: string
  category: string
}

const HelpCenter: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [feedback, setFeedback] = useState<{ [key: string]: 'helpful' | 'not-helpful' | null }>({})
  const guidesSectionRef = useRef<HTMLDivElement | null>(null)

  const guideArticles: GuideArticle[] = [
    {
      id: 'guide-1',
      title: t('helpCenter.guides.firstSteps.title', '初次使用中国移动支付的四个步骤'),
      description: t(
        'helpCenter.guides.firstSteps.description',
        '专为初到中国的外国用户设计，帮助您快速完成支付宝和微信支付的核心设置。'
      ),
      steps: [
        t('helpCenter.guides.firstSteps.steps.0', '下载并安装支付宝与微信，使用常用邮箱或手机号注册账户。'),
        t('helpCenter.guides.firstSteps.steps.1', '准备护照、入境签证页以及中国手机号，用于完成实名认证。'),
        t('helpCenter.guides.firstSteps.steps.2', '在应用中绑定境内银行卡，或使用境外卡渠道完成绑定与换汇。'),
        t('helpCenter.guides.firstSteps.steps.3', '在支付地图中搜索常用商户，加入收藏并开启位置提醒。')
      ],
      tips: [
        t('helpCenter.guides.firstSteps.tips.0', '实名认证时请确保护照信息与填写内容完全一致，避免审核被退回。'),
        t('helpCenter.guides.firstSteps.tips.1', '若暂时没有中国银行卡，可优先开通支付宝国际钱包或微信旅行卡。')
      ],
      estimatedTime: t('helpCenter.guides.firstSteps.estimatedTime', '预计完成时间：20-30分钟'),
      category: 'account'
    },
    {
      id: 'guide-2',
      title: t('helpCenter.guides.linkCard.title', '境外银行卡绑定与支付限额说明'),
      description: t(
        'helpCenter.guides.linkCard.description',
        '了解常见境外卡绑定路径、费用结构与常见失败原因，确保顺利完成支付。'
      ),
      steps: [
        t('helpCenter.guides.linkCard.steps.0', '在支付宝或微信支付中选择“添加银行卡”，输入卡号与持卡人姓名。'),
        t('helpCenter.guides.linkCard.steps.1', '按页面提示填写账单地址，建议与发卡行预留信息保持一致。'),
        t('helpCenter.guides.linkCard.steps.2', '收到银行验证短信后输入验证码，完成双重验证。'),
        t('helpCenter.guides.linkCard.steps.3', '查看每日与每笔支付限额，合理规划大额消费或提前充值。')
      ],
      tips: [
        t('helpCenter.guides.linkCard.tips.0', '部分境外卡需要开通线上交易或跨境支付功能，请提前联系发卡行确认。'),
        t('helpCenter.guides.linkCard.tips.1', '如多次验证失败，可尝试更换网络环境或避开高峰时段。')
      ],
      estimatedTime: t('helpCenter.guides.linkCard.estimatedTime', '预计完成时间：10-15分钟'),
      category: 'payment'
    },
    {
      id: 'guide-3',
      title: t('helpCenter.guides.cityLife.title', '在城市出行与消费中的支付技巧'),
      description: t(
        'helpCenter.guides.cityLife.description',
        '覆盖交通出行、餐饮购物等高频场景，帮助您灵活选择最合适的支付方式。'
      ),
      steps: [
        t('helpCenter.guides.cityLife.steps.0', '在支付地图中开启“交通出行”“连锁餐饮”等筛选标签，快速定位推荐商户。'),
        t('helpCenter.guides.cityLife.steps.1', '提前在支付宝或微信中充值交通卡，或绑定公交码以免高峰期排队。'),
        t('helpCenter.guides.cityLife.steps.2', '留意商户页面的“支持卡组织”提示，根据优惠选择 Visa、Mastercard 等卡片。'),
        t('helpCenter.guides.cityLife.steps.3', '收藏常用线路与商户，开启到店提醒获取实时优惠。')
      ],
      tips: [
        t('helpCenter.guides.cityLife.tips.0', '部分小型商户仍只收现金，建议随身准备少量人民币备用。'),
        t('helpCenter.guides.cityLife.tips.1', '夜间乘坐出租车可使用支付宝“打车”或微信“出行服务”减少沟通成本。')
      ],
      estimatedTime: t('helpCenter.guides.cityLife.estimatedTime', '预计阅读时间：5分钟'),
      category: 'travel'
    }
  ]

  // Mock FAQ data
  const faqData: FAQItem[] = [
    {
      id: '1',
      question: t('helpCenter.faq.alipaySetup.question', '如何设置支付宝？'),
      answer: t(
        'helpCenter.faq.alipaySetup.answer',
        '下载支付宝应用后，使用手机号注册账户，按照页面提示上传护照信息完成实名认证，再绑定银行卡或选择国际钱包即可开始使用。'
      ),
      category: 'account',
      helpful: 45,
      notHelpful: 3
    },
    {
      id: '2',
      question: t('helpCenter.faq.wechatPay.question', '微信支付如何使用？'),
      answer: t('helpCenter.faq.wechatPay.answer', '在微信中进入"我"-"支付"，添加银行卡，设置支付密码，即可在支持微信支付的商户处扫码付款。'),
      category: 'payment',
      helpful: 38,
      notHelpful: 2
    },
    {
      id: '3',
      question: t('helpCenter.faq.findStores.question', '如何找到支持移动支付的商店？'),
      answer: t('helpCenter.faq.findStores.answer', '使用我们的地图功能，可以查看附近支持支付宝、微信支付等移动支付方式的商店位置和详细信息。'),
      category: 'app',
      helpful: 52,
      notHelpful: 1
    },
    {
      id: '4',
      question: t('helpCenter.faq.security.question', '移动支付安全吗？'),
      answer: t('helpCenter.faq.security.answer', '移动支付采用多重安全措施，包括密码保护、指纹识别、面部识别等，比现金支付更加安全。'),
      category: 'security',
      helpful: 67,
      notHelpful: 5
    },
    {
      id: '5',
      question: t('helpCenter.faq.realName.question', '护照实名认证失败怎么办？'),
      answer: t(
        'helpCenter.faq.realName.answer',
        '请确认上传的护照照片清晰、未被遮挡，并使用本人持有的中国大陆手机号。如仍未通过，可在工作时间联系支付宝或微信人工客服进行人工复核。'
      ),
      category: 'account',
      helpful: 29,
      notHelpful: 4
    },
    {
      id: '6',
      question: t('helpCenter.faq.cardLimit.question', '境外银行卡如何设置支付限额？'),
      answer: t(
        'helpCenter.faq.cardLimit.answer',
        '在绑定境外卡后，可在“卡片管理”页面查看平台与发卡行的限额说明。若需提高限额，请联系发卡行开通更高的线上交易额度，或选择提前充值到余额。'
      ),
      category: 'payment',
      helpful: 31,
      notHelpful: 6
    },
    {
      id: '7',
      question: t('helpCenter.faq.filter.question', '如何在地图中筛选支持特定卡组织的商户？'),
      answer: t(
        'helpCenter.faq.filter.answer',
        '在地图页面打开筛选面板，勾选“卡组织”标签，如 Visa、Mastercard 或 American Express，并可结合“优惠活动”等条件共同筛选。'
      ),
      category: 'app',
      helpful: 42,
      notHelpful: 2
    },
    {
      id: '8',
      question: t('helpCenter.faq.failedPayment.question', '支付失败常见原因有哪些？'),
      answer: t(
        'helpCenter.faq.failedPayment.answer',
        '请检查网络连接是否稳定、账户余额是否充足、卡片是否在有效期内。若出现“风控限制”，可尝试更换网络或联系发卡行确认跨境交易权限。'
      ),
      category: 'troubleshooting',
      helpful: 57,
      notHelpful: 8
    },
    {
      id: '9',
      question: t('helpCenter.faq.transport.question', '在公共交通场景中如何使用移动支付？'),
      answer: t(
        'helpCenter.faq.transport.answer',
        '可在支付宝开通“乘车码”或在微信进入“出行服务”，按照城市提示选择交通卡。进站前先打开二维码或刷 NFC，支持扫码过闸的城市可直接出示二维码。'
      ),
      category: 'travel',
      helpful: 34,
      notHelpful: 3
    }
  ]

  // Mock video tutorial data
  const videoTutorials: VideoTutorial[] = [
    {
      id: '1',
      title: t('helpCenter.videos.alipayGuide.title', '支付宝完整使用指南'),
      description: t('helpCenter.videos.alipayGuide.description', '从注册到日常使用的完整教程'),
      duration: '8:30',
      thumbnail: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Alipay%20mobile%20payment%20tutorial%20thumbnail%20with%20smartphone%20and%20QR%20code&image_size=landscape_16_9',
      category: 'payment'
    },
    {
      id: '2',
      title: t('helpCenter.videos.wechatGuide.title', '微信支付使用教程'),
      description: t('helpCenter.videos.wechatGuide.description', '学习如何在微信中设置和使用支付功能'),
      duration: '6:45',
      thumbnail: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=WeChat%20Pay%20tutorial%20thumbnail%20with%20green%20interface%20and%20payment%20icons&image_size=landscape_16_9',
      category: 'payment'
    },
    {
      id: '3',
      title: t('helpCenter.videos.appGuide.title', '支付地图应用使用指南'),
      description: t('helpCenter.videos.appGuide.description', '了解如何使用我们的应用找到支付友好的商店'),
      duration: '5:20',
      thumbnail: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=Payment%20map%20app%20tutorial%20with%20map%20interface%20and%20location%20pins&image_size=landscape_16_9',
      category: 'app'
    },
    {
      id: '4',
      title: t('helpCenter.videos.cityTravel.title', '城市出行支付攻略'),
      description: t('helpCenter.videos.cityTravel.description', '掌握乘车码、地铁闸机与出租车场景的支付技巧'),
      duration: '7:15',
      thumbnail: 'https://trae-api-sg.mchost.guru/api/ide/v1/text_to_image?prompt=City%20transportation%20mobile%20payment%20tutorial%20with%20subway%20and%20qr%20code&image_size=landscape_16_9',
      category: 'travel'
    }
  ]

  const categories = [
    { id: 'all', name: t('helpCenter.categories.all', '全部'), icon: FileText },
    { id: 'account', name: t('helpCenter.categories.account', '账户设置'), icon: Users },
    { id: 'payment', name: t('helpCenter.categories.payment', '支付方式'), icon: CreditCard },
    { id: 'app', name: t('helpCenter.categories.app', '应用使用'), icon: MapPin },
    { id: 'security', name: t('helpCenter.categories.security', '安全相关'), icon: ShieldCheck },
    { id: 'troubleshooting', name: t('helpCenter.categories.troubleshooting', '问题排查'), icon: LifeBuoy },
    { id: 'travel', name: t('helpCenter.categories.travel', '出行购物'), icon: Globe }
  ]

  const normalizedQuery = searchQuery.toLowerCase()

  const filteredFAQ = faqData.filter(item => {
    const matchesSearch =
      item.question.toLowerCase().includes(normalizedQuery) || item.answer.toLowerCase().includes(normalizedQuery)
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const filteredVideos = videoTutorials.filter(video => {
    const matchesSearch =
      video.title.toLowerCase().includes(normalizedQuery) || video.description.toLowerCase().includes(normalizedQuery)
    const matchesCategory = activeCategory === 'all' || video.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const filteredGuides = guideArticles.filter(guide => {
    const guideText = [guide.title, guide.description, ...guide.steps, ...(guide.tips ?? [])].join(' ').toLowerCase()
    const matchesSearch = guideText.includes(normalizedQuery)
    const matchesCategory = activeCategory === 'all' || guide.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const showNoResults =
    filteredFAQ.length === 0 && filteredVideos.length === 0 && filteredGuides.length === 0 && Boolean(searchQuery)

  const handleFeedback = (faqId: string, type: 'helpful' | 'not-helpful') => {
    setFeedback(prev => ({ ...prev, [faqId]: type }))
    notify.success(t('helpCenter.feedback.thanks', '感谢您的反馈！'))
  }

  const handleContactSupport = () => {
    notify.info(t('helpCenter.contact.message', '客服功能即将上线，敬请期待！'))
  }

  const quickActions = [
    {
      id: 'onboarding',
      icon: Video,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: t('helpCenter.quickActions.onboarding', '新手引导'),
      description: t('helpCenter.quickActions.onboardingDesc', '从下载到完成实名认证的全流程教程'),
      onClick: () => navigate('/onboarding')
    },
    {
      id: 'contact',
      icon: MessageCircle,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      title: t('helpCenter.quickActions.contact', '联系客服'),
      description: t('helpCenter.quickActions.contactDesc', '获取人工帮助与多语言支持'),
      onClick: () => handleContactSupport()
    },
    {
      id: 'guides',
      icon: BookOpen,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: t('helpCenter.quickActions.guides', '图文教程'),
      description: t('helpCenter.quickActions.guidesDesc', '按场景查看操作步骤与贴士'),
      onClick: () => guidesSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              {t('helpCenter.title', '帮助中心')}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('helpCenter.search.placeholder', '搜索帮助内容...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    activeCategory === category.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {category.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {quickActions.map(action => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={action.onClick}
                className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${action.iconBg}`}>
                    <Icon className={`w-6 h-6 ${action.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.button>
            )
          })}
        </div>

        {/* Guides */}
        {filteredGuides.length > 0 && (
          <div className="mb-8" ref={guidesSectionRef}>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('helpCenter.guides.title', '图文教程')}
            </h2>
            <div className="space-y-4">
              {filteredGuides.map(guide => (
                <motion.div
                  key={guide.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg shadow-sm border p-6"
                >
                  <div className="flex flex-col gap-6 md:flex-row">
                    <div className="md:flex-1">
                      <h3 className="font-medium text-gray-900 mb-2">{guide.title}</h3>
                      <p className="text-gray-600 mb-4">{guide.description}</p>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">
                          {t('helpCenter.guides.stepsTitle', '操作步骤')}
                        </h4>
                        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                          {guide.steps.map((step, index) => (
                            <li key={index}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    </div>
                    <div className="md:w-64 bg-blue-50 rounded-lg p-4 self-start">
                      <div className="flex items-center gap-2 text-blue-700 font-medium mb-3">
                        <Timer className="w-4 h-4" />
                        <span>{guide.estimatedTime}</span>
                      </div>
                      {guide.tips && guide.tips.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-blue-700 mb-2">
                            {t('helpCenter.guides.tipsTitle', '贴心提示')}
                          </h4>
                          <ul className="list-disc list-inside space-y-2 text-sm text-blue-700">
                            {guide.tips.map((tip, index) => (
                              <li key={index}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Video Tutorials */}
        {filteredVideos.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('helpCenter.videos.title', '视频教程')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video) => (
                <motion.div
                  key={video.id}
                  whileHover={{ scale: 1.02 }}
                  className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-32 object-cover"
                    />
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-1">{video.title}</h3>
                    <p className="text-sm text-gray-500">{video.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t('helpCenter.faq.title', '常见问题')}
          </h2>
          <div className="space-y-4">
            {filteredFAQ.map((faq) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-sm border p-6"
              >
                <h3 className="font-medium text-gray-900 mb-3">{faq.question}</h3>
                <p className="text-gray-600 mb-4">{faq.answer}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      {t('helpCenter.feedback.helpful', '这个回答有帮助吗？')}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFeedback(faq.id, 'helpful')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                          feedback[faq.id] === 'helpful'
                            ? 'bg-green-100 text-green-700'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        {faq.helpful}
                      </button>
                      <button
                        onClick={() => handleFeedback(faq.id, 'not-helpful')}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                          feedback[faq.id] === 'not-helpful'
                            ? 'bg-red-100 text-red-700'
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        {faq.notHelpful}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* No Results */}
        {showNoResults && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('helpCenter.noResults.title', '没有找到相关内容')}
            </h3>
            <p className="text-gray-500 mb-4">
              {t('helpCenter.noResults.description', '尝试使用不同的关键词搜索，或联系客服获取帮助')}
            </p>
            <button
              onClick={handleContactSupport}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              {t('helpCenter.noResults.contact', '联系客服')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default HelpCenter
