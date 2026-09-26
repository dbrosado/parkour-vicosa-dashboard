import test from 'node:test'
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {once} from 'node:events'
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawn} from 'node:child_process'
import {waitForPanel} from '../scripts/wait-for-panel.mjs'

async function healthServer(t,handler) {
 const server=createServer(handler)
 server.listen(0,'127.0.0.1');await once(server,'listening')
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections()}))
 return `http://127.0.0.1:${server.address().port}`
}

test('abertura aguarda identidade do CRM e frontend disponível',async t=>{
 let calls=0
 const url=await healthServer(t,(_req,res)=>{
  calls++
  res.setHeader('content-type','application/json')
  res.end(JSON.stringify(calls===1?{ok:true,app:'another-app',servesFrontend:true}:calls===2?{ok:true,app:'parkour-vicosa',servesFrontend:false}:{ok:true,app:'parkour-vicosa',servesFrontend:true}))
 })
 await waitForPanel(url,{timeoutMs:2000,pollIntervalMs:10})
 assert.equal(calls,3)
})

test('resposta de erro ou servidor travado não são sucesso',async t=>{
 const url=await healthServer(t,(_req,res)=>{res.statusCode=503;res.end(JSON.stringify({ok:true,app:'parkour-vicosa',servesFrontend:true}))})
 await assert.rejects(waitForPanel(url,{timeoutMs:100,pollIntervalMs:10}),/ainda não está pronto/)
 const stalled=await healthServer(t,()=>{})
 await assert.rejects(waitForPanel(stalled,{timeoutMs:100,requestTimeoutMs:20,pollIntervalMs:10}),/ainda não está pronto/)
})

test('atalho só abre navegador depois que o healthcheck passa',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'parkour-launcher-'));t.after(()=>rm(dir,{recursive:true,force:true}))
 const log=join(dir,'calls')
 for(const [name,content] of Object.entries({
  systemctl:'#!/bin/sh\nprintf "systemctl %s\\n" "$*" >> "$STARTUP_TEST_LOG"\nexit 0\n',
  node:'#!/bin/sh\nprintf "health\\n" >> "$STARTUP_TEST_LOG"\nexit "$STARTUP_TEST_HEALTH"\n',
  'xdg-open':'#!/bin/sh\nprintf "browser\\n" >> "$STARTUP_TEST_LOG"\n',
 }))await writeFile(join(dir,name),content,{mode:0o700})
 async function run(status) {
  await writeFile(log,'')
  const child=spawn('bash',['scripts/start-panel.sh'],{env:{...process.env,PATH:`${dir}:${process.env.PATH}`,STARTUP_TEST_LOG:log,STARTUP_TEST_HEALTH:String(status)},stdio:'ignore'})
  const [code]=await once(child,'exit')
  return {code,calls:await readFile(log,'utf8')}
 }
 const failed=await run(1);assert.equal(failed.code,1);assert.doesNotMatch(failed.calls,/browser/)
 const ready=await run(0);assert.equal(ready.code,0);assert.match(ready.calls,/health\nbrowser/)
})

test('reinstalação reinicia a versão ativa e permite recuperar montagem tardia',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'parkour-install-'));t.after(()=>rm(dir,{recursive:true,force:true}))
 const project=join(dir,'Projeto com espaços'),bin=join(dir,'bin'),config=join(dir,'config'),log=join(dir,'calls')
 await Promise.all([mkdir(join(project,'scripts'),{recursive:true}),mkdir(join(project,'dist'),{recursive:true}),mkdir(bin)])
 await writeFile(join(project,'dist','index.html'),'<html></html>')
 await writeFile(join(project,'scripts','install-service.sh'),await readFile(new URL('../scripts/install-service.sh',import.meta.url)))
 await writeFile(join(bin,'systemctl'),'#!/bin/sh\nprintf "systemctl %s\\n" "$*" >> "$STARTUP_TEST_LOG"\n',{mode:0o700})
 await writeFile(join(bin,'node'),'#!/bin/sh\nprintf "health\\n" >> "$STARTUP_TEST_LOG"\n',{mode:0o700})
 const child=spawn('bash',[join(project,'scripts','install-service.sh')],{env:{...process.env,PATH:`${bin}:${process.env.PATH}`,XDG_CONFIG_HOME:config,STARTUP_TEST_LOG:log},stdio:'ignore'})
 const [code]=await once(child,'exit');assert.equal(code,0)
 const calls=await readFile(log,'utf8')
 assert.match(calls,/enable parkour-vicosa.service/)
 assert.match(calls,/restart parkour-vicosa.service\nhealth\nsystemctl --user is-active/)
 const unit=await readFile(join(config,'systemd','user','parkour-vicosa.service'),'utf8')
 assert.match(unit,/StartLimitIntervalSec=0/)
 assert.match(unit,/Restart=on-failure\nRestartSec=10/)
 assert.match(unit,/Environment=HOST=0\.0\.0\.0/)
 assert.ok(unit.includes(`EnvironmentFile=-${project}/server/data/service.env`))
 // Local overrides belong to the operator and must survive installer reruns.
 const environment=join(project,'server','data','service.env')
 await mkdir(join(project,'server','data'),{recursive:true})
 await writeFile(environment,'WA_WEB_VERSION=2.3000.1000000000\n')
 const rerun=spawn('bash',[join(project,'scripts','install-service.sh')],{env:{...process.env,PATH:`${bin}:${process.env.PATH}`,XDG_CONFIG_HOME:config,STARTUP_TEST_LOG:log},stdio:'ignore'})
 assert.equal((await once(rerun,'exit'))[0],0)
 assert.equal(await readFile(environment,'utf8'),'WA_WEB_VERSION=2.3000.1000000000\n')
})
