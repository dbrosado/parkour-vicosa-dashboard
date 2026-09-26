import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

export async function waitForPanel(url='http://127.0.0.1:3901',{timeoutMs=60000,pollIntervalMs=500,requestTimeoutMs=2000}={}) {
 const deadline=Date.now()+timeoutMs
 do {
  try {
   const remaining=Math.max(1,deadline-Date.now())
   const response=await fetch(new URL('/api/health',url),{signal:AbortSignal.timeout(Math.min(requestTimeoutMs,remaining))})
   const health=await response.json()
   if(response.ok&&health.ok===true&&health.app==='parkour-vicosa'&&health.servesFrontend===true)return
  }catch{/* The service may still be starting or waiting for the external disk. */}
  const remaining=deadline-Date.now()
  if(remaining<=0)break
  await new Promise(resolve=>setTimeout(resolve,Math.min(pollIntervalMs,remaining)))
 }while(Date.now()<deadline)
 throw new Error('O painel ainda não está pronto para abrir. Confira se o disco da academia está conectado. O serviço instalado continuará tentando iniciar.')
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const timeoutMs=Number(process.argv[2]||60000)
 if(!Number.isFinite(timeoutMs)||timeoutMs<=0){console.error('Tempo de espera inválido.');process.exitCode=1}
 else try{await waitForPanel(undefined,{timeoutMs})}catch(error){console.error(error.message);process.exitCode=1}
}
