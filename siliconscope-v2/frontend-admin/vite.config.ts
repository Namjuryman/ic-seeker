import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5176,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8751',
        changeOrigin: true,
      },
      '/download': {
        target: 'http://127.0.0.1:8751',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
