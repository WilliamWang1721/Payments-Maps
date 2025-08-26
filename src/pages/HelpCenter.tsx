import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, MessageCircle, Video, FileText, Users, ChevronRight, Star, ThumbsUp, ThumbsDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

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

const HelpCenter: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [feedback, setFeedback] = useState<{ [key: string]: 'helpful' | 'not-helpful' | null }>({})

  // Mock FAQ data
  const faqData: FAQItem[] = [
    {
      id: '1',
      question: t('helpCenter.faq.alipaySetup.question', '如何设置支付宝？'),
      answer: t('helpCenter.faq.alipaySetup.answer', '下载支付宝应用，注册账户，绑定银行卡或信用卡，完成实名认证即可开始使用。'),
      category: 'payment',
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
    }
  ]

  const categories = [
    { id: 'all', name: t('helpCenter.categories.all', '全部'), icon: FileText },
    { id: 'payment', name: t('helpCenter.categories.payment', '支付方式'), icon: MessageCircle },
    { id: 'app', name: t('helpCenter.categories.app', '应用使用'), icon: Video },
    { id: 'security', name: t('helpCenter.categories.security', '安全相关'), icon: Users }
  ]

  const filteredFAQ = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const filteredVideos = videoTutorials.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         video.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'all' || video.category === activeCategory
    return matchesSearch && matchesCategory
  })

  const handleFeedback = (faqId: string, type: 'helpful' | 'not-helpful') => {
    setFeedback(prev => ({ ...prev, [faqId]: type }))
    toast.success(t('helpCenter.feedback.thanks', '感谢您的反馈！'))
  }

  const handleContactSupport = () => {
    toast.info(t('helpCenter.contact.message', '客服功能即将上线，敬请期待！'))
  }

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
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/onboarding')}
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">
                  {t('helpCenter.quickActions.onboarding', '新手引导')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('helpCenter.quickActions.onboardingDesc', '快速上手指南')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContactSupport}
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">
                  {t('helpCenter.quickActions.contact', '联系客服')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('helpCenter.quickActions.contactDesc', '获取人工帮助')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/welcome')}
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-gray-900">
                  {t('helpCenter.quickActions.community', '用户社区')}
                </h3>
                <p className="text-sm text-gray-500">
                  {t('helpCenter.quickActions.communityDesc', '交流分享经验')}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </motion.button>
        </div>

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
        {filteredFAQ.length === 0 && filteredVideos.length === 0 && searchQuery && (
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