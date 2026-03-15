import { motion } from 'framer-motion'
import { ReactNode, HTMLAttributes } from 'react'
import { COMPONENT_ANIMATIONS } from '@/utils/animations'
import { cn } from '@/lib/utils'

interface AnimatedCardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration' | 'onDragStart' | 'onDrag' | 'onDragEnd'> {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'outlined'
  hoverable?: boolean
  clickable?: boolean
}

const AnimatedCard = ({
  children,
  variant = 'default',
  hoverable = true,
  clickable = false,
  className,
  ...props
}: AnimatedCardProps) => {
  const baseClasses = 'rounded-lg transition-all duration-200 card-hover-animation safari-animation-optimize'
  
  const variantClasses = {
    default: 'bg-white shadow-sm border border-gray-200',
    elevated: 'bg-white shadow-md',
    outlined: 'bg-white border-2 border-gray-200'
  }
  
  const hoverClasses = hoverable ? 'hover:shadow-lg' : ''
  const clickableClasses = clickable ? 'cursor-pointer' : ''
  
  return (
    <motion.div
      className={cn(
        baseClasses,
        variantClasses[variant],
        hoverClasses,
        clickableClasses,
        className
      )}
      whileHover={hoverable ? COMPONENT_ANIMATIONS.card.hover : undefined}
      whileTap={clickable ? COMPONENT_ANIMATIONS.card.tap : undefined}
      initial={COMPONENT_ANIMATIONS.card.initial}
      animate={COMPONENT_ANIMATIONS.card.animate}
      transition={COMPONENT_ANIMATIONS.card.transition}
      {...props}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedCard