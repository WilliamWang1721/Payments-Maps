// 全局动画配置文件
// 定义统一的动画时长、缓动函数和过渡效果

// 动画时长配置
export const ANIMATION_DURATION = {
  // 快速动画 - 用于按钮点击、悬停等即时反馈
  fast: 150,
  // 标准动画 - 用于大部分UI交互
  normal: 300,
  // 慢速动画 - 用于页面切换、模态框等
  slow: 500,
  // 超慢动画 - 用于复杂的布局变化
  slower: 700
} as const;

// 缓动函数配置
export const EASING = {
  // 标准缓动
  ease: [0.4, 0, 0.2, 1] as const,
  // 进入缓动
  easeIn: [0.4, 0, 1, 1] as const,
  // 退出缓动
  easeOut: [0, 0, 0.2, 1] as const,
  // 进入退出缓动
  easeInOut: [0.4, 0, 0.2, 1] as const,
  // 弹性缓动
  bounce: [0.68, -0.55, 0.265, 1.55] as const,
  // 平滑缓动
  smooth: [0.25, 0.46, 0.45, 0.94] as const
} as const;

// 页面过渡动画配置
export const PAGE_TRANSITIONS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: ANIMATION_DURATION.normal / 1000,
      ease: EASING.easeInOut
    }
  },
  slideLeft: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
    transition: {
      duration: ANIMATION_DURATION.normal / 1000,
      ease: EASING.easeInOut
    }
  },
  slideUp: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-100%', opacity: 0 },
    transition: {
      duration: ANIMATION_DURATION.normal / 1000,
      ease: EASING.easeInOut
    }
  }
} as const;

// 组件动画配置
export const COMPONENT_ANIMATIONS = {
  // 按钮动画
  button: {
    hover: {
      scale: 1.02,
      transition: {
        duration: ANIMATION_DURATION.fast / 1000,
        ease: EASING.easeOut
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: ANIMATION_DURATION.fast / 1000,
        ease: EASING.easeIn
      }
    }
  },
  // 卡片动画
  card: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: ANIMATION_DURATION.normal / 1000,
      ease: EASING.easeOut
    },
    hover: {
      y: -4,
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
      transition: {
        duration: ANIMATION_DURATION.normal / 1000,
        ease: EASING.easeOut
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        duration: ANIMATION_DURATION.fast / 1000,
        ease: EASING.easeIn
      }
    }
  },
  // 输入框动画
  input: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: {
      duration: ANIMATION_DURATION.normal / 1000,
      ease: EASING.easeOut
    },
    focus: {
      scale: 1.02,
      borderColor: '#3b82f6',
      transition: {
        duration: ANIMATION_DURATION.normal / 1000,
        ease: EASING.easeOut
      }
    }
  }
} as const;

// 模态框动画配置
export const MODAL_ANIMATIONS = {
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: ANIMATION_DURATION.normal / 1000,
      ease: EASING.easeInOut
    }
  },
  modal: {
    initial: { scale: 0.9, opacity: 0, y: 20 },
    animate: { scale: 1, opacity: 1, y: 0 },
    exit: { scale: 0.9, opacity: 0, y: 20 },
    transition: {
      duration: ANIMATION_DURATION.normal / 1000,
      ease: EASING.bounce
    }
  },
  drawer: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
    transition: {
      duration: ANIMATION_DURATION.normal / 1000,
      ease: EASING.easeInOut
    }
  }
} as const;

// 列表动画配置
export const LIST_ANIMATIONS = {
  container: {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: {
      duration: ANIMATION_DURATION.normal / 1000,
      ease: EASING.easeOut
    }
  }
} as const;

// 加载动画配置
export const LOADING_ANIMATIONS = {
  spinner: {
    animate: {
      rotate: 360,
      transition: {
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  },
  pulse: {
    animate: {
      scale: [1, 1.05, 1],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: EASING.easeInOut
      }
    }
  },
  skeleton: {
    animate: {
      backgroundPosition: ['200% 0', '-200% 0'],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: 'linear'
      }
    }
  }
} as const;

// 导航动画配置
export const NAVIGATION_ANIMATIONS = {
  tab: {
    active: {
      scale: 1.05,
      color: '#3b82f6',
      transition: {
        duration: ANIMATION_DURATION.normal / 1000,
        ease: EASING.easeOut
      }
    },
    inactive: {
      scale: 1,
      color: '#6b7280',
      transition: {
        duration: ANIMATION_DURATION.normal / 1000,
        ease: EASING.easeOut
      }
    }
  },
  menu: {
    open: {
      height: 'auto',
      opacity: 1,
      transition: {
        duration: ANIMATION_DURATION.normal / 1000,
        ease: EASING.easeOut
      }
    },
    closed: {
      height: 0,
      opacity: 0,
      transition: {
        duration: ANIMATION_DURATION.normal / 1000,
        ease: EASING.easeIn
      }
    }
  }
} as const;

// CSS类名生成器
export const generateAnimationClass = (type: string, variant?: string) => {
  const baseClass = `animate-${type}`;
  return variant ? `${baseClass}-${variant}` : baseClass;
};

// 动画延迟生成器
export const generateStaggerDelay = (index: number, baseDelay = 100) => {
  return index * baseDelay;
};

// 响应式动画配置
export const getResponsiveAnimation = (isMobile: boolean) => {
  return {
    duration: isMobile ? ANIMATION_DURATION.fast : ANIMATION_DURATION.normal,
    scale: isMobile ? 0.99 : 0.98
  };
};