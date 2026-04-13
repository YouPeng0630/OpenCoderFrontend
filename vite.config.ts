import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    host: true,  // 监听所有地址，禁用 host 检查
    port: 5174,
    strictPort: true,
  },
  server: {
    host: true,  // 监听所有地址
    port: 5173,
  },
})