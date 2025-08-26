import React from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { motion } from 'framer-motion'
import { changeLanguage, getCurrentLanguage, getLanguageDisplayName } from '@/lib/i18n'

interface LanguageSwitcherProps {
  className?: string
  showLabel?: boolean
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ 
  className = '', 
  showLabel = true 
}) => {
  const { t } = useTranslation()
  const currentLanguage = getCurrentLanguage()
  
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
  ]

  const handleLanguageChange = (languageCode: string) => {
    changeLanguage(languageCode)
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
          {languages.map((language) => {
            const isActive = currentLanguage === language.code
            
            return (
              <motion.button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`
                  px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-blue-500 text-white shadow-md' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={false}
                animate={{
                  backgroundColor: isActive ? '#3b82f6' : '#f3f4f6',
                  color: isActive ? '#ffffff' : '#374151'
                }}
              >
                <div className="flex items-center gap-1">
                  <span>{language.flag}</span>
                  <span>{language.code.toUpperCase()}</span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
      
      {/* 当前语言显示 */}
      <div className="mt-2 text-xs text-gray-500">
        {t('common.currentLanguage')}: {getLanguageDisplayName(currentLanguage)}
      </div>
    </div>
  )
}

export default LanguageSwitcher