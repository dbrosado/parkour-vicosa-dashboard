import {mkdirSync, openSync, closeSync, writeFileSync, readFileSync, ftruncateSync, statSync} from 'node:fs'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
import {spawnSync} from 'node:child_process'

const busyMessage='Outro servidor já está usando esta pasta de dados. Utilize a instância existente.'

function ensureDirectory(directory) {
 try {if(statSync(directory).isDirectory())return}catch(error){if(error.code!=='ENOENT')throw error}
 try {mkdirSync(directory,{recursive:true,mode:0o700})}catch(error){
  // Some mounted filesystems return ENOTEMPTY when recursive mkdir finds a directory.
  if(!['EEXIST','ENOTEMPTY'].includes(error.code)||!statSync(directory).isDirectory())throw error
 }
}

function legacyServerIsAlive(owner) {
 if(!Number.isSafeInteger(owner?.pid)||owner.pid<=0)return false
 try {process.kill(owner.pid,0)}catch(error){if(error.code==='ESRCH')return false;return true}
 try {
  const args=readFileSync(`/proc/${owner.pid}/cmdline`,'utf8').split('\0').filter(Boolean)
  // A legacy PID alone can belong to an unrelated process after a reboot.
  // Only migrate while its original server is stopped; uncertainty stays locked.
  if(args.some(arg=>arg.endsWith('whatsapp-server.mjs')))return true
  return owner.pid===process.pid
 }catch(error){return error.code!=='ENOENT'}
}

export function lockDataDirectory(directory) {
 ensureDirectory(directory)
 const path=join(directory,'.server-lock')
 const fd=openSync(path,'a+',0o600)
 try {
  // flock locks the shared open-file description inherited by fd 3. The lock
  // survives the helper's exit while this Node process keeps fd open. The kernel
  // releases it on crashes/reboots; no PID guesses or unlink races are involved.
  const acquired=spawnSync('flock',['-n','-E','73','3'],{stdio:['ignore','ignore','pipe',fd]})
  if(acquired.status===73)throw new Error(busyMessage)
  if(acquired.error||acquired.status!==0)throw new Error('Não foi possível proteger a pasta de dados. Instale o comando flock (util-linux) e verifique o disco.',{cause:acquired.error})
  const content=readFileSync(path,'utf8').trim()
  if(content){
   let owner
   try {owner=JSON.parse(content)}catch {throw new Error('Bloqueio de dados inválido. Verifique se o servidor antigo já foi encerrado antes de remover .server-lock.')}
   if(owner.lockVersion!==2&&legacyServerIsAlive(owner))throw new Error(busyMessage)
  }
  ftruncateSync(fd,0)
  writeFileSync(fd,JSON.stringify({lockVersion:2,pid:process.pid,token:randomUUID()}))
  let released=false
  const release=()=>{
   if(released)return
   released=true
   process.off('exit',release)
   // Keep the inode: unlinking it lets another process lock a different file.
   closeSync(fd)
  }
  process.once('exit',release)
  return release
 }catch(error){closeSync(fd);throw error}
}
