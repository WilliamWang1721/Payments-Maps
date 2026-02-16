import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import AnimatedButton from './AnimatedButton'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface AnimatedSidebarProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  position?: 'left' | 'right'
  width?: string
  className?: string
}

const AnimatedSidebar: React.FC<AnimatedSidebarProps> = ({
  isOpen,
  onClose,
  title,
  children,
  position = 'right',
  width = 'w-80',
  className = ''
}) => {
  useBodyScrollLock(isOpen, { includeHtml: true })

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }

  const sidebarVariants = {
    hidden: {
      x: position === 'left' ? '-100%' : '100%',
      transition: {
        type: 'tween' as const,
        duration: 0.3
      }
    },
    visible: {
      x: 0,
      transition: {
        type: 'tween' as const,
        duration: 0.3
      }
    }
  }

  const sidebarContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          
          {/* Sidebar */}
          <motion.div
            className={`relative bg-white shadow-xl h-full ${width} ${position === 'left' ? 'order-first' : 'ml-auto'} ${className}`}
            variants={sidebarVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>
              )}
              <AnimatedButton
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
              >
                <X className="h-5 w-5 text-gray-500" />
              </AnimatedButton>
            </div>
            
            {/* Content */}
            <div className="p-6 h-full overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(sidebarContent, document.body)
}

export default AnimatedSidebar
