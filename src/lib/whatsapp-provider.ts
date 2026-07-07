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

class ApiWhatsAppProvider implements WhatsAppProvider {
  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`/api/whatsapp${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(detail || 'O backend do WhatsApp não respondeu.')
    }

    return response.json() as Promise<T>
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
