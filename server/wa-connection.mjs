import { DisconnectReason } from 'baileys'
import { useAtomicAuthState, resetAuthState } from './wa-auth.mjs'
import { HttpError } from './security.mjs'

// Every start, reset and reconnect passes through the same queue. A previous
// identity store is sealed and drained before its directory can be reused.
export function createWhatsAppConnection({ directory, makeSocket, renderQr, onSocket = () => {}, onStatus = () => {}, openAuth = useAtomicAuthState, resetAuth = resetAuthState, retryDelay = 500 }) {
  let socket = null, auth = null, generation = 0, attempts = 0
  let timer, qrTimer, tail = Promise.resolve()
  let pairingPhone = null, lastPairingRequest = 0
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
      let qrCount = 0, codeRequested = false, phoneApproved = false, offeredPairing = false
      current.ev.on('creds.update', () => {
        if (!active()) return
        void store.saveCreds().catch(error => queue(async () => { if (active()) await fail(error) }))
      })
      current.ws?.on('CB:notification,type:passkey_prologue_request', () => {
        void queue(async () => {
          if (!active()) return
          console.warn('[whatsapp] celular solicitou verificação adicional de chave de acesso')
          try { await dispose() } catch { /* Keep the specific provider diagnostic. */ }
          publish({ status: 'error', error: 'O WhatsApp exigiu uma verificação adicional por chave de acesso que esta integração ainda não suporta. O vínculo não foi concluído. Use o WhatsApp no celular para atender enquanto essa compatibilidade é resolvida.' })
        })
      })
      onSocket(current, active)
      current.ev.on('connection.update', update => {
        if (!active()) return
        // Queue QR conversion too: an older asynchronous QR must never replace connected.
        void queue(async () => {
          if (!active()) return
          try {
          const { connection, lastDisconnect, qr, isNewLogin } = update
          if (isNewLogin) {
            phoneApproved = true
            pairingPhone = null
            clearTimeout(qrTimer)
            publish({ status: 'pairing', detail: 'Celular reconhecido. Confirmando a conexão com o WhatsApp…' })
          }
          if (qr && !phoneApproved && connection !== 'close' && snapshot.status !== 'connected') {
            offeredPairing = true
            if (pairingPhone) {
              if (!codeRequested) {
                codeRequested = true
                const phone = pairingPhone
                // Called only after the provider's QR event proves the socket is ready.
                const pairingCode = await current.requestPairingCode(phone)
                if (!active()) return
                if (typeof pairingCode !== 'string' || !/^[A-Z0-9]{8}$/i.test(pairingCode)) throw new Error('Resposta de pareamento inválida')
                await store.flush()
                const pairingExpiresAt = new Date(Date.now() + 60000).toISOString()
                publish({ status: 'waiting_code', pairingCode, pairingExpiresAt, pairingPhoneNumber: `+${phone}` })
                clearTimeout(qrTimer)
                qrTimer = setTimeout(() => { void queue(async () => {
                  if (!active() || phoneApproved) return
                  try {
                    await dispose(); await resetAuth(directory); pairingPhone = null
                    publish({ status: 'disconnected', error: 'O código venceu sem confirmação do celular. Solicite outro código para tentar novamente.' })
                  } catch (error) { await fail(error) }
                }) }, 60000)
              }
            } else {
              const issuedAt = Date.now()
              const lifetime = qrCount++ === 0 ? 55000 : 18000
              const qrCodeDataUrl = await renderQr(qr)
              if (!active()) return
              const qrExpiresAt = new Date(issuedAt + lifetime).toISOString()
              publish({ status: 'waiting_qr', qrCodeDataUrl, qrExpiresAt })
              clearTimeout(qrTimer)
              qrTimer = setTimeout(() => {
                if (active() && snapshot.qrExpiresAt === qrExpiresAt) publish({ status: 'connecting', detail: 'Aguardando um novo QR do WhatsApp…' })
              }, Math.max(0, issuedAt + lifetime - Date.now()))
            }
          }
          if (connection === 'open') {
            await store.flush()
            clearTimeout(qrTimer); attempts = 0
            const phone = current.user?.id?.split(':')[0]?.split('@')[0]
            if (!phone) throw new Error('O WhatsApp não confirmou a identidade da sessão')
            pairingPhone = null
            publish({ status: 'connected', phoneNumber: `+${phone}`, connectedAt: new Date().toISOString() })
          }
          if (connection !== 'close') return
          const code = lastDisconnect?.error?.output?.statusCode
          console.warn('[whatsapp] conexão encerrada:', code ?? 'sem código')
          publish({ status: 'connecting' })
          // This barrier is required after scanning a QR (WhatsApp closes with 515).
          await dispose()
          if (code === DisconnectReason.timedOut && offeredPairing && !phoneApproved) {
            pairingPhone = null
            await resetAuth(directory)
            publish({ status: 'disconnected', error: 'O WhatsApp encerrou a tentativa sem confirmação do celular. Gere outro QR ou use Conectar pelo número.' })
            return
          }
          if (code === DisconnectReason.loggedOut) {
            pairingPhone = null
            await resetAuth(directory)
            publish({ status: 'disconnected', error: 'Sessão encerrada no celular. Gere um novo QR Code.' })
            return
          }
          if ([DisconnectReason.connectionReplaced, DisconnectReason.badSession, DisconnectReason.multideviceMismatch].includes(code)) {
            pairingPhone = null
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
    connect: () => queue(async () => {
      if (!socket && pairingPhone) { await resetAuth(directory); pairingPhone = null }
      attempts = 0; await start(); return snapshot
    }),
    pairWithPhone: (phone) => queue(async () => {
      if (typeof phone !== 'string' || !/^[1-9][0-9]{9,14}$/.test(phone)) throw new HttpError(400, 'Informe o número completo, com código do país e DDD.')
      if (snapshot.status === 'connected' || snapshot.status === 'pairing') throw new HttpError(409, 'Já existe uma conexão ativa ou em confirmação. Aguarde ou desconecte primeiro.')
      if (Date.now() - lastPairingRequest < 60000) throw new HttpError(429, 'Aguarde um minuto antes de solicitar outro código.')
      lastPairingRequest = Date.now()
      try {
        await dispose(); await resetAuth(directory)
        pairingPhone = phone; attempts = 0
        await start()
        return snapshot
      } catch (error) { await fail(error); throw error }
    }),
    disconnect: (logout = true) => queue(async () => {
      let error
      try { await dispose(logout) } catch (failure) { error = failure }
      if (logout) {
        try { await resetAuth(directory); error = undefined }
        catch (failure) { error = failure }
      }
      if (error) { await fail(error); throw error }
      pairingPhone = null
      publish({ status: 'disconnected' })
    }),
    idle: () => tail,
  }
}
