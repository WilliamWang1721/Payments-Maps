import { motion, AnimatePresence } from 'framer-motion'
import { useLocation } from 'react-router-dom'
import { ReactNode } from 'react'
import { PAGE_TRANSITIONS } from '@/utils/animations'

interface PageTransitionProps {
  children: ReactNode
  variant?: 'fadeIn' | 'slideLeft' | 'slideUp'
}

const PageTransition = ({ children, variant = 'fadeIn' }: PageTransitionProps) => {
  const location = useLocation()
  const animation = PAGE_TRANSITIONS[variant]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={animation.initial}
        animate={animation.animate}
        exit={animation.exit}
        transition={animation.transition}
        className="w-full h-full page-transition safari-animation-optimize"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

export default PageTransition