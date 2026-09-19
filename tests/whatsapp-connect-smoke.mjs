// Optional network test: generates a temporary QR only; never pairs or sends messages.
import {mkdtemp,rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import assert from 'node:assert/strict'
const directory=await mkdtemp(join(tmpdir(),'parkour-wa-connect-'))
process.env.DATA_DIR=directory;process.env.WA_SESSION_DIR=join(directory,'wa');process.env.SERVER_NO_LISTEN='true';process.env.WA_DISABLED='false'
const {server,dataReady}=await import('../server/whatsapp-server.mjs');await dataReady
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
const base=`http://127.0.0.1:${server.address().port}`
let cookie='',csrf=''
async function request(path,body){const response=await fetch(base+path,{method:body?'POST':'GET',headers:{'content-type':'application/json',cookie,'x-csrf-token':csrf},body:body?JSON.stringify(body):undefined});return {response,data:await response.json()}}
try {
 const status=await request('/api/auth/status')
 const setup=await request('/api/auth/setup',{setupToken:status.data.bootstrapToken,name:'Teste QR',username:'testeqr',password:'teste-temporario-qr'});cookie=setup.response.headers.get('set-cookie').split(';')[0];csrf=setup.data.csrfToken
 await request('/api/whatsapp/connect',{})
 let last
 for(let n=0;n<90;n++){last=(await request('/api/whatsapp/status')).data;if(last.status==='waiting_qr')break;await new Promise(r=>setTimeout(r,500))}
 assert.equal(last.status,'waiting_qr',JSON.stringify(last));assert.match(last.qrCodeDataUrl,/^data:image\/png;base64,/)
 console.log('PASS conexão real com WhatsApp gerou QR Code. Nenhum aparelho pareado e nenhuma mensagem enviada.')
} finally {
 if(cookie)await request('/api/whatsapp/disconnect',{})
 await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true})
}
