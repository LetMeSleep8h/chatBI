import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/agent/',
  plugins: [react()],
  server: {
    port: 5180,
    proxy: {
      // 开发环境代理到本地 FastAPI（生产由同一容器托管，无需代理）
      '/agent/api': {
        target: 'http://localhost:8070',
        changeOrigin: true,
      },
      // WebSocket 代理（管理端实时看板）
      '/agent/ws': {
        target: 'ws://localhost:8070',
        ws: true,
      },
    },
  },
})
