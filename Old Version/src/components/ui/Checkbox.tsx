import React from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const Checkbox: React.FC<CheckboxProps> = ({
  id,
  checked,
  onChange,
  label,
  description,
  disabled = false,
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }

  return (
    <label
      className={cn(
        'flex items-start space-x-3 cursor-pointer group',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <div className="flex items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div
          className={cn(
            sizeClasses[size],
            'rounded-md border-2 flex items-center justify-center transition-all duration-200',
            'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-50',
            checked
              ? 'border-blue-500 bg-blue-500 text-white'
              : 'border-gray-300 bg-white hover:border-gray-400',
            disabled && 'hover:border-gray-300'
          )}
        >
          {checked && (
            <Check className={cn(iconSizes[size], 'stroke-[3]')} />
          )}
        </div>
      </div>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
              {label}
            </span>
          )}
          {description && (
            <span className="text-xs text-gray-500 mt-0.5">
              {description}
            </span>
          )}
        </div>
      )}
    </label>
  )
}

export default Checkbox