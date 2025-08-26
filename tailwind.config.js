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
