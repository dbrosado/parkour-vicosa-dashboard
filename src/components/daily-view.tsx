import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Calendar,
  CheckCircle2,
  Clock,
  GripVertical,
  MessageSquare,
  UserPlus2,
  X,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useStore } from '../store/useStore'
import {
  ageGroupPalette,
  capacityPerClass,
  getScheduleForDay,
  getWeekdayKey,
  weekdayLabel,
} from '../data/schedule'
import { cn, getAge } from '../lib/utils'
import {
  type AttendanceStatus,
  type ClassNote,
  type ClassSlot,
  type Student,
  type WeekdayKey,
} from '../types'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'

type QuickStudentForm = {
  name: string
  age: string
  parentContact: string
  isTrial: boolean
  slotId: string
}

type TransferLogItem = {
  studentId: string
  targetDay: WeekdayKey
  targetTime: string
  targetAgeGroup: string
  movedAt: string
}

const orderedDays: WeekdayKey[] = [
  'segunda',
  'terca',
  'quarta',
  'quinta',
  'sexta',
  'sabado',
  'domingo',
]

function statusLabel(status: AttendanceStatus) {
  if (status === 'present') return 'Presente'
  if (status === 'absent') return 'Falta'
  if (status === 'late') return 'Atraso'
  return 'Sem check-in'
}

function createQuickForm(slotId: string): QuickStudentForm {
  return {
    name: '',
    age: '',
    parentContact: '',
    isTrial: false,
    slotId,
  }
}

function statusChip(status: AttendanceStatus) {
  if (status === 'present') return 'chip-success'
  if (status === 'absent') return 'chip-error'
  if (status === 'late') return 'chip-warning'
  return 'chip-neutral'
}

