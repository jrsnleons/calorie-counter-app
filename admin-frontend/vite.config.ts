
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
        '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
        }
    }
  },
  preview: {
    port: 4173,
    host: true,
    allowedHosts: ["admin-pakals.up.railway.app"],
    proxy: {
        '/api': {
            target: 'https://backend-server-production-44a5.up.railway.app',
            changeOrigin: true,
        }
    }
  }
})
