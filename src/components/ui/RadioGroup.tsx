import React from 'react'
import { cn } from '@/lib/utils'

interface RadioOption {
  value: string | boolean | null
  label: string
  description?: string
}

interface RadioGroupProps {
  name: string
  value: string | boolean | null | undefined
  onChange: (value: string | boolean | null) => void
  options: RadioOption[]
  label?: string
  className?: string
  disabled?: boolean
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  label,
  className,
  disabled = false
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-3">
        {options.map((option, index) => {
          const isSelected = value === option.value
          return (
            <label
              key={index}
              className={cn(
                'relative flex items-center cursor-pointer group',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              <input
                type="radio"
                name={name}
                value={String(option.value)}
                checked={isSelected}
                onChange={() => !disabled && onChange(option.value)}
                disabled={disabled}
                className="sr-only"
              />
              <div
                className={cn(
                  'flex items-center space-x-2 px-4 py-2.5 rounded-lg border-2 transition-all duration-200',
                  'hover:shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
                  disabled && 'hover:border-gray-200 hover:shadow-none'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                    isSelected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 bg-white group-hover:border-gray-400'
                  )}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  {option.description && (
                    <span className="text-xs text-gray-500 mt-0.5">
                      {option.description}
                    </span>
                  )}
                </div>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export default RadioGroup