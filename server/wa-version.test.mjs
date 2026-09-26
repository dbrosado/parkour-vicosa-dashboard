import test from 'node:test'
import assert from 'node:assert/strict'
import {parseWhatsAppVersion} from './wa-version.mjs'
await test('versão de protocolo só muda por configuração explícita validada',()=>{
 assert.equal(parseWhatsAppVersion(undefined),undefined)
 assert.deepEqual(parseWhatsAppVersion('2.3000.1048451567'),[2,3000,1048451567])
 for(const value of ['latest','2.3', '2.3.NaN', '2.3.9999999999999999', '1.3.4','2.3.4;exit'])assert.throws(()=>parseWhatsAppVersion(value))
})
