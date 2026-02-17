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
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  Plus,
  Rocket,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '../lib/utils'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

type ColumnId = 'ideas' | 'planning' | 'promoting' | 'done'

type EventTask = {
  id: string
  title: string
  date: string
}

type CalendarEvent = EventTask & {
  columnId: ColumnId
}

const columnMeta: Array<{ id: ColumnId; title: string; icon: typeof Sparkles }> = [
  { id: 'ideas', title: 'Ideias', icon: Sparkles },
  { id: 'planning', title: 'Planejando', icon: Rocket },
  { id: 'promoting', title: 'Divulgando', icon: Megaphone },
  { id: 'done', title: 'Concluído', icon: Check },
]

const stageLabel: Record<ColumnId, string> = {
  ideas: 'Ideias',
  planning: 'Planejando',
  promoting: 'Divulgando',
  done: 'Concluído',
}

const stageDotColors: Record<ColumnId, string> = {
  ideas: 'bg-blue-400',
  planning: 'bg-indigo-400',
  promoting: 'bg-cyan-400',
  done: 'bg-emerald-400',
}

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']

function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromIsoDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function addDays(base: Date, amount: number): Date {
  const next = new Date(base)
  next.setDate(base.getDate() + amount)
  return next
}

function addMonths(base: Date, amount: number): Date {
  return new Date(base.getFullYear(), base.getMonth() + amount, 1)
}

function formatDate(value: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('pt-BR', options).format(fromIsoDate(value))
}

function buildMonthCells(monthDate: Date): Array<{ iso: string | null; day: number | null }> {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingSlots = (firstDay.getDay() + 6) % 7

  const cells: Array<{ iso: string | null; day: number | null }> = []

  for (let index = 0; index < leadingSlots; index += 1) {
    cells.push({ iso: null, day: null })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const current = new Date(year, month, day)
    cells.push({ iso: toIsoDate(current), day })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ iso: null, day: null })
  }

  return cells
}

const todayIso = toIsoDate(new Date())

const initialTasks: Record<ColumnId, EventTask[]> = {
  ideas: [
    { id: 'evt-1', title: 'Campeonato Interno', date: toIsoDate(addDays(new Date(), 5)) },
    { id: 'evt-2', title: 'Sessão de fotos outdoor', date: toIsoDate(addDays(new Date(), 12)) },
  ],
  planning: [
    { id: 'evt-3', title: 'Workshop de Férias', date: toIsoDate(addDays(new Date(), 9)) },
    { id: 'evt-4', title: 'Aula aberta para iniciantes', date: toIsoDate(addDays(new Date(), 15)) },
  ],
  promoting: [
    { id: 'evt-5', title: 'Campanha Instagram - turma kids', date: toIsoDate(addDays(new Date(), 2)) },
  ],
  done: [{ id: 'evt-6', title: 'Treino especial de sábado', date: toIsoDate(addDays(new Date(), -3)) }],
}

const emptyDrafts: Record<ColumnId, string> = {
  ideas: '',
  planning: '',
  promoting: '',
  done: '',
}

const emptyDraftDates: Record<ColumnId, string> = {
  ideas: todayIso,
  planning: todayIso,
  promoting: todayIso,
  done: todayIso,
}

function SortableTask({ task }: { task: EventTask }) {
  const { setNodeRef, transform, transition, listeners, attributes, isDragging } =
    useSortable({ id: task.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'rounded-xl border border-border/20 bg-surface/60 px-3 py-2.5 text-sm text-white/90 transition-all duration-200 hover:border-border/30 hover:bg-surface/80',
        isDragging && 'opacity-40',
      )}
      {...attributes}
      {...listeners}
    >
      <p>{task.title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {formatDate(task.date, { day: '2-digit', month: 'short' })}
      </p>
    </div>
  )
}

