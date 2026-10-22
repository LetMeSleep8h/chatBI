import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/bi',
  plugins: [react()],
  server: {
    port: 5160,
    proxy: {
      '/bi': 'http://localhost:8090',
    },
  },
})
