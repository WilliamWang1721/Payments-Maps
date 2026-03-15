/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      // Safari 和移动端优化
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'touch': '44px', // iOS 推荐的最小触摸区域
      },
      minWidth: {
        'touch': '44px',
      },
      screens: {
        'xs': '375px', // iPhone SE
        'iphone': '390px', // iPhone 12/13/14
        'iphone-plus': '414px', // iPhone Plus
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: '#F4F7FE',
        'cream-dark': '#E9EDF7',
        'dark-card': '#111C44',
        'beige-card': '#FFFFFF',
        'accent-yellow': '#4318FF',
        'accent-salmon': '#05CD99',
        'accent-purple': '#7551FF',
        'soft-black': '#1B2559',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(17, 28, 68, 0.05)',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fadeIn 1s ease-out forwards',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-left': 'slideInLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'spin-slow': 'spin 6s linear infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [
    // 添加 Safari 兼容性插件
    function({ addUtilities }) {
      const newUtilities = {
        '.touch-manipulation': {
          'touch-action': 'manipulation',
        },
        '.webkit-appearance-none': {
          '-webkit-appearance': 'none',
        },
        '.webkit-tap-highlight-none': {
          '-webkit-tap-highlight-color': 'transparent',
        },
        '.webkit-overflow-scrolling': {
          '-webkit-overflow-scrolling': 'touch',
        },
        '.safe-area-padding': {
          'padding-top': 'env(safe-area-inset-top)',
          'padding-right': 'env(safe-area-inset-right)',
          'padding-bottom': 'env(safe-area-inset-bottom)',
          'padding-left': 'env(safe-area-inset-left)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
};
