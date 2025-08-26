import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AnimatedSearchResultsProps {
  children: React.ReactNode
  isVisible: boolean
  className?: string
}

export const AnimatedSearchResults: React.FC<AnimatedSearchResultsProps> = ({
  children,
  isVisible,
  className = ''
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{
            opacity: 0,
            y: -10,
            scale: 0.95
          }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1
          }}
          exit={{
            opacity: 0,
            y: -10,
            scale: 0.95
          }}
          transition={{
            duration: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94]
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface AnimatedSearchItemProps {
  children: React.ReactNode
  index: number
  onClick?: () => void
  className?: string
}

export const AnimatedSearchItem: React.FC<AnimatedSearchItemProps> = ({
  children,
  index,
  onClick,
  className = ''
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        x: -20
      }}
      animate={{
        opacity: 1,
        x: 0
      }}
      exit={{
        opacity: 0,
        x: -20
      }}
      transition={{
        duration: 0.3,
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        x: 4,
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

export default AnimatedSearchResults