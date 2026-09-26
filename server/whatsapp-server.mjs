/**
 * Servidor compartilhado do painel Parkour Viçosa.
 *
 * - Conecta ao WhatsApp Web via Baileys.
 * - Persiste o estado do CRM em JSON com troca atômica de arquivo.
 * - Serve o build de produção do Vite quando a pasta dist existe.
 *
 * Rodar: npm run dev (via plugin do Vite) ou npm run whatsapp.
 */
import { randomUUID } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, open, readFile, rm, stat, readdir } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

import makeWASocket, { generateMessageIDV2 } from 'baileys'
import { createAuth, HttpError, isRecord, enforceOrigin } from './security.mjs'
import { createEmptyData, normalizeData, filterState, authorizedData } from './validation.mjs'
import { atomicJson } from './storage.mjs'
import { lockDataDirectory } from './instance-lock.mjs'
import { createWhatsAppConnection } from './wa-connection.mjs'
import { parseWhatsAppVersion } from './wa-version.mjs'
import pino from 'pino'
import QRCode from 'qrcode'

const webVersion = parseWhatsAppVersion(process.env.WA_WEB_VERSION)
if (webVersion) console.log('[whatsapp] protocolo configurado:', webVersion.join('.'))
const PORT = Number(process.env.WHATSAPP_PORT || 3901)
const SERVER_DIR = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(SERVER_DIR, '..')
const SESSION_DIR = resolve(process.env.WA_SESSION_DIR || join(SERVER_DIR, '.wa-session'))
const DATA_DIR = resolve(process.env.DATA_DIR || join(SERVER_DIR, 'data'))
const releaseDataLock = lockDataDirectory(DATA_DIR)
const DATA_FILE = join(DATA_DIR, 'crm-data.json')
const DIST_DIR = join(ROOT_DIR, 'dist')
const DIST_INDEX = join(DIST_DIR, 'index.html')

const APP_ID = 'parkour-vicosa'
const DATA_SCHEMA_VERSION = 1
const MAX_JSON_BODY_BYTES = 10 * 1024 * 1024

const logger = pino({ level: 'silent' })

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function createInitialState() {
  return {
    app: APP_ID,
    version: DATA_SCHEMA_VERSION,
    revision: 0,
    updatedAt: new Date().toISOString(),
    data: createEmptyData(),
  }
}

function normalizeStoredState(parsed) {
  if (!isRecord(parsed)) {
    throw new Error('O arquivo de dados não contém um objeto JSON válido.')
  }
  if (parsed.app !== APP_ID) {
    throw new Error('O arquivo de dados pertence a outro aplicativo.')
  }
  if (parsed.version !== DATA_SCHEMA_VERSION) {
    throw new Error(
      `Versão de dados incompatível: ${String(parsed.version)} (servidor: ${DATA_SCHEMA_VERSION}).`,
    )
  }

  const revision = Number(parsed.revision)
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new Error('A revisão do arquivo de dados é inválida.')
  }

  return {
    app: APP_ID,
    version: DATA_SCHEMA_VERSION,
    revision,
    updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
    data: normalizeData(parsed.data),
  }
}

async function atomicWriteState(state) {
  if (sharedState) {
    const backupDir = join(DATA_DIR, 'backups')
    await atomicJson(join(backupDir, `revision-${String(sharedState.revision).padStart(12,'0')}.json`), sharedState)
    const files = (await readdir(backupDir)).filter(x => /^revision-\d+\.json$/.test(x)).sort()
    for (const name of files.slice(0, Math.max(0, files.length - 100))) await rm(join(backupDir,name))
  }
  await atomicJson(DATA_FILE, state)
}

async function loadSharedState() {
  await mkdir(DATA_DIR, { recursive: true, mode: 0o700 })
  try {
    const raw = await readFile(DATA_FILE, 'utf8')
    return normalizeStoredState(JSON.parse(raw))
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    const initial = createInitialState()
    await atomicWriteState(initial)
    return initial
  }
}

