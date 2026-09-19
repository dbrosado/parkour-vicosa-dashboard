import {mkdirSync, openSync, closeSync, writeFileSync, readFileSync, unlinkSync} from 'node:fs'
import {join} from 'node:path'
import {randomUUID} from 'node:crypto'
export function lockDataDirectory(directory) {
 mkdirSync(directory,{recursive:true,mode:0o700})
 const path=join(directory,'.server-lock'), token=randomUUID()
 for(let attempt=0;attempt<2;attempt++) {
  try {
   const fd=openSync(path,'wx',0o600)
   try {writeFileSync(fd,JSON.stringify({pid:process.pid,token}))}finally{closeSync(fd)}
   const release=()=>{try{if(JSON.parse(readFileSync(path,'utf8')).token===token)unlinkSync(path)}catch{}}
   process.once('exit',release)
   return release
  } catch(error) {
   if(error.code!=='EEXIST')throw error
   let owner
   try {owner=JSON.parse(readFileSync(path,'utf8'))}catch {throw new Error('Bloqueio de dados inválido. Verifique se o servidor já está aberto antes de remover .server-lock.')}
   if(!Number.isSafeInteger(owner.pid)||owner.pid<=0)throw new Error('Bloqueio de dados inválido.')
   try {process.kill(owner.pid,0);throw new Error('Outro servidor já está usando esta pasta de dados. Utilize a instância existente.')} catch(alive) {
    if(alive.code!=='ESRCH')throw alive
    unlinkSync(path)
   }
  }
 }
 throw new Error('Não foi possível reservar a pasta de dados.')
}
