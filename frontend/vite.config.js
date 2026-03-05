import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const apiTarget = process.env.VITE_API_URL || 'http://localhost:4000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // In dev, /api and /api/* go through Vite; Node accepts self-signed certs if API is HTTPS
      '/api': { target: apiTarget, changeOrigin: true, secure: false },
      '/team-members': { target: apiTarget, changeOrigin: true, secure: false },
      '/roles': { target: apiTarget, changeOrigin: true, secure: false },
      '/projects': { target: apiTarget, changeOrigin: true, secure: false },
      '/sprints': { target: apiTarget, changeOrigin: true, secure: false },
      '/items': { target: apiTarget, changeOrigin: true, secure: false },
      '/labels': { target: apiTarget, changeOrigin: true, secure: false },
      '/activity': { target: apiTarget, changeOrigin: true, secure: false },
    },
  },
})