/** @type {ReturnType<typeof createInitialState> | null} */
let sharedState = null
let writeTail = Promise.resolve()

const dataReady = loadSharedState().then((state) => {
  sharedState = state
  return state
})

function queueStateMutation(mutator) {
  const operation = writeTail.then(async () => {
    await dataReady
    const current = sharedState
    const next = await mutator(current)
    if (!next || next === current) return structuredClone(current)

    await atomicWriteState(next)
    sharedState = next
    return structuredClone(next)
  })

  // Uma falha não deve bloquear para sempre as gravações posteriores.
  writeTail = operation.then(() => undefined, () => undefined)
  return operation
}

async function getSharedState() {
  await dataReady
  await writeTail
  return structuredClone(sharedState)
}

function stateEtag(state) {
  return `\"crm-${state.version}-${state.revision}\"`
}

const sendOperations = new Map()
const whatsapp = createWhatsAppConnection({
  directory: SESSION_DIR,
  makeSocket: auth => makeWASocket({auth,logger,...(webVersion ? {version:webVersion} : {}),markOnlineOnConnect:false,syncFullHistory:false,connectTimeoutMs:30000,defaultQueryTimeoutMs:30000,getMessage:async key=>{const current=await getSharedState();const message=current.data.crmMessages.find(x=>x.externalId===key.id);return message ? {conversation:message.content} : undefined}}),
  renderQr: qr => QRCode.toDataURL(qr,{width:320,margin:2}),
  onSocket: registerMessageHandlers,
  onStatus: next => console.log(`[whatsapp] status: ${next.status}${next.error ? ` — ${next.error}` : ''}`),
})
const startSocket = () => process.env.WA_DISABLED === 'true' ? Promise.resolve() : whatsapp.connect()
const stopSocket = (logout = false) => whatsapp.disconnect(logout)

