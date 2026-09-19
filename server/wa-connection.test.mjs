import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { useAtomicAuthState, resetAuthState } from './wa-auth.mjs'
import { createWhatsAppConnection } from './wa-connection.mjs'

// Deliberately use the repository volume (including external/fuseblk drives),
// rather than only /tmp, which did not reproduce the installed environment.
const parent = dirname(fileURLToPath(import.meta.url))
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
const tick = () => new Promise(resolve => setTimeout(resolve, 10))
async function fixture(t, overrides = {}) {
  const directory = await mkdtemp(join(parent, '.wa-session-test-'))
  const sockets = []
  const manager = createWhatsAppConnection({directory, retryDelay: 1, renderQr: async qr => `data:image/png;base64,${qr}`, makeSocket: state => {
    const socket = {ev: new EventEmitter(), user: { id: '5500000000000:1@s.whatsapp.net' }, state, logout: async () => {}, end: async () => {}}
    sockets.push(socket); return socket
  }, ...overrides})
  t.after(async () => { await manager.disconnect(true); await rm(directory, {recursive:true,force:true,maxRetries:5}) })
  return {directory, sockets, manager}
}
const closeEvent = code => ({connection:'close',lastDisconnect:{error:{output:{statusCode:code}}}})

await test('credenciais e chaves Signal persistem no volume da instalação; reset não é recriado por gravações tardias', async t => {
  const {directory} = await fixture(t)
  const auth = await useAtomicAuthState(directory)
  auth.state.creds.me = {id:'5500000000000@s.whatsapp.net'}
  await Promise.all([auth.saveCreds(), auth.state.keys.set({'session':{one:Buffer.from([0,12,255])}})])
  await auth.close()
  const reopened = await useAtomicAuthState(directory)
  assert.equal(reopened.state.creds.me.id, '5500000000000@s.whatsapp.net')
  assert.deepEqual((await reopened.state.keys.get('session',['one'])).one, Buffer.from([0,12,255]))
  await reopened.close()
  await resetAuthState(directory)
  await Promise.all([auth.saveCreds(), reopened.state.keys.set({session:{late:Buffer.from('late')}})])
  await assert.rejects(readFile(join(directory,'auth-state.json')), {code:'ENOENT'})
})
await test('flush informa falhas reais de persistência, sem engolir erro', async t => {
  const {directory} = await fixture(t)
  const auth = await useAtomicAuthState(directory)
  await rm(directory,{recursive:true,force:true})
  await writeFile(directory,'not a directory')
  await assert.rejects(auth.saveCreds())
  await assert.rejects(auth.flush())
  await assert.rejects(auth.close())
})
await test('reconexão 515 espera todas as credenciais e ignora eventos antigos', async t => {
  const barrier = deferred()
  let reopened = 0
  const {manager,sockets} = await fixture(t, {openAuth: async () => {
    reopened++
    return {state:{}, saveCreds:async()=>{}, flush:async()=>{}, close:async()=>{if(reopened===1)await barrier.promise}}
  }})
  await manager.connect()
  const previous = sockets[0]
  previous.ev.emit('connection.update',closeEvent(515))
  await tick(); assert.equal(reopened,1)
  barrier.resolve(); await tick(); await tick()
  assert.equal(reopened,2)
  previous.ev.emit('connection.update',{connection:'open'})
  previous.ev.emit('connection.update',{qr:'stale'})
  await manager.idle(); assert.equal(manager.snapshot.status,'connecting')
  sockets[1].ev.emit('connection.update',{connection:'open'})
  await manager.idle(); assert.equal(manager.snapshot.status,'connected')
})
await test('falha ao salvar encerra socket e mantém diagnóstico de erro', async t => {
  let ended = false
  const {manager,sockets} = await fixture(t, {openAuth:async()=>({state:{},saveCreds:async()=>{throw new Error('Disk full')},flush:async()=>{},close:async()=>{}})})
  await manager.connect()
  sockets[0].end = async () => { ended = true }
  sockets[0].ev.emit('creds.update',{})
  await tick(); await manager.idle()
  assert.equal(ended,true); assert.equal(manager.snapshot.status,'error')
  assert.match(manager.snapshot.error,/Reiniciar sessão/)
})
await test('reset de sessão inválida gera nova conexão; cancelar impede recriação tardia', async t => {
  const {manager,sockets,directory} = await fixture(t)
  await manager.connect()
  const previous = sockets[0]
  previous.ev.emit('connection.update',closeEvent(500))
  await manager.idle(); assert.equal(manager.snapshot.status,'error')
  await manager.disconnect(true); await manager.connect()
  assert.equal(sockets.length,2)
  await manager.disconnect(true)
  sockets[1].ev.emit('creds.update',{})
  sockets[1].ev.emit('connection.update',{qr:'late'})
  await tick(); assert.equal(manager.snapshot.status,'disconnected')
  assert.equal(manager.snapshot.qrCodeDataUrl,undefined)
  await assert.rejects(readFile(join(directory,'auth-state.json')),{code:'ENOENT'})
})
await test('cancelamento enquanto abre armazenamento é serializado e remove a sessão após drenar', async t => {
  const barrier = deferred()
  const {manager,sockets,directory} = await fixture(t,{openAuth:async dir=>{await barrier.promise;return useAtomicAuthState(dir)}})
  const connecting=manager.connect(), stopping=manager.disconnect(true)
  barrier.resolve(); await Promise.all([connecting,stopping])
  assert.equal(sockets.length,1); assert.equal(manager.socket,null)
  assert.equal(manager.snapshot.status,'disconnected')
  await assert.rejects(readFile(join(directory,'auth-state.json')),{code:'ENOENT'})
})
await test('QR lento não substitui confirmação de conexão e é removido em logout remoto', async t => {
  const barrier = deferred()
  const {manager,sockets,directory} = await fixture(t,{renderQr:async()=>{await barrier.promise;return 'data:image/png;base64,real-provider-event'}})
  await manager.connect()
  sockets[0].ev.emit('connection.update',{qr:'provider-reference'})
  sockets[0].ev.emit('connection.update',{connection:'open'})
  barrier.resolve(); await manager.idle()
  assert.equal(manager.snapshot.status,'connected');assert.equal(manager.snapshot.qrCodeDataUrl,undefined)
  sockets[0].ev.emit('connection.update',closeEvent(401))
  await manager.idle();assert.equal(manager.snapshot.status,'disconnected')
  await assert.rejects(readFile(join(directory,'auth-state.json')),{code:'ENOENT'})
})
await test('QR provém exclusivamente de evento do socket e inclui validade', async t => {
  const {manager,sockets} = await fixture(t)
  await manager.connect();assert.equal(manager.snapshot.qrCodeDataUrl,undefined)
  sockets[0].ev.emit('connection.update',{qr:'provider-reference'})
  await manager.idle()
  assert.equal(manager.snapshot.status,'waiting_qr')
  assert.equal(manager.snapshot.qrCodeDataUrl,'data:image/png;base64,provider-reference')
  assert.ok(Date.parse(manager.snapshot.qrExpiresAt)>Date.now())
})
await test('falha de QR antigo não encerra uma nova conexão enfileirada', async t => {
  const barrier = deferred()
  const {manager,sockets} = await fixture(t,{renderQr:async()=>{await barrier.promise;throw new Error('old QR failed')}})
  await manager.connect()
  sockets[0].ev.emit('connection.update',{qr:'old'})
  const stopping=manager.disconnect(true), restarting=manager.connect()
  barrier.resolve(); await Promise.all([stopping,restarting]);await tick();await manager.idle()
  assert.equal(sockets.length,2)
  assert.equal(manager.socket,sockets[1]);assert.equal(manager.snapshot.status,'connecting')
})
await test('falha ao reiniciar armazenamento nunca mantém status conectado', async t => {
  let failReset = true
  const {manager,sockets} = await fixture(t,{resetAuth:async dir=>{if(failReset)throw new Error('EACCES rename');await resetAuthState(dir)}})
  await manager.connect();sockets[0].ev.emit('connection.update',{connection:'open'});await manager.idle()
  assert.equal(manager.snapshot.status,'connected')
  await assert.rejects(manager.disconnect(true),/EACCES/)
  assert.equal(manager.socket,null);assert.equal(manager.snapshot.status,'error');assert.ok(manager.snapshot.error)
  failReset=false
})
