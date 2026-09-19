import test from 'node:test'
import assert from 'node:assert/strict'
import {createMonthlyCharge, receivePayment, paymentBalance, paymentState} from '../src/lib/finance.ts'
const student = {id:'s',name:'Teste',monthlyFee:200,status:'Ativo',isTrial:false,plan:'Mensal',paymentHistory:[]}
test('partial payment preserves remaining debt and one charge; settlement does not duplicate',()=>{
 const first=receivePayment(student,'2025-01',50,'Pix')
 assert.equal(first.paymentHistory.length,1)
 assert.equal(first.paymentStatus,'Atrasado')
 assert.equal(paymentBalance(first.paymentHistory[0]),150)
 const paid=receivePayment(first,'2025-01',150,'Dinheiro')
 assert.equal(paid.paymentHistory.length,1)
 assert.equal(paid.paymentHistory[0].receipts.length,2)
 assert.equal(paid.paymentStatus,'Em dia')
 assert.throws(()=>receivePayment(paid,'2025-01',1,'Pix'),/acima do saldo/)
})
test('charge generation idempotent and previous debt persists',()=>{
 const first=createMonthlyCharge(student,'2025-01')
 assert.equal(createMonthlyCharge(first,'2025-01'),first)
 const next=receivePayment(first,'2025-02',200,'Pix')
 assert.equal(next.paymentStatus,'Atrasado')
 assert.equal(paymentState(next.paymentHistory[0]),'paid')
})
test('invalid amounts, duplicate invoices and nonpaying students are rejected',()=>{
 assert.throws(()=>receivePayment(student,'2025-01',NaN,'Pix'))
 assert.equal(createMonthlyCharge({...student,isTrial:true},'2025-01').paymentHistory.length,0)
 const charge=createMonthlyCharge(student,'2025-01')
 assert.throws(()=>receivePayment({...charge,paymentHistory:[...charge.paymentHistory,...charge.paymentHistory]},'2025-01',1,'Pix'),/duplicadas/)
})
