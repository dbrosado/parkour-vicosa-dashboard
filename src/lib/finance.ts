import { newId } from './id.ts'
import type { PaymentMethod, PaymentRecord, Student } from '../types'
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const cents = (value: number) => Math.round(value * 100)
export const paymentBalance = (payment: PaymentRecord) => Math.max(0, cents(payment.amount) - cents(payment.amountPaid)) / 100
export function paymentState(payment: PaymentRecord, today = localDate()): PaymentRecord['status'] {
  if (paymentBalance(payment) === 0) return 'paid'
  return (payment.dueDate || `${payment.monthReference}-10`) < today ? 'overdue' : 'pending'
}
export function studentPaymentState(history: PaymentRecord[]): Student['paymentStatus'] {
  if (history.some(p => paymentState(p) === 'overdue')) return 'Atrasado'
  if (history.length === 0 || history.some(p => paymentState(p) === 'pending')) return 'Pendente'
  return 'Em dia'
}
export function createMonthlyCharge(student: Student, month: string, dueDay = 10): Student {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Mês inválido.')
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28) throw new Error('Escolha o vencimento entre 1 e 28.')
  if (student.status !== 'Ativo' || student.isTrial || student.monthlyFee <= 0 || student.paymentHistory.some(p => p.monthReference === month)) return student
  const payment: PaymentRecord = {
    id: `tuition-${student.id}-${month}`, monthReference: month, date: localDate(), dueDate: `${month}-${String(dueDay).padStart(2,'0')}`,
    amount: cents(student.monthlyFee)/100, amountPaid: 0, description: `Mensalidade ${month}`, status: 'pending', plan: student.plan, receipts: [],
  }
  payment.status = paymentState(payment)
  const history = [payment, ...student.paymentHistory]
  return {...student, paymentHistory: history, paymentStatus: studentPaymentState(history)}
}
export function receivePayment(student: Student, month: string, value: number, method: PaymentMethod): Student {
  if (!Number.isFinite(value) || cents(value) <= 0) throw new Error('Informe um valor recebido maior que zero.')
  const charged = createMonthlyCharge(student, month)
  const matches = charged.paymentHistory.filter(p => p.monthReference === month)
  if (matches.length !== 1) throw new Error(matches.length ? 'Há cobranças duplicadas nessa competência. Corrija os registros antes de receber.' : 'Defina a mensalidade do aluno e gere a cobrança primeiro.')
  const payment = matches[0]
  if (cents(value) > cents(paymentBalance(payment))) throw new Error(`Valor acima do saldo em aberto: R$ ${paymentBalance(payment).toFixed(2)}.`)
  const updated: PaymentRecord = {...payment, amountPaid: (cents(payment.amountPaid) + cents(value))/100, paymentMethod: method,
    paidAt: localDate(), receipts: [...(payment.receipts ?? []), {id: newId(), date: localDate(), amount: cents(value)/100, method}]}
  updated.status = paymentState(updated)
  const history = charged.paymentHistory.map(p => p.id === updated.id ? updated : p)
  return {...charged, paymentHistory: history, paymentStatus: studentPaymentState(history)}
}
