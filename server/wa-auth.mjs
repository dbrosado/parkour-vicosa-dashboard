// One atomic file contains both identity credentials and Signal keys.
import { readFile, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { BufferJSON, initAuthCreds, proto } from 'baileys'
import { atomicJson } from './storage.mjs'

export async function resetAuthState(directory) {
  // Never recursively remove the live pathname. A closed store cannot recreate it.
  const retired = `${directory}-retired-${randomUUID()}`
  try { await rename(directory, retired) } catch (error) { if (error.code === 'ENOENT') return; throw error }
  try { await rm(retired, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) }
  catch { console.warn('[whatsapp] Uma sessão desativada não pôde ser removida do disco; ela não será reutilizada.') }
}

export async function useAtomicAuthState(directory) {
  const file = join(directory, 'auth-state.json')
  let stored
  try { stored = JSON.parse(await readFile(file, 'utf8'), BufferJSON.reviver) }
  catch (error) {
    if (error.code !== 'ENOENT') throw error
    let legacy
    try { legacy = await readFile(join(directory, 'creds.json'), 'utf8') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
    if (legacy) throw new Error('Sessão antiga encontrada. Use Reiniciar sessão e vincule novamente pelo QR Code.')
    stored = { creds: initAuthCreds(), keys: {} }
  }
  if (!stored.creds || !stored.keys) throw new Error('Sessão inválida. Use Reiniciar sessão e vincule novamente.')
  let tail = Promise.resolve(), lastError, closed = false
  const persist = (mutate) => {
    if (closed) return Promise.resolve()
    const op = tail.then(async () => {
      mutate?.()
      await atomicJson(file, stored, BufferJSON.replacer)
      lastError = undefined
    })
    tail = op.catch(error => { lastError = error })
    return op
  }
  const flush = async () => { await tail; if (lastError) throw lastError }
  // Detect inaccessible storage before presenting a QR to the user.
  await persist()
  return {
    state: {
      creds: stored.creds,
      keys: {
        get: async (type, ids) => {
          await flush()
          const result = {}
          for (const id of ids) {
            let value = stored.keys[type]?.[id]
            if (type === 'app-state-sync-key' && value) value = proto.Message.AppStateSyncKeyData.fromObject(value)
            result[id] = value
          }
          return result
        },
        set: (data) => persist(() => {
          for (const [category, entries] of Object.entries(data)) {
            stored.keys[category] ??= {}
            for (const [id, value] of Object.entries(entries)) {
              if (value) stored.keys[category][id] = value
              else delete stored.keys[category][id]
            }
          }
        }),
      },
    },
    saveCreds: () => persist(),
    flush,
    close: async () => { closed = true; await flush() },
  }
}
