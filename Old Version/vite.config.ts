import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React相关库
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/react-router')) {
            return 'react-vendor'
          }
          
          // 动画库
          if (id.includes('node_modules/framer-motion')) {
            return 'animation-vendor'
          }
          
          // Supabase相关
          if (id.includes('node_modules/@supabase')) {
            return 'supabase-vendor'
          }
          
          // UI组件库
          if (id.includes('node_modules/lucide-react') || 
              id.includes('node_modules/sonner') ||
              id.includes('node_modules/react-icons')) {
            return 'ui-vendor'
          }
          
          // 状态管理
          if (id.includes('node_modules/zustand')) {
            return 'state-vendor'
          }
          
          // i18n相关
          if (id.includes('node_modules/i18next') || 
              id.includes('node_modules/react-i18next')) {
            return 'i18n-vendor'
          }
          
          // PDF和图像处理
          if (id.includes('node_modules/jspdf') || 
              id.includes('node_modules/html2canvas')) {
            return 'pdf-vendor'
          }
          
          // 工具库
          if (id.includes('node_modules/clsx') || 
              id.includes('node_modules/tailwind-merge')) {
            return 'utils-vendor'
          }
          
          // 大型页面组件单独分割
          if (id.includes('/pages/POSDetail')) {
            return 'pos-detail'
          }
          
          // 地图相关组件
          if (id.includes('/pages/Map') || 
              id.includes('/lib/amap') ||
              id.includes('amap')) {
            return 'map-vendor'
          }
          
          // 列表页面
          if (id.includes('/pages/List')) {
            return 'list-page'
          }
          
          // 其他页面组件
          if (id.includes('/pages/') && 
              !id.includes('/pages/POSDetail') && 
              !id.includes('/pages/Map') &&
              !id.includes('/pages/List')) {
            return 'pages-vendor'
          }
        }
      }
    },
    // 提高代码块大小警告阈值，因为现在有更好的分割
    chunkSizeWarningLimit: 800
  }
})
