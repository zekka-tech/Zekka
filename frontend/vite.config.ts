import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('recharts')) {
            return 'charts'
          }

          if (
            id.includes('@radix-ui')
            || id.includes('lucide-react')
            || id.includes('react-window')
          ) {
            return 'ui-vendor'
          }

          if (
            id.includes('@tanstack/react-query')
            || id.includes('axios')
            || id.includes('socket.io-client')
          ) {
            return 'data-vendor'
          }

          if (
            id.includes('react-router-dom')
            || id.includes('react-dom')
            || id.includes('react')
          ) {
            return 'react-vendor'
          }

          if (id.includes('prismjs') || id.includes('fuse.js')) {
            return 'search-vendor'
          }

          return undefined
        },
      },
    },
  },
})
