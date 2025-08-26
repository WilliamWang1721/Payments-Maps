import { motion } from 'framer-motion'
import { InputHTMLAttributes, forwardRef, useState } from 'react'
import { COMPONENT_ANIMATIONS } from '@/utils/animations'
import { cn } from '@/lib/utils'

interface AnimatedInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>((
  { label, error, helperText, className, onFocus, onBlur, ...props },
  ref
) => {
  const [isFocused, setIsFocused] = useState(false)
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    onFocus?.(e)
  }
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    onBlur?.(e)
  }
  
  const inputClasses = cn(
    'w-full px-3 py-2 border rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'min-h-[44px] touch-manipulation webkit-tap-highlight-none',
    'webkit-appearance-none',
    error
      ? 'border-red-300 focus:ring-red-500'
      : 'border-gray-300 hover:border-gray-400',
    className
  )
  
  return (
    <motion.div
      className="space-y-1 input-focus-animation safari-animation-optimize"
      initial={COMPONENT_ANIMATIONS.input.initial}
      animate={COMPONENT_ANIMATIONS.input.animate}
      transition={COMPONENT_ANIMATIONS.input.transition}
    >
      {label && (
        <motion.label
          className={cn(
            'block text-sm font-medium transition-colors duration-200',
            error ? 'text-red-700' : isFocused ? 'text-blue-700' : 'text-gray-700'
          )}
          animate={{
            color: error ? '#b91c1c' : isFocused ? '#1d4ed8' : '#374151'
          }}
          transition={{ duration: 0.2 }}
        >
          {label}
        </motion.label>
      )}
      
      <motion.div
        whileFocus={COMPONENT_ANIMATIONS.input.focus}
        transition={{ duration: 0.2 }}
      >
        <input
          ref={ref}
          className={inputClasses}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            WebkitAppearance: 'none',
            WebkitTapHighlightColor: 'transparent',
            touchAction: 'manipulation',
            fontSize: '16px' // 防止iOS Safari缩放
          }}
          {...props}
        />
      </motion.div>
      
      {(error || helperText) && (
        <motion.p
          className={cn(
            'text-sm',
            error ? 'text-red-600' : 'text-gray-500'
          )}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {error || helperText}
        </motion.p>
      )}
    </motion.div>
  )
})

AnimatedInput.displayName = 'AnimatedInput'

export default AnimatedInput