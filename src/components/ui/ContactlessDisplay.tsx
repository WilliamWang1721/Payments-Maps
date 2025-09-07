import React from 'react'
import { Check, X, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThreeStateValue } from './ThreeStateSelector'

interface ContactlessDisplayProps {
  supports_contactless?: boolean | ThreeStateValue
  supports_apple_pay?: boolean | ThreeStateValue  
  supports_google_pay?: boolean | ThreeStateValue
  supports_hce_simulation?: boolean | ThreeStateValue
  className?: string
}

const ContactlessDisplay: React.FC<ContactlessDisplayProps> = ({
  supports_contactless,
  supports_apple_pay,
  supports_google_pay,
  supports_hce_simulation,
  className = ''
}) => {
  // 转换boolean值到ThreeStateValue以兼容旧数据
  const convertToState = (value: boolean | ThreeStateValue | undefined): ThreeStateValue => {
    if (typeof value === 'boolean') {
      return value ? 'supported' : 'unsupported'
    }
    return value || 'unknown'
  }

  const getStateBadge = (state: ThreeStateValue, label: string) => {
    let bgColor: string
    let textColor: string
    let icon: React.ReactNode
    let statusText: string

    switch (state) {
      case 'supported':
        bgColor = 'bg-emerald-600'
        textColor = 'text-white'
        icon = <Check className="w-3 h-3" />
        statusText = '支持'
        break
      case 'unsupported':
        bgColor = 'bg-red-500'
        textColor = 'text-white'
        icon = <X className="w-3 h-3" />
        statusText = '不支持'
        break
      case 'unknown':
      default:
        bgColor = 'bg-gray-500'
        textColor = 'text-white'
        icon = <HelpCircle className="w-3 h-3" />
        statusText = '未知'
        break
    }

    return (
      <div className={`${bgColor} ${textColor} px-2 py-1 rounded text-xs font-medium flex items-center gap-1 min-w-0`}>
        {icon}
        <span className="truncate">{label}</span>
      </div>
    )
  }

  const contactlessState = convertToState(supports_contactless)
  const applePayState = convertToState(supports_apple_pay)
  const googlePayState = convertToState(supports_google_pay)
  const hceState = convertToState(supports_hce_simulation)

  const features = [
    { label: 'NFC卡', state: contactlessState },
    { label: 'Apple Pay', state: applePayState },
    { label: 'Google Pay', state: googlePayState },
    { label: 'HCE模拟', state: hceState }
  ]

  // 检查是否有任何已知状态
  const hasKnownStates = features.some(f => f.state !== 'unknown')

  return (
    <div className={cn('space-y-2', className)}>
      {hasKnownStates ? (
        <div className="flex flex-wrap gap-2">
          {features.map((feature, index) => (
            <div key={index}>
              {getStateBadge(feature.state, feature.label)}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-100 px-3 py-2 rounded text-sm text-gray-600 text-center">
          Contactless支持情况待勘察
        </div>
      )}
    </div>
  )
}

export default ContactlessDisplay