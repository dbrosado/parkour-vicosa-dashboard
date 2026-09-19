let csrfToken: string | null = null

export function setCsrfToken(value: string | null) { csrfToken = value }
export function getCsrfToken() { return csrfToken }

export class ApiError extends Error {
  status: number
  details: unknown
  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (!['GET', 'HEAD'].includes((init.method ?? 'GET').toUpperCase()) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (csrfToken && !['GET', 'HEAD'].includes((init.method ?? 'GET').toUpperCase())) headers.set('X-CSRF-Token', csrfToken)
  const controller = new AbortController()
  const signal = init.signal ? AbortSignal.any([controller.signal, init.signal]) : controller.signal
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(path, { ...init, headers, credentials: 'same-origin', cache: 'no-store', signal })
    if (!(response.headers.get('content-type') ?? '').includes('application/json')) throw new ApiError('O serviço da academia não respondeu. Verifique se o servidor está ligado e tente novamente.', response.status)
    const body = await response.json() as T & { error?: string }
    if (!response.ok) {
      if (response.status === 401) window.dispatchEvent(new Event('pkv-session-expired'))
      throw new ApiError(body.error || 'Não foi possível concluir esta operação.', response.status, body)
    }
    return body
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (init.signal?.aborted) throw error
    throw new ApiError('Não foi possível acessar o servidor. Verifique sua conexão e tente novamente.', 0)
  } finally { clearTimeout(timeout) }
}
