import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { apiRequest, ApiError } from './api'
import { mergeChanges, sameData, SyncConflict } from './sync-merge'

type Data = Record<string, unknown>
interface Envelope { app: string; version: number; revision: number; updatedAt: string; data: Data }
export type DataSyncStatus = 'connecting' | 'synced' | 'saving' | 'offline' | 'error'
export interface DataSyncSnapshot {
  status: DataSyncStatus; ready: boolean; lastSyncedAt?: string; error?: string
  retry: () => Promise<void>; refresh: () => Promise<void>
}
const readData = (): Data => (JSON.parse(useStore.getState().exportBackup()) as {data: Data}).data
let flushCurrent: () => Promise<void> = async () => { throw new Error('Aguarde a conexão com os dados.') }
let refreshCurrent: () => Promise<void> = async () => {}
export const flushData = () => flushCurrent()
export const refreshData = () => refreshCurrent()

export function useDataSync(enabled: boolean, accountId?: string): DataSyncSnapshot {
  const [snapshot, setSnapshot] = useState<DataSyncSnapshot>({ status: 'connecting', ready: false, retry: async () => {}, refresh: async () => {} })
  useEffect(() => {
    if (!enabled || !accountId) return
    const draftKey = `pkv-pending:${accountId}`
    let stopped = false, applying = false, ready = false, blocked = false
    let baseline: Data = {}, revision = -1, busy: Promise<void> | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    const persistDraft = () => {
      if (!ready) return
      try {
        const local = readData()
        if (sameData(local, baseline)) sessionStorage.removeItem(draftKey)
        else sessionStorage.setItem(draftKey, JSON.stringify({baseline, local, revision}))
      } catch { /* The unload warning remains active if browser storage is full. */ }
    }
    const publish = (status: DataSyncStatus, error?: string, lastSyncedAt?: string) => {
      if (stopped) return
      persistDraft()
      setSnapshot({ status, ready, error, lastSyncedAt, retry, refresh })
    }
    const apply = (data: Data) => {
      applying = true
      try { const error = useStore.getState().importBackup(JSON.stringify({app: 'parkour-vicosa', version: 3, data})); if (error) throw new Error(error) }
      finally { applying = false }
    }
    const get = async () => {
      const value = await apiRequest<Envelope>('/api/data')
      if (value.app !== 'parkour-vicosa' || !Number.isSafeInteger(value.revision) || !value.data) throw new Error('Dados incompatíveis recebidos do servidor.')
      return value
    }
    const fail = (error: unknown) => {
      blocked = error instanceof SyncConflict || (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 409)
      publish(blocked ? 'error' : 'offline', error instanceof Error ? error.message : 'Não foi possível salvar. Mantenha esta aba aberta para tentar novamente.')
    }
    const cycle = async () => {
      if (stopped) return
      if (!ready) {
        const remote = await get()
        if (stopped) return
        let draft: {baseline: Data; local: Data; revision: number} | null = null
        try { draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null') } catch { /* corrupt browser cache */ }
        if (draft?.baseline && draft.local && Number.isSafeInteger(draft.revision)) {
          apply(draft.local); baseline = draft.baseline; revision = draft.revision; ready = true
          const merged = mergeChanges(baseline, readData(), remote.data) as Data
          baseline = remote.data; revision = remote.revision; apply(merged)
          publish(sameData(merged, baseline) ? 'synced' : 'saving', undefined, remote.updatedAt)
        } else {
          apply(remote.data); baseline = readData(); revision = remote.revision; ready = true
          publish('synced', undefined, remote.updatedAt)
          return
        }
      }
      for (let attempt = 0; attempt < 5; attempt++) {
        const local = readData()
        if (sameData(local, baseline)) {
          const remote = await get()
          if (stopped) return
          const merged = mergeChanges(baseline, readData(), remote.data) as Data
          baseline = remote.data; revision = remote.revision; apply(merged)
          if (sameData(merged, baseline)) { publish('synced', undefined, remote.updatedAt); return }
          continue
        }
        publish('saving')
        const submitted = local
        let remote: Envelope
        try {
          remote = await apiRequest<Envelope>('/api/data', {method: 'PUT', body: JSON.stringify({revision, data: submitted})})
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 409) throw error
          remote = await get()
          if (stopped) return
          const merged = mergeChanges(baseline, readData(), remote.data) as Data
          baseline = remote.data; revision = remote.revision; apply(merged)
          continue
        }
        if (stopped) return
        // Preserve edits made while the request was in flight.
        const merged = mergeChanges(submitted, readData(), remote.data) as Data
        baseline = remote.data; revision = remote.revision; apply(merged)
        if (sameData(merged, baseline)) { publish('synced', undefined, remote.updatedAt); return }
      }
      throw new Error('Há alterações simultâneas. Mantenha esta aba aberta; o salvamento será tentado novamente.')
    }
    const run = async () => {
      if (busy) { await busy; if (ready && !sameData(readData(), baseline)) return run(); return }
      if (blocked) throw new Error('Resolva o conflito de dados antes de continuar.')
      const operation = cycle()
      busy = operation
      try { await operation } catch (error) { fail(error); throw error } finally { busy = null }
    }
    async function retry() { blocked = false; await run().catch(() => {}) }
    async function refresh() {
      if (busy) await busy.catch(() => {})
      try {
        const remote = await get()
        if (stopped) return
        apply(remote.data); baseline = readData(); revision = remote.revision; ready = true; blocked = false
        publish('synced', undefined, remote.updatedAt)
      } catch (error) { fail(error) }
    }
    flushCurrent = run
    refreshCurrent = async () => { await run() }
    const unsubscribe = useStore.subscribe(() => {
      if (applying || !ready || stopped || blocked || sameData(readData(), baseline)) return
      publish('saving')
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void run().catch(() => {}) }, 350)
    })
    const poll = setInterval(() => { if (!blocked && !busy) void run().catch(() => {}) }, 3000)
    const beforeUnload = (event: BeforeUnloadEvent) => {
      persistDraft()
      if (ready && !sameData(readData(), baseline)) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', beforeUnload)
    void run().catch(() => {})
    return () => {
      persistDraft()
      stopped = true; unsubscribe(); clearInterval(poll); if (timer) clearTimeout(timer)
      window.removeEventListener('beforeunload', beforeUnload)
      flushCurrent = async () => { throw new Error('Entre novamente no painel.') }
      refreshCurrent = async () => {}
      useStore.getState().resetAllData()
    }
  }, [enabled, accountId])
  return snapshot
}
