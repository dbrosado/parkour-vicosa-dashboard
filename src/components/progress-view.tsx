import {
    Activity,
    AlertTriangle,
    Award,
    CalendarCheck,
    ChevronDown,
    ChevronUp,
    Dumbbell,
    Flame,
    Medal,
    Plus,
    Ruler,
    Scale,
    Search,
    Shield,
    TrendingUp,
    Trophy,
    User,
    Volume2,
    Wind,
    X,
} from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'

import {
    calculateBMI,
    classifyBMI,
    cn,
    formatDateBR,
    getAge,
    getConditioningLevel,
    waistHeightRatio,
} from '../lib/utils'
import {
    categoryColors,
    categoryLabels,
    skillStatusLabels,
} from '../data/skills-data'
import type {
    ConditioningTest,
    PhysicalAssessment,
    SkillAchievement,
    SkillCategory,
    SkillStatus,
    Student,
} from '../types'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

// ─── Types ───────────────────────────────────────────────────────────────────

type ProgressViewProps = {
    students: Student[]
    onUpdateStudent: (student: Student) => void
}

type TabKey = 'overview' | 'physical' | 'conditioning' | 'skills'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAttendanceRate(student: Student) {
    if (!student.attendanceHistory.length) return 0
    const present = student.attendanceHistory.filter(
        (a) => a.status === 'present' || a.status === 'late',
    ).length
    return Math.round((present / student.attendanceHistory.length) * 100)
}

function getSkillProgress(student: Student) {
    const skills = student.skillAchievements
    if (!skills.length) return 0
    const mastered = skills.filter((s) => s.status === 'mastered' || s.status === 'fluid').length
    return Math.round((mastered / skills.length) * 100)
}

function getTotalAssessments(students: Student[]) {
    return students.reduce(
        (sum, s) => sum + s.physicalAssessments.length + s.conditioningTests.length,
        0,
    )
}

function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const conditioningExercises = [
    { key: 'pushUps' as const, label: 'Flexoes', unit: 'reps' },
    { key: 'pullUps' as const, label: 'Barra Fixa', unit: 'reps' },
    { key: 'sitUps' as const, label: 'Abdominais', unit: 'reps' },
    { key: 'verticalJump' as const, label: 'Salto Vertical', unit: 'cm' },
    { key: 'horizontalJump' as const, label: 'Salto Horizontal', unit: 'cm' },
] as const

const levelColors = {
    gold: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/25',
    silver: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/25',
    bronze: 'text-orange-400 bg-orange-500/10 border-orange-500/25',
    below: 'text-zinc-500 bg-zinc-500/5 border-zinc-500/20',
} as const

const levelLabels = {
    gold: 'Ouro',
    silver: 'Prata',
    bronze: 'Bronze',
    below: 'Abaixo',
} as const


const qualityIcons = [
    { key: 'control' as const, label: 'Controle', Icon: Shield },
    { key: 'silence' as const, label: 'Silencio', Icon: Volume2 },
    { key: 'flow' as const, label: 'Fluidez', Icon: Wind },
    { key: 'courage' as const, label: 'Coragem', Icon: Flame },
] as const

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

const statusOptions: SkillStatus[] = ['not_started', 'learning', 'mastered', 'fluid']

// ─── BMI Gauge Component ─────────────────────────────────────────────────────

function BMIGauge({ bmi, classification }: { bmi: number; classification: { label: string; color: string; level: number } }) {
    // Map bmi to a position from 0 to 100
    // Range approximately 12 - 40
    const minBmi = 12
    const maxBmi = 40
    const pct = Math.max(0, Math.min(100, ((bmi - minBmi) / (maxBmi - minBmi)) * 100))

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>12</span>
                <span>18.5</span>
                <span>25</span>
                <span>30</span>
                <span>40</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full flex">
                <div className="h-full bg-sky-500" style={{ width: '23.2%' }} />
                <div className="h-full bg-emerald-500" style={{ width: '23.2%' }} />
                <div className="h-full bg-amber-500" style={{ width: '17.9%' }} />
                <div className="h-full bg-rose-500" style={{ width: '35.7%' }} />
            </div>
            <div className="relative h-4">
                <div
                    className="absolute -translate-x-1/2 transition-all duration-500"
                    style={{ left: `${pct}%` }}
                >
                    <div className="flex flex-col items-center">
                        <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-b-[6px] border-l-transparent border-r-transparent border-b-white" />
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <span className={cn('text-sm font-semibold', classification.color)}>
                    {bmi}
                </span>
                <span className={cn('text-xs font-medium', classification.color)}>
                    {classification.label}
                </span>
            </div>
        </div>
    )
}

