import { useMemo } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getScheduleForDay, getWeekdayKey, ageGroupPalette, capacityPerClass } from '../data/schedule'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import { cn } from '../lib/utils'

export function WeeklyView() {
    const { selectedDate, setSelectedDate, getAssignmentsForDate } = useStore()

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
                        <p className="text-xs text-muted-foreground">Visão geral de ocupação das turmas</p>
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
                                                onClick={() => setSelectedDate(day)}
                                                className="group relative flex w-full flex-col items-start gap-1 rounded-xl border border-border/10 bg-surface/40 p-2 text-left transition-all hover:bg-surface/60 hover:border-border/30"
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
                                                        <span className="text-[8px] font-bold text-rose-400">LU</span>
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
        </div>
    )
}
