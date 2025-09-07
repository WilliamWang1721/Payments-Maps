import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDropdownOptions, DropdownOption } from '@/constants/systemDropdownData'

interface SystemSelectProps {
  // 系统数据类型
  dataType?: 'acquiring_institution' | 'device_status' | 'currency' | 'acquiring_modes' | 'pos_models' | 'transaction_types' | 'checkout_locations' | 'platforms'
  // 或者自定义选项
  options?: DropdownOption[]
  
  // 基础属性
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
  error?: string
  
  // 增强功能
  showDescription?: boolean
  allowCustom?: boolean
  customPlaceholder?: string
  required?: boolean
}

const SystemSelect: React.FC<SystemSelectProps> = ({
  dataType,
  options: customOptions,
  value,
  onChange,
  placeholder = '请选择...',
  label,
  disabled = false,
  className,
  error,
  showDescription = false,
  allowCustom = false,
  customPlaceholder = '自定义...',
  required = false
}) => {
  // 获取选项数据
  const options = customOptions || (dataType ? getDropdownOptions(dataType) : [])
  
  // 获取当前选项的描述
  const selectedOption = options.find(opt => opt.value === value)
  const hasDescription = showDescription && selectedOption?.description

  // 处理自定义输入
  const [isCustomInput, setIsCustomInput] = React.useState(false)
  const [customValue, setCustomValue] = React.useState('')

  React.useEffect(() => {
    // 如果当前值不在选项中，且允许自定义，则显示自定义输入
    if (allowCustom && value && !options.find(opt => opt.value === value)) {
      setIsCustomInput(true)
      setCustomValue(value)
    }
  }, [value, options, allowCustom])

  const handleSelectChange = (newValue: string) => {
    if (newValue === '__CUSTOM__') {
      setIsCustomInput(true)
      setCustomValue('')
    } else {
      setIsCustomInput(false)
      onChange(newValue)
    }
  }

  const handleCustomInputChange = (newValue: string) => {
    setCustomValue(newValue)
    onChange(newValue)
  }

  const handleCustomInputBlur = () => {
    if (!customValue.trim()) {
      setIsCustomInput(false)
      onChange('')
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {isCustomInput ? (
        // 自定义输入框
        <div className="relative">
          <input
            type="text"
            value={customValue}
            onChange={(e) => handleCustomInputChange(e.target.value)}
            onBlur={handleCustomInputBlur}
            placeholder={customPlaceholder}
            className={cn(
              'w-full px-4 py-3 border rounded-lg transition-all duration-200',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              'min-h-[44px] touch-manipulation webkit-tap-highlight-none',
              error
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 hover:border-gray-400',
              'bg-white text-gray-900'
            )}
            disabled={disabled}
            autoFocus
          />
          <button
            type="button"
            onClick={() => {
              setIsCustomInput(false)
              setCustomValue('')
              onChange('')
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <span className="text-xs">返回选择</span>
          </button>
        </div>
      ) : (
        // 标准下拉选择
        <div className="relative">
          <select
            value={value}
            onChange={(e) => handleSelectChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'w-full appearance-none px-4 py-3 pr-10 border rounded-lg transition-all duration-200',
              'focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
              'min-h-[44px] touch-manipulation webkit-tap-highlight-none',
              'webkit-appearance-none moz-appearance-none',
              error
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 hover:border-gray-400',
              'bg-white text-gray-900'
            )}
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation',
              fontSize: '16px' // 防止iOS Safari缩放
            }}
            required={required}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                title={option.description}
              >
                {option.label}
              </option>
            ))}
            {allowCustom && (
              <option value="__CUSTOM__" className="text-blue-600">
                + 自定义输入
              </option>
            )}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown
              className={cn(
                'w-5 h-5 transition-colors',
                disabled ? 'text-gray-400' : 'text-gray-500'
              )}
            />
          </div>
        </div>
      )}

      {/* 显示选项描述 */}
      {hasDescription && !isCustomInput && (
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded px-3 py-2">
          <span className="font-medium">说明：</span>{selectedOption.description}
        </div>
      )}

      {/* 错误信息 */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* 系统数据来源标识 */}
      {dataType && (
        <div className="text-xs text-gray-400 flex items-center">
          <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5"></span>
          系统标准数据
        </div>
      )}
    </div>
  )
}

export default SystemSelect