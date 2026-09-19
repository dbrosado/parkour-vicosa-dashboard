import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { createEmptyData } from './validation.mjs'

const directory=await mkdtemp(join(tmpdir(),'parkour-server-test-'))
process.env.DATA_DIR=directory
process.env.WA_SESSION_DIR=join(directory,'wa')
process.env.WA_DISABLED='true'
process.env.SERVER_NO_LISTEN='true'
const mod=await import('./whatsapp-server.mjs')
await mod.dataReady
await new Promise(resolve=>mod.server.listen(0,'127.0.0.1',resolve))
const port=mod.server.address().port
const base=`http://127.0.0.1:${port}`
let admin={},trainer={}
async function request(path,method='GET',body,session={},extra={}){
 const response=await fetch(base+path,{method,headers:{...(body!==undefined?{'content-type':'application/json'}:{}),...(session.cookie?{cookie:session.cookie}:{}),...(session.csrfToken?{'x-csrf-token':session.csrfToken}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)})
 const data=await response.json()
 const cookie=response.headers.get('set-cookie')?.split(';')[0]
 return {status:response.status,data,cookie,headers:response.headers}
}
const student={id:'s1',name:'Aluno real',birthDate:'2012-05-20',parentName:'Responsável privado',parentContact:'31999999999',emergencyPhone:'31988888888',status:'Ativo',allergies:'Alergia relevante',monthlyFee:210,paymentStatus:'Em dia',registrationStatus:'Completo',plan:'Mensal',classSlots:['segunda-0900'],attendanceHistory:[],paymentHistory:[{id:'p1',date:'2026-09-01',monthReference:'2026-09',amount:210,amountPaid:50,status:'pending',dueDate:'2026-09-10',receipts:[{id:'r1',date:'2026-09-01',amount:50,method:'Pix'}]}],physicalAssessments:[],conditioningTests:[],skillAchievements:[]}
const lead={id:'l1',studentName:'Contato real',whatsapp:'+5531999999999',stage:'new',tags:[],history:[],doNotContact:false,communicationConsent:false}
await test('servidor CRM integrado',async t=>{
 await t.test('bloqueia dados, WhatsApp, backup e contas sem autenticação',async()=>{
  for(const path of ['/api/data','/api/whatsapp/status','/api/backup','/api/users'])assert.equal((await request(path)).status,401)
  assert.equal((await request('/api/auth/status','GET',undefined,{}, {origin:'https://evil.test'})).status,403)
 })
 await t.test('configuração única com token local e senha protegida',async()=>{
  const status=await request('/api/auth/status');assert.equal(status.data.needsSetup,true);assert.ok(status.data.bootstrapToken)
  assert.equal((await request('/api/auth/status','GET',undefined,{}, {'x-forwarded-for':'203.0.113.1'})).data.bootstrapToken,undefined)
  assert.equal((await request('/api/auth/setup','POST',{setupToken:'invalid',name:'Admin',username:'admin',password:'senha-admin-segura'})).status,403)
  const created=await request('/api/auth/setup','POST',{setupToken:status.data.bootstrapToken,name:'Administrador',username:'admin',password:'senha-admin-segura'})
  assert.equal(created.status,200);assert.match(created.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);admin={cookie:created.cookie,csrfToken:created.data.csrfToken};assert.equal(created.data.user.role,'admin')
  assert.equal((await request('/api/auth/setup','POST',{})).status,409)
  const stored=await readFile(join(directory,'auth.json'),'utf8');assert.ok(!stored.includes('senha-admin-segura'));assert.ok(!stored.includes(admin.cookie.split('=')[1]));assert.equal((await request('/api/auth/status')).data.bootstrapToken,undefined)
 })
 await t.test('exige CSRF, revisão e validação profunda antes de gravar',async()=>{
  assert.equal((await request('/api/data','PUT',{revision:0,data:createEmptyData()},{cookie:admin.cookie})).status,403)
  assert.equal((await request('/api/data','PUT',{data:createEmptyData()},admin)).status,400)
  assert.equal((await request('/api/data','PUT',{revision:0,data:{...createEmptyData(),students:[null]}},admin)).status,400)
  assert.equal((await request('/api/data','PUT',{revision:0,data:{...createEmptyData(),evil:[]}},admin)).status,400)
  const data={...createEmptyData(),students:[student],crmLeads:[lead],operationalExpenses:[{id:'e1',description:'Aluguel',amount:2500,category:'aluguel',monthReference:'2026-09'}]}
  assert.equal((await request('/api/data','PUT',{revision:0,data},admin)).status,200)
  const conflict=await request('/api/data','PUT',{revision:0,data:createEmptyData()},admin);assert.equal(conflict.status,409);assert.equal(conflict.data.revision,1);assert.equal(conflict.data.data.students.length,1)
  assert.ok((await readdir(join(directory,'backups'))).some(x=>x.includes('000000000000')))
 })
 let trainerId
 await t.test('cadastra treinador e protege todas APIs e campos privados',async()=>{
  const added=await request('/api/users','POST',{name:'Treinador',username:'treinador',password:'senha-treinador-segura',role:'trainer',instructorId:''},admin);assert.equal(added.status,200);trainerId=added.data.user.id
  const signed=await request('/api/auth/login','POST',{username:'treinador',password:'senha-treinador-segura'});assert.equal(signed.status,200);trainer={cookie:signed.cookie,csrfToken:signed.data.csrfToken}
  for(const path of ['/api/whatsapp/status','/api/backup','/api/users'])assert.equal((await request(path,'GET',undefined,trainer)).status,403)
  const loaded=await request('/api/data','GET',undefined,trainer);assert.equal(loaded.data.data.students[0].parentContact,'');assert.equal(loaded.data.data.students[0].monthlyFee,0);assert.deepEqual(loaded.data.data.students[0].paymentHistory,[]);assert.deepEqual(loaded.data.data.crmLeads,[]);assert.deepEqual(loaded.data.data.operationalExpenses,[])
  const poison=structuredClone(loaded.data);poison.data.students[0].monthlyFee=1;assert.equal((await request('/api/data','PUT',poison,trainer)).status,403)
  const update=structuredClone(loaded.data);update.data.students[0].attendanceHistory=[{date:'2026-09-17',slotId:'quinta-0900',status:'present'}];update.data.dailyAttendance={'2026-09-17':{s1:'present'}};assert.equal((await request('/api/data','PUT',update,trainer)).status,200)
  const saved=await request('/api/data','GET',undefined,admin);assert.equal(saved.data.data.students[0].monthlyFee,210);assert.equal(saved.data.data.students[0].parentContact,'31999999999');assert.equal(saved.data.data.students[0].attendanceHistory.length,1)
  const stale=await request('/api/data','PUT',loaded.data,trainer);assert.equal(stale.status,409);assert.equal(stale.data.data.students[0].parentContact,'');assert.deepEqual(stale.data.data.crmLeads,[])
 })
 await t.test('revoga imediatamente sessões do treinador desativado',async()=>{
  assert.equal((await request(`/api/users/${trainerId}`,'PATCH',{active:false},admin)).status,200)
  assert.equal((await request('/api/data','GET',undefined,trainer)).status,401)
  assert.equal((await request('/api/auth/login','POST',{username:'treinador',password:'senha-treinador-segura'})).status,401)
  const current=await request('/api/auth/status','GET',undefined,admin);assert.equal((await request(`/api/users/${current.data.user.id}`,'PATCH',{active:false},admin)).status,400)
 })
 await t.test('WhatsApp desconectado persiste falha sem fingir envio',async()=>{
  const failed=await request('/api/whatsapp/messages','POST',{leadId:'l1',clientMessageId:'failed-message-1',content:'Mensagem teste'},admin)
  assert.equal(failed.status,409);assert.equal(failed.data.message.status,'failed');assert.ok(failed.data.message.error)
  const repeated=await request('/api/whatsapp/messages','POST',{leadId:'l1',clientMessageId:'failed-message-1',content:'Mensagem teste'},admin);assert.equal(repeated.data.message.id,failed.data.message.id)
 })
 await t.test('envio idempotente concorrente, recibos monotônicos e número real',async()=>{
  let calls=0
  const transport={sendMessage:async(jid,content,options)=>{calls++;assert.equal(jid,'5531999999999@s.whatsapp.net');assert.equal(content.text,'Olá');await new Promise(resolve=>setTimeout(resolve,30));return {key:{id:options.messageId}}}}
  const body={leadId:'l1',clientMessageId:'send-message-1',content:'Olá'}
  const [a,b]=await Promise.all([mod.sendCrmMessage(body,transport),mod.sendCrmMessage(body,transport)])
  assert.equal(calls,1);assert.equal(a.message.status,'sent');assert.equal(a.message.id,b.message.id);assert.ok(a.externalId)
  await mod.sendCrmMessage(body,transport);assert.equal(calls,1)
  await assert.rejects(()=>mod.sendCrmMessage({...body,content:'Diferente'},transport),e=>e.status===409)
  await mod.persistReceipt(a.externalId,'read');await mod.persistReceipt(a.externalId,'delivered');assert.equal((await mod.getSharedState()).data.crmMessages.find(x=>x.id===a.message.id).status,'read')
 })
 await t.test('erro do transporte, falta de confirmação e doNotContact são honestos',async()=>{
  const error=await mod.sendCrmMessage({leadId:'l1',clientMessageId:'send-error-1',content:'Falhar'},{sendMessage:async()=>{throw new Error('Falha de rede')}});assert.equal(error.message.status,'uncertain');assert.match(error.message.error,/Falha de rede/)
  const noAck=await mod.sendCrmMessage({leadId:'l1',clientMessageId:'send-noack-1',content:'Sem confirmação'},{sendMessage:async()=>({})});assert.equal(noAck.message.status,'uncertain')
  let state=await mod.getSharedState();state.data.crmLeads[0].doNotContact=true;assert.equal((await request('/api/data','PUT',state,admin)).status,200)
  let called=false;await assert.rejects(()=>mod.sendCrmMessage({leadId:'l1',clientMessageId:'blocked-message',content:'Não enviar'},{sendMessage:async()=>{called=true}}),e=>e.status===403);assert.equal(called,false)
 })
 await t.test('mensagens recebidas persistem uma vez, grupos ignorados e consentimento não inventado',async()=>{
  const inbound={key:{id:'incoming-one',remoteJid:'553188887777@s.whatsapp.net',fromMe:false},message:{conversation:'Quero conhecer a academia'},messageTimestamp:Math.floor(Date.now()/1000),pushName:'Cliente WhatsApp'}
  await Promise.all([mod.persistIncomingMessage(inbound),mod.persistIncomingMessage(inbound)])
  const current=await mod.getSharedState();assert.equal(current.data.crmMessages.filter(x=>x.externalId==='incoming-one').length,1);assert.equal(current.data.crmLeads.find(x=>x.whatsapp==='+553188887777').communicationConsent,false)
  await mod.persistIncomingMessage({...inbound,key:{...inbound.key,id:'group-one',remoteJid:'123@g.us',participant:'553188887777@s.whatsapp.net'}})
  assert.equal((await mod.getSharedState()).data.crmMessages.some(x=>x.externalId==='group-one'),false)
 })
 await t.test('senhas trocadas revogam sessões anteriores e backup só ao administrador',async()=>{
  const old=structuredClone(admin)
  const changed=await request('/api/auth/password','POST',{currentPassword:'senha-admin-segura',newPassword:'senha-admin-nova-segura'},admin);assert.equal(changed.status,200);admin={cookie:changed.cookie,csrfToken:changed.data.csrfToken}
  assert.equal((await request('/api/data','GET',undefined,old)).status,401)
  const backup=await request('/api/backup','GET',undefined,admin);assert.equal(backup.status,200);assert.match(backup.headers.get('content-disposition'),/attachment/)
  assert.equal((await request('/api/backup','POST',{...backup.data,revision:0},admin)).status,409)
 })
 await t.test('restaura backup legado/pending versão 3 com validação e exclusividade da base',async()=>{
  const backup=await request('/api/backup','GET',undefined,admin)
  const restored=await request('/api/backup','POST',{...backup.data,version:3},admin)
  assert.equal(restored.status,200)
  const read=await request('/api/data','GET',undefined,admin)
  assert.equal(typeof read.data.data.students[0].mainClass,'string')
  assert.equal(typeof read.data.data.crmLeads[0].guardianName,'string')
  const duplicate=spawn(process.execPath,['server/whatsapp-server.mjs'],{env:{...process.env,SERVER_NO_LISTEN:'false',WHATSAPP_PORT:'49309'},stdio:['ignore','pipe','pipe']})
  let output='';duplicate.stderr.on('data',chunk=>output+=chunk)
  const [code]=await once(duplicate,'exit');assert.notEqual(code,0);assert.match(output,/Outro servidor/)
 })
 await t.test('persistência de dados e sessão resiste ao reinício do processo',async()=>{
  await new Promise(resolve=>mod.server.close(resolve))
  const child=spawn(process.execPath,['server/whatsapp-server.mjs'],{cwd:process.cwd(),env:{...process.env,SERVER_NO_LISTEN:'false',WHATSAPP_PORT:String(port)},stdio:['ignore','pipe','pipe']})
  let output='';child.stdout.on('data',chunk=>output+=chunk);child.stderr.on('data',chunk=>output+=chunk)
  try{
   let ready=false
   for(let attempt=0;attempt<400 && child.exitCode === null;attempt++){try{const res=await fetch(base+'/api/health');if(res.ok){ready=true;break}}catch{/* startup */}await new Promise(resolve=>setTimeout(resolve,50))}
   assert.equal(ready,true,output)
   const loaded=await request('/api/data','GET',undefined,admin);assert.equal(loaded.status,200);assert.equal(loaded.data.data.students[0].monthlyFee,210);assert.ok(loaded.data.data.crmMessages.some(x=>x.externalId==='incoming-one'))
   const failed=loaded.data.data.crmMessages.find(x=>x.clientMessageId==='failed-message-1');const same=await request('/api/whatsapp/messages','POST',{leadId:'l1',clientMessageId:'failed-message-1',content:'Mensagem teste'},admin);assert.equal(same.data.message.id,failed.id)
  }finally{if(child.exitCode===null){child.kill('SIGTERM');await once(child,'exit')}}
 })
})
await rm(directory,{recursive:true,force:true})
