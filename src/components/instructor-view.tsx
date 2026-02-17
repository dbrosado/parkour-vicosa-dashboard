import {
    Briefcase,
    Calendar,
    ChevronDown,
    ChevronUp,
    Clock,
    Phone,
    Plus,
    Trash2,
    UserCog,
    X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '../lib/utils'
import { ageGroupPalette, getScheduleForDay, weekdayLabel } from '../data/schedule'
import type { Instructor, InstructorSlotAssignment, WeekdayKey } from '../types'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

type InstructorViewProps = {
    instructors: Instructor[]
    onUpdateInstructors: (instructors: Instructor[]) => void
}

const allDays: WeekdayKey[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']

function getHoursUsed(slots: InstructorSlotAssignment[]): number {
    return slots.length
}

function getRoleBadge(role: string) {
    if (role === 'Professor Principal') return 'border-primary/25 bg-primary/10 text-blue-300'
    if (role === 'Assistente') return 'border-indigo-500/25 bg-indigo-500/10 text-indigo-300'
    return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300'
}

export function InstructorView({ instructors, onUpdateInstructors }: InstructorViewProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [showAssignForm, setShowAssignForm] = useState<string | null>(null)
    const [assignDay, setAssignDay] = useState<WeekdayKey>('segunda')
    const [assignSlot, setAssignSlot] = useState('')
    const [newForm, setNewForm] = useState({ name: '', role: 'Assistente', phone: '', maxHours: '25' })

    const daySlots = useMemo(() => getScheduleForDay(assignDay), [assignDay])

    const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

    const handleAddInstructor = (e: React.FormEvent) => {
        e.preventDefault()
        if (!newForm.name.trim() || !newForm.phone.trim()) return
        const newInstructor: Instructor = {
            id: `inst-${Date.now()}`,
            name: newForm.name.trim(),
            role: newForm.role,
            photoUrl: `https://i.pravatar.cc/160?u=${Date.now()}`,
            phone: newForm.phone.trim(),
            weeklyHours: 0,
            maxHours: Number(newForm.maxHours) || 25,
            assignedSlots: [],
        }
        onUpdateInstructors([...instructors, newInstructor])
        setNewForm({ name: '', role: 'Assistente', phone: '', maxHours: '25' })
        setShowAddForm(false)
    }

    const handleAssignSlot = (instructorId: string) => {
        if (!assignSlot) return
        const slot = daySlots.find((s) => s.id === assignSlot)
        if (!slot) return
        const assignment: InstructorSlotAssignment = { day: assignDay, slotTime: slot.time, ageGroup: slot.ageGroup }
        onUpdateInstructors(
            instructors.map((inst) => {
                if (inst.id !== instructorId) return inst
                if (inst.assignedSlots.some((a) => a.day === assignment.day && a.slotTime === assignment.slotTime)) return inst
                const newSlots = [...inst.assignedSlots, assignment]
                return { ...inst, assignedSlots: newSlots, weeklyHours: getHoursUsed(newSlots) }
            }),
        )
        setShowAssignForm(null)
        setAssignSlot('')
    }

    const handleRemoveSlot = (instructorId: string, slotIndex: number) => {
        onUpdateInstructors(
            instructors.map((inst) => {
                if (inst.id !== instructorId) return inst
                const newSlots = inst.assignedSlots.filter((_, i) => i !== slotIndex)
                return { ...inst, assignedSlots: newSlots, weeklyHours: getHoursUsed(newSlots) }
            }),
        )
    }

    const handleRemoveInstructor = (instructorId: string) => {
        onUpdateInstructors(instructors.filter((inst) => inst.id !== instructorId))
    }

    const slotsByDay = (slots: InstructorSlotAssignment[]) => {
        const grouped: Partial<Record<WeekdayKey, InstructorSlotAssignment[]>> = {}
        slots.forEach((slot) => {
            if (!grouped[slot.day]) grouped[slot.day] = []
            grouped[slot.day]!.push(slot)
        })
        return grouped
    }

    return (
        <div className="space-y-4">
            <Card className="border-primary/10 bg-hero-grid shadow-soft-sm">
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <CardTitle className="flex items-center gap-2 font-display text-xl sm:text-2xl">
                                <UserCog className="h-5 w-5 text-primary" />
                                Professores & Equipe
                            </CardTitle>
                            <CardDescription className="mt-1 text-muted-foreground">
                                Gestão de escala, carga horária e funções da equipe.
                            </CardDescription>
                        </div>
                        <Button onClick={() => setShowAddForm(true)} className="tactile btn-glow">
                            <Plus className="mr-1 h-4 w-4" />
                            Novo Professor
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Summary */}
            <div className="grid gap-3 sm:grid-cols-3 stagger-children">
                <div className="stat-card">
                    <p className="text-xs text-muted-foreground">Total de Professores</p>
                    <p className="font-display text-2xl font-semibold text-white">{instructors.length}</p>
                </div>
                <div className="stat-card">
                    <p className="text-xs text-muted-foreground">Horas Semanais Totais</p>
                    <p className="font-display text-2xl font-semibold text-white">
                        {instructors.reduce((sum, i) => sum + i.assignedSlots.length, 0)}h
                    </p>
                </div>
                <div className="stat-card">
                    <p className="text-xs text-muted-foreground">Aulas Cobertas</p>
                    <p className="font-display text-2xl font-semibold text-white">
                        {instructors.reduce((sum, i) => sum + i.assignedSlots.length, 0)}/28
                    </p>
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <Card className="animate-scale-in border-primary/20 shadow-soft">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="font-display text-base">Novo Professor</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}><X className="h-4 w-4" /></Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddInstructor} className="grid gap-3 sm:grid-cols-2">
                            <Input placeholder="Nome" value={newForm.name} onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))} />
                            <Input placeholder="Telefone" value={newForm.phone} onChange={(e) => setNewForm((p) => ({ ...p, phone: e.target.value }))} />
                            <select className="h-10 rounded-xl border border-border/30 bg-surface px-3 text-sm text-white" value={newForm.role} onChange={(e) => setNewForm((p) => ({ ...p, role: e.target.value }))}>
                                <option>Professor Principal</option>
                                <option>Assistente</option>
                                <option>Estagiária</option>
                            </select>
                            <Input type="number" placeholder="Carga horária máxima" value={newForm.maxHours} onChange={(e) => setNewForm((p) => ({ ...p, maxHours: e.target.value }))} />
                            <div className="flex justify-end gap-2 sm:col-span-2">
                                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancelar</Button>
                                <Button type="submit" className="btn-glow">Salvar</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Instructor List */}
            <div className="space-y-3 stagger-children">
                {instructors.map((instructor) => {
                    const isExpanded = expandedId === instructor.id
                    const grouped = slotsByDay(instructor.assignedSlots)
                    const hoursPercent = Math.min(100, (instructor.assignedSlots.length / instructor.maxHours) * 100)
                    const isOverloaded = instructor.assignedSlots.length > instructor.maxHours

                    return (
                        <Card key={instructor.id} className={cn('shadow-soft-sm transition-all duration-200', isExpanded && 'border-primary/20')}>
                            <CardContent className="p-0">
                                <button type="button" onClick={() => toggleExpand(instructor.id)} className="flex w-full items-center gap-3 p-4 text-left">
                                    <Avatar className="h-12 w-12 border border-border/20 shadow-soft-sm">
                                        <AvatarImage src={instructor.photoUrl} alt={instructor.name} />
                                        <AvatarFallback className="bg-primary/10 text-sm text-white">
                                            {instructor.name.split(' ').slice(0, 2).map((c) => c[0]).join('')}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold text-white">{instructor.name}</p>
                                        <div className="mt-1 flex flex-wrap items-center gap-2">
                                            <Badge className={cn('text-[10px]', getRoleBadge(instructor.role))}>{instructor.role}</Badge>
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3" />
                                                {instructor.assignedSlots.length}/{instructor.maxHours}h
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="hidden w-24 sm:block">
                                            <div className="h-2 overflow-hidden rounded-full bg-border/30">
                                                <div
                                                    className={cn(
                                                        'h-full rounded-full transition-all duration-300',
                                                        isOverloaded ? 'bg-rose-500' : hoursPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500',
                                                    )}
                                                    style={{ width: `${hoursPercent}%` }}
                                                />
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="animate-fade-in space-y-4 border-t border-border/20 p-4">
                                        <div className="grid gap-3 text-sm sm:grid-cols-3">
                                            <div className="flex items-center gap-2 rounded-xl border border-border/20 bg-surface/40 px-3 py-2">
                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-white/80">{instructor.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2 rounded-xl border border-border/20 bg-surface/40 px-3 py-2">
                                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-white/80">{instructor.role}</span>
                                            </div>
                                            <div className="flex items-center gap-2 rounded-xl border border-border/20 bg-surface/40 px-3 py-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-white/80">{instructor.assignedSlots.length} aulas/semana</span>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="mb-2 text-sm font-display font-semibold text-white">Escala Semanal</p>
                                            <div className="space-y-2">
                                                {allDays.map((day) => {
                                                    const daySlotsList = grouped[day]
                                                    if (!daySlotsList || daySlotsList.length === 0) return null
                                                    return (
                                                        <div key={day} className="rounded-xl border border-border/20 bg-surface/40 p-3">
                                                            <p className="mb-2 text-xs font-display font-semibold text-primary">{weekdayLabel[day]}</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {daySlotsList.map((slot) => {
                                                                    const globalIdx = instructor.assignedSlots.findIndex((a) => a.day === slot.day && a.slotTime === slot.slotTime)
                                                                    const palette = ageGroupPalette[slot.ageGroup]
                                                                    return (
                                                                        <div key={`${slot.day}-${slot.slotTime}`} className={cn('flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs', palette.badge)}>
                                                                            <span>{slot.slotTime}</span>
                                                                            <span className="hidden text-[10px] opacity-60 sm:inline">{slot.ageGroup}</span>
                                                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleRemoveSlot(instructor.id, globalIdx) }} className="rounded p-0.5 hover:bg-white/10 transition-colors">
                                                                                <X className="h-3 w-3" />
                                                                            </button>
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                                {instructor.assignedSlots.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma aula atribuída.</p>}
                                            </div>
                                        </div>

                                        {showAssignForm === instructor.id ? (
                                            <div className="animate-scale-in rounded-xl border border-primary/20 bg-surface/40 p-3 space-y-2">
                                                <p className="text-sm font-display font-semibold text-white">Atribuir Aula</p>
                                                <div className="grid gap-2 sm:grid-cols-3">
                                                    <select className="h-9 rounded-lg border border-border/30 bg-surface px-2 text-sm text-white" value={assignDay} onChange={(e) => { setAssignDay(e.target.value as WeekdayKey); setAssignSlot('') }}>
                                                        {allDays.map((d) => <option key={d} value={d}>{weekdayLabel[d]}</option>)}
                                                    </select>
                                                    <select className="h-9 rounded-lg border border-border/30 bg-surface px-2 text-sm text-white" value={assignSlot} onChange={(e) => setAssignSlot(e.target.value)}>
                                                        <option value="">Selecione</option>
                                                        {daySlots.map((s) => <option key={s.id} value={s.id}>{s.time} - {s.ageGroup}</option>)}
                                                    </select>
                                                    <div className="flex gap-2">
                                                        <Button size="sm" onClick={() => handleAssignSlot(instructor.id)} className="btn-glow">Atribuir</Button>
                                                        <Button size="sm" variant="ghost" onClick={() => setShowAssignForm(null)}>Cancelar</Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-2">
                                                <Button size="sm" variant="secondary" className="tactile" onClick={() => { setShowAssignForm(instructor.id); setAssignDay('segunda'); setAssignSlot('') }}>
                                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                                    Atribuir Aula
                                                </Button>
                                                <Button size="sm" variant="ghost" className="tactile text-rose-400 hover:text-rose-300" onClick={() => handleRemoveInstructor(instructor.id)}>
                                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                    Remover
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
