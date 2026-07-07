import { useMemo, useState } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, Plus, Users, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getScheduleForDay, getWeekdayKey, ageGroupPalette, capacityPerClass } from '../data/schedule'
import { cn, getAge } from '../lib/utils'
import type { ClassSlot } from '../types'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Modal, Select } from './crm/crm-common'

type WeeklyViewProps = {
    onOpenDaily?: () => void
}

type SelectedSlot = {
    day: Date
    slot: ClassSlot
}

function SlotDetailModal({
    selected,
    onClose,
    onOpenDaily,
}: {
    selected: SelectedSlot
    onClose: () => void
    onOpenDaily?: () => void
}) {
    const { students, setSelectedDate, setAssignment, getAssignmentsForDate } = useStore()
    const [studentToAdd, setStudentToAdd] = useState('')

    const { day, slot } = selected
    const dateStr = format(day, 'yyyy-MM-dd')
    const assignments = getAssignmentsForDate(day)
    const assignedIds = assignments[slot.id] || []
    const assigned = assignedIds
        .map((id) => students.find((student) => student.id === id))
        .filter((student) => student !== undefined)

    const available = students
        .filter((student) => student.status === 'Ativo' && !assignedIds.includes(student.id))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

    const palette = ageGroupPalette[slot.ageGroup]
    const isFull = assignedIds.length >= capacityPerClass

    const addStudent = () => {
        if (!studentToAdd) return
        setAssignment(dateStr, slot.id, [...assignedIds, studentToAdd])
        setStudentToAdd('')
    }

    const removeStudent = (studentId: string) => {
        setAssignment(dateStr, slot.id, assignedIds.filter((id) => id !== studentId))
    }

    const openDaily = () => {
        setSelectedDate(day)
        onClose()
        onOpenDaily?.()
    }

    return (
        <Modal
            open
            onClose={onClose}
            title={`Turma das ${slot.time}`}
            description={format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}
        >
            <div className="space-y-4">
                {/* Resumo da turma */}
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/20 bg-surface/40 p-3">
                    <Badge className={palette.badge}>{slot.ageGroup}</Badge>
                    <span className="inline-flex items-center gap-1.5 text-sm text-white/85">
                        <Users className="h-4 w-4 text-primary" />
                        {assignedIds.length}/{capacityPerClass} alunos
                    </span>
                    {isFull ? <Badge variant="danger">Lotada</Badge> : null}
                    <div className="ml-auto h-1.5 w-28 overflow-hidden rounded-full bg-border/20">
                        <div
                            className={cn('h-full rounded-full', isFull ? 'bg-rose-500' : 'bg-primary/70')}
                            style={{ width: `${Math.min(100, (assignedIds.length / capacityPerClass) * 100)}%` }}
                        />
                    </div>
                </div>

                {/* Lista de alunos */}
                <div className="space-y-1.5">
                    {assigned.length > 0 ? (
                        assigned.map((student) => {
                            const age = student.birthDate ? getAge(student.birthDate) : null
                            return (
                                <div
                                    key={student.id}
                                    className="flex items-center gap-3 rounded-xl border border-border/20 bg-surface/40 px-3 py-2"
                                >
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-semibold text-primary">
                                        {student.name.split(' ').slice(0, 2).map((part) => part[0]).join('')}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-white">{student.name}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {age !== null ? `${age} anos` : 'Idade não cadastrada'}
                                            {student.isTrial ? ' · Experimental' : ''}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeStudent(student.id)}
                                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                                        title="Remover da turma neste dia"
                                        aria-label={`Remover ${student.name} da turma`}
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            )
                        })
                    ) : (
                        <div className="rounded-xl border border-dashed border-border/25 p-6 text-center text-sm text-muted-foreground">
                            Nenhum aluno nesta turma neste dia.
                        </div>
                    )}
                </div>

                {/* Adicionar aluno */}
                <div className="flex gap-2">
                    <Select value={studentToAdd} onChange={(event) => setStudentToAdd(event.target.value)}>
                        <option value="">Adicionar aluno à turma...</option>
                        {available.map((student) => (
                            <option key={student.id} value={student.id}>{student.name}</option>
                        ))}
                    </Select>
                    <Button onClick={addStudent} disabled={!studentToAdd || isFull} className="shrink-0 gap-1.5">
                        <Plus className="h-4 w-4" />
                        Adicionar
                    </Button>
                </div>
                {isFull ? (
                    <p className="text-xs text-amber-300">A turma atingiu a capacidade máxima de {capacityPerClass} alunos.</p>
                ) : null}

                <p className="text-[11px] text-muted-foreground">
                    As mudanças valem para <strong className="text-white/80">{format(day, 'dd/MM/yyyy')}</strong>. Para
                    check-in e remanejamento por arrastar, use a Visão Diária.
                </p>

                {onOpenDaily ? (
                    <div className="flex justify-end">
                        <Button variant="secondary" onClick={openDaily} className="gap-1.5">
                            <CalendarDays className="h-4 w-4" />
                            Abrir este dia na Visão Diária
                        </Button>
                    </div>
                ) : null}
            </div>
        </Modal>
    )
}

