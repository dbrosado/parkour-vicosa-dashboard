import {
    Activity,
    ArrowDownRight,
    ArrowUpRight,
    Clock,
    DollarSign,
    Download,
    FileBarChart,
    Medal,
    Pencil,
    Percent,
    Plus,
    Printer,
    Ruler,
    Scale,
    Search,
    Trash2,
    TrendingUp,
    Users,
    X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import {
    calculateBMI,
    classifyBMI,
    cn,
    formatDateBR,
    formatMonthYear,
    getAge,
    getConditioningLevel,
} from '../lib/utils'
import {
    categoryColors,
    categoryLabels,
} from '../data/skills-data'
import type {
    ExpenseCategory,
    OperationalExpense,
    SkillCategory,
} from '../types'
import { useStore } from '../store/useStore'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

// ─── Types ───────────────────────────────────────────────────────────────────

type TabKey = 'overview' | 'financial' | 'evolution' | 'print'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentMonthRef(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const expenseCategoryLabels: Record<ExpenseCategory, string> = {
    aluguel: 'Aluguel',
    salarios: 'Salarios',
    energia: 'Energia',
    agua: 'Agua',
    materiais: 'Materiais',
    manutencao: 'Manutencao',
    marketing: 'Marketing',
    outros: 'Outros',
}

const expenseCategoryColors: Record<ExpenseCategory, string> = {
    aluguel: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
    salarios: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    energia: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    agua: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
    materiais: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
    manutencao: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    marketing: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    outros: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
}

const conditioningExercises = [
    { key: 'pushUps' as const, label: 'Flexoes', unit: 'reps' },
    { key: 'pullUps' as const, label: 'Barra Fixa', unit: 'reps' },
    { key: 'sitUps' as const, label: 'Abdominais', unit: 'reps' },
    { key: 'verticalJump' as const, label: 'Salto Vertical', unit: 'cm' },
    { key: 'horizontalJump' as const, label: 'Salto Horizontal', unit: 'cm' },
] as const

const levelLabels = {
    gold: 'Ouro',
    silver: 'Prata',
    bronze: 'Bronze',
    below: 'Abaixo',
} as const

const levelColors = {
    gold: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/25',
    silver: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/25',
    bronze: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
    below: 'text-zinc-500 bg-zinc-500/5 border-zinc-500/20',
} as const

const allCategories: SkillCategory[] = [
    'saltos',
    'escaladas',
    'corridas',
    'giros',
    'vaults',
    'equilibrios',
    'rolamentos',
    'balancos',
]

const expenseCategories: ExpenseCategory[] = [
    'aluguel',
    'salarios',
    'energia',
    'agua',
    'materiais',
    'manutencao',
    'marketing',
    'outros',
]

// ─── Main Component ──────────────────────────────────────────────────────────

export function ReportsView() {
    const { students, operationalExpenses, addExpense, updateExpense, deleteExpense } = useStore()

    const [activeTab, setActiveTab] = useState<TabKey>('overview')

    const tabs = [
        { key: 'overview' as const, label: 'Visao Geral', icon: FileBarChart },
        { key: 'financial' as const, label: 'Financeiro', icon: DollarSign },
        { key: 'evolution' as const, label: 'Evolucao', icon: TrendingUp },
        { key: 'print' as const, label: 'Imprimir', icon: Printer },
    ]

    return (
        <div className="space-y-4">
            {/* Header */}
            <Card className="border-primary/10 bg-hero-grid shadow-soft-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-xl sm:text-2xl">
                        <FileBarChart className="h-5 w-5 text-primary" />
                        Relatorios e Analises
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Visao consolidada de alunos, financas, evolucao e relatorios para impressao.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Tab Bar */}
            <div className="flex overflow-x-auto border-b border-border/20">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-medium transition-colors duration-200',
                            activeTab === tab.key
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-white',
                        )}
                    >
                        <tab.icon className="h-3.5 w-3.5" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'financial' && (
                <FinancialTab
                    students={students}
                    operationalExpenses={operationalExpenses}
                    addExpense={addExpense}
                    updateExpense={updateExpense}
                    deleteExpense={deleteExpense}
                />
            )}
            {activeTab === 'evolution' && <EvolutionTab />}
            {activeTab === 'print' && <PrintTab />}
        </div>
    )
}

