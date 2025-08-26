import { AnimatedLoading } from '@/components/AnimatedLoading'

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton'
}

const Loading = ({ size = 'md', className, text, variant = 'spinner' }: LoadingProps) => {
  return (
    <AnimatedLoading
      size={size}
      text={text}
      className={className}
      variant={variant}
    />
  )
}

export default Loading