export function WeeklyView({ onOpenDaily }: WeeklyViewProps) {
    const { selectedDate, setSelectedDate, getAssignmentsForDate } = useStore()
    const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null)

    const weekDays = useMemo(() => {
        const start = startOfWeek(selectedDate, { locale: ptBR, weekStartsOn: 1 }) // Start Monday
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i))
    }, [selectedDate])

    const prevWeek = () => setSelectedDate(addDays(selectedDate, -7))
    const nextWeek = () => setSelectedDate(addDays(selectedDate, 7))

    return (
        <div className="space-y-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/20 bg-surface/40 p-3 sm:p-4">
                <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white sm:text-base">
                            Semana de {format(weekDays[0], "dd 'de' MMMM", { locale: ptBR })}
                        </h2>
                        <p className="text-xs text-muted-foreground">Clique em uma turma para ver e editar os alunos</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={prevWeek} className="tactile rounded-xl border border-border/20 bg-surface/60 h-9 w-9">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(new Date())} className="tactile hidden px-3 text-xs sm:inline-flex">
                        Hoje
                    </Button>
                    <Button variant="ghost" size="icon" onClick={nextWeek} className="tactile rounded-xl border border-border/20 bg-surface/60 h-9 w-9">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Weekly Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 xl:gap-2">
                {weekDays.map((day) => {
                    const weekdayKey = getWeekdayKey(day)
                    const slots = getScheduleForDay(weekdayKey)
                    const assignments = getAssignmentsForDate(day)
                    const isToday = isSameDay(day, new Date())
                    const isSelected = isSameDay(day, selectedDate)

                    return (
                        <Card
                            key={day.toISOString()}
                            className={cn(
                                "flex h-full flex-col gap-2 rounded-2xl border p-2 transition-all duration-200",
                                isToday ? "border-primary/40 bg-primary/[.04]" : "border-border/10 bg-surface/20",
                                isSelected && !isToday && "ring-1 ring-primary/20",
                                slots.length === 0 && "opacity-60"
                            )}
                        >
                            <div className="px-1 py-1">
                                <p className={cn(
                                    "text-[10px] uppercase tracking-wider font-bold",
                                    isToday ? "text-primary" : "text-muted-foreground"
                                )}>
                                    {format(day, 'eee', { locale: ptBR }).replace('.', '')}
                                </p>
                                <p className="text-lg font-display font-bold text-white leading-tight">
                                    {format(day, 'dd')}
                                </p>
                            </div>

                            <CardContent className="flex flex-1 flex-col gap-1.5 p-0">
                                {slots.length > 0 ? (
                                    slots.map((slot) => {
                                        const studentCount = assignments[slot.id]?.length || 0
                                        const palette = ageGroupPalette[slot.ageGroup]
                                        const occupancy = (studentCount / capacityPerClass) * 100

                                        return (
                                            <button
                                                key={slot.id}
                                                type="button"
                                                onClick={() => setSelectedSlot({ day, slot })}
                                                className="group relative flex w-full flex-col items-start gap-1 rounded-xl border border-border/10 bg-surface/40 p-2 text-left transition-all hover:bg-surface/60 hover:border-primary/30"
                                            >
                                                <div className="flex w-full items-center justify-between gap-1">
                                                    <span className="text-[10px] font-bold text-white leading-none">{slot.time}</span>
                                                    <div className={cn("h-1.5 w-1.5 rounded-full", palette.dot)} />
                                                </div>

                                                <div className="mt-0.5 flex w-full items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Users className="h-2.5 w-2.5" />
                                                        <span className="text-[9px] font-medium">{studentCount}/{capacityPerClass}</span>
                                                    </div>
                                                    {studentCount >= capacityPerClass && (
                                                        <span className="text-[8px] font-bold text-rose-400">LOTADA</span>
                                                    )}
                                                </div>

                                                {/* Progress bar */}
                                                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border/10">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-300",
                                                            studentCount >= capacityPerClass ? "bg-rose-500" :
                                                                studentCount >= capacityPerClass * 0.8 ? "bg-amber-500" : "bg-primary/60"
                                                        )}
                                                        style={{ width: `${Math.min(100, Math.max(5, occupancy))}%` }}
                                                    />
                                                </div>
                                            </button>
                                        )
                                    })
                                ) : (
                                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-border/10 p-4 text-center">
                                        <p className="text-[10px] text-muted-foreground italic">Sem aulas</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border/10 bg-surface/20 p-3 text-[10px] sm:text-xs">
                <span className="text-muted-foreground">Legenda:</span>
                {Object.entries(ageGroupPalette).map(([group, color]) => (
                    <div key={group} className="flex items-center gap-1.5">
                        <div className={cn("h-2 w-2 rounded-full", color.dot)} />
                        <span className="text-white/80">{group}</span>
                    </div>
                ))}
                <div className="ml-auto flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-3 rounded-full bg-primary/60" />
                        <span className="text-muted-foreground">Vagas Ativas</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="h-1.5 w-3 rounded-full bg-rose-500" />
                        <span className="text-muted-foreground">Lotado</span>
                    </div>
                </div>
            </div>

            {selectedSlot ? (
                <SlotDetailModal
                    selected={selectedSlot}
                    onClose={() => setSelectedSlot(null)}
                    onOpenDaily={onOpenDaily}
                />
            ) : null}
        </div>
    )
}
