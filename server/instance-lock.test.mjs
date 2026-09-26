import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,writeFile,readFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawn} from 'node:child_process'
import {once} from 'node:events'
import {fileURLToPath} from 'node:url'
import {lockDataDirectory} from './instance-lock.mjs'

const moduleUrl=new URL('./instance-lock.mjs',import.meta.url).href
const serverFile=fileURLToPath(new URL('./whatsapp-server.mjs',import.meta.url))
function startOwner(directory,{legacy=false}={}) {
 const code=legacy?'process.send("ready");setInterval(()=>{},1000)':`import {lockDataDirectory} from ${JSON.stringify(moduleUrl)};try{lockDataDirectory(process.argv[1]);process.send('ready');setInterval(()=>{},1000)}catch(error){process.send(error.message);process.exitCode=1}`
 const child=spawn(process.execPath,['--input-type=module','-e',code,directory,...(legacy?[serverFile]:[])],{stdio:['ignore','ignore','pipe','ipc']})
 const ready=once(child,'message').then(([message])=>message)
 return {child,ready}
}
async function stop(child,signal='SIGTERM') {
 if(child.exitCode!==null||child.signalCode!==null)return
 const exited=once(child,'exit');child.kill(signal);await exited
}
async function temporary(t) {
 const dir=await mkdtemp(join(tmpdir(),'parkour-lock-'))
 t.after(()=>rm(dir,{recursive:true,force:true}))
 return dir
}

test('lock exclusivo dura após flock terminar e libera no crash do Node',async t=>{
 const dir=await temporary(t)
 const {child,ready}=startOwner(dir);t.after(()=>stop(child))
 assert.equal(await ready,'ready')
 assert.throws(()=>lockDataDirectory(dir),/Outro servidor/)
 await stop(child,'SIGKILL')
 const release=lockDataDirectory(dir)
 assert.equal(JSON.parse(await readFile(join(dir,'.server-lock'),'utf8')).lockVersion,2)
 release();release()
 const next=lockDataDirectory(dir);next()
})

test('um PID reaproveitado não bloqueia uma sessão encerrada',async t=>{
 const dir=await temporary(t)
 await writeFile(join(dir,'.server-lock'),JSON.stringify({lockVersion:2,pid:process.pid,token:'old-boot'}))
 const release=lockDataDirectory(dir);release()
 const unrelated=spawn('sleep',['30'],{stdio:'ignore'});t.after(()=>stop(unrelated))
 await writeFile(join(dir,'.server-lock'),JSON.stringify({pid:unrelated.pid,token:'legacy-boot'}))
 const migrate=lockDataDirectory(dir);migrate()
})

test('migração não permite executar junto com um servidor legado ativo',async t=>{
 const dir=await temporary(t)
 const {child,ready}=startOwner(dir,{legacy:true});t.after(()=>stop(child))
 assert.equal(await ready,'ready')
 await writeFile(join(dir,'.server-lock'),JSON.stringify({pid:child.pid,token:'legacy-active'}))
 assert.throws(()=>lockDataDirectory(dir),/Outro servidor/)
 await stop(child)
 const release=lockDataDirectory(dir);release()
})

test('disputa concorrente após crash admite somente um servidor',async t=>{
 const dir=await temporary(t)
 await writeFile(join(dir,'.server-lock'),JSON.stringify({lockVersion:2,pid:process.pid,token:'abandoned'}))
 const owners=Array.from({length:6},()=>startOwner(dir))
 t.after(()=>Promise.all(owners.map(({child})=>stop(child))))
 const messages=await Promise.all(owners.map(({ready})=>ready))
 assert.equal(messages.filter(message=>message==='ready').length,1)
 assert.equal(messages.filter(message=>/Outro servidor/.test(message)).length,5)
})
