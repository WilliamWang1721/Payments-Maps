import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Match the production Vercel function so local development can use the same AMap entry.
      "/api/amap/js": {
        target: "https://webapi.amap.com",
        changeOrigin: true,
        rewrite: () => "/maps"
      }
    }
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
