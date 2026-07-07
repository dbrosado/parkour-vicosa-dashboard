import { spawn, type ChildProcess } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const whatsappScript = fileURLToPath(new URL('./server/whatsapp-server.mjs', import.meta.url))

// Sobe o servidor local do WhatsApp junto com o painel (dev e preview),
// para que "npm run dev" seja tudo o que o usuário precisa rodar.
function localWhatsAppServer(): Plugin {
  let child: ChildProcess | null = null

  const start = () => {
    if (child) return
    child = spawn(process.execPath, [whatsappScript], { stdio: 'inherit' })
    child.on('exit', () => {
      child = null
    })
  }

  const stop = () => {
    if (child) {
      child.kill()
      child = null
    }
  }

  return {
    name: 'local-whatsapp-server',
    configureServer(server) {
      start()
      server.httpServer?.once('close', stop)
      process.once('exit', stop)
    },
    configurePreviewServer(server) {
      start()
      server.httpServer?.once('close', stop)
      process.once('exit', stop)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localWhatsAppServer()],
  server: {
    proxy: {
      '/api/whatsapp': 'http://127.0.0.1:3901',
    },
  },
  preview: {
    proxy: {
      '/api/whatsapp': 'http://127.0.0.1:3901',
    },
  },
})