function SortableStudentCard({
  student,
  status,
  onOpenActions,
}: {
  student: Student
  status: AttendanceStatus
  onOpenActions: (studentId: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: student.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-xl border bg-surface/60 p-2.5 transition-all duration-200 sm:p-3',
        status === 'present' && 'border-emerald-500/25 bg-emerald-500/[.06]',
        status === 'absent' && 'border-rose-500/25 bg-rose-500/[.06]',
        status === 'late' && 'border-amber-500/25 bg-amber-500/[.06]',
        status === 'none' && 'border-border/30',
        student.isTrial && 'border-dashed border-primary/40 shadow-glow',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
        <Avatar className="h-9 w-9 border border-border/30 sm:h-10 sm:w-10">
          <AvatarImage src={student.photoUrl} alt={student.name} />
          <AvatarFallback className="bg-primary/10 text-xs text-white">
            {student.name.split(' ').slice(0, 2).map((chunk) => chunk[0]).join('')}
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={() => onOpenActions(student.id)}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-xs font-semibold text-white sm:text-sm">{student.name}</p>
          <p className="text-[10px] text-muted-foreground sm:text-xs">{getAge(student.birthDate)} anos</p>
          <p className="mt-0.5 text-[10px] text-primary">Toque para ações</p>
        </button>

        <div className="flex flex-col items-end gap-1.5 sm:gap-2">
          {student.isTrial ? (
            <Badge className="border-primary/30 bg-primary/10 text-[9px] text-primary sm:text-[10px]">
              EXPERIMENTAL
            </Badge>
          ) : null}
          <Badge className={cn('text-[9px] sm:text-[10px]', statusChip(status))}>{statusLabel(status)}</Badge>
          <button
            type="button"
            className="rounded-lg border border-border/30 bg-surface/80 p-1 text-muted-foreground hover:text-white transition-colors duration-150"
            aria-label={`Arrastar ${student.name}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function ClassColumn({
  slot,
  students,
  attendance,
  classNote,
  onOpenActions,
  onToggleNote,
}: {
  slot: ClassSlot
  students: Student[]
  attendance: Record<string, AttendanceStatus>
  classNote?: ClassNote
  onOpenActions: (studentId: string) => void
  onToggleNote: (slotId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: slot.id })
  const palette = ageGroupPalette[slot.ageGroup]
  const isFull = students.length >= capacityPerClass

  const presentCount = students.filter((s) => attendance[s.id] === 'present').length
  const absentCount = students.filter((s) => attendance[s.id] === 'absent').length
  const lateCount = students.filter((s) => attendance[s.id] === 'late').length

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex w-full flex-col rounded-2xl border p-0 shadow-soft-sm transition-all duration-200',
        palette.border,
        isOver && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
      )}
    >
      <CardHeader className="space-y-3 border-b border-border/20 pb-3 sm:pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-display text-base font-semibold text-white sm:text-lg">{slot.time}</CardTitle>
          <Badge className={cn('border text-[10px] sm:text-[11px]', palette.badge)}>{slot.ageGroup}</Badge>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Badge variant="secondary" className="text-[10px] sm:text-xs">
            {students.length}/{capacityPerClass}
          </Badge>
          {isFull ? (
            <Badge variant="danger" className="gap-1 text-[10px] sm:text-[11px]">
              <AlertTriangle className="h-3 w-3" /> LOTADO
            </Badge>
          ) : null}

          {students.length > 0 && (
            <div className="flex items-center gap-1.5 text-[10px]">
              {presentCount > 0 && (
                <span className="flex items-center gap-0.5 text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />{presentCount}
                </span>
              )}
              {absentCount > 0 && (
                <span className="flex items-center gap-0.5 text-rose-400">
                  <XCircle className="h-3 w-3" />{absentCount}
                </span>
              )}
              {lateCount > 0 && (
                <span className="flex items-center gap-0.5 text-amber-400">
                  <Clock className="h-3 w-3" />{lateCount}
                </span>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => onToggleNote(slot.id)}
            className="tactile ml-auto rounded-lg border border-border/20 bg-surface/80 p-1.5 text-muted-foreground hover:text-white transition-colors duration-150"
            title="Anotações da aula"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
        </div>

        {classNote && (
          <div className="rounded-lg border border-primary/20 bg-primary/[.06] px-2.5 py-1.5 text-[10px] text-blue-200">
            {classNote.content}
          </div>
        )}
      </CardHeader>

      <CardContent className="flex min-h-[200px] flex-col gap-2 p-2 sm:min-h-[280px] sm:gap-2.5 sm:p-3">
        <SortableContext items={students.map((student) => student.id)} strategy={verticalListSortingStrategy}>
          {students.map((student) => (
            <SortableStudentCard
              key={student.id}
              student={student}
              status={attendance[student.id] ?? 'none'}
              onOpenActions={onOpenActions}
            />
          ))}
        </SortableContext>

        {students.length === 0 ? (
          <div className="flex min-h-[80px] items-center justify-center rounded-xl border border-dashed border-border/30 bg-surface/30 px-4 text-center text-xs text-muted-foreground sm:min-h-[100px]">
            Arraste alunos para esta turma
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function DailyView() {
  const {
    selectedDate,
    setSelectedDate,
    students,
    setAttendance: storeSetAttendance,
    setAssignment: storeSetAssignment,
    getAssignmentsForDate,
    getAttendanceForDate,
    addStudent: storeAddStudent,
  } = useStore()

  const dateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate])
  const dayKey = useMemo(() => getWeekdayKey(selectedDate), [selectedDate])
  const slots = useMemo(() => getScheduleForDay(dayKey), [dayKey])
  const slotIds = useMemo(() => slots.map((slot) => slot.id), [slots])

  const assignments = useMemo(() => getAssignmentsForDate(selectedDate), [selectedDate, getAssignmentsForDate])
  const attendance = useMemo(() => getAttendanceForDate(selectedDate), [selectedDate, getAttendanceForDate])

  const [activeStudentId, setActiveStudentId] = useState<string | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [quickForm, setQuickForm] = useState<QuickStudentForm>(() =>
    createQuickForm(slots[0]?.id ?? ''),
  )
  const [transferDay, setTransferDay] = useState<WeekdayKey | null>(null)
  const [transferSlotId, setTransferSlotId] = useState('')
  const [transferLog, setTransferLog] = useState<TransferLogItem[]>([])
  const [classNotes, setClassNotes] = useState<Record<string, ClassNote>>({})
  const [noteFormSlot, setNoteFormSlot] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')

  const studentsMap = useMemo(
    () => Object.fromEntries(students.map((student) => [student.id, student])),
    [students],
  )

  const formattedDate = useMemo(() => {
    const formatted = format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
    return formatted.charAt(0).toUpperCase() + formatted.slice(1)
  }, [selectedDate])

  const availableTransferDays = useMemo(
    () => orderedDays.filter((weekday) => weekday !== dayKey && getScheduleForDay(weekday).length > 0),
    [dayKey],
  )

  const selectedStudent = selectedStudentId ? studentsMap[selectedStudentId] : null
  const transferSlots = useMemo(() => (transferDay ? getScheduleForDay(transferDay) : []), [transferDay])

  const totalStudents = useMemo(() => {
    const allIds = new Set<string>()
    Object.values(assignments).forEach((ids) => ids.forEach((id) => allIds.add(id)))
    return allIds.size
  }, [assignments])

  const checkedInCount = Object.values(attendance).filter((s) => s === 'present' || s === 'late').length
  const absentCount = Object.values(attendance).filter((s) => s === 'absent').length

  const openStudentActions = (studentId: string) => {
    setSelectedStudentId(studentId)
    const defaultDay = availableTransferDays[0] ?? null
    setTransferDay(defaultDay)
    if (defaultDay) {
      setTransferSlotId(getScheduleForDay(defaultDay)[0]?.id ?? '')
    } else {
      setTransferSlotId('')
    }
  }

  const setPresenceStatus = (status: AttendanceStatus) => {
    if (selectedStudentId) {
      storeSetAttendance(dateStr, selectedStudentId, status)
      setSelectedStudentId(null)
    }
  }

  const openAddForm = () => {
    setQuickForm(createQuickForm(slots[0]?.id ?? ''))
    setShowAddForm(true)
  }

  const closeAddForm = () => setShowAddForm(false)

  const handleQuickAddStudent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickForm.name || !quickForm.age) return

    const newStudent: Student = {
      id: `stu-${Date.now()}`,
      name: quickForm.name,
      birthDate: `${new Date().getFullYear() - Number(quickForm.age)}-01-01`,
      parentName: '',
      parentContact: quickForm.parentContact,
      emergencyPhone: '',
      allergies: '',
      status: 'Ativo',
      registrationStatus: 'Incompleto',
      paymentStatus: 'Em dia',
      mainClass: `${slots.find((s) => s.id === quickForm.slotId)?.time} (${slots.find((s) => s.id === quickForm.slotId)?.ageGroup})`,
      isTrial: quickForm.isTrial,
      photoUrl: `https://i.pravatar.cc/160?u=${Date.now()}`,
      enrolledAt: new Date().toISOString().split('T')[0],
      plan: 'Mensal',
      monthlyFee: 150,
      attendanceHistory: [],
      paymentHistory: [],
      physicalAssessments: [],
      conditioningTests: [],
      skillAchievements: [],
    }

    storeAddStudent(newStudent)

    // Add to current assignments in store
    const currentSlotItems = assignments[quickForm.slotId] || []
    storeSetAssignment(dateStr, quickForm.slotId, [...currentSlotItems, newStudent.id])

    closeAddForm()
  }

  const handleTransferDayChange = (day: string) => {
    const d = day as WeekdayKey
    setTransferDay(d)
    const daySlots = getScheduleForDay(d)
    setTransferSlotId(daySlots[0]?.id ?? '')
  }

  const transferStudent = () => {
    if (!selectedStudentId || !transferDay || !transferSlotId) return

    const targetSlot = transferSlots.find((s) => s.id === transferSlotId)
    if (!targetSlot) return

    // Remove from current day in store
    const currentSlotId = slotIds.find((id) => assignments[id]?.includes(selectedStudentId))
    if (currentSlotId) {
      const remainingItems = assignments[currentSlotId].filter(id => id !== selectedStudentId)
      storeSetAssignment(dateStr, currentSlotId, remainingItems)
    }

    // Since we don't have a date for the target day (could be next week), 
    // for this demo we'll just log it. In a real app we'd need to pick a target DATE.
    setTransferLog((prev) => {
      const withoutCurrent = prev.filter((l) => l.studentId !== selectedStudentId)
      return [
        {
          studentId: selectedStudentId,
          targetDay: transferDay,
          targetTime: targetSlot.time,
          targetAgeGroup: targetSlot.ageGroup,
          movedAt: new Date().toISOString(),
        },
        ...withoutCurrent,
      ].slice(0, 6)
    })

    setSelectedStudentId(null)
  }

  const handleSaveNote = (slotId: string) => {
    if (!noteInput.trim()) return
    setClassNotes((prev) => ({
      ...prev,
      [slotId]: {
        slotId,
        date: dateStr,
        content: noteInput.trim(),
        createdAt: new Date().toISOString(),
      },
    }))
    setNoteFormSlot(null)
    setNoteInput('')
  }

  const toggleNoteForm = (slotId: string) => {
    if (noteFormSlot === slotId) {
      setNoteFormSlot(null)
      setNoteInput('')
    } else {
      setNoteFormSlot(slotId)
      setNoteInput(classNotes[slotId]?.content ?? '')
    }
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 7 } }))

  const findContainer = (itemId: string) => {
    if (slotIds.includes(itemId)) return itemId
    return slotIds.find((slotId) => assignments[slotId]?.includes(itemId))
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveStudentId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveStudentId(null)
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null
    if (!overId) return

    const activeContainer = findContainer(activeId)
    const overContainer = findContainer(overId)
    if (!activeContainer || !overContainer) return

    if (activeContainer === overContainer) {
      const items = assignments[activeContainer]
      const oldIndex = items.indexOf(activeId)
      const newIndex = overId === overContainer ? items.length - 1 : items.indexOf(overId)
      if (oldIndex === -1 || newIndex === -1) return

      const newItems = arrayMove(items, oldIndex, newIndex)
      storeSetAssignment(dateStr, activeContainer, newItems)
      return
    }

    const sourceItems = [...assignments[activeContainer]]
    const targetItems = [...(assignments[overContainer] || [])]
    if (targetItems.length >= capacityPerClass) return

    const activeIndex = sourceItems.indexOf(activeId)
    if (activeIndex === -1) return
    sourceItems.splice(activeIndex, 1)

    const insertionIndex = overId === overContainer ? targetItems.length : targetItems.indexOf(overId)
    targetItems.splice(insertionIndex < 0 ? targetItems.length : insertionIndex, 0, activeId)

    storeSetAssignment(dateStr, activeContainer, sourceItems)
    storeSetAssignment(dateStr, overContainer, targetItems)
  }

  const activeStudent = activeStudentId ? studentsMap[activeStudentId] : null

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Date Navigation & Actions */}
      <Card className="border-primary/15 shadow-soft-sm bg-hero-grid overflow-hidden">
        <CardHeader className="pb-3 sm:pb-4 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="tactile rounded-xl border border-border/10 bg-surface/60 h-9 w-9">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelectedDate(addDays(selectedDate, 1))} className="tactile rounded-xl border border-border/10 bg-surface/60 h-9 w-9">
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <CardTitle className="font-display text-lg sm:text-xl lg:text-2xl">
                  {formattedDate}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="gap-1 chip-info text-[10px] sm:text-[11px] h-5">
                    <Calendar className="h-3 w-3" />
                    {weekdayLabel[dayKey]}
                  </Badge>
                  {format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') && (
                    <Badge className="bg-primary/20 text-primary border-primary/20 text-[10px] h-5">Hoje</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" size="sm" onClick={openAddForm} className="tactile text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white border-0 shadow-glow">
                <UserPlus2 className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Matricular Aluno</span>
                <span className="sm:hidden">Novo</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 relative z-10">
          {/* Daily stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="stat-card bg-surface/40 backdrop-blur-md">
              <p className="font-display text-lg font-semibold text-white sm:text-2xl">{totalStudents}</p>
              <p className="text-[10px] text-muted-foreground sm:text-xs">Alunos escalados</p>
            </div>
            <div className="stat-card border-emerald-500/20 bg-emerald-500/[.03] backdrop-blur-md">
              <p className="font-display text-lg font-semibold text-emerald-400 sm:text-2xl">{checkedInCount}</p>
              <p className="text-[10px] text-emerald-300/60 sm:text-xs">Check-ins realizados</p>
            </div>
            <div className="stat-card border-rose-500/20 bg-rose-500/[.03] backdrop-blur-md">
              <p className="font-display text-lg font-semibold text-rose-400 sm:text-2xl">{absentCount}</p>
              <p className="text-[10px] text-rose-300/60 sm:text-xs">Faltas registradas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!slots.length ? (
        <Card className="shadow-soft-sm border-dashed bg-surface/20">
          <CardHeader className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface/40 text-muted-foreground">
              <Calendar className="h-8 w-8" />
            </div>
            <CardTitle className="font-display text-lg text-white">Sem aulas agendadas</CardTitle>
            <CardDescription className="mx-auto max-w-xs">
              {weekdayLabel[dayKey]} não possui turmas cadastradas na grade fixa da academia.
            </CardDescription>
            <div className="mt-6">
              <Button variant="outline" onClick={() => setSelectedDate(new Date())} className="tactile">
                Voltar para Hoje
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <>
          {showAddForm ? (
            <Card className="animate-scale-in border-primary/20 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">Adicionar aluno no dia</CardTitle>
                <CardDescription>Cadastro rápido para já inserir o aluno em uma turma de hoje.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuickAddStudent} className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground ml-1 uppercase">Nome do aluno</label>
                    <Input placeholder="Ex: João Silva" value={quickForm.name} onChange={(e) => setQuickForm((p) => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground ml-1 uppercase">Idade</label>
                    <Input type="number" min={1} placeholder="Ex: 8" value={quickForm.age} onChange={(e) => setQuickForm((p) => ({ ...p, age: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground ml-1 uppercase">Contato dos pais</label>
                    <Input placeholder="Ex: (31) 9...." value={quickForm.parentContact} onChange={(e) => setQuickForm((p) => ({ ...p, parentContact: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground ml-1 uppercase">Turma de hoje</label>
                    <select className="flex h-10 w-full rounded-xl border border-border/30 bg-surface px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary" value={quickForm.slotId} onChange={(e) => setQuickForm((p) => ({ ...p, slotId: e.target.value }))}>
                      {slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.time} - {slot.ageGroup}</option>)}
                    </select>
                  </div>
                  <label className="sm:col-span-2 flex items-center gap-2 rounded-xl border border-border/20 bg-surface/40 px-3 py-2.5 text-sm text-white/80">
                    <Checkbox checked={quickForm.isTrial} onCheckedChange={(v) => setQuickForm((p) => ({ ...p, isTrial: v === true }))} />
                    Aula Experimental
                  </label>
                  <div className="sm:col-span-2 flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={closeAddForm}>Cancelar</Button>
                    <Button type="submit" className="btn-glow">Salvar e adicionar</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}

          {transferLog.length > 0 && (
            <Card className="animate-fade-in shadow-soft-sm border-primary/10 bg-primary/[.02]">
              <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0">
                <CardTitle className="font-display text-xs uppercase tracking-wider text-primary font-bold">Remanejados para outro dia</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setTransferLog([])} className="h-6 text-[10px] text-muted-foreground hover:text-white">Limpar log</Button>
              </CardHeader>
              <CardContent className="px-4 pb-3 flex flex-wrap gap-2">
                {transferLog.map((logItem) => (
                  <div key={logItem.studentId} className="flex items-center gap-2 rounded-lg border border-border/20 bg-surface/60 px-2.5 py-1.5 text-[10px]">
                    <span className="font-semibold text-white">{studentsMap[logItem.studentId]?.name ?? 'Aluno'}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{weekdayLabel[logItem.targetDay]} às {logItem.targetTime}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {noteFormSlot && (
            <Card className="animate-scale-in border-primary/20 shadow-soft">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Anotação — {slots.find((s) => s.id === noteFormSlot)?.time}
                  </CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setNoteFormSlot(null)}><X className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input placeholder="Ex: Foco em rolamento e equilíbrio..." value={noteInput} onChange={(e) => setNoteInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote(noteFormSlot) }} className="flex-1" />
                  <Button onClick={() => handleSaveNote(noteFormSlot)} className="btn-glow">Salvar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:gap-4">
              {slots.map((slot) => {
                const studentsInSlot = (assignments[slot.id] ?? []).map((id) => studentsMap[id]).filter(Boolean)
                return (
                  <ClassColumn
                    key={slot.id}
                    slot={slot}
                    students={studentsInSlot}
                    attendance={attendance}
                    classNote={classNotes[slot.id]}
                    onOpenActions={openStudentActions}
                    onToggleNote={toggleNoteForm}
                  />
                )
              })}
            </div>

            <DragOverlay>
              {activeStudent ? (
                <div className="w-[260px] sm:w-[300px] rounded-xl border border-primary/30 bg-surface/95 p-3 shadow-soft-lg ring-1 ring-primary/50">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={activeStudent.photoUrl} alt={activeStudent.name} />
                      <AvatarFallback>{activeStudent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">{activeStudent.name}</p>
                      <p className="text-xs text-muted-foreground">Rep posicionando na grade...</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </>
      )}

      {/* Action Modal */}
      {selectedStudent ? (
        <div className="modal-backdrop fixed inset-0 z-50 bg-black/70 p-3 sm:p-6 backdrop-blur-sm" onClick={() => setSelectedStudentId(null)}>
          <div className="flex h-full items-center justify-center sm:items-end">
            <Card className="modal-content w-full max-w-lg border-primary/20 shadow-soft-lg animate-mount" onClick={(e) => e.stopPropagation()}>
              <CardHeader className="pb-3 border-b border-border/10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/20">
                      <AvatarImage src={selectedStudent.photoUrl} />
                      <AvatarFallback>{selectedStudent.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="font-display text-lg sm:text-xl">{selectedStudent.name}</CardTitle>
                      <CardDescription>Gerenciar presença ou remanejar</CardDescription>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => setSelectedStudentId(null)} className="rounded-full h-8 w-8 hover:bg-white/10">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-5 pb-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Controlar Presença</p>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <Button type="button" variant="secondary" onClick={() => setPresenceStatus('present')} className="tactile h-auto py-3 flex-col gap-1.5 border-emerald-500/20 bg-emerald-500/[.04] hover:bg-emerald-500/10 hover:border-emerald-500/40 group">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold">Presente</span>
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setPresenceStatus('late')} className="tactile h-auto py-3 flex-col gap-1.5 border-amber-500/20 bg-amber-500/[.04] hover:bg-amber-500/10 hover:border-amber-500/40 group">
                      <Clock className="h-5 w-5 text-amber-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold">Atraso</span>
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setPresenceStatus('absent')} className="tactile h-auto py-3 flex-col gap-1.5 border-rose-500/20 bg-rose-500/[.04] hover:bg-rose-500/10 hover:border-rose-500/40 group">
                      <XCircle className="h-5 w-5 text-rose-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-semibold">Falta</span>
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-primary/20 bg-primary/[.04] p-4">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/20 p-1.5">
                      <ArrowRightLeft className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-sm font-bold text-white">Enviar para outro dia</p>
                  </div>

                  <div className="grid gap-2">
                    <select className="h-10 w-full rounded-xl border border-border/30 bg-surface px-3 text-sm text-white focus:ring-1 focus:ring-primary/50" value={transferDay ?? ''} onChange={(e) => handleTransferDayChange(e.target.value)}>
                      <option value="" disabled>Selecione o dia da semana</option>
                      {availableTransferDays.map((w) => <option key={w} value={w}>{weekdayLabel[w]}</option>)}
                    </select>
                    <select className="h-10 w-full rounded-xl border border-border/30 bg-surface px-3 text-sm text-white focus:ring-1 focus:ring-primary/50" value={transferSlotId} onChange={(e) => setTransferSlotId(e.target.value)} disabled={!transferDay}>
                      <option value="" disabled>Selecione o horário disponível</option>
                      {transferSlots.map((s) => <option key={s.id} value={s.id}>{s.time} - {s.ageGroup}</option>)}
                    </select>
                  </div>

                  <Button type="button" className="w-full btn-glow h-11" disabled={!transferDay || !transferSlotId} onClick={transferStudent}>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Confirmar Remanejamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  )
}