// ─── Tab 1: Visao Geral ──────────────────────────────────────────────────────

function OverviewTab() {
    const { students, operationalExpenses } = useStore()

    const currentMonth = getCurrentMonthRef()

    const stats = useMemo(() => {
        const total = students.length
        const ativos = students.filter((s) => s.status === 'Ativo').length
        const inativos = students.filter(
            (s) => s.status === 'Inativo' || s.status === 'Trancado',
        ).length

        // Receita mensal (pagamentos pagos no mes corrente)
        let receitaMensal = 0
        for (const student of students) {
            for (const p of student.paymentHistory) {
                if (p.monthReference === currentMonth && p.status === 'paid') {
                    receitaMensal += p.amountPaid
                }
            }
        }

        const projecaoAnual = receitaMensal * 12

        // Taxa de frequencia
        let totalPresent = 0
        let totalRecords = 0
        for (const student of students) {
            if (student.status !== 'Ativo') continue
            for (const a of student.attendanceHistory) {
                totalRecords++
                if (a.status === 'present' || a.status === 'late') totalPresent++
            }
        }
        const taxaFrequencia = totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : 0

        // Despesas do mes
        const despesasMes = operationalExpenses
            .filter((e) => e.monthReference === currentMonth)
            .reduce((sum, e) => sum + e.amount, 0)

        const lucro = receitaMensal - despesasMes

        return { total, ativos, inativos, receitaMensal, projecaoAnual, taxaFrequencia, despesasMes, lucro }
    }, [students, operationalExpenses, currentMonth])

    const statCards = [
        {
            title: 'Total Alunos',
            value: String(stats.total),
            icon: Users,
            color: 'text-white',
        },
        {
            title: 'Ativos',
            value: String(stats.ativos),
            icon: Users,
            color: 'text-emerald-400',
        },
        {
            title: 'Inativos/Trancados',
            value: String(stats.inativos),
            icon: Users,
            color: 'text-amber-400',
        },
        {
            title: 'Receita Mensal',
            value: formatCurrency(stats.receitaMensal),
            icon: DollarSign,
            color: 'text-emerald-400',
        },
        {
            title: 'Projecao Anual',
            value: formatCurrency(stats.projecaoAnual),
            icon: TrendingUp,
            color: 'text-primary',
        },
        {
            title: 'Taxa de Frequencia',
            value: `${stats.taxaFrequencia}%`,
            icon: Percent,
            color: 'text-cyan-400',
        },
    ]

    return (
        <div className="space-y-4 animate-scale-in">
            {/* Stat Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 stagger-children">
                {statCards.map((item) => {
                    const Icon = item.icon
                    return (
                        <div key={item.title} className="stat-card space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-[10px] sm:text-xs text-muted-foreground">{item.title}</p>
                                <Icon className={cn('h-3.5 w-3.5', item.color)} />
                            </div>
                            <p className={cn('font-display text-xl sm:text-2xl font-semibold', item.color)}>
                                {item.value}
                            </p>
                        </div>
                    )
                })}
            </div>

            {/* Financial Snapshot */}
            <Card className="shadow-soft-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 font-display text-base">
                        <Activity className="h-4 w-4 text-primary" />
                        Resumo Financeiro do Mes
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-xs">
                        {formatMonthYear(currentMonth)}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-xl border border-border/20 bg-surface/40 p-3 text-center">
                            <ArrowUpRight className="mx-auto mb-1 h-4 w-4 text-emerald-400" />
                            <p className="text-[10px] text-muted-foreground">Receita</p>
                            <p className="font-display text-lg font-semibold text-emerald-400">
                                {formatCurrency(stats.receitaMensal)}
                            </p>
                        </div>
                        <div className="rounded-xl border border-border/20 bg-surface/40 p-3 text-center">
                            <ArrowDownRight className="mx-auto mb-1 h-4 w-4 text-rose-400" />
                            <p className="text-[10px] text-muted-foreground">Despesas</p>
                            <p className="font-display text-lg font-semibold text-rose-400">
                                {formatCurrency(stats.despesasMes)}
                            </p>
                        </div>
                        <div
                            className={cn(
                                'rounded-xl border p-3 text-center',
                                stats.lucro >= 0
                                    ? 'border-emerald-500/25 bg-emerald-500/5'
                                    : 'border-rose-500/25 bg-rose-500/5',
                            )}
                        >
                            <DollarSign
                                className={cn(
                                    'mx-auto mb-1 h-4 w-4',
                                    stats.lucro >= 0 ? 'text-emerald-400' : 'text-rose-400',
                                )}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                {stats.lucro >= 0 ? 'Lucro' : 'Prejuizo'}
                            </p>
                            <p
                                className={cn(
                                    'font-display text-lg font-semibold',
                                    stats.lucro >= 0 ? 'text-emerald-400' : 'text-rose-400',
                                )}
                            >
                                {formatCurrency(Math.abs(stats.lucro))}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Tab 2: Financeiro ───────────────────────────────────────────────────────

function FinancialTab({
    students,
    operationalExpenses,
    addExpense,
    updateExpense,
    deleteExpense,
}: {
    students: ReturnType<typeof useStore>['students']
    operationalExpenses: OperationalExpense[]
    addExpense: (expense: OperationalExpense) => void
    updateExpense: (expense: OperationalExpense) => void
    deleteExpense: (expenseId: string) => void
}) {
    const currentMonth = getCurrentMonthRef()

    const [expenseMonth, setExpenseMonth] = useState(currentMonth)
    const [showExpenseForm, setShowExpenseForm] = useState(false)
    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)
    const [formDescription, setFormDescription] = useState('')
    const [formAmount, setFormAmount] = useState('')
    const [formCategory, setFormCategory] = useState<ExpenseCategory>('outros')
    const [formMonth, setFormMonth] = useState(currentMonth)

    // ── Summary ──────────────────────────────────────────────────────

    const summary = useMemo(() => {
        let receitaMes = 0
        let pendenteMes = 0
        let pagoCount = 0
        let totalCount = 0

        for (const student of students) {
            for (const p of student.paymentHistory) {
                if (p.monthReference === currentMonth) {
                    totalCount++
                    if (p.status === 'paid') {
                        receitaMes += p.amountPaid
                        pagoCount++
                    } else {
                        pendenteMes += p.amount
                    }
                }
            }
        }

        const percentualPago = totalCount > 0 ? Math.round((pagoCount / totalCount) * 100) : 0

        return { receitaMes, pendenteMes, percentualPago }
    }, [students, currentMonth])

    // ── Monthly Revenue Table (last 12 months) ──────────────────────

    const monthlyRevenue = useMemo(() => {
        const months: { month: string; revenue: number; pending: number; count: number }[] = []
        const now = new Date()

        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const monthRef = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            let revenue = 0
            let pending = 0
            let count = 0

            for (const student of students) {
                for (const p of student.paymentHistory) {
                    if (p.monthReference === monthRef) {
                        count++
                        if (p.status === 'paid') {
                            revenue += p.amountPaid
                        } else {
                            pending += p.amount
                        }
                    }
                }
            }

            months.push({ month: monthRef, revenue, pending, count })
        }

        return months
    }, [students])

    // ── Filtered expenses ────────────────────────────────────────────

    const filteredExpenses = useMemo(() => {
        return operationalExpenses.filter((e) => e.monthReference === expenseMonth)
    }, [operationalExpenses, expenseMonth])

    const totalExpensesFiltered = useMemo(() => {
        return filteredExpenses.reduce((sum, e) => sum + e.amount, 0)
    }, [filteredExpenses])

    // ── Profit/Loss for the selected expense month ──────────────────

    const profitLoss = useMemo(() => {
        let revenue = 0
        for (const student of students) {
            for (const p of student.paymentHistory) {
                if (p.monthReference === expenseMonth && p.status === 'paid') {
                    revenue += p.amountPaid
                }
            }
        }
        return revenue - totalExpensesFiltered
    }, [students, expenseMonth, totalExpensesFiltered])

    // ── Form handlers ────────────────────────────────────────────────

    const resetForm = () => {
        setFormDescription('')
        setFormAmount('')
        setFormCategory('outros')
        setFormMonth(expenseMonth)
        setShowExpenseForm(false)
        setEditingExpenseId(null)
    }

    const handleOpenAddForm = () => {
        resetForm()
        setFormMonth(expenseMonth)
        setShowExpenseForm(true)
        setEditingExpenseId(null)
    }

    const handleOpenEditForm = (expense: OperationalExpense) => {
        setFormDescription(expense.description)
        setFormAmount(String(expense.amount))
        setFormCategory(expense.category)
        setFormMonth(expense.monthReference)
        setEditingExpenseId(expense.id)
        setShowExpenseForm(true)
    }

    const handleSubmitExpense = (e: React.FormEvent) => {
        e.preventDefault()
        const amount = parseFloat(formAmount)
        if (!formDescription.trim() || isNaN(amount) || amount <= 0) return

        if (editingExpenseId) {
            updateExpense({
                id: editingExpenseId,
                description: formDescription.trim(),
                amount,
                category: formCategory,
                monthReference: formMonth,
                createdAt: operationalExpenses.find((ex) => ex.id === editingExpenseId)?.createdAt ?? new Date().toISOString(),
            })
        } else {
            addExpense({
                id: generateId(),
                description: formDescription.trim(),
                amount,
                category: formCategory,
                monthReference: formMonth,
                createdAt: new Date().toISOString(),
            })
        }

        resetForm()
    }

    const handleDeleteExpense = (expenseId: string) => {
        deleteExpense(expenseId)
    }

    // ── Summary cards ────────────────────────────────────────────────

    const summaryCards = [
        {
            title: 'Receita do Mes',
            value: formatCurrency(summary.receitaMes),
            icon: ArrowUpRight,
            chipClass: 'chip-success',
        },
        {
            title: 'Pendente',
            value: formatCurrency(summary.pendenteMes),
            icon: Clock,
            chipClass: 'chip-warning',
        },
        {
            title: 'Percentual Pago',
            value: `${summary.percentualPago}%`,
            icon: Percent,
            chipClass: summary.percentualPago >= 80 ? 'chip-success' : summary.percentualPago >= 50 ? 'chip-warning' : 'chip-error',
        },
    ]

    return (
        <div className="space-y-4 animate-scale-in">
            {/* Summary Cards */}
            <div className="grid gap-3 sm:grid-cols-3 stagger-children">
                {summaryCards.map((item) => {
                    const Icon = item.icon
                    return (
                        <div key={item.title} className="stat-card animate-scale-in space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">{item.title}</p>
                                <Badge className={cn('text-[10px]', item.chipClass)}>
                                    <Icon className="mr-1 h-3 w-3" />
                                    {formatMonthYear(currentMonth)}
                                </Badge>
                            </div>
                            <p className="font-display text-2xl font-semibold text-white">{item.value}</p>
                        </div>
                    )
                })}
            </div>

            {/* Monthly Revenue Table */}
            <Card className="shadow-soft-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="font-display text-base">Receita Mensal (Ultimos 12 Meses)</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/20">
                                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Mes</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Receita</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Pendente</th>
                                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Pagamentos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyRevenue.map((row) => (
                                    <tr
                                        key={row.month}
                                        className="border-b border-border/10 transition-colors duration-150 hover:bg-white/[.02]"
                                    >
                                        <td className="px-4 py-2 text-sm text-white/80 capitalize">
                                            {formatMonthYear(row.month)}
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm font-semibold text-emerald-400">
                                            {formatCurrency(row.revenue)}
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-amber-400">
                                            {formatCurrency(row.pending)}
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-white/80">
                                            {row.count}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Operational Expenses */}
            <Card className="shadow-soft-sm">
                <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle className="font-display text-base">Despesas Operacionais</CardTitle>
                        <div className="flex items-center gap-2">
                            <Input
                                type="month"
                                value={expenseMonth}
                                onChange={(e) => setExpenseMonth(e.target.value)}
                                className="w-auto min-w-[160px]"
                            />
                            <Button size="sm" onClick={handleOpenAddForm} className="tactile">
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Adicionar
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Inline Form */}
                    {showExpenseForm && (
                        <div className="mb-4 rounded-xl border border-primary/20 bg-surface/40 p-3 space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-display font-semibold text-white/80">
                                    {editingExpenseId ? 'Editar Despesa' : 'Nova Despesa'}
                                </p>
                                <button type="button" onClick={resetForm}>
                                    <X className="h-4 w-4 text-muted-foreground hover:text-white" />
                                </button>
                            </div>
                            <form onSubmit={handleSubmitExpense} className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-xs font-medium text-muted-foreground">Descricao</label>
                                    <Input
                                        value={formDescription}
                                        onChange={(e) => setFormDescription(e.target.value)}
                                        placeholder="Ex: Aluguel do espaco"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Valor (R$)</label>
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
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                                    <select
                                        value={formCategory}
                                        onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                                        className="flex h-10 w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    >
                                        {expenseCategories.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {expenseCategoryLabels[cat]}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground">Mes de Referencia</label>
                                    <Input
                                        type="month"
                                        value={formMonth}
                                        onChange={(e) => setFormMonth(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="flex items-end justify-end gap-2 sm:col-span-2">
                                    <Button type="button" variant="ghost" onClick={resetForm}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" className="btn-glow">
                                        {editingExpenseId ? 'Salvar' : 'Adicionar'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Expense List */}
                    {filteredExpenses.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            Nenhuma despesa registrada para {formatMonthYear(expenseMonth)}.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {filteredExpenses.map((expense) => (
                                <div
                                    key={expense.id}
                                    className="flex items-center justify-between rounded-xl border border-border/20 bg-surface/40 p-3"
                                >
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <Badge
                                            className={cn(
                                                'shrink-0 text-[10px] border',
                                                expenseCategoryColors[expense.category],
                                            )}
                                        >
                                            {expenseCategoryLabels[expense.category]}
                                        </Badge>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-white">
                                                {expense.description}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {formatDateBR(expense.createdAt)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-rose-400 whitespace-nowrap">
                                            {formatCurrency(expense.amount)}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditForm(expense)}
                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface/60 hover:text-white transition-colors"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteExpense(expense.id)}
                                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Total Expenses */}
                    {filteredExpenses.length > 0 && (
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-border/20 bg-surface/40 p-3">
                            <p className="text-xs font-medium text-muted-foreground">Total Despesas</p>
                            <p className="font-display text-lg font-semibold text-rose-400">
                                {formatCurrency(totalExpensesFiltered)}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Profit/Loss Card */}
            <div
                className={cn(
                    'rounded-xl border p-4',
                    profitLoss >= 0
                        ? 'border-emerald-500/25 bg-emerald-500/5'
                        : 'border-rose-500/25 bg-rose-500/5',
                )}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-muted-foreground">
                            {profitLoss >= 0 ? 'Lucro' : 'Prejuizo'} em {formatMonthYear(expenseMonth)}
                        </p>
                        <p
                            className={cn(
                                'font-display text-2xl font-semibold mt-1',
                                profitLoss >= 0 ? 'text-emerald-400' : 'text-rose-400',
                            )}
                        >
                            {formatCurrency(Math.abs(profitLoss))}
                        </p>
                    </div>
                    {profitLoss >= 0 ? (
                        <ArrowUpRight className="h-8 w-8 text-emerald-400/50" />
                    ) : (
                        <ArrowDownRight className="h-8 w-8 text-rose-400/50" />
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Tab 3: Evolucao ─────────────────────────────────────────────────────────

function EvolutionTab() {
    const { students } = useStore()

    const [searchQuery, setSearchQuery] = useState('')
    const [selectedStudentId, setSelectedStudentId] = useState('')

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => a.name.localeCompare(b.name))
    }, [students])

    const filteredStudents = useMemo(() => {
        const q = searchQuery.trim().toLowerCase()
        if (!q) return sortedStudents
        return sortedStudents.filter((s) => s.name.toLowerCase().includes(q))
    }, [sortedStudents, searchQuery])

    const selectedStudent = useMemo(() => {
        if (!selectedStudentId) return null
        return students.find((s) => s.id === selectedStudentId) ?? null
    }, [students, selectedStudentId])

    const age = selectedStudent ? getAge(selectedStudent.birthDate) : 0

    // ── Skill tree completion per category ───────────────────────────

    const skillProgress = useMemo(() => {
        if (!selectedStudent) return []

        const grouped: Partial<Record<SkillCategory, { total: number; mastered: number }>> = {}
        for (const skill of selectedStudent.skillAchievements) {
            if (!grouped[skill.category]) {
                grouped[skill.category] = { total: 0, mastered: 0 }
            }
            grouped[skill.category]!.total++
            if (skill.status === 'mastered' || skill.status === 'fluid') {
                grouped[skill.category]!.mastered++
            }
        }

        return allCategories
            .filter((cat) => grouped[cat])
            .map((cat) => ({
                category: cat,
                total: grouped[cat]!.total,
                mastered: grouped[cat]!.mastered,
                pct: Math.round((grouped[cat]!.mastered / grouped[cat]!.total) * 100),
            }))
    }, [selectedStudent])

    return (
        <div className="space-y-4 animate-scale-in">
            {/* Student Selector */}
            <Card className="shadow-soft-sm">
                <CardContent className="p-3">
                    <label className="text-xs font-medium text-muted-foreground">Selecione o Aluno</label>
                    <div className="mt-1.5 relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar aluno..."
                            className="pl-9 mb-2"
                        />
                    </div>
                    <select
                        value={selectedStudentId}
                        onChange={(e) => setSelectedStudentId(e.target.value)}
                        className="flex h-10 w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        <option value="">Selecione um aluno...</option>
                        {filteredStudents.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name} — {getAge(s.birthDate)} anos
                            </option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            {!selectedStudent && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                    Selecione um aluno para visualizar a evolucao.
                </p>
            )}

            {selectedStudent && (
                <div className="space-y-4 animate-fade-in">
                    {/* Conditioning Evolution */}
                    <Card className="shadow-soft-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 font-display text-base">
                                <Medal className="h-4 w-4 text-yellow-400" />
                                Evolucao do Condicionamento
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedStudent.conditioningTests.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    Nenhum teste de condicionamento registrado.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border/20">
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Data</th>
                                                {conditioningExercises.map((ex) => (
                                                    <th key={ex.key} className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                                                        {ex.label}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...selectedStudent.conditioningTests].reverse().map((test) => (
                                                <tr
                                                    key={test.id}
                                                    className="border-b border-border/10 transition-colors duration-150 hover:bg-white/[.02]"
                                                >
                                                    <td className="px-3 py-2 text-xs text-white/80 whitespace-nowrap">
                                                        {formatDateBR(test.date)}
                                                    </td>
                                                    {conditioningExercises.map((ex) => {
                                                        const value = test[ex.key]
                                                        const { level } = getConditioningLevel(ex.key, value, age)
                                                        return (
                                                            <td key={ex.key} className="px-3 py-2 text-center">
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className="text-xs font-semibold text-white">
                                                                        {value}
                                                                    </span>
                                                                    <Badge
                                                                        className={cn(
                                                                            'text-[9px] border px-1 py-0',
                                                                            levelColors[level],
                                                                        )}
                                                                    >
                                                                        {levelLabels[level]}
                                                                    </Badge>
                                                                </div>
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Physical Assessment History */}
                    <Card className="shadow-soft-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 font-display text-base">
                                <Scale className="h-4 w-4 text-blue-400" />
                                Historico de Avaliacoes Fisicas
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {selectedStudent.physicalAssessments.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    Nenhuma avaliacao fisica registrada.
                                </p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border/20">
                                                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Data</th>
                                                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                                                    <Scale className="inline h-3 w-3 mr-1" />
                                                    Peso (kg)
                                                </th>
                                                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                                                    <Ruler className="inline h-3 w-3 mr-1" />
                                                    Altura (cm)
                                                </th>
                                                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Cintura (cm)</th>
                                                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">IMC</th>
                                                <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Classificacao</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...selectedStudent.physicalAssessments].reverse().map((assessment) => {
                                                const bmi = calculateBMI(assessment.weight, assessment.height)
                                                const classification = classifyBMI(bmi, age)
                                                return (
                                                    <tr
                                                        key={assessment.id}
                                                        className="border-b border-border/10 transition-colors duration-150 hover:bg-white/[.02]"
                                                    >
                                                        <td className="px-3 py-2 text-xs text-white/80 whitespace-nowrap">
                                                            {formatDateBR(assessment.date)}
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-xs text-white">
                                                            {assessment.weight}
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-xs text-white">
                                                            {assessment.height}
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-xs text-white">
                                                            {assessment.waistCircumference}
                                                        </td>
                                                        <td className="px-3 py-2 text-center text-xs font-semibold text-white">
                                                            {bmi}
                                                        </td>
                                                        <td className="px-3 py-2 text-center">
                                                            <span className={cn('text-xs font-medium', classification.color)}>
                                                                {classification.label}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Skill Tree Completion */}
                    <Card className="shadow-soft-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 font-display text-base">
                                <Activity className="h-4 w-4 text-emerald-400" />
                                Arvore de Habilidades
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {skillProgress.length === 0 ? (
                                <p className="py-4 text-center text-sm text-muted-foreground">
                                    Nenhuma habilidade registrada.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {skillProgress.map((item) => {
                                        const colors = categoryColors[item.category]
                                        return (
                                            <div key={item.category} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className={cn('text-xs font-medium', colors.text)}>
                                                        {categoryLabels[item.category]}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground">
                                                        {item.mastered}/{item.total} ({item.pct}%)
                                                    </span>
                                                </div>
                                                <div className="h-2.5 overflow-hidden rounded-full bg-border/30">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full transition-all duration-500',
                                                            item.pct >= 80
                                                                ? 'bg-emerald-500'
                                                                : item.pct >= 40
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-zinc-600',
                                                        )}
                                                        style={{ width: `${item.pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

// ─── Tab 4: Imprimir ─────────────────────────────────────────────────────────

function PrintTab() {
    const { students } = useStore()

    const [selectedStudentId, setSelectedStudentId] = useState('')
    const [loadingStudent, setLoadingStudent] = useState(false)
    const [loadingAcademy, setLoadingAcademy] = useState(false)

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => a.name.localeCompare(b.name))
    }, [students])

    const handleGenerateStudentReport = async () => {
        if (!selectedStudentId) return
        const student = students.find((s) => s.id === selectedStudentId)
        if (!student) return

        setLoadingStudent(true)
        try {
            const { generateStudentReport } = await import('../lib/pdf-reports')
            await generateStudentReport(student)
        } catch (err) {
            console.error('Erro ao gerar relatorio do aluno:', err)
        } finally {
            setLoadingStudent(false)
        }
    }

    const handleGenerateAcademyReport = async () => {
        setLoadingAcademy(true)
        try {
            const { generateAcademyReport } = await import('../lib/pdf-reports')
            await generateAcademyReport(students)
        } catch (err) {
            console.error('Erro ao gerar relatorio da academia:', err)
        } finally {
            setLoadingAcademy(false)
        }
    }

    return (
        <div className="space-y-4 animate-scale-in">
            {/* Individual Report */}
            <Card className="shadow-soft-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 font-display text-base">
                        <Download className="h-4 w-4 text-primary" />
                        Relatorio Individual
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-xs">
                        Gere um PDF completo com dados do aluno, avaliacoes, condicionamento e habilidades.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-muted-foreground">Selecione o Aluno</label>
                            <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="flex h-10 w-full rounded-xl border border-input bg-background/60 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <option value="">Selecione um aluno...</option>
                                {sortedStudents.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} — {s.status}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <Button
                            onClick={handleGenerateStudentReport}
                            disabled={!selectedStudentId || loadingStudent}
                            className="w-full btn-glow"
                        >
                            {loadingStudent ? (
                                <>
                                    <Clock className="mr-1.5 h-4 w-4 animate-spin" />
                                    Gerando...
                                </>
                            ) : (
                                <>
                                    <Printer className="mr-1.5 h-4 w-4" />
                                    Gerar PDF do Aluno
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Academy Report */}
            <Card className="shadow-soft-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 font-display text-base">
                        <FileBarChart className="h-4 w-4 text-emerald-400" />
                        Relatorio Geral da Academia
                    </CardTitle>
                    <CardDescription className="text-muted-foreground text-xs">
                        Gere um PDF consolidado com dados de todos os alunos, financas e metricas da academia.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleGenerateAcademyReport}
                        disabled={loadingAcademy}
                        className="w-full btn-glow"
                    >
                        {loadingAcademy ? (
                            <>
                                <Clock className="mr-1.5 h-4 w-4 animate-spin" />
                                Gerando...
                            </>
                        ) : (
                            <>
                                <Download className="mr-1.5 h-4 w-4" />
                                Gerar PDF da Academia
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