// ─── Conditioning Bar Component ──────────────────────────────────────────────

function ConditioningBar({
    value,
    thresholds,
    level,
}: {
    value: number
    thresholds: { bronze: number; silver: number; gold: number }
    level: string
}) {
    const max = Math.max(thresholds.gold * 1.3, value * 1.15)
    const pctValue = Math.min(100, (value / max) * 100)
    const pctBronze = (thresholds.bronze / max) * 100
    const pctSilver = (thresholds.silver / max) * 100
    const pctGold = (thresholds.gold / max) * 100

    return (
        <div className="space-y-1">
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
                {/* Bronze zone */}
                <div
                    className="absolute inset-y-0 left-0 bg-orange-500/30"
                    style={{ width: `${pctSilver}%` }}
                />
                {/* Silver zone */}
                <div
                    className="absolute inset-y-0 bg-zinc-400/20"
                    style={{ left: `${pctSilver}%`, width: `${pctGold - pctSilver}%` }}
                />
                {/* Gold zone */}
                <div
                    className="absolute inset-y-0 bg-yellow-500/15"
                    style={{ left: `${pctGold}%`, right: 0 }}
                />
                {/* Value indicator */}
                <div
                    className={cn(
                        'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
                        level === 'gold'
                            ? 'bg-yellow-400'
                            : level === 'silver'
                                ? 'bg-zinc-300'
                                : level === 'bronze'
                                    ? 'bg-orange-400'
                                    : 'bg-zinc-600',
                    )}
                    style={{ width: `${pctValue}%` }}
                />
            </div>
            <div className="relative flex text-[9px] text-muted-foreground">
                <span className="absolute" style={{ left: `${pctBronze}%`, transform: 'translateX(-50%)' }}>
                    B:{thresholds.bronze}
                </span>
                <span className="absolute" style={{ left: `${pctSilver}%`, transform: 'translateX(-50%)' }}>
                    P:{thresholds.silver}
                </span>
                <span className="absolute" style={{ left: `${pctGold}%`, transform: 'translateX(-50%)' }}>
                    O:{thresholds.gold}
                </span>
            </div>
        </div>
    )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ProgressView({ students, onUpdateStudent }: ProgressViewProps) {
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabKey>('overview')

    // Form states
    const [showPhysicalForm, setShowPhysicalForm] = useState(false)
    const [showConditioningForm, setShowConditioningForm] = useState(false)
    const [physicalForm, setPhysicalForm] = useState({ weight: '', height: '', waist: '' })
    const [conditioningForm, setConditioningForm] = useState({
        pushUps: '',
        pullUps: '',
        sitUps: '',
        verticalJump: '',
        horizontalJump: '',
    })

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return students
        return students.filter((s) => s.name.toLowerCase().includes(q))
    }, [search, students])

    const toggleExpand = useCallback((id: string) => {
        setExpandedId((prev) => {
            if (prev === id) return null
            setActiveTab('overview')
            setShowPhysicalForm(false)
            setShowConditioningForm(false)
            return id
        })
    }, [])

    const expandedStudent = expandedId ? students.find((s) => s.id === expandedId) : null

    // ─── Summary stats ──────────────────────────────────────────────

    const avgAttendance = useMemo(() => {
        if (!students.length) return 0
        return Math.round(students.reduce((sum, s) => sum + getAttendanceRate(s), 0) / students.length)
    }, [students])

    const avgSkillProgress = useMemo(() => {
        if (!students.length) return 0
        return Math.round(students.reduce((sum, s) => sum + getSkillProgress(s), 0) / students.length)
    }, [students])

    const totalAssessments = useMemo(() => getTotalAssessments(students), [students])

    // ─── Handlers ────────────────────────────────────────────────────

    const handleAddPhysicalAssessment = useCallback(
        (student: Student) => {
            const weight = parseFloat(physicalForm.weight)
            const height = parseFloat(physicalForm.height)
            const waist = parseFloat(physicalForm.waist)
            if (isNaN(weight) || isNaN(height) || isNaN(waist)) return

            const assessment: PhysicalAssessment = {
                id: generateId(),
                date: new Date().toISOString().split('T')[0],
                weight,
                height,
                waistCircumference: waist,
            }
            onUpdateStudent({
                ...student,
                physicalAssessments: [...student.physicalAssessments, assessment],
            })
            setPhysicalForm({ weight: '', height: '', waist: '' })
            setShowPhysicalForm(false)
        },
        [physicalForm, onUpdateStudent],
    )

    const handleAddConditioningTest = useCallback(
        (student: Student) => {
            const pushUps = parseInt(conditioningForm.pushUps)
            const pullUps = parseInt(conditioningForm.pullUps)
            const sitUps = parseInt(conditioningForm.sitUps)
            const verticalJump = parseFloat(conditioningForm.verticalJump)
            const horizontalJump = parseFloat(conditioningForm.horizontalJump)
            if ([pushUps, pullUps, sitUps, verticalJump, horizontalJump].some(isNaN)) return

            const test: ConditioningTest = {
                id: generateId(),
                date: new Date().toISOString().split('T')[0],
                pushUps,
                pullUps,
                sitUps,
                verticalJump,
                horizontalJump,
            }
            onUpdateStudent({
                ...student,
                conditioningTests: [...student.conditioningTests, test],
            })
            setConditioningForm({ pushUps: '', pullUps: '', sitUps: '', verticalJump: '', horizontalJump: '' })
            setShowConditioningForm(false)
        },
        [conditioningForm, onUpdateStudent],
    )

    const handleSkillStatusChange = useCallback(
        (student: Student, skillId: string, newStatus: SkillStatus) => {
            const updated = student.skillAchievements.map((skill) => {
                if (skill.id !== skillId) return skill
                return {
                    ...skill,
                    status: newStatus,
                    quality:
                        newStatus === 'mastered' || newStatus === 'fluid'
                            ? skill.quality
                            : { control: false, silence: false, flow: false, courage: false },
                    updatedAt: new Date().toISOString(),
                }
            })
            onUpdateStudent({ ...student, skillAchievements: updated })
        },
        [onUpdateStudent],
    )

    const handleSkillQualityToggle = useCallback(
        (student: Student, skillId: string, qualityKey: keyof SkillAchievement['quality']) => {
            const updated = student.skillAchievements.map((skill) => {
                if (skill.id !== skillId) return skill
                return {
                    ...skill,
                    quality: { ...skill.quality, [qualityKey]: !skill.quality[qualityKey] },
                    updatedAt: new Date().toISOString(),
                }
            })
            onUpdateStudent({ ...student, skillAchievements: updated })
        },
        [onUpdateStudent],
    )

    // ─── Render ──────────────────────────────────────────────────────

    return (
        <div className="space-y-4">
            {/* Header */}
            <Card className="border-emerald-500/10 bg-hero-grid shadow-soft-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-xl sm:text-2xl">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                        Progresso dos Alunos
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                        Avaliacao fisica, condicionamento e arvore de habilidades.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Summary Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 stagger-children">
                <div className="stat-card">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Frequencia Media</p>
                    <p className="font-display text-xl sm:text-2xl font-semibold text-emerald-400">
                        {avgAttendance}%
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Habilidades Media</p>
                    <p className="font-display text-xl sm:text-2xl font-semibold text-primary">
                        {avgSkillProgress}%
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total Avaliacoes</p>
                    <p className="font-display text-xl sm:text-2xl font-semibold text-cyan-400">
                        {totalAssessments}
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Total de Alunos</p>
                    <p className="font-display text-xl sm:text-2xl font-semibold text-white">
                        {students.length}
                    </p>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar aluno..."
                    className="pl-9"
                />
            </div>

            {/* Student Cards */}
            <div className="space-y-3 stagger-children">
                {filtered.map((student) => {
                    const isExpanded = expandedId === student.id
                    const attendanceRate = getAttendanceRate(student)
                    const skillPct = getSkillProgress(student)
                    const age = getAge(student.birthDate)

                    return (
                        <Card
                            key={student.id}
                            className={cn(
                                'shadow-soft-sm transition-all duration-200',
                                isExpanded && 'border-primary/20',
                            )}
                        >
                            <CardContent className="p-0">
                                {/* Collapsed Row */}
                                <button
                                    type="button"
                                    onClick={() => toggleExpand(student.id)}
                                    className="flex w-full items-center gap-3 p-3 sm:p-4 text-left"
                                >
                                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-border/20">
                                        <AvatarImage src={student.photoUrl} alt={student.name} />
                                        <AvatarFallback className="bg-primary/10 text-xs text-white">
                                            {student.name
                                                .split(' ')
                                                .slice(0, 2)
                                                .map((c) => c[0])
                                                .join('')}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-white">
                                            {student.name}
                                        </p>
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                                            <span className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                                                <CalendarCheck className="h-3 w-3" />
                                                {attendanceRate}%
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] sm:text-xs text-emerald-400">
                                                <Trophy className="h-3 w-3" />
                                                {skillPct}%
                                            </span>
                                            <span className="text-[10px] sm:text-xs text-muted-foreground">
                                                {age} anos
                                            </span>
                                        </div>
                                    </div>

                                    {/* Progress ring */}
                                    <div className="flex items-center gap-2">
                                        <div className="relative hidden sm:flex h-10 w-10 items-center justify-center">
                                            <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                                                <path
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke="hsl(0 0% 20%)"
                                                    strokeWidth="3"
                                                />
                                                <path
                                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                    fill="none"
                                                    stroke="hsl(142 76% 36%)"
                                                    strokeWidth="3"
                                                    strokeDasharray={`${skillPct}, 100`}
                                                    strokeLinecap="round"
                                                    className="transition-all duration-500"
                                                />
                                            </svg>
                                            <span className="absolute text-[9px] font-semibold text-white">
                                                {skillPct}%
                                            </span>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </div>
                                </button>

                                {/* Expanded Detail */}
                                {isExpanded && expandedStudent && (
                                    <div className="animate-fade-in border-t border-border/20">
                                        {/* Tab Bar */}
                                        <div className="flex overflow-x-auto border-b border-border/20 px-2 sm:px-4">
                                            {(
                                                [
                                                    { key: 'overview' as const, label: 'Resumo', icon: User },
                                                    { key: 'physical' as const, label: 'Avaliacao Fisica', icon: Scale },
                                                    { key: 'conditioning' as const, label: 'Condicionamento', icon: Dumbbell },
                                                    { key: 'skills' as const, label: 'Habilidades', icon: Award },
                                                ]
                                            ).map((tab) => (
                                                <button
                                                    key={tab.key}
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveTab(tab.key)
                                                        setShowPhysicalForm(false)
                                                        setShowConditioningForm(false)
                                                    }}
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

                                        <div className="p-3 sm:p-4">
                                            {/* ──── Tab: Resumo ──── */}
                                            {activeTab === 'overview' && (
                                                <OverviewTab
                                                    student={expandedStudent}
                                                    attendanceRate={attendanceRate}
                                                    skillPct={skillPct}
                                                    age={age}
                                                />
                                            )}

                                            {/* ──── Tab: Avaliacao Fisica ──── */}
                                            {activeTab === 'physical' && (
                                                <PhysicalTab
                                                    student={expandedStudent}
                                                    age={age}
                                                    showForm={showPhysicalForm}
                                                    onToggleForm={() => setShowPhysicalForm((v) => !v)}
                                                    formValues={physicalForm}
                                                    onFormChange={setPhysicalForm}
                                                    onSubmit={() => handleAddPhysicalAssessment(expandedStudent)}
                                                />
                                            )}

                                            {/* ──── Tab: Condicionamento ──── */}
                                            {activeTab === 'conditioning' && (
                                                <ConditioningTab
                                                    student={expandedStudent}
                                                    age={age}
                                                    showForm={showConditioningForm}
                                                    onToggleForm={() => setShowConditioningForm((v) => !v)}
                                                    formValues={conditioningForm}
                                                    onFormChange={setConditioningForm}
                                                    onSubmit={() => handleAddConditioningTest(expandedStudent)}
                                                />
                                            )}

                                            {/* ──── Tab: Habilidades ──── */}
                                            {activeTab === 'skills' && (
                                                <SkillsTab
                                                    student={expandedStudent}
                                                    onStatusChange={(skillId, status) =>
                                                        handleSkillStatusChange(expandedStudent, skillId, status)
                                                    }
                                                    onQualityToggle={(skillId, qualityKey) =>
                                                        handleSkillQualityToggle(
                                                            expandedStudent,
                                                            skillId,
                                                            qualityKey,
                                                        )
                                                    }
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}

                {filtered.length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Nenhum aluno encontrado.
                    </p>
                )}
            </div>
        </div>
    )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({
    student,
    attendanceRate,
    skillPct,
    age,
}: {
    student: Student
    attendanceRate: number
    skillPct: number
    age: number
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2 animate-scale-in">
            <div className="space-y-2 rounded-xl border border-border/20 bg-surface/40 p-3">
                <p className="text-xs font-display font-semibold text-white/80">Informacoes</p>
                <p className="text-sm text-white">
                    {student.name}, {age} anos
                </p>
                <p className="text-xs text-muted-foreground">Contato: {student.parentContact}</p>
                <p className="text-xs text-muted-foreground">Turma: {student.mainClass}</p>
                {student.enrolledAt && (
                    <p className="text-xs text-muted-foreground">
                        Matricula: {formatDateBR(student.enrolledAt)}
                    </p>
                )}
                {student.physicalAssessments.length > 0 && (() => {
                    const latest = student.physicalAssessments[student.physicalAssessments.length - 1]
                    return (
                        <p className="text-xs text-muted-foreground">
                            {latest.weight}kg / {latest.height}cm
                        </p>
                    )
                })()}
            </div>
            <div className="space-y-3">
                <div className="rounded-xl border border-border/20 bg-surface/40 p-3">
                    <p className="text-xs text-muted-foreground">Frequencia</p>
                    <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/30">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all duration-500',
                                    attendanceRate >= 80
                                        ? 'bg-emerald-500'
                                        : attendanceRate >= 60
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500',
                                )}
                                style={{ width: `${attendanceRate}%` }}
                            />
                        </div>
                        <span className="text-sm font-semibold text-white">{attendanceRate}%</span>
                    </div>
                </div>
                <div className="rounded-xl border border-border/20 bg-surface/40 p-3">
                    <p className="text-xs text-muted-foreground">Habilidades Dominadas</p>
                    <div className="mt-1 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border/30">
                            <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${skillPct}%` }}
                            />
                        </div>
                        <span className="text-sm font-semibold text-white">{skillPct}%</span>
                    </div>
                </div>
                <div className="rounded-xl border border-border/20 bg-surface/40 p-3">
                    <p className="text-xs text-muted-foreground">Avaliacoes Fisicas / Testes</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                        {student.physicalAssessments.length} avaliacoes /{' '}
                        {student.conditioningTests.length} testes
                    </p>
                </div>
            </div>
        </div>
    )
}

// ─── Physical Assessment Tab ─────────────────────────────────────────────────

function PhysicalTab({
    student,
    age,
    showForm,
    onToggleForm,
    formValues,
    onFormChange,
    onSubmit,
}: {
    student: Student
    age: number
    showForm: boolean
    onToggleForm: () => void
    formValues: { weight: string; height: string; waist: string }
    onFormChange: (v: { weight: string; height: string; waist: string }) => void
    onSubmit: () => void
}) {
    const latest =
        student.physicalAssessments.length > 0
            ? student.physicalAssessments[student.physicalAssessments.length - 1]
            : null

    const bmi = latest ? calculateBMI(latest.weight, latest.height) : 0
    const bmiClass = latest ? classifyBMI(bmi, age) : null
    const whr = latest ? waistHeightRatio(latest.waistCircumference, latest.height) : null

    return (
        <div className="space-y-4 animate-scale-in">
            {/* Latest Assessment */}
            {latest ? (
                <div className="space-y-4">
                    <div className="grid gap-3 grid-cols-3">
                        <div className="rounded-xl border border-border/20 bg-surface/40 p-3 text-center">
                            <Scale className="mx-auto h-4 w-4 text-blue-400 mb-1" />
                            <p className="text-lg font-semibold text-white">{latest.weight}</p>
                            <p className="text-[10px] text-muted-foreground">kg</p>
                        </div>
                        <div className="rounded-xl border border-border/20 bg-surface/40 p-3 text-center">
                            <Ruler className="mx-auto h-4 w-4 text-emerald-400 mb-1" />
                            <p className="text-lg font-semibold text-white">{latest.height}</p>
                            <p className="text-[10px] text-muted-foreground">cm</p>
                        </div>
                        <div className="rounded-xl border border-border/20 bg-surface/40 p-3 text-center">
                            <Activity className="mx-auto h-4 w-4 text-cyan-400 mb-1" />
                            <p className="text-lg font-semibold text-white">{latest.waistCircumference}</p>
                            <p className="text-[10px] text-muted-foreground">cm cintura</p>
                        </div>
                    </div>

                    {/* BMI Gauge */}
                    {bmiClass && (
                        <div className="rounded-xl border border-border/20 bg-surface/40 p-3">
                            <p className="text-xs font-display font-semibold text-white/80 mb-2">
                                IMC (Indice de Massa Corporal)
                            </p>
                            <BMIGauge bmi={bmi} classification={bmiClass} />
                        </div>
                    )}

                    {/* Waist/Height Ratio */}
                    {whr && (
                        <div
                            className={cn(
                                'rounded-xl border p-3',
                                whr.risk
                                    ? 'border-rose-500/30 bg-rose-500/5'
                                    : 'border-border/20 bg-surface/40',
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-display font-semibold text-white/80">
                                        Razao Cintura/Altura
                                    </p>
                                    <p className="text-lg font-semibold text-white mt-1">{whr.ratio}</p>
                                </div>
                                {whr.risk ? (
                                    <div className="flex items-center gap-1.5 text-rose-400">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="text-xs font-medium">Risco Elevado</span>
                                    </div>
                                ) : (
                                    <Badge className="chip-success text-[10px]">Normal</Badge>
                                )}
                            </div>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                                {whr.risk
                                    ? 'Razao acima de 0.5 indica risco cardiovascular elevado.'
                                    : 'Dentro da faixa saudavel (abaixo de 0.5).'}
                            </p>
                        </div>
                    )}

                    <p className="text-[10px] text-muted-foreground">
                        Ultima avaliacao: {formatDateBR(latest.date)}
                    </p>
                </div>
            ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhuma avaliacao fisica registrada.
                </p>
            )}

            {/* History */}
            {student.physicalAssessments.length > 1 && (
                <div className="rounded-xl border border-border/20 bg-surface/40 p-3">
                    <p className="text-xs font-display font-semibold text-white/80 mb-2">
                        Historico de Avaliacoes
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {[...student.physicalAssessments].reverse().map((a) => (
                            <div
                                key={a.id}
                                className="flex items-center justify-between text-xs rounded-lg border border-border/10 bg-surface/20 px-3 py-1.5"
                            >
                                <span className="text-muted-foreground">{formatDateBR(a.date)}</span>
                                <div className="flex items-center gap-3 text-white/80">
                                    <span>{a.weight}kg</span>
                                    <span>{a.height}cm</span>
                                    <span>{a.waistCircumference}cm</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Form */}
            {showForm ? (
                <div className="rounded-xl border border-primary/20 bg-surface/40 p-3 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-display font-semibold text-white/80">
                            Nova Avaliacao Fisica
                        </p>
                        <button type="button" onClick={onToggleForm}>
                            <X className="h-4 w-4 text-muted-foreground hover:text-white" />
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div>
                            <label className="text-[10px] text-muted-foreground">Peso (kg)</label>
                            <Input
                                type="number"
                                step="0.1"
                                placeholder="65.0"
                                value={formValues.weight}
                                onChange={(e) =>
                                    onFormChange({ ...formValues, weight: e.target.value })
                                }
                                className="mt-0.5"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-muted-foreground">Altura (cm)</label>
                            <Input
                                type="number"
                                step="0.1"
                                placeholder="170"
                                value={formValues.height}
                                onChange={(e) =>
                                    onFormChange({ ...formValues, height: e.target.value })
                                }
                                className="mt-0.5"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-muted-foreground">Cintura (cm)</label>
                            <Input
                                type="number"
                                step="0.1"
                                placeholder="75"
                                value={formValues.waist}
                                onChange={(e) =>
                                    onFormChange({ ...formValues, waist: e.target.value })
                                }
                                className="mt-0.5"
                            />
                        </div>
                    </div>
                    <Button size="sm" onClick={onSubmit} className="w-full">
                        Salvar Avaliacao
                    </Button>
                </div>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleForm}
                    className="w-full gap-1.5"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Avaliacao
                </Button>
            )}
        </div>
    )
}

// ─── Conditioning Tab ────────────────────────────────────────────────────────

function ConditioningTab({
    student,
    age,
    showForm,
    onToggleForm,
    formValues,
    onFormChange,
    onSubmit,
}: {
    student: Student
    age: number
    showForm: boolean
    onToggleForm: () => void
    formValues: {
        pushUps: string
        pullUps: string
        sitUps: string
        verticalJump: string
        horizontalJump: string
    }
    onFormChange: (v: {
        pushUps: string
        pullUps: string
        sitUps: string
        verticalJump: string
        horizontalJump: string
    }) => void
    onSubmit: () => void
}) {
    const latest =
        student.conditioningTests.length > 0
            ? student.conditioningTests[student.conditioningTests.length - 1]
            : null

    return (
        <div className="space-y-4 animate-scale-in">
            {latest ? (
                <div className="space-y-3">
                    {conditioningExercises.map(({ key, label, unit }) => {
                        const value = latest[key]
                        const { level, thresholds } = getConditioningLevel(key, value, age)

                        return (
                            <div
                                key={key}
                                className="rounded-xl border border-border/20 bg-surface/40 p-3"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-white">{label}</span>
                                        <span className="text-sm font-semibold text-white">
                                            {value}
                                            <span className="text-[10px] text-muted-foreground ml-0.5">
                                                {unit}
                                            </span>
                                        </span>
                                    </div>
                                    <Badge
                                        className={cn(
                                            'text-[10px] border',
                                            levelColors[level],
                                        )}
                                    >
                                        <Medal className="h-3 w-3 mr-1" />
                                        {levelLabels[level]}
                                    </Badge>
                                </div>
                                <ConditioningBar
                                    value={value}
                                    thresholds={thresholds}
                                    level={level}
                                />
                            </div>
                        )
                    })}
                    <p className="text-[10px] text-muted-foreground">
                        Ultimo teste: {formatDateBR(latest.date)}
                    </p>
                </div>
            ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum teste de condicionamento registrado.
                </p>
            )}

            {/* History */}
            {student.conditioningTests.length > 1 && (
                <div className="rounded-xl border border-border/20 bg-surface/40 p-3">
                    <p className="text-xs font-display font-semibold text-white/80 mb-2">
                        Historico de Testes
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                        {[...student.conditioningTests].reverse().map((t) => (
                            <div
                                key={t.id}
                                className="flex items-center justify-between text-[10px] rounded-lg border border-border/10 bg-surface/20 px-3 py-1.5"
                            >
                                <span className="text-muted-foreground">{formatDateBR(t.date)}</span>
                                <div className="flex items-center gap-2 text-white/80">
                                    <span>F:{t.pushUps}</span>
                                    <span>B:{t.pullUps}</span>
                                    <span>A:{t.sitUps}</span>
                                    <span>SV:{t.verticalJump}</span>
                                    <span>SH:{t.horizontalJump}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Form */}
            {showForm ? (
                <div className="rounded-xl border border-primary/20 bg-surface/40 p-3 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-display font-semibold text-white/80">
                            Novo Teste de Condicionamento
                        </p>
                        <button type="button" onClick={onToggleForm}>
                            <X className="h-4 w-4 text-muted-foreground hover:text-white" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {([
                            { key: 'pushUps' as const, label: 'Flexoes', ph: '20' },
                            { key: 'pullUps' as const, label: 'Barra Fixa', ph: '5' },
                            { key: 'sitUps' as const, label: 'Abdominais', ph: '30' },
                            { key: 'verticalJump' as const, label: 'Salto Vert. (cm)', ph: '35' },
                            { key: 'horizontalJump' as const, label: 'Salto Horiz. (cm)', ph: '180' },
                        ]).map(({ key, label, ph }) => (
                            <div key={key}>
                                <label className="text-[10px] text-muted-foreground">{label}</label>
                                <Input
                                    type="number"
                                    placeholder={ph}
                                    value={formValues[key]}
                                    onChange={(e) =>
                                        onFormChange({ ...formValues, [key]: e.target.value })
                                    }
                                    className="mt-0.5"
                                />
                            </div>
                        ))}
                    </div>
                    <Button size="sm" onClick={onSubmit} className="w-full">
                        Salvar Teste
                    </Button>
                </div>
            ) : (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleForm}
                    className="w-full gap-1.5"
                >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Teste
                </Button>
            )}
        </div>
    )
}

// ─── Skills Tab ──────────────────────────────────────────────────────────────

function SkillsTab({
    student,
    onStatusChange,
    onQualityToggle,
}: {
    student: Student
    onStatusChange: (skillId: string, status: SkillStatus) => void
    onQualityToggle: (skillId: string, qualityKey: keyof SkillAchievement['quality']) => void
}) {
    const skills = student.skillAchievements
    const totalSkills = skills.length
    const masteredCount = skills.filter((s) => s.status === 'mastered' || s.status === 'fluid').length
    const overallPct = totalSkills > 0 ? Math.round((masteredCount / totalSkills) * 100) : 0

    // Group by category
    const grouped = useMemo(() => {
        const map: Partial<Record<SkillCategory, SkillAchievement[]>> = {}
        for (const skill of skills) {
            if (!map[skill.category]) map[skill.category] = []
            map[skill.category]!.push(skill)
        }
        return map
    }, [skills])

    const [expandedCategory, setExpandedCategory] = useState<SkillCategory | null>(null)

    return (
        <div className="space-y-4 animate-scale-in">
            {/* Overall Progress */}
            <div className="rounded-xl border border-border/20 bg-surface/40 p-3">
                <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-display font-semibold text-white/80">
                        Dominou {overallPct}% das tecnicas
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                        {masteredCount}/{totalSkills}
                    </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-border/30">
                    <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${overallPct}%` }}
                    />
                </div>
            </div>

            {/* Categories */}
            {allCategories.map((category) => {
                const catSkills = grouped[category]
                if (!catSkills || catSkills.length === 0) return null

                const catMastered = catSkills.filter(
                    (s) => s.status === 'mastered' || s.status === 'fluid',
                ).length
                const catPct =
                    catSkills.length > 0
                        ? Math.round((catMastered / catSkills.length) * 100)
                        : 0
                const colors = categoryColors[category]
                const isOpen = expandedCategory === category

                return (
                    <div
                        key={category}
                        className={cn(
                            'rounded-xl border bg-surface/40 p-3 transition-colors',
                            colors.border,
                        )}
                    >
                        <button
                            type="button"
                            className="flex w-full items-center justify-between"
                            onClick={() =>
                                setExpandedCategory(isOpen ? null : category)
                            }
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className={cn(
                                        'text-xs font-display font-semibold',
                                        colors.text,
                                    )}
                                >
                                    {categoryLabels[category]}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                    {catMastered}/{catSkills.length}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="hidden sm:block w-24 h-1.5 overflow-hidden rounded-full bg-border/30">
                                    <div
                                        className={cn(
                                            'h-full rounded-full transition-all duration-500',
                                            catPct >= 80
                                                ? 'bg-emerald-500'
                                                : catPct >= 40
                                                    ? 'bg-amber-500'
                                                    : 'bg-zinc-600',
                                        )}
                                        style={{ width: `${catPct}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-medium text-muted-foreground">
                                    {catPct}%
                                </span>
                                {isOpen ? (
                                    <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                                ) : (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                            </div>
                        </button>

                        {isOpen && (
                            <div className="mt-3 space-y-2 animate-fade-in">
                                {catSkills.map((skill) => {
                                    const showQuality =
                                        skill.status === 'mastered' || skill.status === 'fluid'

                                    return (
                                        <div
                                            key={skill.id}
                                            className="rounded-lg border border-border/10 bg-surface/20 p-2.5"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-medium text-white/90 truncate flex-1">
                                                    {skill.skillName}
                                                </span>
                                                <select
                                                    value={skill.status}
                                                    onChange={(e) =>
                                                        onStatusChange(
                                                            skill.id,
                                                            e.target.value as SkillStatus,
                                                        )
                                                    }
                                                    className="h-7 rounded-lg border border-border/20 bg-surface/60 px-2 text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer"
                                                >
                                                    {statusOptions.map((st) => (
                                                        <option key={st} value={st}>
                                                            {skillStatusLabels[st].label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Quality indicators */}
                                            {showQuality && (
                                                <div className="mt-2 flex items-center gap-3">
                                                    {qualityIcons.map(
                                                        ({ key, label, Icon }) => {
                                                            const active = skill.quality[key]
                                                            return (
                                                                <button
                                                                    key={key}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        onQualityToggle(
                                                                            skill.id,
                                                                            key,
                                                                        )
                                                                    }
                                                                    title={label}
                                                                    className={cn(
                                                                        'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] transition-colors border',
                                                                        active
                                                                            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25'
                                                                            : 'text-zinc-500 bg-zinc-500/5 border-zinc-500/20 hover:text-zinc-300',
                                                                    )}
                                                                >
                                                                    <Icon className="h-3 w-3" />
                                                                    <span className="hidden sm:inline">
                                                                        {label}
                                                                    </span>
                                                                </button>
                                                            )
                                                        },
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
