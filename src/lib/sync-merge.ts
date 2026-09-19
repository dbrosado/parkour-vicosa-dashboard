// Three-way merge: only actual edits are replayed, including deletions.
// Conflicting edits to the same field require a human choice; never silently overwrite.
export class SyncConflict extends Error {
  constructor(path: string) { super(`Conflito em ${path}. Baixe suas alterações antes de recarregar os dados compartilhados.`) }
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
export const sameData = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => sameData(v, b[i]))
  if (record(a) && record(b)) {
    const keys = Object.keys(a)
    return keys.length === Object.keys(b).length && keys.every(k => Object.hasOwn(b, k) && sameData(a[k], b[k]))
  }
  return false
}
const entities = (v: unknown): v is Record<string, unknown>[] => Array.isArray(v) && v.every(x => record(x) && typeof x.id === 'string')
export function mergeChanges(base: unknown, local: unknown, remote: unknown, path = 'dados'): unknown {
  if (sameData(local, base)) return remote
  if (/\.(updatedAt|lastContactAt)$/.test(path) && typeof local === 'string' && typeof remote === 'string' && Number.isFinite(Date.parse(local)) && Number.isFinite(Date.parse(remote))) return Date.parse(local) >= Date.parse(remote) ? local : remote
  if (/\.paymentHistory\.[^.]+$/.test(path) && !sameData(remote, base) && !sameData(local, remote)) throw new SyncConflict(path)
  if (sameData(remote, base) || sameData(local, remote)) return local
  if (entities(base) && entities(local) && entities(remote)) {
    const map = (items: Record<string, unknown>[]) => new Map(items.map(x => [x.id, x]))
    const b = map(base), l = map(local), r = map(remote)
    const ids = new Set([...r.keys(), ...l.keys(), ...b.keys()])
    return [...ids].map(id => mergeChanges(b.get(id), l.get(id), r.get(id), `${path}.${String(id)}`)).filter(v => v !== undefined)
  }
  if (record(base) && record(local) && record(remote)) {
    const result: Record<string, unknown> = {}
    for (const key of new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)])) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new SyncConflict(path)
      const value = mergeChanges(base[key], local[key], remote[key], `${path}.${key}`)
      if (value !== undefined) result[key] = value
    }
    return result
  }
  // Independently created day/slot maps can be merged recursively.
  if (base === undefined && record(local) && record(remote)) return mergeChanges({}, local, remote, path)
  throw new SyncConflict(path)
}
