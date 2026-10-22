import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base:'/bi',
  plugins: [react()],
  server:{
    port:5160
    },
    proxy: {
      '/bi': 'http://localhost:8090',   // 必须有这条：/bi 开头的请求转给后端
    },

})
