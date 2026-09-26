import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import assert from 'node:assert/strict'
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright')
const dataDir = await mkdtemp(join(tmpdir(), 'parkour-browser-'))
const port=Number(process.env.TEST_PORT || 49301), base=`http://127.0.0.1:${port}`
const child=spawn(process.execPath,['server/whatsapp-server.mjs'],{env:{...process.env,HOST:'127.0.0.1',WHATSAPP_PORT:String(port),DATA_DIR:dataDir,WA_SESSION_DIR:join(dataDir,'wa'),WA_DISABLED:'true'},stdio:['ignore','pipe','pipe']})
let logs='';child.stdout.on('data',x=>logs+=x);child.stderr.on('data',x=>logs+=x)
let browser
try {
 for(let i=0;i<100;i++){try {if((await fetch(base+'/api/health')).ok)break}catch{} await new Promise(r=>setTimeout(r,100))}
 browser=await chromium.launch({executablePath:process.env.CHROME_PATH || '/usr/bin/google-chrome',headless:true,args:['--no-sandbox']})
 const context=await browser.newContext({viewport:{width:1440,height:1000}})
 context.setDefaultTimeout(10000);
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message))
 await page.goto(base)
 await page.getByLabel('Seu nome',{exact:true}).fill('Administrador Teste')
 await page.getByLabel('Usuário',{exact:true}).fill('admin')
 await page.getByLabel('Crie sua senha').fill('senha-de-teste-segura')
 await page.getByLabel('Confirme sua senha').fill('senha-de-teste-segura')
 await page.getByRole('button',{name:'Criar conta e abrir academia'}).click()
 await page.getByText('Dados salvos no servidor',{exact:true}).waitFor()
 const nav=name=>page.locator('aside').getByRole('button',{name,exact:true}).click()
 await nav('Alunos')
 await page.getByRole('button',{name:'Adicionar Aluno',exact:true}).click()
 await page.getByPlaceholder('Ex: João da Silva').fill('Aluno de Teste')
 await page.getByPlaceholder('(31) 99999-9999').first().fill('31999999999')
 await page.getByPlaceholder('Ex: 150.00').fill('200')
 await page.locator('fieldset input[type="checkbox"]').first().check()
 await page.getByRole('button',{name:'Salvar',exact:true}).click()
 await page.getByText('Dados salvos no servidor',{exact:true}).waitFor()
 const state=async()=> (await context.request.get(base+'/api/data')).json()
 let current=await state();assert.equal(current.data.students.length,1);assert.ok(current.data.students[0].classSlots.length)
 await page.reload();await page.getByText('Dados salvos no servidor',{exact:true}).waitFor()
 const second=await context.newPage();await second.goto(base);await second.getByText('Dados salvos no servidor',{exact:true}).waitFor()
 await nav('Financeiro');await page.getByLabel('Competência das cobranças').fill('2025-01');await page.getByRole('button',{name:'Gerar cobranças',exact:true}).click()
 await page.getByText('Dados salvos no servidor',{exact:true}).waitFor()
 await page.getByRole('button',{name:'Registrar Pagamento',exact:true}).click()
 await page.locator('form select').first().selectOption(current.data.students[0].id)
 await page.locator('form input[type="month"]').fill('2025-01')
 await page.locator('form input[type="number"]').fill('50')
 await page.getByRole('button',{name:'Confirmar Pagamento',exact:true}).click()
 await page.getByText('Dados salvos no servidor',{exact:true}).waitFor()
 current=await state();assert.equal(current.data.students[0].paymentHistory[0].amountPaid,50);assert.equal(current.data.students[0].paymentStatus,'Atrasado')
 await second.locator('aside').getByRole('button',{name:'Financeiro',exact:true}).click()
 await second.locator('table').getByText('R$ 50,00',{exact:true}).waitFor()
 console.log('PASS setup, cadastro, horários fixos, reload, financeiro parcial e dois aparelhos')
 await nav('Alunos')
 await page.route('**/api/data',route=>route.request().method()==='PUT'?route.abort('failed'):route.continue())
 await page.locator('table button').first().click()
 await page.getByPlaceholder('Ex: João da Silva').fill('Aluno Recuperado')
 await page.getByRole('button',{name:'Atualizar',exact:true}).click()
 await page.getByText('Edições pausadas até confirmar o salvamento no servidor.',{exact:true}).waitFor()
 assert.equal((await state()).data.students[0].name,'Aluno de Teste')
 await page.unroute('**/api/data')
 page.once('dialog',dialog=>dialog.accept())
 await page.reload()
 await page.getByText('Dados salvos no servidor',{exact:true}).waitFor()
 assert.equal((await state()).data.students[0].name,'Aluno Recuperado')
 console.log('PASS queda de rede, edição pendente e recuperação após recarregar')

 // Create a trainer through the actual settings form.
 await nav('Professores');await page.getByRole('button',{name:'Novo Professor',exact:true}).click()
 await page.getByPlaceholder('Nome',{exact:true}).fill('Professor Teste')
 await page.getByPlaceholder('Telefone',{exact:true}).fill('31999999999')
 await page.getByRole('button',{name:'Salvar',exact:true}).click();await page.getByText('Dados salvos no servidor',{exact:true}).waitFor()
 await nav('Configurações')
 const create=page.locator('form').filter({has:page.getByText('Criar acesso de treinador',{exact:true})})
 await create.getByLabel('Nome',{exact:true}).fill('Treinador Teste')
 await create.getByLabel('Usuário de acesso').fill('treinador')
 await create.getByLabel('Senha inicial').fill('senha-treinador-segura')
 const inst=(await state()).data.instructors[0].id
 await create.getByLabel('Vincular ao professor').selectOption(inst)
 await create.getByRole('button',{name:'Criar acesso',exact:true}).click()
 await page.getByText(/Acesso criado/).waitFor()
 const trainerContext=await browser.newContext({viewport:{width:1440,height:1000}})
 const trainer=await trainerContext.newPage();trainer.on('pageerror',e=>errors.push(e.message));await trainer.goto(base)
 await trainer.getByLabel('Usuário',{exact:true}).fill('treinador');await trainer.getByLabel('Senha',{exact:true}).fill('senha-treinador-segura');await trainer.getByRole('button',{name:'Entrar',exact:true}).click()
 await trainer.getByText('Dados salvos no servidor',{exact:true}).waitFor()
 assert.equal(await trainer.locator('aside').getByRole('button',{name:'Financeiro',exact:true}).count(),0)
 assert.equal(await trainer.getByRole('button',{name:'Matricular Aluno'}).count(),0)
 const privateState=await (await trainerContext.request.get(base+'/api/data')).json()
 assert.equal(privateState.data.students[0].monthlyFee,0);assert.equal(privateState.data.students[0].parentContact,'')
 assert.equal((await trainerContext.request.get(base+'/api/whatsapp/status')).status(),403)
 await trainer.locator('aside').getByRole('button',{name:'Configurações',exact:true}).click()
 await trainer.locator('main').getByRole('button',{name:'Sair',exact:true}).click()
 await trainer.getByRole('button',{name:'Entrar',exact:true}).waitFor()
 console.log('PASS criar treinador, login, restrições de interface/API e logout')
 // Simulated server states test the UI only; this is not pairing evidence.
 let waStatus = {status:'disconnected'}
 let networkDown = false
 await page.route('**/api/whatsapp/status', route => networkDown ? route.abort('failed') : route.fulfill({json:waStatus}))
 await nav('Conectar WhatsApp')
 await page.getByText('Nenhum QR Code disponível',{exact:true}).waitFor()
 assert.equal(await page.getByAltText('QR Code para conectar WhatsApp').count(),0)
 await page.getByRole('button',{name:'Conectar pelo número',exact:true}).click()
 await page.getByLabel('Número do WhatsApp com DDD',{exact:true}).fill('+55 31 99999-9999')
 await page.route('**/api/whatsapp/pairing-code',async route=>{
   assert.equal(route.request().postDataJSON().phoneNumber,'+55 31 99999-9999')
   waStatus={status:'waiting_code',pairingCode:'ABCD1234',pairingPhoneNumber:'+5531999999999',pairingExpiresAt:new Date(Date.now()+60000).toISOString()}
   await route.fulfill({json:waStatus})
 })
 await page.getByRole('button',{name:'Solicitar código de vinculação',exact:true}).click()
 await page.getByText('ABCD-1234',{exact:true}).waitFor()
 assert.equal(await page.getByAltText('QR Code para conectar WhatsApp').count(),0)
 assert.equal(await page.getByText('WhatsApp conectado',{exact:true}).count(),0)
 waStatus={status:'pairing',detail:'Celular reconhecido. Confirmando a conexão com o WhatsApp…'}
 await page.getByText('Celular reconhecido',{exact:true}).waitFor()
 await page.unroute('**/api/whatsapp/pairing-code')
 waStatus = {status:'connected',phoneNumber:'+5500000000000'}
 await page.getByText('WhatsApp conectado',{exact:true}).waitFor()
 waStatus = {status:'error',error:'Sessão inválida no teste'}
 await page.getByText('Sessão inválida no teste',{exact:true}).waitFor()
 assert.equal(await page.getByRole('button',{name:'Reiniciar sessão',exact:true}).isVisible(),true)
 waStatus = {status:'waiting_qr',qrCodeDataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDakAAAAASUVORK5CYII=',qrExpiresAt:new Date(Date.now()+5000).toISOString()}
 await page.getByAltText('QR Code para conectar WhatsApp').waitFor()
 await page.getByAltText('QR Code para conectar WhatsApp').waitFor({state:'detached',timeout:10000})
 networkDown = true
 await page.getByText('Sem comunicação com o servidor. Tentando novamente…',{exact:true}).waitFor()
 assert.equal(await page.getByAltText('QR Code para conectar WhatsApp').count(),0)
 networkDown = false; waStatus = {status:'connected',phoneNumber:'+5500000000000'}
 await page.getByText('WhatsApp conectado',{exact:true}).waitFor()
 await page.unroute('**/api/whatsapp/status')
 console.log('PASS WhatsApp UI: polling após conectado/erro, recuperação acessível, expiração e remoção do QR sem rede')
 for(const name of ['Central Comercial','Leads','Pipeline','Inbox WhatsApp','Aulas Experimentais','Tarefas','Templates','Relatórios Comerciais','Conectar WhatsApp','Visão Diária','Visão Semanal','Alunos','Professores','Progresso','Eventos','Financeiro','Relatórios Gerais','Aniversários','Configurações']) {await nav(name);await page.locator('main h1').waitFor()}
 await page.screenshot({path:'/tmp/parkour-admin-smoke.png',fullPage:true})
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.getByText('Acesso dos treinadores',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/parkour-mobile-smoke.png',fullPage:true})
 assert.deepEqual(errors,[])
 console.log('PASS todas as 19 seções, desktop/mobile, sem erros JavaScript')
} catch(error) {console.error(logs);if(browser){for(const ctx of browser.contexts())for(const page of ctx.pages()) console.error((await page.locator('body').innerText()).slice(0,7000))}throw error}
finally {if(browser)await browser.close();child.kill('SIGTERM');await once(child,'exit');await rm(dataDir,{recursive:true,force:true})}
