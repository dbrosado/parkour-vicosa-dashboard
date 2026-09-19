import { randomUUID } from 'node:crypto'
import { mkdir, open, rename, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
export async function atomicText(file, text) {
  const dir=dirname(file);await mkdir(dir,{recursive:true,mode:0o700});const temporary=join(dir,`.write-${process.pid}-${randomUUID()}.tmp`)
  try { const handle=await open(temporary,'wx',0o600);try{await handle.writeFile(text,'utf8');await handle.sync()}finally{await handle.close()}await rename(temporary,file);try{const dh=await open(dir,'r');try{await dh.sync()}finally{await dh.close()}}catch{/* Some filesystems do not support directory fsync. */} } catch(error){await rm(temporary,{force:true}).catch(()=>{});throw error}
}
export const atomicJson=(file,value,replacer)=>atomicText(file,JSON.stringify(value,replacer,2)+'\n')
