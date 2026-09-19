import { randomBytes, randomUUID, scrypt as scryptCallback, createHash, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { readFile, rm } from 'node:fs/promises'
import { atomicJson, atomicText } from './storage.mjs'

const scrypt = promisify(scryptCallback)
export class HttpError extends Error { constructor(status, message, details) { super(message); this.status = status; this.details = details } }
export const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value)
const hash = (value) => createHash('sha256').update(value).digest('hex')
const equal = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))
const safeUser = ({ id, username, name, role, active, instructorId, createdAt }) => ({ id, username, name, role, active, instructorId, createdAt })
const validatePassword = (password) => { if (typeof password !== 'string' || password.length < 10 || password.length > 256) throw new HttpError(400, 'A senha deve ter entre 10 e 256 caracteres.') }
async function passwordHash(password) { validatePassword(password); const salt = randomBytes(16).toString('hex'); return `${salt}:${(await scrypt(password, salt, 64)).toString('hex')}` }
async function verifyPassword(password, stored) { const [salt, expected] = (stored || '').split(':'); if (typeof password !== 'string' || password.length > 256 || !salt || !expected) return false; return equal((await scrypt(password, salt, 64)).toString('hex'), expected) }
function userFields(body, create = false) {
  const result = {}
  if (create || body.username !== undefined) { if (typeof body.username !== 'string' || !/^[a-zA-Z0-9_.@-]{3,80}$/.test(body.username.trim())) throw new HttpError(400, 'Usuário deve ter 3 a 80 letras, números, ponto, hífen ou @.'); result.username = body.username.trim().toLowerCase() }
  if (create || body.name !== undefined) { if (typeof body.name !== 'string' || body.name.trim().length < 2 || body.name.length > 120) throw new HttpError(400, 'Informe um nome de 2 a 120 caracteres.'); result.name = body.name.trim() }
  if (create || body.role !== undefined) { if (!['admin','trainer'].includes(body.role)) throw new HttpError(400, 'Perfil inválido.'); result.role = body.role }
  if (body.active !== undefined) { if (typeof body.active !== 'boolean') throw new HttpError(400, 'active deve ser booleano.'); result.active = body.active }
  if (body.instructorId !== undefined) { if (typeof body.instructorId !== 'string' || body.instructorId.length > 150) throw new HttpError(400, 'Treinador inválido.'); result.instructorId = body.instructorId }
  return result
}

