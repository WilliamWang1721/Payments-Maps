import React from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { motion } from 'framer-motion'
import { getLanguageDisplayName, supportedLanguages } from '@/lib/i18n'
import { useLocaleStore } from '@/stores/useLocaleStore'

interface LanguageSwitcherProps {
  className?: string
  showLabel?: boolean
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  showLabel = true,
}) => {
  const { t } = useTranslation()
  const { language, setPreference, experience } = useLocaleStore()

  const languages = [
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
  ]

  const handleLanguageChange = (languageCode: string) => {
    const mode = languageCode === 'zh' ? 'domestic' : 'international'
    setPreference(languageCode, mode)
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        {showLabel && (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-gray-600" />
            <span className="text-sm text-gray-600">{t('common.language')}</span>
          </div>
        )}
        
        <div className="flex gap-1">
          {languages
            .filter((item) => Object.keys(supportedLanguages).includes(item.code))
            .map((languageOption) => {
              const isActive = language === languageOption.code

              return (
                <motion.button
                  key={languageOption.code}
                  onClick={() => handleLanguageChange(languageOption.code)}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${
                      isActive
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={false}
                  animate={{
                    backgroundColor: isActive ? '#3b82f6' : '#f3f4f6',
                    color: isActive ? '#ffffff' : '#374151',
                  }}
                >
                  <div className="flex items-center gap-1">
                    <span>{languageOption.flag}</span>
                    <span>{languageOption.code.toUpperCase()}</span>
                  </div>
                </motion.button>
              )
            })}
        </div>
      </div>

      {/* 当前语言显示 */}
      <div className="mt-2 text-xs text-gray-500">
        {t('common.currentLanguage')}: {getLanguageDisplayName(language)}
      </div>

      <div className="mt-1 text-xs font-medium text-blue-500">
        {experience === 'domestic'
          ? t('experience.badge.domestic')
          : t('experience.badge.international')}
      </div>
    </div>
  )
}

export default LanguageSwitcher