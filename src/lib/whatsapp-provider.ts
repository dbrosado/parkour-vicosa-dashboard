export type WhatsAppConnectionStatus =
  | 'disconnected'
  | 'waiting_qr'
  | 'connecting'
  | 'connected'
  | 'error'

export interface WhatsAppConnectionSnapshot {
  status: WhatsAppConnectionStatus
  phoneNumber?: string
  qrCodeDataUrl?: string
  error?: string
}

export interface WhatsAppProvider {
  getStatus(): Promise<WhatsAppConnectionSnapshot>
  connect(): Promise<WhatsAppConnectionSnapshot>
  disconnect(): Promise<void>
  sendMessage(phone: string, content: string): Promise<{ externalId: string }>
}

// Endereço direto do servidor local, usado quando o proxy do Vite não responde
const DIRECT_BASE = 'http://127.0.0.1:3901'

class ApiWhatsAppProvider implements WhatsAppProvider {
  private base: string | null = null

  private async attempt<T>(base: string, path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${base}/api/whatsapp${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })

    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok || !contentType.includes('application/json')) {
      const detail = contentType.includes('application/json') ? await response.text() : ''
      throw new Error(detail || 'O servidor local do WhatsApp não respondeu.')
    }

    return response.json() as Promise<T>
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (this.base !== null) {
      return this.attempt<T>(this.base, path, init)
    }

    // Tenta o proxy do Vite primeiro; sem ele, fala direto com o servidor local
    try {
      const result = await this.attempt<T>('', path, init)
      this.base = ''
      return result
    } catch (proxyError) {
      try {
        const result = await this.attempt<T>(DIRECT_BASE, path, init)
        this.base = DIRECT_BASE
        return result
      } catch {
        throw proxyError
      }
    }
  }

  getStatus() {
    return this.request<WhatsAppConnectionSnapshot>('/status')
  }

  connect() {
    return this.request<WhatsAppConnectionSnapshot>('/connect', { method: 'POST' })
  }

  async disconnect() {
    await this.request<{ ok: boolean }>('/disconnect', { method: 'POST' })
  }

  sendMessage(phone: string, content: string) {
    return this.request<{ externalId: string }>('/messages', {
      method: 'POST',
      body: JSON.stringify({ phone, content }),
    })
  }
}

export const whatsappProvider: WhatsAppProvider = new ApiWhatsAppProvider()
