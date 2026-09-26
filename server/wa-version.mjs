// An explicit deployment pin is stable across reconnects. Never silently fetch
// a different web protocol for each socket or overwrite a chosen version.
export function parseWhatsAppVersion(value) {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string' || !/^\d+\.\d+\.\d+$/.test(value)) throw new Error('WA_WEB_VERSION deve conter três números separados por ponto.')
  const version = value.split('.').map(Number)
  if (version.some(n => !Number.isSafeInteger(n) || n < 0 || n > 2147483647) || version[0] < 2) throw new Error('WA_WEB_VERSION inválida.')
  return version
}
