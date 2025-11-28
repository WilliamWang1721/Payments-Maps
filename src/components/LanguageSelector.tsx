import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Globe, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supportedLanguages, changeLanguage } from '@/lib/i18n'

interface LanguageSelectorProps {
  onClose?: () => void
  isFirstVisit?: boolean
}

const LanguageSelector = ({ onClose, isFirstVisit = false }: LanguageSelectorProps) => {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState(i18n.language)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const handleLanguageChange = (lang: string) => {
    setSelectedLang(lang)
    changeLanguage(lang)
    setIsOpen(false)

    // 标记用户已选择语言
    if (isFirstVisit) {
      localStorage.setItem('hasSelectedLanguage', 'true')
      onClose?.()
    }
  }

  const handleSkip = () => {
    localStorage.setItem('hasSelectedLanguage', 'true')
    onClose?.()
  }

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Apple 风格的语言选项
  const languageOptions = Object.entries(supportedLanguages).map(([code, name]) => ({
    code,
    name,
    flag: code === 'zh' ? '🇨🇳' : code === 'en' ? '🇺🇸' : code === 'ru' ? '🇷🇺' : '🇩🇪'
  }))

  return (
    <>
      {/* 首次访问时的全屏语言选择 */}
      {isFirstVisit ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
            className="max-w-md w-full mx-auto px-6"
          >
            {/* Apple 风格的图标 */}
            <div className="mb-8 flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-3xl flex items-center justify-center"
              >
                <Globe className="w-12 h-12 text-white" />
              </motion.div>
            </div>

            {/* 标题 */}
            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-semibold text-center mb-3 text-gray-900 dark:text-white"
            >
              欢迎使用 Payments Maps
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-gray-600 dark:text-gray-300 mb-10"
            >
              请选择您的语言偏好
            </motion.p>

            {/* 语言选项列表 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-3"
            >
              {languageOptions.map((lang, index) => (
                <motion.button
                  key={lang.code}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`w-full px-6 py-4 rounded-2xl flex items-center justify-between transition-all ${
                    selectedLang === lang.code
                      ? 'bg-blue-50 border-2 border-blue-500 dark:bg-blue-500/10 dark:border-blue-400'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100 dark:bg-slate-900 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-lg font-medium text-gray-900 dark:text-gray-100">{lang.name}</span>
                  </div>
                  {selectedLang === lang.code && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <Check className="w-6 h-6 text-blue-500" />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </motion.div>

            {/* 继续按钮 */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-10 flex flex-col gap-3"
            >
              <button
                onClick={handleSkip}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-medium text-lg hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 transition-colors"
              >
                继续
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      ) : (
        /* 普通的语言选择器（导航栏中使用） */
        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl transition-all shadow-sm hover:shadow-md"
          >
            <Globe className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {supportedLanguages[selectedLang as keyof typeof supportedLanguages]}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          <AnimatePresence>
            {isOpen && (
              <>
                {/* 背景遮罩 - 提高可见性 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/10 dark:bg-black/50"
                  onClick={() => setIsOpen(false)}
                />

                {/* 下拉菜单 - 向上弹出 */}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute right-0 bottom-full mb-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50"
                >
                  <div className="p-2">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        选择语言 / Select Language
                      </p>
                    </div>
                    <div className="py-2 space-y-1">
                      {languageOptions.map((lang) => (
                        <motion.button
                          key={lang.code}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleLanguageChange(lang.code)}
                          className={`w-full px-4 py-3 rounded-xl flex items-center justify-between transition-all ${
                            selectedLang === lang.code
                              ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-500/10 dark:to-purple-500/10 border border-blue-200 dark:border-slate-700'
                              : 'hover:bg-gray-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{lang.flag}</span>
                            <span className={`text-sm font-medium ${
                              selectedLang === lang.code ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-200'
                            }`}>
                              {lang.name}
                            </span>
                          </div>
                          {selectedLang === lang.code && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500 }}
                            >
                              <div className="w-6 h-6 bg-blue-500 dark:bg-blue-400 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </motion.div>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </>
  )
}

export default LanguageSelector
