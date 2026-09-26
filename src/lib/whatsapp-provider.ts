import { apiRequest, ApiError } from './api'
import { flushData, refreshData } from './data-sync'
import type { CrmMessage } from '../types'
export type WhatsAppConnectionStatus = 'disconnected' | 'waiting_qr' | 'waiting_code' | 'pairing' | 'connecting' | 'connected' | 'error'
export interface WhatsAppConnectionSnapshot { status: WhatsAppConnectionStatus; phoneNumber?: string; qrCodeDataUrl?: string; qrExpiresAt?: string; pairingCode?: string; pairingExpiresAt?: string; pairingPhoneNumber?: string; connectedAt?: string; detail?: string; error?: string }
export interface WhatsAppProvider {
  getStatus(): Promise<WhatsAppConnectionSnapshot>
  connect(): Promise<WhatsAppConnectionSnapshot>
  pairWithPhone(phoneNumber: string): Promise<WhatsAppConnectionSnapshot>
  disconnect(): Promise<void>
  sendMessage(leadId: string, content: string, clientMessageId: string): Promise<{externalId: string; message: CrmMessage}>
}
export const whatsappProvider: WhatsAppProvider = {
  getStatus: () => apiRequest('/api/whatsapp/status'),
  connect: () => apiRequest('/api/whatsapp/connect', {method: 'POST', body: '{}'}),
  pairWithPhone: phoneNumber => apiRequest('/api/whatsapp/pairing-code', {method: 'POST', body: JSON.stringify({phoneNumber})}),
  disconnect: async () => { await apiRequest('/api/whatsapp/disconnect', {method: 'POST', body: '{}'}) },
  async sendMessage(leadId, content, clientMessageId) {
    await flushData()
    try {
      return await apiRequest('/api/whatsapp/messages', {method: 'POST', body: JSON.stringify({leadId, content, clientMessageId})})
    } finally { void refreshData().catch(() => {}) }
  },
}
export function whatsappLink(phone: string, content = '') {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`
  return `https://wa.me/${digits}?text=${encodeURIComponent(content)}`
}
export const messageStatusLabel: Record<string, string> = {
  received: 'Recebida', pending: 'Enviando', uncertain: 'Envio não confirmado — confira no celular', sent: 'Enviada', delivered: 'Entregue', read: 'Lida', failed: 'Falha no envio',
}

export function safeToRetrySend(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false
  const details = error.details as {message?: {status?: string}} | undefined
  return details?.message?.status === 'failed'
}
