import React from 'react'
import { useTranslation } from 'react-i18next'
import { CreditCard, Wifi, Shield, DollarSign, AlertCircle } from 'lucide-react'

interface PaymentFeaturesDisplayProps {
  supportsContactless?: boolean
  supports3DSecure?: boolean
  supportsDCC?: boolean
  requiresChipPin?: boolean
  requiresSignature?: boolean
  minAmountNoPin?: number
  foreignCardFee?: number
  className?: string
}

const PaymentFeaturesDisplay: React.FC<PaymentFeaturesDisplayProps> = ({
  supportsContactless,
  supports3DSecure,
  supportsDCC,
  requiresChipPin,
  requiresSignature,
  minAmountNoPin,
  foreignCardFee,
  className = ''
}) => {
  const { t } = useTranslation()

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Contactless/NFC Payment */}
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${supportsContactless ? 'bg-green-100' : 'bg-gray-100'}`}>
          <Wifi className={`w-5 h-5 ${supportsContactless ? 'text-green-600' : 'text-gray-400'}`} />
        </div>
        <div className="flex-1">
          <p className={`text-sm font-medium ${supportsContactless ? 'text-green-700' : 'text-gray-500'}`}>
            {supportsContactless ? t('pos.contactless_supported') : t('pos.contactless_not_supported')}
          </p>
          {supportsContactless && minAmountNoPin && (
            <p className="text-xs text-gray-600 mt-1">
              {t('pos.no_pin_limit')}: ¥{minAmountNoPin}
            </p>
          )}
        </div>
      </div>

      {/* 3D Secure */}
      {supports3DSecure !== undefined && (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${supports3DSecure ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Shield className={`w-5 h-5 ${supports3DSecure ? 'text-blue-600' : 'text-gray-400'}`} />
          </div>
          <p className={`text-sm font-medium ${supports3DSecure ? 'text-blue-700' : 'text-gray-500'}`}>
            {supports3DSecure ? t('pos.3d_secure_enabled') : t('pos.3d_secure_disabled')}
          </p>
        </div>
      )}

      {/* DCC (Dynamic Currency Conversion) */}
      {supportsDCC !== undefined && (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${supportsDCC ? 'bg-yellow-100' : 'bg-gray-100'}`}>
            <DollarSign className={`w-5 h-5 ${supportsDCC ? 'text-yellow-600' : 'text-gray-400'}`} />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${supportsDCC ? 'text-yellow-700' : 'text-gray-500'}`}>
              {supportsDCC ? t('pos.dcc_available') : t('pos.dcc_not_available')}
            </p>
            {supportsDCC && (
              <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {t('pos.currency_conversion_fee')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Chip & PIN Requirement */}
      {requiresChipPin && (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-blue-700">
            {t('pos.chip_pin')}
          </p>
        </div>
      )}

      {/* Signature Requirement */}
      {requiresSignature && (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100">
            <CreditCard className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-sm font-medium text-purple-700">
            {t('pos.signature')}
          </p>
        </div>
      )}

      {/* Foreign Card Fee */}
      {foreignCardFee !== undefined && foreignCardFee > 0 && (
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700">
              {t('pos.foreign_card_fee')}: {foreignCardFee}%
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentFeaturesDisplay