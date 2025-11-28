import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, changeLanguage } from '@/lib/i18n'

interface LanguageBannerProps {
  onClose?: () => void
}

const LanguageBanner = ({ onClose }: LanguageBannerProps) => {
  const { i18n } = useTranslation()
  const [selectedLang, setSelectedLang] = useState(i18n.language)
  const [isOpen, setIsOpen] = useState(false)

  // 监听语言变化
  useEffect(() => {
    setSelectedLang(i18n.language)
  }, [i18n.language])

  // 当选择语言时立即更改
  const handleLanguageSelect = (langCode: string) => {
    setSelectedLang(langCode)
    changeLanguage(langCode) // 立即应用语言更改
    setIsOpen(false)
  }

  const handleContinue = () => {
    localStorage.setItem('hasSelectedLanguage', 'true')
    onClose?.()
  }

  const handleClose = () => {
    // 关闭时保存当前语言选择
    changeLanguage(selectedLang)
    localStorage.setItem('hasSelectedLanguage', 'true')
    onClose?.()
  }

  const languageOptions = Object.entries(supportedLanguages).map(([code, name]) => ({
    code,
    name,
    region: code === 'zh' ? '中国大陆' : code === 'en' ? 'United States' : code === 'ru' ? 'Россия' : 'Deutschland'
  }))

  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: 'auto' }}
      exit={{ height: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 border-b border-gray-200 dark:border-slate-800 relative shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* 左侧文字说明 */}
            <div className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200 text-center md:text-left">
              {i18n.language === 'zh' && '选择另一个国家或地区，以获得适用于您所在位置的内容和在线购物选项。'}
              {i18n.language === 'en' && 'Choose another country or region to see content specific to your location and shop online.'}
              {i18n.language === 'ru' && 'Выберите другую страну или регион, чтобы увидеть контент для вашего местоположения.'}
              {i18n.language === 'de' && 'Wählen Sie ein anderes Land oder eine andere Region, um Inhalte für Ihren Standort anzuzeigen.'}
            </div>

            {/* 中间选择区域 */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
              {/* 语言选择下拉框 */}
              <div className="relative z-[70]">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="flex items-center justify-between gap-2 px-5 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 hover:border-blue-400 dark:hover:border-slate-500 transition-all min-w-[160px] shadow-sm w-full sm:w-auto"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {languageOptions.find(l => l.code === selectedLang)?.region ||
                     languageOptions.find(l => l.code === i18n.language)?.region ||
                     '中国大陆'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-gray-600 dark:text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <>
                      {/* 点击外部关闭 */}
                      <div
                        className="fixed inset-0 z-[65] bg-black/10 dark:bg-black/40"
                        onClick={() => setIsOpen(false)}
                      />

                      {/* 下拉菜单 */}
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full mt-1 right-0 w-full min-w-[200px] bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-slate-700 rounded-lg shadow-lg z-[70]"
                      >
                        {/* 标题 */}
                        <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {i18n.language === 'zh' && '选择你的国家或地区'}
                            {i18n.language === 'en' && 'Choose your country or region'}
                            {i18n.language === 'ru' && 'Выберите вашу страну или регион'}
                            {i18n.language === 'de' && 'Wählen Sie Ihr Land oder Ihre Region'}
                          </p>
                        </div>

                        {/* 选项列表 */}
                        <div className="py-2">
                          {languageOptions.map((lang) => (
                            <button
                              key={lang.code}
                              onClick={() => handleLanguageSelect(lang.code)}
                              className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between ${
                                selectedLang === lang.code ? 'text-blue-600 font-medium dark:text-blue-400' : 'text-gray-700 dark:text-gray-200 hover:dark:bg-slate-800'
                              }`}
                            >
                              <span>{lang.region}</span>
                              {selectedLang === lang.code && (
                                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              {/* 继续按钮 */}
              <button
                onClick={handleContinue}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 transition-all shadow-sm hover:shadow-md w-full sm:w-auto text-center"
              >
                {i18n.language === 'zh' ? '继续' : i18n.language === 'en' ? 'Continue' : i18n.language === 'ru' ? 'Продолжить' : 'Fortfahren'}
              </button>

              {/* 关闭按钮 */}
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/50 dark:hover:bg-slate-800/70 rounded-lg transition-colors self-end sm:self-auto"
                aria-label="关闭"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default LanguageBanner
