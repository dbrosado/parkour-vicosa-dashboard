import { DisconnectReason } from 'baileys'
import { useAtomicAuthState, resetAuthState } from './wa-auth.mjs'

// Every start, reset and reconnect passes through the same queue. A previous
// identity store is sealed and drained before its directory can be reused.
export function createWhatsAppConnection({ directory, makeSocket, renderQr, onSocket = () => {}, onStatus = () => {}, openAuth = useAtomicAuthState, resetAuth = resetAuthState, retryDelay = 500 }) {
  let socket = null, auth = null, generation = 0, attempts = 0
  let timer, qrTimer, tail = Promise.resolve()
  let snapshot = { status: 'disconnected' }
  const publish = (next) => { snapshot = next; onStatus(next) }
  const queue = (work) => {
    const operation = tail.then(work)
    tail = operation.catch(() => {})
    return operation
  }
  const clearTimers = () => { clearTimeout(timer); clearTimeout(qrTimer) }
  const dispose = async (logout = false) => {
    clearTimers()
    ++generation
    const previous = socket, store = auth
    socket = null; auth = null
    if (previous) {
      for (const event of ['connection.update', 'creds.update', 'messages.upsert', 'messages.update', 'message-receipt.update']) previous.ev.removeAllListeners(event)
      if (logout) {
        let deadline
        try { await Promise.race([previous.logout(), new Promise(resolve => { deadline = setTimeout(resolve, 5000) })]) }
        catch { /* The phone may have already revoked this device. */ }
        finally { clearTimeout(deadline) }
      }
      // Sealing is synchronous, so late Signal writes cannot recreate a reset session.
      const draining = store?.close()
      if (draining) draining.catch(() => {})
      try { await previous.end(undefined) } finally { await draining }
    } else { await store?.close() }
  }
  const fail = async (error) => {
    try { await dispose() } catch { /* Preserve the original diagnostic. */ }
    console.error('[whatsapp] falha de sessão:', error.message)
    publish({ status: 'error', error: 'Não foi possível manter a sessão do WhatsApp. Use Reiniciar sessão para tentar novamente. Se persistir, verifique a internet e o espaço no disco.' })
  }
  const start = async () => {
    if (socket) return
    clearTimers()
    publish({ status: 'connecting' })
    try {
      auth = await openAuth(directory)
      const store = auth
      const current = makeSocket(store.state)
      socket = current
      const token = ++generation
      const active = () => generation === token && socket === current
      current.ev.on('creds.update', () => {
        if (!active()) return
        void store.saveCreds().catch(error => queue(async () => { if (active()) await fail(error) }))
      })
      onSocket(current, active)
      current.ev.on('connection.update', update => {
        if (!active()) return
        // Queue QR conversion too: an older asynchronous QR must never replace connected.
        void queue(async () => {
          if (!active()) return
          try {
          const { connection, lastDisconnect, qr } = update
          if (qr && connection !== 'close' && snapshot.status !== 'connected') {
            const qrCodeDataUrl = await renderQr(qr)
            if (!active()) return
            const qrExpiresAt = new Date(Date.now() + 18000).toISOString()
            publish({ status: 'waiting_qr', qrCodeDataUrl, qrExpiresAt })
            clearTimeout(qrTimer)
            qrTimer = setTimeout(() => {
              if (active() && snapshot.qrExpiresAt === qrExpiresAt) publish({ status: 'connecting', error: 'Aguardando a renovação do QR Code…' })
            }, 18000)
          }
          if (connection === 'open') {
            await store.flush()
            clearTimeout(qrTimer); attempts = 0
            const phone = current.user?.id?.split(':')[0]?.split('@')[0]
            publish({ status: 'connected', phoneNumber: phone ? `+${phone}` : undefined })
          }
          if (connection !== 'close') return
          const code = lastDisconnect?.error?.output?.statusCode
          console.warn('[whatsapp] conexão encerrada:', code ?? 'sem código')
          publish({ status: 'connecting' })
          // This barrier is required after scanning a QR (WhatsApp closes with 515).
          await dispose()
          if (code === DisconnectReason.loggedOut) {
            await resetAuth(directory)
            publish({ status: 'disconnected', error: 'Sessão encerrada no celular. Gere um novo QR Code.' })
            return
          }
          if ([DisconnectReason.connectionReplaced, DisconnectReason.badSession, DisconnectReason.multideviceMismatch].includes(code)) {
            publish({ status: 'error', error: 'Sessão substituída ou inválida. Use Reiniciar sessão e vincule novamente.' })
            return
          }
          const restart = code === DisconnectReason.restartRequired
          if (!restart && ++attempts > 8) {
            publish({ status: 'error', error: 'Não foi possível conectar. Verifique a internet e tente novamente.' })
            return
          }
          const delay = restart ? retryDelay : Math.min(30000, 1000 * 2 ** Math.min(attempts - 1, 5))
          const nextGeneration = generation
          timer = setTimeout(() => { void queue(async () => { if (generation === nextGeneration) await start() }) }, delay)
          } catch (error) { await fail(error) }
        })
      })
    } catch (error) { await fail(error) }
  }
  return {
    get socket() { return socket },
    get snapshot() { return snapshot },
    connect: () => queue(async () => { attempts = 0; await start(); return snapshot }),
    disconnect: (logout = true) => queue(async () => {
      let error
      try { await dispose(logout) } catch (failure) { error = failure }
      if (logout) {
        try { await resetAuth(directory); error = undefined }
        catch (failure) { error = failure }
      }
      if (error) { await fail(error); throw error }
      publish({ status: 'disconnected' })
    }),
    idle: () => tail,
  }
}
