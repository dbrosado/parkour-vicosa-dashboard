/**
 * Servidor local do WhatsApp para o painel Parkour Viçosa.
 *
 * Conecta ao WhatsApp Web via Baileys — roda 100% nesta máquina, sem serviços
 * externos. A sessão fica salva em server/.wa-session (fora do git).
 *
 * Rodar: npm run dev   (sobe o painel e este servidor juntos)
 */
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import makeWASocket, { DisconnectReason, useMultiFileAuthState } from 'baileys'
import pino from 'pino'
import QRCode from 'qrcode'

const PORT = Number(process.env.WHATSAPP_PORT || 3901)
const SESSION_DIR = join(dirname(fileURLToPath(import.meta.url)), '.wa-session')

const logger = pino({ level: 'silent' })

/** @type {{ status: string, qrCodeDataUrl?: string, phoneNumber?: string, error?: string }} */
let snapshot = { status: 'disconnected' }
/** @type {ReturnType<typeof makeWASocket> | null} */
let sock = null
let starting = false

function setSnapshot(next) {
  snapshot = next
  console.log(`[whatsapp] status: ${next.status}${next.phoneNumber ? ` (${next.phoneNumber})` : ''}${next.error ? ` — ${next.error}` : ''}`)
}

async function startSocket() {
  if (starting) return
  starting = true
  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

    sock = makeWASocket({ auth: state, logger })
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        const qrCodeDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 1 })
        setSnapshot({ status: 'waiting_qr', qrCodeDataUrl })
      }

      if (connection === 'open') {
        const phoneNumber = sock?.user?.id?.split(':')[0] ?? ''
        setSnapshot({ status: 'connected', phoneNumber: phoneNumber ? `+${phoneNumber}` : undefined })
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode
        if (statusCode === DisconnectReason.loggedOut) {
          await rm(SESSION_DIR, { recursive: true, force: true })
          setSnapshot({ status: 'disconnected', error: 'Sessão encerrada no celular. Gere um novo QR Code.' })
        } else if (snapshot.status === 'waiting_qr') {
          setSnapshot({ status: 'disconnected', error: 'O QR Code expirou. Clique em "Gerar QR Code" para criar outro.' })
        } else if (snapshot.status === 'connected' || snapshot.status === 'connecting') {
          // Queda de conexão com sessão válida: reconecta sozinho
          setSnapshot({ status: 'connecting' })
          setTimeout(() => { starting = false; startSocket() }, 2000)
          return
        } else {
          setSnapshot({ status: 'disconnected' })
        }
        sock = null
      }
    })
  } catch (err) {
    setSnapshot({ status: 'error', error: err instanceof Error ? err.message : String(err) })
    sock = null
  } finally {
    starting = false
  }
}

function toJid(phone) {
  let digits = String(phone).replace(/\D/g, '')
  if (digits.length <= 11) digits = `55${digits}`
  return `${digits}@s.whatsapp.net`
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function isAllowedOrigin(origin) {
  if (!origin) return true

  try {
    const { hostname, protocol } = new URL(origin)
    return (
      (protocol === 'http:' || protocol === 'https:') &&
      ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)
    )
  } catch {
    return false
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const route = `${req.method} ${url.pathname}`
  const origin = req.headers.origin
  const allowedOrigin = isAllowedOrigin(origin) ? origin : null

  // Permite o painel local falar direto com http://127.0.0.1:3901,
  // mas bloqueia páginas externas de acionarem o WhatsApp local.
  res.setHeader('Vary', 'Origin')
  if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') {
    res.writeHead(allowedOrigin ? 204 : 403)
    res.end()
    return
  }
  if (origin && !allowedOrigin) {
    return json(res, 403, { error: 'Origem não autorizada para o servidor local do WhatsApp.' })
  }

  try {
    if (route === 'GET /api/whatsapp/status') {
      return json(res, 200, snapshot)
    }

    if (route === 'POST /api/whatsapp/connect') {
      if (snapshot.status === 'connected') return json(res, 200, snapshot)
      setSnapshot({ status: 'connecting' })
      startSocket()
      // O QR chega de forma assíncrona; o frontend acompanha via polling do /status
      return json(res, 200, snapshot)
    }

    if (route === 'POST /api/whatsapp/disconnect') {
      if (sock) {
        try { await sock.logout() } catch { /* sessão pode já ter caído */ }
        sock = null
      }
      await rm(SESSION_DIR, { recursive: true, force: true })
      setSnapshot({ status: 'disconnected' })
      return json(res, 200, { ok: true })
    }

    if (route === 'POST /api/whatsapp/messages') {
      if (!sock || snapshot.status !== 'connected') {
        return json(res, 409, { error: 'WhatsApp não está conectado.' })
      }
      const { phone, content } = await readBody(req)
      if (!phone || !content) return json(res, 400, { error: 'Informe phone e content.' })
      const sent = await sock.sendMessage(toJid(phone), { text: String(content) })
      return json(res, 200, { externalId: sent?.key?.id ?? '' })
    }

    return json(res, 404, { error: 'Rota não encontrada.' })
  } catch (err) {
    return json(res, 500, { error: err instanceof Error ? err.message : String(err) })
  }
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[whatsapp] porta ${PORT} já em uso — outro servidor do WhatsApp já está rodando, seguindo com ele.`)
    process.exit(0)
  }
  throw err
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[whatsapp] servidor local em http://127.0.0.1:${PORT}`)
  // Se já existe sessão salva, reconecta direto sem pedir QR
  if (existsSync(join(SESSION_DIR, 'creds.json'))) {
    setSnapshot({ status: 'connecting' })
    startSocket()
  }
})
