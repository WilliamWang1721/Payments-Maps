import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AnimatedPopoverProps {
  isOpen: boolean
  onClose?: () => void
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  className?: string
}

const AnimatedPopover: React.FC<AnimatedPopoverProps> = ({
  isOpen,
  onClose,
  children,
  position = 'bottom',
  className = ''
}) => {
  const popoverVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
      y: position === 'top' ? 10 : position === 'bottom' ? -10 : 0,
      x: position === 'left' ? 10 : position === 'right' ? -10 : 0
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
      transition: {
        type: 'spring' as const,
        damping: 20,
        stiffness: 300,
        duration: 0.2
      }
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      y: position === 'top' ? 10 : position === 'bottom' ? -10 : 0,
      x: position === 'left' ? 10 : position === 'right' ? -10 : 0,
      transition: {
        type: 'tween' as const,
        duration: 0.15
      }
    }
  }

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2'
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          {onClose && (
            <motion.div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          )}
          
          {/* Popover */}
          <motion.div
            className={`absolute z-50 ${positionClasses[position]} ${className}`}
            variants={popoverVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
              {/* Arrow */}
              <div className={`absolute w-3 h-3 bg-white border transform rotate-45 ${
                position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-b-0 border-r-0' :
                position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-t-0 border-l-0' :
                position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-b-0 border-l-0' :
                'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-t-0 border-r-0'
              }`} />
              
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default AnimatedPopover