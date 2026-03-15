import React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  label?: string
  disabled?: boolean
  className?: string
  error?: string
}


const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '请选择...',
  label,
  disabled = false,
  className,
  error
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
            >
              {option.label}
            </option>
          ))}
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
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

export default Select