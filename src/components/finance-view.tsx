import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  CreditCard,
  DollarSign,
  Plus,
  Search,
  Wallet,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn, formatMonthYear } from '../lib/utils'
import type { PaymentMethod, PaymentRecord, Student } from '../types'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

type FinanceViewProps = {
  students: Student[]
  onUpdateStudent: (student: Student) => void
}

type StatusFilter = 'all' | 'paid' | 'pending' | 'overdue'

function statusChip(status: 'paid' | 'pending' | 'overdue') {
  if (status === 'paid') return 'chip-success'
  if (status === 'pending') return 'chip-warning'
  return 'chip-error'
}

function statusLabel(status: 'paid' | 'pending' | 'overdue') {
  if (status === 'paid') return 'Pago'
  if (status === 'pending') return 'Pendente'
  return 'Atrasado'
}

function methodIcon(method?: PaymentMethod) {
  if (method === 'Pix') return 'Pix'
  if (method === 'Cartão') return 'Cartão'
  if (method === 'Dinheiro') return 'Dinheiro'
  return '—'
}

function getCurrentMonthRef(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface PaymentRow {
  student: Student
  payment: PaymentRecord
}

export function FinanceView({ students, onUpdateStudent }: FinanceViewProps) {
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [monthFilter, setMonthFilter] = useState('')

  // Form state
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [formMonth, setFormMonth] = useState(getCurrentMonthRef())
  const [formAmount, setFormAmount] = useState('')
  const [formMethod, setFormMethod] = useState<PaymentMethod>('Pix')

  const currentMonth = getCurrentMonthRef()

  // Collect all payments from all students into flat rows
  const allPayments = useMemo<PaymentRow[]>(() => {
    const rows: PaymentRow[] = []
    for (const student of students) {
      for (const payment of student.paymentHistory) {
        rows.push({ student, payment })
      }
    }
    // Sort by date descending
    rows.sort((a, b) => b.payment.date.localeCompare(a.payment.date))
    return rows
  }, [students])

  // Summary calculations
  const summary = useMemo(() => {
    let revenueThisMonth = 0
    let totalPendingOverdue = 0
    let paidCountThisMonth = 0
    let totalCountThisMonth = 0

    for (const { payment } of allPayments) {
      if (payment.monthReference === currentMonth) {
        totalCountThisMonth++
        if (payment.status === 'paid') {
          revenueThisMonth += payment.amountPaid
          paidCountThisMonth++
        }
        if (payment.status === 'pending' || payment.status === 'overdue') {
          totalPendingOverdue += payment.amount
        }
      } else if (payment.status === 'pending' || payment.status === 'overdue') {
        totalPendingOverdue += payment.amount
      }
    }

    const activeStudents = students.filter((s) => s.status === 'Ativo').length
    const pctPaid = totalCountThisMonth > 0
      ? Math.round((paidCountThisMonth / totalCountThisMonth) * 100)
      : 0

    return { revenueThisMonth, totalPendingOverdue, activeStudents, pctPaid }
  }, [allPayments, students, currentMonth])

  // Filter payments
  const filteredPayments = useMemo(() => {
    let rows = allPayments

    if (statusFilter !== 'all') {
      rows = rows.filter((r) => r.payment.status === statusFilter)
    }

    if (monthFilter) {
      rows = rows.filter((r) => r.payment.monthReference === monthFilter)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter((r) => r.student.name.toLowerCase().includes(q))
    }

    return rows
  }, [allPayments, statusFilter, monthFilter, search])

  // Pre-fill amount when student is selected
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId)
    const student = students.find((s) => s.id === studentId)
    if (student) {
      setFormAmount(String(student.monthlyFee))
    }
  }

  const handleOpenForm = () => {
    setSelectedStudentId('')
    setFormMonth(getCurrentMonthRef())
    setFormAmount('')
    setFormMethod('Pix')
    setShowForm(true)
  }

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault()
    const student = students.find((s) => s.id === selectedStudentId)
    if (!student || !formMonth || !formAmount) return

    const amount = parseFloat(formAmount)
    if (isNaN(amount) || amount <= 0) return

    const now = new Date()
    const newPayment: PaymentRecord = {
      id: `pay-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      date: now.toISOString().split('T')[0],
      monthReference: formMonth,
      amount: student.monthlyFee,
      amountPaid: amount,
      description: `Mensalidade ${formatMonthYear(formMonth)}`,
      status: 'paid',
      paymentMethod: formMethod,
      paidAt: now.toISOString().split('T')[0],
      plan: student.plan,
    }

    const updatedStudent: Student = {
      ...student,
      paymentHistory: [newPayment, ...student.paymentHistory],
      paymentStatus: 'Em dia',
    }

    onUpdateStudent(updatedStudent)
    setShowForm(false)
    setSelectedStudentId('')
    setFormMonth(getCurrentMonthRef())
    setFormAmount('')
    setFormMethod('Pix')
  }

  const summaryCards = [
    {
      title: 'Receita do mês',
      value: formatCurrency(summary.revenueThisMonth),
      subtitle: formatMonthYear(currentMonth),
      icon: ArrowUpRight,
      chipClass: 'chip-success',
    },
    {
      title: 'Pendente / Atrasado',
      value: formatCurrency(summary.totalPendingOverdue),
      subtitle: 'Todas as referências',
      icon: ArrowDownLeft,
      chipClass: 'chip-warning',
    },
    {
      title: 'Alunos ativos',
      value: String(summary.activeStudents),
      subtitle: 'Com matrícula ativa',
      icon: CreditCard,
      chipClass: 'chip-info',
    },
    {
      title: 'Pagos este mês',
      value: `${summary.pctPaid}%`,
      subtitle: 'Taxa de adimplência',
      icon: Check,
      chipClass: summary.pctPaid >= 80 ? 'chip-success' : summary.pctPaid >= 50 ? 'chip-warning' : 'chip-error',
    },
  ]

  const statusFilters: { label: string; value: StatusFilter }[] = [
    { label: 'Todos', value: 'all' },
    { label: 'Pagos', value: 'paid' },
    { label: 'Pendentes', value: 'pending' },
    { label: 'Atrasados', value: 'overdue' },
  ]

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-primary/10 bg-hero-grid shadow-soft-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-xl sm:text-2xl">
                <Wallet className="h-5 w-5 text-primary" />
                Financeiro
              </CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">
                Gestão completa de pagamentos, receitas e cobranças da academia.
              </CardDescription>
            </div>
            <Button onClick={handleOpenForm} className="tactile btn-glow">
              <Plus className="mr-1.5 h-4 w-4" />
              Registrar Pagamento
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        {summaryCards.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="stat-card animate-scale-in space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{item.title}</p>
                <Badge className={cn('text-[10px]', item.chipClass)}>
                  <Icon className="mr-1 h-3 w-3" />
                  {item.subtitle}
                </Badge>
              </div>
              <p className="font-display text-2xl font-semibold text-white">{item.value}</p>
            </div>
          )
        })}
      </div>

      {/* Register Payment Form */}
      {showForm && (
        <Card className="animate-scale-in border-primary/20 shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <DollarSign className="h-4 w-4 text-primary" />
                Registrar Pagamento
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitPayment} className="grid gap-3 sm:grid-cols-2">
              {/* Student Select */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Aluno</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="flex h-10 w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Selecione um aluno...</option>
                  {students
                    .filter((s) => s.status === 'Ativo')
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.plan} ({formatCurrency(s.monthlyFee)})
                      </option>
                    ))}
                </select>
              </div>

              {/* Month Reference */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Mês de referência</label>
                <Input
                  type="month"
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                  required
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Valor pago (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  required
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">Forma de pagamento</label>
                <div className="flex gap-2">
                  {(['Pix', 'Cartão', 'Dinheiro'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setFormMethod(method)}
                      className={cn(
                        'flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition-all',
                        formMethod === method
                          ? 'border-primary bg-primary/20 text-primary shadow-[0_0_12px_rgba(249,115,22,.15)]'
                          : 'border-border/20 bg-surface/40 text-muted-foreground hover:bg-surface/60',
                      )}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="btn-glow" disabled={!selectedStudentId}>
                  <Check className="mr-1.5 h-4 w-4" />
                  Confirmar Pagamento
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por aluno..."
            className="pl-9"
          />
        </div>

        {/* Status filter chips */}
        <div className="flex gap-1.5">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                statusFilter === f.value
                  ? 'bg-primary/20 text-primary shadow-[0_0_8px_rgba(249,115,22,.12)]'
                  : 'bg-surface/40 text-muted-foreground hover:bg-surface/60 hover:text-white/80',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Month filter */}
        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="w-auto min-w-[160px]"
          placeholder="Filtrar mês"
        />
        {monthFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMonthFilter('')}
            className="h-8 px-2 text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Payments Count */}
      <p className="text-xs text-muted-foreground">
        {filteredPayments.length} pagamento{filteredPayments.length !== 1 ? 's' : ''} encontrado{filteredPayments.length !== 1 ? 's' : ''}
      </p>

      {/* Mobile Card View */}
      <div className="space-y-2 stagger-children lg:hidden">
        {filteredPayments.length === 0 && (
          <Card className="shadow-soft-sm">
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado.</p>
            </CardContent>
          </Card>
        )}

        {filteredPayments.map(({ student, payment }) => (
          <Card key={payment.id} className="shadow-soft-sm transition-all duration-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-border/20">
                  <AvatarImage src={student.photoUrl} alt={student.name} />
                  <AvatarFallback className="bg-primary/10 text-[10px] text-white">
                    {student.name.split(' ').slice(0, 2).map((c) => c[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMonthYear(payment.monthReference)}
                  </p>
                </div>
                <Badge className={cn('text-[10px]', statusChip(payment.status))}>
                  {statusLabel(payment.status)}
                </Badge>
              </div>

              <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-xl border border-border/20 bg-surface/40 p-2.5">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Valor</p>
                  <p className="text-xs font-semibold text-white">{formatCurrency(payment.amount)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Pago</p>
                  <p className={cn(
                    'text-xs font-semibold',
                    payment.amountPaid >= payment.amount ? 'text-emerald-400' : 'text-amber-400',
                  )}>
                    {formatCurrency(payment.amountPaid)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">Método</p>
                  <p className="text-xs font-semibold text-white/80">{methodIcon(payment.paymentMethod)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden shadow-soft-sm lg:block">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Pagamentos registrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPayments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum pagamento encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/20 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Aluno</TableHead>
                  <TableHead className="text-muted-foreground">Referência</TableHead>
                  <TableHead className="text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-muted-foreground">Pago</TableHead>
                  <TableHead className="text-muted-foreground">Método</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map(({ student, payment }) => (
                  <TableRow
                    key={payment.id}
                    className="border-border/10 transition-colors duration-150 hover:bg-white/[.02]"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 border border-border/20">
                          <AvatarImage src={student.photoUrl} alt={student.name} />
                          <AvatarFallback className="bg-primary/10 text-[10px] text-white">
                            {student.name.split(' ').slice(0, 2).map((c) => c[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-semibold text-white">{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-white/80">
                      {formatMonthYear(payment.monthReference)}
                    </TableCell>
                    <TableCell className="text-sm text-white/80">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        'text-sm font-semibold',
                        payment.amountPaid >= payment.amount ? 'text-emerald-400' : 'text-amber-400',
                      )}>
                        {formatCurrency(payment.amountPaid)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {methodIcon(payment.paymentMethod)}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('text-[10px]', statusChip(payment.status))}>
                        {statusLabel(payment.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
