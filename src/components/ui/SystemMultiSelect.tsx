import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CARD_NETWORKS, CardNetwork, getCardNetworkLabel } from '@/lib/cardNetworks'
import { DropdownOption } from '@/constants/systemDropdownData'

interface SystemMultiSelectProps {
  // 对于卡组织选择，使用预设的CARD_NETWORKS
  useCardNetworks?: boolean
  // 或者自定义选项
  options?: DropdownOption[]
  
  // 基础属性
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
  
  // 增强功能
  showDescription?: boolean
  maxSelections?: number
  allowSelectAll?: boolean
  required?: boolean
}

const SystemMultiSelect: React.FC<SystemMultiSelectProps> = ({
  useCardNetworks = false,
  options: customOptions,
  value,
  onChange,
  placeholder = '请选择...',
  label,
  className = '',
  disabled = false,
  showDescription = false,
  maxSelections,
  allowSelectAll = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 获取选项数据
  const options = customOptions || (useCardNetworks ? 
    CARD_NETWORKS.map(network => ({
      value: network.value,
      label: getCardNetworkLabel(network.value as CardNetwork),
      description: `${network.label} 卡组织`
    })) : [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleToggleOption = (optionValue: string) => {
    if (disabled) return
    
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue]
    
    // 检查最大选择数限制
    if (maxSelections && newValue.length > maxSelections) {
      return
    }
    
    onChange(newValue)
  }

  const handleRemoveOption = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    
    const newValue = value.filter(v => v !== optionValue)
    onChange(newValue)
  }

  const handleSelectAll = () => {
    if (disabled) return
    
    if (value.length === options.length) {
      // 如果全选了，则取消全选
      onChange([])
    } else {
      // 否则全选
      const allValues = options.map(opt => opt.value)
      onChange(maxSelections ? allValues.slice(0, maxSelections) : allValues)
    }
  }

  const selectedOptions = options.filter(option => value.includes(option.value))
  const isAllSelected = value.length === options.length && options.length > 0
  const canSelectMore = !maxSelections || value.length < maxSelections

  return (
    <div className={cn('space-y-2', className)} ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
          {maxSelections && (
            <span className="text-xs text-gray-500 ml-2">
              最多选择 {maxSelections} 项 ({value.length}/{maxSelections})
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <div
          className={cn(
            'w-full min-h-[44px] px-4 py-2 border rounded-lg transition-all duration-200 cursor-pointer',
            'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-50 disabled:cursor-not-allowed',
            'touch-manipulation webkit-tap-highlight-none',
            disabled 
              ? 'bg-gray-50 border-gray-200'
              : isOpen 
                ? 'border-blue-500 ring-2 ring-blue-500'
                : 'border-gray-300 hover:border-gray-400',
            'bg-white'
          )}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          style={{
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 flex flex-wrap gap-1">
              {selectedOptions.length === 0 ? (
                <span className="text-gray-500 text-sm">{placeholder}</span>
              ) : (
                selectedOptions.map(option => (
                  <span
                    key={option.value}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {option.label}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveOption(option.value, e)}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
            <ChevronDown
              className={cn(
                'w-5 h-5 transition-transform',
                isOpen ? 'transform rotate-180' : '',
                disabled ? 'text-gray-400' : 'text-gray-500'
              )}
            />
          </div>
        </div>

        {isOpen && !disabled && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {allowSelectAll && options.length > 1 && (
              <div
                className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 cursor-pointer border-b border-gray-200 font-medium"
                onClick={handleSelectAll}
              >
                {isAllSelected ? '取消全选' : '全选'}
              </div>
            )}
            
            {options.map(option => {
              const isSelected = value.includes(option.value)
              const canSelect = canSelectMore || isSelected
              
              return (
                <div
                  key={option.value}
                  className={cn(
                    'px-4 py-3 text-sm cursor-pointer transition-colors',
                    canSelect
                      ? 'hover:bg-gray-50'
                      : 'opacity-50 cursor-not-allowed',
                    isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  )}
                  onClick={() => canSelect && handleToggleOption(option.value)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{option.label}</div>
                      {showDescription && option.description && (
                        <div className="text-xs text-gray-500 mt-1">
                          {option.description}
                        </div>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                </div>
              )
            })}
            
            {options.length === 0 && (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                暂无选项
              </div>
            )}
          </div>
        )}
      </div>

      {/* 系统数据来源标识 */}
      {useCardNetworks && (
        <div className="text-xs text-gray-400 flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5"></span>
          标准卡组织数据
        </div>
      )}
    </div>
  )
}

export default SystemMultiSelect