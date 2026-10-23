import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bi/',
  plugins: [react()],
  server: {
    port: 5176,
    proxy: {
      // 开发环境直连后端（vite 也挂在 /bi 下，代理时剥掉 /bi 前缀）
      '/bi/bi': { target: 'http://localhost:8090', rewrite: (p) => p.replace(/^\/bi/, '') },
      '/bi/auth': { target: 'http://localhost:8090', rewrite: (p) => p.replace(/^\/bi/, '') },
      '/bi/devices': { target: 'http://localhost:8090', rewrite: (p) => p.replace(/^\/bi/, '') },
      '/bi/stats': { target: 'http://localhost:8090', rewrite: (p) => p.replace(/^\/bi/, '') },
      '/bi/tasks': { target: 'http://localhost:8090', rewrite: (p) => p.replace(/^\/bi/, '') },
      '/bi/records': { target: 'http://localhost:8090', rewrite: (p) => p.replace(/^\/bi/, '') },
      '/bi/heath': 'http://localhost:8090',
      '/bi/test': 'http://localhost:8090',
    },
  },
})
