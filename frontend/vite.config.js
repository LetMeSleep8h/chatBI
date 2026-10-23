import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5176,
    proxy: {
      // 开发环境代理到本地后端，避免跨域（生产由容器 nginx 代理）
      '/bi/heath': 'http://localhost:8090',
      '/bi/test': 'http://localhost:8090',
      '/auth': 'http://localhost:8090',
      '/tasks': 'http://localhost:8090',
      '/records': 'http://localhost:8090',
    },
  },
})