function EventColumn({
  id,
  title,
  Icon,
  tasks,
  draft,
  draftDate,
  onDraftChange,
  onDraftDateChange,
  onAddTask,
}: {
  id: ColumnId
  title: string
  Icon: typeof Sparkles
  tasks: EventTask[]
  draft: string
  draftDate: string
  onDraftChange: (value: string) => void
  onDraftDateChange: (value: string) => void
  onAddTask: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        'flex h-full w-[86vw] max-w-[320px] flex-shrink-0 snap-start flex-col rounded-2xl shadow-soft-sm sm:w-[320px]',
        isOver && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
      )}
    >
      <CardHeader className="border-b border-border/20 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </CardTitle>
          <Badge className="chip-neutral text-[10px]">{tasks.length}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-2.5 p-3">
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-1 flex-col gap-2">
            {tasks.map((task) => (
              <SortableTask key={task.id} task={task} />
            ))}

            {tasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/20 bg-surface/30 px-3 py-4 text-center text-xs text-muted-foreground">
                Sem cards nesta etapa
              </div>
            ) : null}
          </div>
        </SortableContext>

        <div className="space-y-2 pt-2">
          <Input
            placeholder="Nova tarefa"
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onAddTask()
              }
            }}
          />

          <Input
            type="date"
            value={draftDate}
            onChange={(event) => onDraftDateChange(event.target.value)}
          />

          <Button variant="secondary" size="sm" className="w-full tactile" onClick={onAddTask}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Criar card
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function EventsBoard() {
  const [columns, setColumns] = useState(initialTasks)
  const [drafts, setDrafts] = useState(emptyDrafts)
  const [draftDates, setDraftDates] = useState(emptyDraftDates)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayIso)
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const taskById = useMemo(
    () =>
      Object.fromEntries(
        Object.values(columns)
          .flat()
          .map((task) => [task.id, task]),
      ),
    [columns],
  )

  const allEvents = useMemo<CalendarEvent[]>(
    () =>
      columnMeta.flatMap((column) =>
        columns[column.id].map((task) => ({
          ...task,
          columnId: column.id,
        })),
      ),
    [columns],
  )

  const eventsByDate = useMemo(() => {
    return allEvents.reduce<Record<string, CalendarEvent[]>>((accumulator, event) => {
      if (!accumulator[event.date]) {
        accumulator[event.date] = []
      }
      accumulator[event.date].push(event)
      return accumulator
    }, {})
  }, [allEvents])

  const selectedDateEvents = eventsByDate[selectedDate] ?? []
  const monthCells = useMemo(() => buildMonthCells(calendarMonth), [calendarMonth])

  const currentMonthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        month: 'long',
        year: 'numeric',
      }).format(calendarMonth),
    [calendarMonth],
  )

  const findContainer = (itemId: string) => {
    const directColumn = columnMeta.find((column) => column.id === itemId)
    if (directColumn) return directColumn.id
    return columnMeta.find((column) => columns[column.id].some((task) => task.id === itemId))?.id
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(String(event.active.id))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTaskId(null)
    if (!event.over) return

    const activeId = String(event.active.id)
    const overId = String(event.over.id)
    const sourceColumn = findContainer(activeId)
    const targetColumn = findContainer(overId)

    if (!sourceColumn || !targetColumn) return

    if (sourceColumn === targetColumn) {
      setColumns((previous) => {
        const sourceCards = previous[sourceColumn]
        const oldIndex = sourceCards.findIndex((task) => task.id === activeId)
        const newIndex =
          overId === targetColumn
            ? sourceCards.length - 1
            : sourceCards.findIndex((task) => task.id === overId)

        if (oldIndex === -1 || newIndex === -1) return previous
        return { ...previous, [sourceColumn]: arrayMove(sourceCards, oldIndex, newIndex) }
      })
      return
    }

    setColumns((previous) => {
      const sourceCards = [...previous[sourceColumn]]
      const targetCards = [...previous[targetColumn]]
      const sourceIndex = sourceCards.findIndex((task) => task.id === activeId)

      if (sourceIndex === -1) return previous

      const [movedTask] = sourceCards.splice(sourceIndex, 1)
      const insertIndex =
        overId === targetColumn
          ? targetCards.length
          : targetCards.findIndex((task) => task.id === overId)

      targetCards.splice(insertIndex < 0 ? targetCards.length : insertIndex, 0, movedTask)

      return { ...previous, [sourceColumn]: sourceCards, [targetColumn]: targetCards }
    })
  }

  const addTask = (columnId: ColumnId) => {
    const title = drafts[columnId].trim()
    if (!title) return
    const date = draftDates[columnId] || selectedDate

    setColumns((previous) => ({
      ...previous,
      [columnId]: [...previous[columnId], { id: `evt-${Date.now()}`, title, date }],
    }))
    setDrafts((previous) => ({ ...previous, [columnId]: '' }))
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/10 bg-hero-grid shadow-soft-sm">
        <CardHeader>
          <CardTitle className="font-display text-xl sm:text-2xl">Planejamento de Eventos</CardTitle>
          <CardDescription className="text-muted-foreground">
            Quadro Kanban com calendário mensal para visualizar e marcar eventos.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card className="shadow-soft-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="inline-flex items-center gap-2 font-display text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Calendário de Eventos
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 tactile"
                onClick={() => setCalendarMonth((value) => addMonths(value, -1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 tactile"
                onClick={() => setCalendarMonth((value) => addMonths(value, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <CardDescription className="capitalize">{currentMonthLabel}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
            {weekDays.map((label) => (
              <span key={label} className="py-1 font-medium">
                {label}
              </span>
            ))}

            {monthCells.map((cell, index) => {
              if (!cell.iso || !cell.day) {
                return <div key={`empty-${index}`} className="h-12 rounded-lg border border-transparent" />
              }

              const dayEvents = eventsByDate[cell.iso] ?? []
              const isSelected = selectedDate === cell.iso
              const isToday = cell.iso === todayIso
              const markerStages = Array.from(new Set(dayEvents.map((event) => event.columnId))).slice(0, 3)

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => setSelectedDate(cell.iso!)}
                  className={cn(
                    'tactile flex h-12 flex-col items-center justify-center rounded-lg border text-xs transition-all duration-200',
                    isSelected
                      ? 'border-primary/40 bg-primary/15 text-white shadow-glow'
                      : 'border-border/20 bg-surface/40 text-white/80 hover:bg-surface/60',
                    isToday && !isSelected && 'border-emerald-500/30',
                  )}
                >
                  <span>{cell.day}</span>
                  <span className="mt-1 flex gap-0.5">
                    {markerStages.map((stage) => (
                      <span
                        key={`${cell.iso}-${stage}`}
                        className={cn('h-1.5 w-1.5 rounded-full', stageDotColors[stage])}
                      />
                    ))}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="rounded-xl border border-border/20 bg-surface/40 p-3">
            <p className="text-sm font-display font-semibold text-white">
              Eventos em {formatDate(selectedDate, { day: '2-digit', month: 'long' })}
            </p>

            {selectedDateEvents.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Nenhum evento marcado para este dia.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {selectedDateEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/20 bg-background/40 px-3 py-2"
                  >
                    <p className="text-sm text-white/90">{event.title}</p>
                    <Badge className="chip-neutral text-[10px]">
                      {stageLabel[event.columnId]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 sm:gap-4">
          {columnMeta.map((column) => (
            <EventColumn
              key={column.id}
              id={column.id}
              title={column.title}
              Icon={column.icon}
              tasks={columns[column.id]}
              draft={drafts[column.id]}
              draftDate={draftDates[column.id]}
              onDraftChange={(value) =>
                setDrafts((previous) => ({ ...previous, [column.id]: value }))
              }
              onDraftDateChange={(value) =>
                setDraftDates((previous) => ({ ...previous, [column.id]: value }))
              }
              onAddTask={() => addTask(column.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTaskId && taskById[activeTaskId] ? (
            <div className="w-[280px] rounded-xl border border-primary/30 bg-surface/95 px-3 py-2 text-sm text-white shadow-soft-lg">
              <p>{taskById[activeTaskId].title}</p>
              <p className="text-[11px] text-muted-foreground">
                {formatDate(taskById[activeTaskId].date, { day: '2-digit', month: 'short' })}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
