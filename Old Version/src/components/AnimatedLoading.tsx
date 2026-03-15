import React from 'react'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

interface AnimatedLoadingProps {
  size?: 'sm' | 'md' | 'lg'
  text?: string
  className?: string
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton'
}

export const AnimatedLoading: React.FC<AnimatedLoadingProps> = ({
  size = 'md',
  text,
  className = '',
  variant = 'spinner'
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  if (variant === 'spinner') {
    return (
      <div className={`flex items-center justify-center space-x-2 loading-animation safari-animation-optimize ${className}`}>
        <motion.div
          className="rotate-animation"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }}
        >
          <Loader2 className={`${sizeClasses[size]} text-blue-500`} />
        </motion.div>
        {text && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`${textSizeClasses[size]} text-gray-600`}
          >
            {text}
          </motion.span>
        )}
      </div>
    )
  }

  if (variant === 'dots') {
    return (
      <div className={`flex items-center justify-center space-x-1 loading-animation safari-animation-optimize ${className}`}>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} bg-blue-500 rounded-full scale-animation`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: index * 0.2
            }}
          />
        ))}
        {text && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={`ml-2 ${textSizeClasses[size]} text-gray-600`}
          >
            {text}
          </motion.span>
        )}
      </div>
    )
  }

  if (variant === 'pulse') {
    return (
      <div className={`flex items-center justify-center loading-animation safari-animation-optimize ${className}`}>
        <motion.div
          className={`${sizeClasses[size]} bg-blue-500 rounded-full scale-animation`}
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />
        {text && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`ml-2 ${textSizeClasses[size]} text-gray-600`}
          >
            {text}
          </motion.span>
        )}
      </div>
    )
  }

  if (variant === 'skeleton') {
    return (
      <div className={`space-y-3 skeleton-animation safari-animation-optimize ${className}`}>
        {[1, 2, 3].map((index) => (
          <motion.div
            key={index}
            className="h-4 bg-gray-200 rounded opacity-animation"
            style={{ width: `${100 - index * 10}%` }}
            animate={{
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.2
            }}
          />
        ))}
      </div>
    )
  }

  return null
}

// 骨架屏组件
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg skeleton-animation safari-animation-optimize ${className}`}>
      <div className="space-y-3">
        <motion.div
          className="h-4 bg-gray-200 rounded w-3/4 opacity-animation"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.div
          className="h-3 bg-gray-200 rounded w-1/2 opacity-animation"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="h-3 bg-gray-200 rounded w-2/3 opacity-animation"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </div>
  )
}

// 进度条组件
export const AnimatedProgressBar: React.FC<{
  progress: number
  className?: string
  showPercentage?: boolean
}> = ({ progress, className = '', showPercentage = false }) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className="bg-blue-500 h-2 rounded-full slide-animation safari-animation-optimize"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      {showPercentage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600 mt-1 text-center"
        >
          {progress}%
        </motion.div>
      )}
    </div>
  )
}