function normalizePhoneDigits(value) {
  let digits = String(value ?? '').replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0') && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1)
  }
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`
  return digits
}

function toJid(phone) {
  const digits = normalizePhoneDigits(phone)
  if (digits.length < 10 || digits.length > 15) {
    throw new HttpError(400, 'Número de WhatsApp inválido.')
  }
  return `${digits}@s.whatsapp.net`
}

export function incomingPhone(message) {
  const candidates = [
    message?.key?.remoteJidAlt,
    message?.key?.participantAlt,
    message?.key?.remoteJid,
    message?.key?.participant,
    message?.participant,
  ]
  const jid = candidates.find(
    (candidate) => typeof candidate === 'string' && candidate.endsWith('@s.whatsapp.net'),
  )
  if (!jid) return ''
  return normalizePhoneDigits(jid.split('@')[0].split(':')[0])
}

function unwrapMessageContent(message, depth = 0) {
  if (!isRecord(message) || depth > 5) return message
  const wrappers = [
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage',
    'editedMessage',
  ]
  for (const wrapper of wrappers) {
    const nested = message[wrapper]?.message
    if (nested) return unwrapMessageContent(nested, depth + 1)
  }
  return message
}

function incomingContent(message) {
  const content = unwrapMessageContent(message?.message)
  if (!isRecord(content)) return ''

  const text =
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    content.buttonsResponseMessage?.selectedDisplayText ||
    content.listResponseMessage?.title ||
    content.templateButtonReplyMessage?.selectedDisplayText ||
    content.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson

  if (typeof text === 'string' && text.trim()) return text.trim()
  if (content.imageMessage) return '[Imagem recebida]'
  if (content.videoMessage) return '[Vídeo recebido]'
  if (content.audioMessage) return '[Áudio recebido]'
  if (content.documentMessage) return '[Documento recebido]'
  if (content.stickerMessage) return '[Figurinha recebida]'
  if (content.contactMessage || content.contactsArrayMessage) return '[Contato recebido]'
  if (content.locationMessage || content.liveLocationMessage) return '[Localização recebida]'
  return ''
}

function incomingCreatedAt(message) {
  const value = message?.messageTimestamp
  let seconds = 0
  if (typeof value === 'number') seconds = value
  else if (typeof value === 'bigint') seconds = Number(value)
  else if (isRecord(value) && typeof value.low === 'number') seconds = value.low
  const date = seconds > 0 ? new Date(seconds * 1000) : new Date()
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

function createInboundLead(phone, pushName, createdAt) {
  const label = typeof pushName === 'string' && pushName.trim()
    ? pushName.trim()
    : `WhatsApp +${phone}`
  return {
    id: `lead-${randomUUID()}`,
    studentName: label,
    guardianName: '',
    whatsapp: `+${phone}`,
    email: '',
    instagram: '',
    age: undefined,
    birthDate: '',
    city: 'Viçosa',
    neighborhood: '',
    source: 'WhatsApp direto',
    sourceCampaign: '',
    referralBy: '',
    mainInterest: 'Parkour',
    studentType: 'Criança',
    stage: 'new',
    temperature: 'warm',
    recommendedPlan: '',
    recommendedSchedule: '',
    presentedValue: undefined,
    objections: '',
    lostReason: '',
    nextAction: 'Responder no WhatsApp',
    nextActionAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    salesOwner: 'Danilo',
    instructorOwner: 'Danilo',
    internalNotes: '',
    communicationConsent: false,
    doNotContact: false,
    tags: ['Novo', 'WhatsApp', 'Entrada automática'],
    createdAt,
    updatedAt: createdAt,
    lastContactAt: createdAt,
    history: [
      {
        id: `history-${randomUUID()}`,
        type: 'stage',
        description: 'Lead criado automaticamente a partir de mensagem recebida',
        createdAt,
      },
    ],
  }
}

export async function persistIncomingMessage(message) {
  if (message?.key?.fromMe || /@(g.us|broadcast|newsletter)$/.test(message?.key?.remoteJid || '')) return

  const externalId = typeof message?.key?.id === 'string' ? message.key.id : ''
  const phone = incomingPhone(message)
  const content = incomingContent(message)
  if (!externalId || !phone || !content) return

  const createdAt = incomingCreatedAt(message)
  const pushName = typeof message.pushName === 'string' ? message.pushName : ''

  const result = await queueStateMutation((current) => {
    const messages = current.data.crmMessages
    const duplicate = messages.some(
      (item) => item?.externalId === externalId || item?.id === `message-wa-${externalId}`,
    )
    if (duplicate) return current

    const leads = [...current.data.crmLeads]
    let leadIndex = leads.findIndex(
      (lead) => normalizePhoneDigits(lead?.whatsapp) === phone,
    )
    if (leadIndex < 0) {
      leads.unshift(createInboundLead(phone, pushName, createdAt))
      leadIndex = 0
    }

    const lead = leads[leadIndex]
    const historyItem = {
      id: `history-${randomUUID()}`,
      type: 'message',
      description: 'Mensagem recebida pelo WhatsApp',
      createdAt,
    }
    leads[leadIndex] = {
      ...lead,
      lastContactAt: createdAt,
      updatedAt: createdAt,
      history: [historyItem, ...(Array.isArray(lead.history) ? lead.history : [])],
    }

    const crmMessage = {
      id: `message-wa-${externalId}`,
      externalId,
      leadId: lead.id,
      direction: 'incoming',
      channel: 'whatsapp',
      content,
      status: 'received',
      createdAt,
    }

    return {
      ...current,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      data: {
        ...current.data,
        crmLeads: leads,
        crmMessages: [crmMessage, ...messages],
      },
    }
  })

  console.log(`[whatsapp] mensagem recebida de +${phone} (revisão ${result.revision})`)
}

async function persistReceipt(externalId, status) {
  const order = {pending:0,uncertain:0,sending:0,unknown:0,failed:0,sent:1,delivered:2,read:3}
  return queueStateMutation(current => {
    const message = current.data.crmMessages.find(x => x.externalId === externalId && x.direction === 'outgoing')
    if (!message || (order[message.status] || 0) >= order[status]) return current
    return {...current,revision:current.revision+1,updatedAt:new Date().toISOString(),data:{...current.data,crmMessages:current.data.crmMessages.map(x=>x.id===message.id?{...x,status,...(status==='read'?{readAt:new Date().toISOString()}:status==='delivered'?{deliveredAt:new Date().toISOString()}: {})}:x)}}
  })
}

function registerMessageHandlers(socket, active) {
    socket.ev.on('messages.upsert', update => {
      if (!active() || update?.type !== 'notify' || !Array.isArray(update.messages)) return
      for (const message of update.messages) void (async()=>{
        if (!incomingPhone(message) && message.key?.remoteJid?.endsWith('@lid')) {
          const pn = await socket.signalRepository?.lidMapping?.getPNForLID(message.key.remoteJid)
          if (pn) message.key.remoteJidAlt = pn
        }
        if (active()) await persistIncomingMessage(message)
      })().catch(error=>console.error('[whatsapp] mensagem não persistida:',error.message))
    })
    socket.ev.on('messages.update', updates=>{if(!active())return;for(const {key,update}of updates){const status=update.status>=4?'read':update.status===3?'delivered':update.status===2?'sent':null;if(status&&key.id)void persistReceipt(key.id,status).catch(error=>console.error('[whatsapp] recibo:',error.message))}})
    socket.ev.on('message-receipt.update', updates=>{if(!active())return;for(const {key,receipt}of updates){const status=receipt.readTimestamp||receipt.playedTimestamp?'read':receipt.receiptTimestamp?'delivered':null;if(status&&key.id)void persistReceipt(key.id,status).catch(error=>console.error('[whatsapp] recibo:',error.message))}})
}

export async function sendCrmMessage(body, transport = whatsapp.socket) {
  if (!isRecord(body) || typeof body.leadId !== 'string' || typeof body.clientMessageId !== 'string' || !/^[a-zA-Z0-9_-]{8,150}$/.test(body.clientMessageId) || typeof body.content !== 'string' || !body.content.trim() || body.content.length>20000) throw new HttpError(400,'Informe leadId, clientMessageId e uma mensagem de até 20.000 caracteres.')
  const key=body.clientMessageId
  if(sendOperations.has(key)){const existing=sendOperations.get(key);if(existing.leadId!==body.leadId||existing.content!==body.content.trim())throw new HttpError(409,'Identificador de mensagem já utilizado para outro conteúdo.');return existing.promise}
  const operation=(async()=>{
    let shouldSend=false, phone='', plannedExternalId=''
    let state=await queueStateMutation(current=>{
      const previous=current.data.crmMessages.find(x=>x.clientMessageId===key)
      if(previous){if(previous.leadId!==body.leadId||previous.content!==body.content.trim())throw new HttpError(409,'Identificador de mensagem já utilizado para outro conteúdo.');return current}
      const lead=current.data.crmLeads.find(x=>x.id===body.leadId)
      if(!lead)throw new HttpError(404,'Contato não encontrado. Salve o contato antes de enviar.')
      if(lead.doNotContact)throw new HttpError(403,'Este contato solicitou não receber mensagens.')
      phone=toJid(lead.whatsapp)
      shouldSend=!!transport&&(transport!==whatsapp.socket||whatsapp.snapshot.status==='connected')
      const now=new Date().toISOString()
      plannedExternalId=shouldSend?generateMessageIDV2():''
      const message={id:`message-${randomUUID()}`,...(plannedExternalId?{externalId:plannedExternalId}:{}),clientMessageId:key,leadId:lead.id,direction:'outgoing',channel:'whatsapp',content:body.content.trim(),status:shouldSend?'pending':'failed',createdAt:now,...(!shouldSend?{error:'WhatsApp não está conectado. Conecte o aparelho e tente novamente.'}:{})}
      return {...current,revision:current.revision+1,updatedAt:now,data:{...current.data,crmMessages:[message,...current.data.crmMessages]}}
    })
    let message=state.data.crmMessages.find(x=>x.clientMessageId===key)
    if(!shouldSend)return {externalId:message.externalId||'',message,state}
    let externalId='', failure='', attempted=false
    try {const current=await getSharedState();if(current.data.crmLeads.find(x=>x.id===body.leadId)?.doNotContact)throw new Error('Este contato solicitou não receber mensagens.');attempted=true;const sent=await transport.sendMessage(phone,{text:body.content.trim()},{messageId:plannedExternalId});externalId=sent?.key?.id||'';if(!externalId)throw new Error('O WhatsApp não confirmou o envio. Verifique no aparelho antes de tentar novamente.')} catch(error){failure=(error.message||'O WhatsApp não confirmou o envio.')+(attempted?' Confira no celular antes de reenviar.':'')}
    state=await queueStateMutation(current=>{
      const now=new Date().toISOString()
      return {...current,revision:current.revision+1,updatedAt:now,data:{...current.data,crmMessages:current.data.crmMessages.map(x=>x.clientMessageId===key?{...x,status:failure?(attempted?'uncertain':'failed'):['delivered','read'].includes(x.status)?x.status:'sent',...(externalId?{externalId}:{}),...(failure?{error:failure}:{})}:x),crmLeads:current.data.crmLeads.map(x=>x.id===body.leadId&&!failure?{...x,lastContactAt:now,updatedAt:now,history:[{id:`history-${randomUUID()}`,type:'message',description:'Mensagem enviada pelo WhatsApp',createdAt:now},...x.history]}:x)}}
    })
    message=state.data.crmMessages.find(x=>x.clientMessageId===key)
    return {externalId,message,state}
  })()
  sendOperations.set(key,{promise:operation,leadId:body.leadId,content:body.content.trim()})
  try{return await operation}finally{sendOperations.delete(key)}
}

async function readJsonBody(req, maxBytes = MAX_JSON_BODY_BYTES) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > maxBytes) {
      throw new HttpError(413, 'Corpo da requisição excede o limite permitido.')
    }
    chunks.push(chunk)
  }

  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (!isRecord(parsed)) throw new Error('Objeto obrigatório.')
    return parsed
  } catch {
    throw new HttpError(400, 'O corpo da requisição não é um JSON válido.')
  }
}

function json(res, status, data, headers = {}) {
  res.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  })
  res.end(JSON.stringify(data))
}

async function fileInfo(path) {
  try {
    const info = await stat(path)
    return info.isFile() ? info : null
  } catch (error) {
    if (error?.code === 'ENOENT' || error?.code === 'ENOTDIR') return null
    throw error
  }
}

async function sendFile(req, res, path, info) {
  const extension = extname(path).toLowerCase()
  const headers = {
    'Content-Length': info.size,
    'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
  }
  headers['Cache-Control'] = path.includes(`${sep}assets${sep}`)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache'

  res.writeHead(200, headers)
  if (req.method === 'HEAD') {
    res.end()
    return
  }

  const stream = createReadStream(path)
  stream.on('error', (error) => {
    console.error(`[server] falha ao servir ${path}: ${error.message}`)
    if (!res.headersSent) json(res, 500, { error: 'Falha ao ler arquivo estático.' })
    else res.destroy(error)
  })
  stream.pipe(res)
}

async function serveProductionApp(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false
  if (!existsSync(DIST_INDEX)) return false

  let pathname
  try {
    pathname = decodeURIComponent(url.pathname)
  } catch {
    throw new HttpError(400, 'Caminho inválido.')
  }

  if (pathname.includes('\0')) throw new HttpError(400, 'Caminho inválido.')
  const candidate = resolve(DIST_DIR, `.${pathname}`)
  const insideDist = candidate === DIST_DIR || candidate.startsWith(`${DIST_DIR}${sep}`)
  if (!insideDist) throw new HttpError(403, 'Caminho não autorizado.')

  const info = await fileInfo(candidate)
  if (info) {
    await sendFile(req, res, candidate, info)
    return true
  }

  // Rotas sem extensão são entregues ao React; assets ausentes continuam 404.
  if (!extname(pathname)) {
    const indexInfo = await fileInfo(DIST_INDEX)
    if (indexInfo) {
      await sendFile(req, res, DIST_INDEX, indexInfo)
      return true
    }
  }
  return false
}

const authReady = createAuth(DATA_DIR)
export const server = createServer(async (req,res) => {
  res.setHeader('X-Content-Type-Options','nosniff')
  res.setHeader('Referrer-Policy','same-origin')
  res.setHeader('X-Frame-Options','DENY')
  try {
    const url=new URL(req.url??'/','http://localhost'),route=`${req.method} ${url.pathname}`
    if(url.pathname.startsWith('/api/'))enforceOrigin(req,res)
    if(req.method==='OPTIONS'){res.writeHead(204);res.end();return}
    const auth=await authReady
    const authentication=await auth.route(req,res,url.pathname,readJsonBody)
    if(authentication!==undefined)return json(res,200,authentication)
    if(route==='GET /api/health'||route==='GET /health')return json(res,200,{ok:true,app:APP_ID,version:DATA_SCHEMA_VERSION,servesFrontend:existsSync(DIST_INDEX)})
    if(url.pathname.startsWith('/api/')){
      const {user}=auth.requireUser(req)
      if(route==='GET /api/data'||route==='GET /api/backup'){
        if(route.includes('backup'))auth.requireUser(req,'admin')
        const state=filterState(await getSharedState(),user)
        return json(res,200,state,{ETag:stateEtag(state),...(route.includes('backup')?{'Content-Disposition':`attachment; filename="parkour-backup-${new Date().toISOString().slice(0,10)}.json"`}:{})})
      }
      if(route==='PUT /api/data'||route==='POST /api/backup'){
        if(route.includes('backup'))auth.requireUser(req,'admin')
        const body=await readJsonBody(req)
        if(!isRecord(body)||!Number.isSafeInteger(body.revision)||body.revision<0)throw new HttpError(400,'Informe uma revisão válida do estado atual.')
        if(body.app!==undefined&&body.app!==APP_ID)throw new HttpError(400,'Este arquivo pertence a outro aplicativo.')
        if(body.version!==undefined&&!(route.includes('backup')?[1,2,3].includes(body.version):body.version===DATA_SCHEMA_VERSION))throw new HttpError(400,'Versão de dados incompatível.')
        const state=await queueStateMutation(current=>{
          if(body.revision!==current.revision)throw new HttpError(409,'O estado foi alterado por outro dispositivo.',{current:filterState(current,user)})
          const data=authorizedData(current,body.data,user)
          if(!route.includes('backup')){
            // Provider messages and receipts are server-owned; an old browser cannot erase or forge them.
            const protectedMessages=current.data.crmMessages.filter(x=>x.externalId||x.clientMessageId)
            if(user.role==='admin'&&protectedMessages.some(x=>!data.crmLeads.some(lead=>lead.id===x.leadId)))throw new HttpError(400,'Não é possível excluir um contato com histórico de WhatsApp. Marque-o como perdido ou não contatar.')
            if(user.role==='admin')data.crmMessages=[...data.crmMessages.filter(x=>!x.externalId&&!x.clientMessageId),...protectedMessages]
          }
          return {...current,revision:current.revision+1,updatedAt:new Date().toISOString(),data}
        })
        const visible=filterState(state,user)
        return json(res,200,visible,{ETag:stateEtag(visible)})
      }
      if(url.pathname.startsWith('/api/whatsapp/'))auth.requireUser(req,'admin')
      if(route==='GET /api/whatsapp/status')return json(res,200,whatsapp.snapshot)
      if(route==='POST /api/whatsapp/connect'){
        if(process.env.WA_DISABLED==='true')throw new HttpError(503,'WhatsApp desativado neste ambiente de teste.')
        await startSocket()
        return json(res,200,whatsapp.snapshot)
      }
      if(route==='POST /api/whatsapp/pairing-code'){
        const body=await readJsonBody(req,4096)
        if(!isRecord(body)||typeof body.phoneNumber!=='string'||body.phoneNumber.length>40)throw new HttpError(400,'Informe o número do WhatsApp com DDD.')
        const phone=normalizePhoneDigits(body.phoneNumber)
        if(!/^[1-9][0-9]{9,14}$/.test(phone))throw new HttpError(400,'Número de WhatsApp inválido.')
        if(process.env.WA_DISABLED==='true')throw new HttpError(503,'WhatsApp desativado neste ambiente de teste.')
        return json(res,200,await whatsapp.pairWithPhone(phone))
      }
      if(route==='POST /api/whatsapp/disconnect'){await stopSocket(true);return json(res,200,{ok:true})}
      if(route==='POST /api/whatsapp/messages'){const result=await sendCrmMessage(await readJsonBody(req,128*1024));return json(res,result.message.status==='failed'?409:200,{...result,...(result.message.error?{error:result.message.error}:{})})}
      return json(res,404,{error:'Rota de API não encontrada.'})
    }
    if(await serveProductionApp(req,res,url))return
    return json(res,404,{error:existsSync(DIST_INDEX)?'Rota não encontrada.':'Build do frontend não encontrado. Execute npm run build.'})
  } catch(error){
    const status=error instanceof HttpError?error.status:500
    if(status===409&&error.details?.current)return json(res,409,error.details.current,{ETag:stateEtag(error.details.current)})
    if(status===500)console.error('[server] falha:',error)
    return json(res,status,{error:status===500?'Não foi possível concluir a operação. Verifique o servidor e tente novamente.':error.message,...(error.details||{})})
  }
})
server.once('close',releaseDataLock)
server.requestTimeout=30000
server.headersTimeout=15000

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.log(`[server] porta ${PORT} já em uso — outro servidor pode já estar rodando.`)
    process.exit(1)
  }
  throw error
})

async function main() {
  await Promise.all([dataReady,authReady])
  await queueStateMutation(current=>{const interrupted=current.data.crmMessages.some(x=>['sending','pending'].includes(x.status));return interrupted?{...current,revision:current.revision+1,updatedAt:new Date().toISOString(),data:{...current.data,crmMessages:current.data.crmMessages.map(x=>['sending','pending'].includes(x.status)?{...x,status:'uncertain',error:'O servidor reiniciou durante o envio. Confira no WhatsApp antes de reenviar.'}:x)}}:current})
  server.listen(PORT, process.env.HOST || '0.0.0.0', () => {
    console.log(`[server] CRM e WhatsApp em http://0.0.0.0:${PORT}`)
    console.log(`[server] dados compartilhados em ${DATA_FILE}`)
    if (existsSync(DIST_INDEX)) console.log(`[server] frontend de produção em ${DIST_DIR}`)

    if (existsSync(join(SESSION_DIR, 'auth-state.json')) && process.env.WA_DISABLED !== 'true') {
      // Restore only through the serialized connection manager.
      void startSocket()
    }
  })
}

if (process.env.SERVER_NO_LISTEN !== 'true') void main().catch((error) => {
  console.error(`[server] falha ao iniciar: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})

export { getSharedState, queueStateMutation, persistReceipt, dataReady }
process.once('SIGTERM',()=>{void stopSocket(false).finally(()=>server.close(()=>process.exit(0)))})
process.once('SIGINT',()=>{void stopSocket(false).finally(()=>server.close(()=>process.exit(0)))})
