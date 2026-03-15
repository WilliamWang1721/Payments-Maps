import React from 'react'
import { motion } from 'framer-motion'

interface AnimatedListItemProps {
  children: React.ReactNode
  index?: number
  className?: string
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  onClick?: () => void
}

export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  children,
  index = 0,
  className = '',
  delay = 0,
  direction = 'up',
  onClick
}) => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: 20, opacity: 0 }
      case 'down':
        return { y: -20, opacity: 0 }
      case 'left':
        return { x: -20, opacity: 0 }
      case 'right':
        return { x: 20, opacity: 0 }
      default:
        return { y: 20, opacity: 0 }
    }
  }

  const getFinalPosition = () => {
    return { x: 0, y: 0, opacity: 1 }
  }

  return (
    <motion.div
      initial={getInitialPosition()}
      animate={getFinalPosition()}
      exit={getInitialPosition()}
      transition={{
        duration: 0.4,
        delay: delay + (index * 0.05),
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{
        scale: 1.02,
        transition: { duration: 0.2 }
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 }
      }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

export default AnimatedListItem