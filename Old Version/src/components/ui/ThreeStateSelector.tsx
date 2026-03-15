import React from 'react'
import { Check, X, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ThreeStateValue = 'supported' | 'unsupported' | 'unknown'

interface ThreeStateSelectorProps {
  value: ThreeStateValue
  onChange: (value: ThreeStateValue) => void
  label: string
  className?: string
  disabled?: boolean
  description?: string
  icon?: React.ReactNode
}

const ThreeStateSelector: React.FC<ThreeStateSelectorProps> = ({
  value,
  onChange,
  label,
  className = '',
  disabled = false,
  description,
  icon
}) => {
  const states = [
    {
      value: 'supported' as ThreeStateValue,
      label: '支持',
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-500',
      textColor: 'text-green-700',
      icon: <Check className="w-4 h-4" />
    },
    {
      value: 'unsupported' as ThreeStateValue,
      label: '不支持',
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-700',
      icon: <X className="w-4 h-4" />
    },
    {
      value: 'unknown' as ThreeStateValue,
      label: '未知',
      color: 'gray',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-500',
      textColor: 'text-gray-700',
      icon: <HelpCircle className="w-4 h-4" />
    }
  ]

  return (
    <div className={cn('space-y-3', className)}>
      {/* 标题和图标 */}
      <div className="flex items-center space-x-2">
        {icon && <div className="text-gray-600">{icon}</div>}
        <h4 className="font-medium text-gray-900">{label}</h4>
      </div>

      {/* 描述 */}
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}

      {/* 三状态选择器 */}
      <div className="grid grid-cols-3 gap-2">
        {states.map(state => {
          const isSelected = value === state.value
          
          return (
            <button
              key={state.value}
              type="button"
              onClick={() => !disabled && onChange(state.value)}
              disabled={disabled}
              className={cn(
                'p-3 rounded-lg border-2 transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
                'flex flex-col items-center space-y-2 text-center',
                isSelected
                  ? `${state.borderColor} ${state.bgColor} ${state.textColor}`
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {/* 状态图标 */}
              <div className={cn(
                'flex items-center justify-center',
                isSelected ? state.textColor : 'text-gray-400'
              )}>
                {state.icon}
              </div>

              {/* 状态标签 */}
              <span className="text-sm font-medium">
                {state.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* 当前选择状态提示 */}
      <div className="text-xs text-gray-400 text-center">
        当前状态: {states.find(s => s.value === value)?.label || '未设置'}
      </div>
    </div>
  )
}

export default ThreeStateSelector