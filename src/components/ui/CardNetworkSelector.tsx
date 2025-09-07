import React from 'react'
import { Check, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARD_NETWORKS, CardNetwork, getCardNetworkLabel } from '@/lib/cardNetworks'

interface CardNetworkSelectorProps {
  value: string[]
  onChange: (value: string[]) => void
  label?: string
  className?: string
  disabled?: boolean
  required?: boolean
  maxSelections?: number
  allowSelectAll?: boolean
  description?: string
}

const CardNetworkSelector: React.FC<CardNetworkSelectorProps> = ({
  value,
  onChange,
  label,
  className = '',
  disabled = false,
  required = false,
  maxSelections,
  allowSelectAll = true,
  description
}) => {
  const handleToggleNetwork = (networkValue: string) => {
    if (disabled) return
    
    const isSelected = value.includes(networkValue)
    let newValue: string[]
    
    if (isSelected) {
      newValue = value.filter(v => v !== networkValue)
    } else {
      if (maxSelections && value.length >= maxSelections) {
        return
      }
      newValue = [...value, networkValue]
    }
    
    onChange(newValue)
  }

  const handleSelectAll = () => {
    if (disabled) return
    
    if (value.length === CARD_NETWORKS.length) {
      onChange([])
    } else {
      const allValues = CARD_NETWORKS.map(network => network.value)
      onChange(maxSelections ? allValues.slice(0, maxSelections) : allValues)
    }
  }

  const isAllSelected = value.length === CARD_NETWORKS.length && CARD_NETWORKS.length > 0
  const canSelectMore = !maxSelections || value.length < maxSelections

  return (
    <div className={cn('space-y-3', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
            {maxSelections && (
              <span className="text-xs text-gray-500 ml-2">
                ({value.length}/{maxSelections})
              </span>
            )}
          </label>
          {allowSelectAll && CARD_NETWORKS.length > 1 && (
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={disabled}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              {isAllSelected ? '取消全选' : '全选'}
            </button>
          )}
        </div>
      )}
      
      {description && (
        <p className="text-xs text-gray-500 mb-2">{description}</p>
      )}
      
      {/* 紧凑型标签选择器 */}
      <div className="flex flex-wrap gap-2">
        {CARD_NETWORKS.map(network => {
          const isSelected = value.includes(network.value)
          const canSelect = canSelectMore || isSelected
          
          return (
            <button
              key={network.value}
              type="button"
              onClick={() => canSelect && handleToggleNetwork(network.value)}
              disabled={disabled || !canSelect}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200',
                'border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                'flex items-center space-x-1',
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600'
                  : canSelect
                  ? 'bg-white text-gray-700 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                  : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span>{getCardNetworkLabel(network.value as CardNetwork)}</span>
              {isSelected && <Check className="w-3 h-3" />}
            </button>
          )
        })}
      </div>
      
      {/* 系统数据来源标识 */}
      <div className="text-xs text-gray-400 flex items-center mt-2">
        <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5"></span>
        标准卡组织数据
      </div>
    </div>
  )
}

export default CardNetworkSelector