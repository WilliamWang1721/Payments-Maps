import React from 'react'
import { MapPin, Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BilingualAddressProps {
  address: string
  addressEn?: string
  addressPinyin?: string
  className?: string
  showPinyin?: boolean
}

const BilingualAddress: React.FC<BilingualAddressProps> = ({
  address,
  addressEn,
  addressPinyin,
  className = '',
  showPinyin = false
}) => {
  const { i18n } = useTranslation()
  const currentLang = i18n.language

  // Determine which address to show based on language preference
  const primaryAddress = currentLang === 'zh' ? address : (addressEn || address)
  const secondaryAddress = currentLang === 'zh' ? addressEn : address

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Primary address */}
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {primaryAddress}
          </p>
        </div>
      </div>

      {/* Secondary address (if available and different) */}
      {secondaryAddress && secondaryAddress !== primaryAddress && (
        <div className="flex items-start gap-2 pl-6">
          <Globe className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600">
            {secondaryAddress}
          </p>
        </div>
      )}

      {/* Pinyin (if available and requested) */}
      {showPinyin && addressPinyin && (
        <div className="pl-6">
          <p className="text-xs text-gray-500 italic">
            {addressPinyin}
          </p>
        </div>
      )}
    </div>
  )
}

export default BilingualAddress