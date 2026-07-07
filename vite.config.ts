import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Servidor local do WhatsApp (npm run whatsapp)
      '/api/whatsapp': 'http://localhost:3901',
    },
  },
  preview: {
    proxy: {
      '/api/whatsapp': 'http://localhost:3901',
    },
  },
})
