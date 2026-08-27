import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // فصل المكتبات الثقيلة: xlsx وحدها ~430KB وتُستخدم في
        // الاستيراد والتصدير فقط، فلا داعي لتحميلها مع صفحة الدخول
        manualChunks: {
          vendor: ['react', 'react-dom'],
          spreadsheet: ['xlsx', 'file-saver'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