export async function createAuth(dataDir) {
  const file = join(dataDir, 'auth.json'), tokenFile = join(dataDir, 'setup-token')
  let auth
  try { auth = JSON.parse(await readFile(file, 'utf8')); if (!Array.isArray(auth.users) || !Array.isArray(auth.sessions)) throw new Error('Arquivo de contas inválido.') } catch (error) { if (error.code !== 'ENOENT') throw error; auth = { users: [], sessions: [] }; await atomicJson(file, auth) }
  let setupToken = ''
  if (!auth.users.length) { try { setupToken = (await readFile(tokenFile, 'utf8')).trim() } catch (error) { if (error.code !== 'ENOENT') throw error; setupToken = randomBytes(24).toString('base64url'); await atomicText(tokenFile, setupToken + '\n') } }
  let tail = Promise.resolve()
  const update = (fn) => { const operation = tail.then(async () => { const next = structuredClone(auth); const result = await fn(next); await atomicJson(file, next); auth = next; return result }); tail = operation.catch(() => {}); return operation }
  const attempts = new Map()
  function throttle(req) { const key = req.socket.remoteAddress || 'unknown'; const now = Date.now(); let entry = attempts.get(key); if (!entry || entry.until < now) { entry = {count:0,until:now+15*60_000}; attempts.set(key,entry) } if (++entry.count > 20) throw new HttpError(429, 'Muitas tentativas. Aguarde 15 minutos.'); if (attempts.size > 10000) for (const [k,v] of attempts) if (v.until < now) attempts.delete(k) }
  function secureCookie(req) { return req.socket.encrypted || process.env.COOKIE_SECURE === 'true' }
  function cookie(req, res, value, age) { res.setHeader('Set-Cookie', `pv_session=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${secureCookie(req) ? '; Secure' : ''}`) }
  function session(req) { const value = String(req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('pv_session='))?.slice(11); if (!value) return null; const item = auth.sessions.find(x=>x.tokenHash === hash(value) && x.expiresAt > Date.now()); const user = item && auth.users.find(x=>x.id === item.userId && x.active); return user ? {session:item,user} : null }
  function requireUser(req, role) { const current = session(req); if (!current) throw new HttpError(401,'Entre na sua conta para continuar.'); if (role && current.user.role !== role) throw new HttpError(403,'Somente administradores podem executar esta ação.'); if (!['GET','HEAD','OPTIONS'].includes(req.method) && !equal(req.headers['x-csrf-token'],current.session.csrfToken)) throw new HttpError(403,'Sessão inválida. Atualize a página e tente novamente.'); return current }
  function issue(next, user, req, res, remember = false) { const raw = randomBytes(32).toString('base64url'), csrfToken = randomBytes(24).toString('base64url'); const lifetime = remember ? 30*86400 : 12*3600; next.sessions = next.sessions.filter(x=>x.expiresAt > Date.now()).slice(-1000); next.sessions.push({tokenHash:hash(raw),userId:user.id,csrfToken,expiresAt:Date.now()+lifetime*1000}); cookie(req,res,raw,lifetime); return {user:safeUser(user),csrfToken} }
  function isLocalBootstrap(req) { const address = req.socket.remoteAddress; if (!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(address)) return false; if (req.headers.forwarded || req.headers['x-forwarded-for'] || req.headers['x-real-ip']) return false; try { return ['localhost','127.0.0.1','[::1]'].includes(new URL(`http://${req.headers.host}`).hostname) } catch { return false } }
  return {
    requireUser,
    async route(req,res,path,bodyReader) {
      const route = `${req.method} ${path}`
      if (route === 'GET /api/auth/status') { const current=session(req); return {user: current ? safeUser(current.user) : null, csrfToken:current?.session.csrfToken, setupRequired:!auth.users.length, needsSetup:!auth.users.length, bootstrapToken:!auth.users.length && isLocalBootstrap(req) ? setupToken : undefined} }
      if (route === 'POST /api/auth/setup') { throttle(req); const body=await bodyReader(req,32*1024); if (!isRecord(body)) throw new HttpError(400,'Dados inválidos.'); return update(async next=> { if(next.users.length) throw new HttpError(409,'O administrador já foi criado.'); if(!equal(body.setupToken,setupToken)) throw new HttpError(403,'Código de configuração inválido. Abra este painel no computador do servidor ou consulte o arquivo setup-token.'); const user={id:randomUUID(),...userFields({...body,role:'admin'},true),active:true,passwordHash:await passwordHash(body.password),createdAt:new Date().toISOString()}; next.users.push(user); return issue(next,user,req,res) }).then(async result=>{ setupToken=''; await rm(tokenFile,{force:true}); return result }) }
      if (route === 'POST /api/auth/login') { throttle(req); const body=await bodyReader(req,32*1024); if (!isRecord(body)) throw new HttpError(400,'Dados inválidos.'); return update(async next=> { const user=next.users.find(x=>x.username===String(body.username||'').trim().toLowerCase()&&x.active); if (!user || !await verifyPassword(body.password,user.passwordHash)) throw new HttpError(401,'Usuário ou senha inválidos.'); return issue(next,user,req,res,body.remember===true) }) }
      if (route === 'POST /api/auth/logout') { const current=requireUser(req); return update(next=>{next.sessions=next.sessions.filter(x=>x.tokenHash!==current.session.tokenHash);cookie(req,res,'',0);return {ok:true}}) }
      if (route === 'POST /api/auth/password') { const current=requireUser(req);const body=await bodyReader(req,32*1024);return update(async next=>{const user=next.users.find(x=>x.id===current.user.id);if(!await verifyPassword(body.currentPassword,user.passwordHash)) throw new HttpError(400,'Senha atual incorreta.');user.passwordHash=await passwordHash(body.newPassword);next.sessions=next.sessions.filter(x=>x.userId!==user.id);return issue(next,user,req,res)}) }
      if (route === 'GET /api/users') { requireUser(req,'admin');return {users:auth.users.map(safeUser)} }
      if (route === 'POST /api/users') { requireUser(req,'admin');const body=await bodyReader(req,32*1024);if(!isRecord(body))throw new HttpError(400,'Dados inválidos.');return update(async next=>{const fields=userFields(body,true);if(next.users.some(x=>x.username===fields.username)) throw new HttpError(409,'Este usuário já existe.');const user={id:randomUUID(),...fields,active:true,passwordHash:await passwordHash(body.password),createdAt:new Date().toISOString()};next.users.push(user);return {user:safeUser(user)}}) }
      if (req.method === 'PATCH' && /^\/api\/users\/[^/]+$/.test(path)) {const current=requireUser(req,'admin');const id=decodeURIComponent(path.split('/').pop());const body=await bodyReader(req,32*1024);if(!isRecord(body))throw new HttpError(400,'Dados inválidos.');return update(async next=>{const user=next.users.find(x=>x.id===id);if(!user) throw new HttpError(404,'Conta não encontrada.');const fields=userFields(body);if(fields.username&&next.users.some(x=>x.id!==id&&x.username===fields.username))throw new HttpError(409,'Este usuário já existe.');if(id===current.user.id&&(fields.active===false||fields.role==='trainer'))throw new HttpError(400,'Você não pode remover seu próprio acesso administrativo.');Object.assign(user,fields);if(!next.users.some(x=>x.active&&x.role==='admin'))throw new HttpError(400,'É necessário manter um administrador ativo.');if(body.password!==undefined)user.passwordHash=await passwordHash(body.password);if(body.password!==undefined||fields.active===false||fields.role!==undefined)next.sessions=next.sessions.filter(x=>x.userId!==id);return {user:safeUser(user)}})}
      return undefined
    }
  }
}

export function enforceOrigin(req,res) {
  const origin=req.headers.origin
  let sameOrigin=false
  if(origin){try{const parsed=new URL(origin);sameOrigin=['http:','https:'].includes(parsed.protocol)&&parsed.host===req.headers.host}catch{/* malformed */}}
  const explicitlyAllowed=String(process.env.CRM_ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean).includes(origin)
  if(origin&&!sameOrigin&&!explicitlyAllowed) throw new HttpError(403,'Origem não autorizada.')
  if(req.headers['sec-fetch-site']==='cross-site'&&!explicitlyAllowed)throw new HttpError(403,'Requisição entre sites bloqueada.')
  if(origin&&(sameOrigin||explicitlyAllowed)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin')}
  res.setHeader('Access-Control-Allow-Methods','GET, HEAD, POST, PUT, PATCH, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers','Content-Type, X-CSRF-Token, If-Match')
  res.setHeader('Access-Control-Expose-Headers','ETag')
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&!String(req.headers['content-type']||'').toLowerCase().startsWith('application/json'))throw new HttpError(415,'Use Content-Type application/json.')
}
