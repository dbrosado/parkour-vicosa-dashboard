import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Flame,
  History,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'

import { cn } from '../../lib/utils'
import {
  formatCurrency,
  formatDateTime,
  isOverdue,
  pipelineStages,
  stageLabel,
  temperatureMeta,
} from '../../lib/crm-utils'
import { useStore } from '../../store/useStore'
import type {
  CrmLead,
  CrmMessage,
  CrmTask,
  LeadSource,
  LeadStudentType,
  LeadTemperature,
  PipelineStage,
  TrialClass,
} from '../../types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import {
  Field,
  Modal,
  Select,
  Textarea,
} from './crm-common'

const leadSources: LeadSource[] = [
  'Instagram',
  'Facebook',
  'Google',
  'Indicação',
  'WhatsApp direto',
  'Evento',
  'Panfleto',
  'Escola',
  'Tráfego pago',
  'Site',
  'Aula experimental anterior',
  'Ex-aluno',
  'Outro',
]

const studentTypes: LeadStudentType[] = [
  'Criança',
  'Adolescente',
  'Adulto',
  'Família',
  'Calistenia',
  'Evento',
]

function localDateTime(dayOffset = 0, hour = 10): string {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, 0, 0, 0)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function createLeadDraft(): CrmLead {
  const now = new Date().toISOString()
  return {
    id: `lead-${crypto.randomUUID()}`,
    studentName: '',
    guardianName: '',
    whatsapp: '',
    email: '',
    instagram: '',
    age: undefined,
    birthDate: '',
    city: 'Viçosa',
    neighborhood: '',
    source: 'WhatsApp direto',
    sourceCampaign: '',
    referralBy: '',
    mainInterest: 'Parkour',
    studentType: 'Criança',
    stage: 'new',
    temperature: 'warm',
    recommendedPlan: '',
    recommendedSchedule: '',
    presentedValue: undefined,
    objections: '',
    lostReason: '',
    nextAction: 'Responder no WhatsApp',
    nextActionAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    salesOwner: 'Danilo',
    instructorOwner: 'Danilo',
    internalNotes: '',
    communicationConsent: true,
    doNotContact: false,
    tags: ['Novo', 'Parkour'],
    createdAt: now,
    updatedAt: now,
    lastContactAt: now,
    history: [
      {
        id: `history-${crypto.randomUUID()}`,
        type: 'stage',
        description: 'Lead criado manualmente',
        createdAt: now,
      },
    ],
  }
}

function LeadFormModal({
  open,
  onClose,
  initialLead,
}: {
  open: boolean
  onClose: () => void
  initialLead?: CrmLead | null
}) {
  const { addCrmLead, updateCrmLead } = useStore()
  const [draft, setDraft] = useState<CrmLead>(() => initialLead ?? createLeadDraft())
  const [tagInput, setTagInput] = useState('')

  const setValue = <K extends keyof CrmLead>(key: K, value: CrmLead[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.studentName.trim() || !draft.whatsapp.trim()) return
    const saved = { ...draft, updatedAt: new Date().toISOString() }
    if (initialLead) updateCrmLead(saved)
    else addCrmLead(saved)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialLead ? 'Editar lead' : 'Novo lead'}
      description="Cadastre só o essencial agora. O restante pode ser completado durante a conversa."
      wide
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome do aluno">
            <Input required value={draft.studentName} onChange={(event) => setValue('studentName', event.target.value)} />
          </Field>
          <Field label="Nome do responsável">
            <Input value={draft.guardianName} onChange={(event) => setValue('guardianName', event.target.value)} />
          </Field>
          <Field label="WhatsApp">
            <Input required inputMode="tel" value={draft.whatsapp} onChange={(event) => setValue('whatsapp', event.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={draft.email} onChange={(event) => setValue('email', event.target.value)} />
          </Field>
          <Field label="Idade">
            <Input type="number" min="2" max="100" value={draft.age ?? ''} onChange={(event) => setValue('age', event.target.value ? Number(event.target.value) : undefined)} />
          </Field>
          <Field label="Tipo de aluno">
            <Select value={draft.studentType} onChange={(event) => setValue('studentType', event.target.value as LeadStudentType)}>
              {studentTypes.map((type) => <option key={type}>{type}</option>)}
            </Select>
          </Field>
          <Field label="Origem">
            <Select value={draft.source} onChange={(event) => setValue('source', event.target.value as LeadSource)}>
              {leadSources.map((source) => <option key={source}>{source}</option>)}
            </Select>
          </Field>
          <Field label="Interesse principal">
            <Input value={draft.mainInterest} onChange={(event) => setValue('mainInterest', event.target.value)} />
          </Field>
          <Field label="Temperatura">
            <Select value={draft.temperature} onChange={(event) => setValue('temperature', event.target.value as LeadTemperature)}>
              <option value="cold">Frio</option>
              <option value="warm">Morno</option>
              <option value="hot">Quente</option>
            </Select>
          </Field>
          <Field label="Próxima ação">
            <Input value={draft.nextAction} onChange={(event) => setValue('nextAction', event.target.value)} />
          </Field>
          <Field label="Data da próxima ação">
            <Input
              type="datetime-local"
              value={draft.nextActionAt ? new Date(new Date(draft.nextActionAt).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ''}
              onChange={(event) => setValue('nextActionAt', new Date(event.target.value).toISOString())}
            />
          </Field>
          <Field label="Responsável comercial">
            <Input value={draft.salesOwner} onChange={(event) => setValue('salesOwner', event.target.value)} />
          </Field>
        </div>

        <Field label="Tags">
          <div className="flex gap-2">
            <Input
              value={tagInput}
              placeholder="Ex.: Criança, Instagram, Quente"
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && tagInput.trim()) {
                  event.preventDefault()
                  setValue('tags', Array.from(new Set([...draft.tags, tagInput.trim()])))
                  setTagInput('')
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (!tagInput.trim()) return
                setValue('tags', Array.from(new Set([...draft.tags, tagInput.trim()])))
                setTagInput('')
              }}
            >
              Adicionar
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {draft.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setValue('tags', draft.tags.filter((item) => item !== tag))}
                className="rounded-full border border-border/40 bg-white/[.04] px-2.5 py-1 text-[11px] text-white/75 hover:border-rose-500/40 hover:text-rose-300"
              >
                {tag} ×
              </button>
            ))}
          </div>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Observações internas">
            <Textarea value={draft.internalNotes} onChange={(event) => setValue('internalNotes', event.target.value)} />
          </Field>
          <div className="space-y-3 rounded-2xl border border-border/30 bg-white/[.02] p-4">
            <label className="flex items-center gap-3 text-sm text-white">
              <input type="checkbox" checked={draft.communicationConsent} onChange={(event) => setValue('communicationConsent', event.target.checked)} />
              Consentiu contato por WhatsApp/e-mail
            </label>
            <label className="flex items-center gap-3 text-sm text-white">
              <input type="checkbox" checked={draft.doNotContact} onChange={(event) => setValue('doNotContact', event.target.checked)} />
              Não contactar
            </label>
            <p className="text-xs leading-relaxed text-muted-foreground">
              O bloqueio de contato prevalece sobre campanhas e mensagens sugeridas.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/30 pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="submit">{initialLead ? 'Salvar alterações' : 'Criar lead'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function TrialForm({
  lead,
  onDone,
}: {
  lead: CrmLead
  onDone: () => void
}) {
  const addTrialClass = useStore((state) => state.addTrialClass)
  const [date, setDate] = useState(localDateTime(1, 17).slice(0, 10))
  const [time, setTime] = useState('17:00')
  const [className, setClassName] = useState(
    lead.studentType === 'Adulto' || lead.studentType === 'Calistenia'
      ? 'Parkour Adulto'
      : 'Parkour Kids 7-12 anos',
  )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextDay = new Date(`${date}T${time}:00`)
    nextDay.setDate(nextDay.getDate() + 1)
    const trial: TrialClass = {
      id: `trial-${crypto.randomUUID()}`,
      leadId: lead.id,
      date,
      time,
      className,
      instructor: lead.instructorOwner || 'Danilo',
      status: 'scheduled',
      guardianAttendance: 'not_applicable',
      studentLiked: null,
      instructorFeedback: '',
      strengths: '',
      improvements: '',
      recommendedPlan: '',
      planPresented: false,
      enrollmentOffered: false,
      commercialResult: 'pending',
      nextFollowUpAt: nextDay.toISOString(),
      notes: '',
      createdAt: new Date().toISOString(),
    }
    addTrialClass(trial)
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-primary/20 bg-primary/[.04] p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Data"><Input type="date" required value={date} onChange={(event) => setDate(event.target.value)} /></Field>
        <Field label="Horário"><Input type="time" required value={time} onChange={(event) => setTime(event.target.value)} /></Field>
        <Field label="Turma"><Input required value={className} onChange={(event) => setClassName(event.target.value)} /></Field>
      </div>
      {(lead.studentType === 'Criança' || lead.studentType === 'Adolescente') ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium text-amber-200">
          Atenção: responsável precisa estar presente no final da aula para fechamento.
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
        <Button type="submit">Agendar experimental</Button>
      </div>
    </form>
  )
}

export function LeadDetailModal({
  leadId,
  onClose,
}: {
  leadId: string | null
  onClose: () => void
}) {
  const {
    crmLeads,
    crmMessages,
    crmTasks,
    trialClasses,
    messageTemplates,
    updateCrmLead,
    moveCrmLead,
    convertCrmLeadToStudent,
    addCrmTask,
    addCrmMessage,
  } = useStore()
  const lead = crmLeads.find((item) => item.id === leadId)
  const [showTrialForm, setShowTrialForm] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [internalNote, setInternalNote] = useState(false)

  if (!lead) return null

  const messages = crmMessages
    .filter((item) => item.leadId === lead.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  const tasks = crmTasks.filter((item) => item.leadId === lead.id)
  const trials = trialClasses.filter((item) => item.leadId === lead.id)

  const createFollowUp = () => {
    const dueAt = new Date()
    dueAt.setDate(dueAt.getDate() + 1)
    const task: CrmTask = {
      id: `task-${crypto.randomUUID()}`,
      title: `Follow-up com ${lead.guardianName || lead.studentName}`,
      leadId: lead.id,
      owner: lead.salesOwner || 'Danilo',
      dueAt: dueAt.toISOString(),
      type: 'follow_up',
      status: 'pending',
      priority: 'high',
      notes: '',
      createdAt: new Date().toISOString(),
    }
    addCrmTask(task)
    updateCrmLead({
      ...lead,
      nextAction: 'Fazer follow-up',
      nextActionAt: task.dueAt,
      updatedAt: new Date().toISOString(),
    })
  }

  const sendMessage = () => {
    if (!message.trim() || lead.doNotContact) return
    const item: CrmMessage = {
      id: `message-${crypto.randomUUID()}`,
      leadId: lead.id,
      direction: internalNote ? 'internal' : 'outgoing',
      channel: internalNote ? 'internal' : 'whatsapp',
      content: message.trim(),
      status: internalNote ? 'sent' : 'sent',
      createdAt: new Date().toISOString(),
    }
    addCrmMessage(item)
    setMessage('')
    setSelectedTemplate('')
  }

  const fillTemplate = (templateId: string) => {
    setSelectedTemplate(templateId)
    const template = messageTemplates.find((item) => item.id === templateId)
    if (!template) return
    setMessage(
      template.content
        .replaceAll('[aluno]', lead.studentName)
        .replaceAll('[responsável]', lead.guardianName || lead.studentName)
        .replaceAll('[plano]', lead.recommendedPlan || 'plano recomendado')
        .replaceAll('[horários]', lead.recommendedSchedule || 'horário combinado'),
    )
  }

  return (
    <>
      <Modal
        open={Boolean(leadId)}
        onClose={onClose}
        title={lead.studentName}
        description={`${lead.guardianName ? `Responsável: ${lead.guardianName} · ` : ''}${lead.whatsapp}`}
        wide
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={temperatureMeta[lead.temperature].className}>
              {lead.temperature === 'hot' ? <Flame className="mr-1 h-3 w-3" /> : null}
              {temperatureMeta[lead.temperature].label}
            </Badge>
            <Badge variant="outline">{stageLabel(lead.stage)}</Badge>
            <Badge variant="secondary">{lead.source}</Badge>
            {lead.doNotContact ? <Badge variant="danger">Não contactar</Badge> : null}
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setShowEdit(true)}>Editar</Button>
              <Button size="sm" variant="outline" onClick={() => setShowTrialForm((value) => !value)}>
                <CalendarPlus className="mr-1.5 h-4 w-4" />
                Agendar aula
              </Button>
              <Button size="sm" onClick={() => convertCrmLeadToStudent(lead.id)}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Matricular
              </Button>
            </div>
          </div>

          {showTrialForm ? <TrialForm lead={lead} onDone={() => setShowTrialForm(false)} /> : null}

          {lead.stage === 'feedback_pending' ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="font-display text-sm font-semibold text-amber-200">
                A aula experimental ainda não terminou comercialmente.
              </p>
              <p className="mt-1 text-xs text-amber-100/75">
                Faça o feedback, apresente o plano recomendado e peça a matrícula.
              </p>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
            <div className="space-y-4">
              <Card className="border-border/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    Conversa e observações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {messages.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border/30 p-5 text-center text-xs text-muted-foreground">
                        Nenhuma mensagem registrada ainda.
                      </p>
                    ) : messages.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          'max-w-[88%] rounded-2xl px-3 py-2.5 text-sm',
                          item.direction === 'incoming' && 'mr-auto bg-white/[.06]',
                          item.direction === 'outgoing' && 'ml-auto bg-emerald-500/15 text-emerald-50',
                          item.direction === 'internal' && 'mx-auto max-w-full border border-amber-500/20 bg-amber-500/10 text-amber-100',
                        )}
                      >
                        <p>{item.content}</p>
                        <p className="mt-1 text-[10px] opacity-55">{formatDateTime(item.createdAt)}</p>
                      </div>
                    ))}
                  </div>

                  <Select value={selectedTemplate} onChange={(event) => fillTemplate(event.target.value)}>
                    <option value="">Usar template...</option>
                    {messageTemplates.filter((item) => item.active).map((template) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </Select>
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={internalNote ? 'Observação interna, não enviada ao cliente...' : 'Escreva uma mensagem...'}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={internalNote} onChange={(event) => setInternalNote(event.target.checked)} />
                      Nota interna
                    </label>
                    <Button size="sm" onClick={sendMessage} disabled={lead.doNotContact && !internalNote}>
                      <Send className="mr-1.5 h-4 w-4" />
                      {internalNote ? 'Registrar nota' : 'Registrar envio'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className="border-border/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Próximo passo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className={cn('rounded-xl border p-3', isOverdue(lead.nextActionAt) ? 'border-rose-500/30 bg-rose-500/10' : 'border-border/30 bg-white/[.02]')}>
                    <p className="text-sm font-semibold text-white">{lead.nextAction || 'Definir próxima ação'}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatDateTime(lead.nextActionAt)}
                    </p>
                  </div>
                  <Button variant="secondary" className="w-full" onClick={createFollowUp}>
                    Criar follow-up em 24h
                  </Button>
                  <Select
                    value={lead.stage}
                    onChange={(event) => {
                      const nextStage = event.target.value as PipelineStage
                      if (nextStage === 'lost') {
                        const reason = window.prompt('Qual foi o motivo da perda?')
                        if (!reason) return
                        moveCrmLead(lead.id, nextStage, reason)
                        return
                      }
                      moveCrmLead(lead.id, nextStage)
                    }}
                  >
                    {pipelineStages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
                  </Select>
                </CardContent>
              </Card>

              <Card className="border-border/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CircleDollarSign className="h-4 w-4 text-primary" />
                    Recomendação comercial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label="Plano" value={lead.recommendedPlan || 'Ainda não recomendado'} />
                  <InfoRow label="Horário" value={lead.recommendedSchedule || 'Ainda não definido'} />
                  <InfoRow label="Valor" value={lead.presentedValue ? formatCurrency(lead.presentedValue) : 'Ainda não apresentado'} />
                  <InfoRow label="Objeções" value={lead.objections || 'Nenhuma registrada'} />
                </CardContent>
              </Card>

              <Card className="border-border/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4 text-primary" />
                    Histórico
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-52 space-y-3 overflow-y-auto">
                  {lead.history.map((item) => (
                    <div key={item.id} className="border-l border-border/50 pl-3">
                      <p className="text-xs text-white/85">{item.description}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-border/30">
              <CardHeader className="pb-3"><CardTitle className="text-base">Aulas experimentais</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {trials.length ? trials.map((trial) => (
                  <div key={trial.id} className="rounded-xl border border-border/30 p-3 text-xs">
                    <p className="font-semibold text-white">{trial.className}</p>
                    <p className="mt-1 text-muted-foreground">{trial.date} às {trial.time} · {trial.status}</p>
                  </div>
                )) : <p className="text-xs text-muted-foreground">Nenhuma aula agendada.</p>}
              </CardContent>
            </Card>
            <Card className="border-border/30">
              <CardHeader className="pb-3"><CardTitle className="text-base">Tarefas</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {tasks.length ? tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-start gap-2 rounded-xl border border-border/30 p-3 text-xs">
                    <CheckCircle2 className={cn('mt-0.5 h-4 w-4', task.status === 'completed' ? 'text-emerald-400' : 'text-muted-foreground')} />
                    <div><p className="text-white">{task.title}</p><p className="mt-1 text-muted-foreground">{formatDateTime(task.dueAt)}</p></div>
                  </div>
                )) : <p className="text-xs text-muted-foreground">Nenhuma tarefa.</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </Modal>
      {showEdit ? <LeadFormModal open onClose={() => setShowEdit(false)} initialLead={lead} /> : null}
    </>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/20 py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-white/85">{value}</span>
    </div>
  )
}

export function CrmLeadsView() {
  const leads = useStore((state) => state.crmLeads)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState<PipelineStage | 'all'>('all')
  const [temperature, setTemperature] = useState<LeadTemperature | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR')
    return leads.filter((lead) => {
      const matchesQuery = !query || [
        lead.studentName,
        lead.guardianName,
        lead.whatsapp,
        lead.source,
        ...lead.tags,
      ].some((value) => value.toLocaleLowerCase('pt-BR').includes(query))
      return matchesQuery
        && (stage === 'all' || lead.stage === stage)
        && (temperature === 'all' || lead.temperature === temperature)
    })
  }, [leads, search, stage, temperature])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/30 bg-surface-gradient p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar aluno, responsável, telefone ou tag..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select className="sm:w-52" value={stage} onChange={(event) => setStage(event.target.value as PipelineStage | 'all')}>
          <option value="all">Todas as etapas</option>
          {pipelineStages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>
        <Select className="sm:w-36" value={temperature} onChange={(event) => setTemperature(event.target.value as LeadTemperature | 'all')}>
          <option value="all">Temperatura</option>
          <option value="hot">Quente</option>
          <option value="warm">Morno</option>
          <option value="cold">Frio</option>
        </Select>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />Novo lead</Button>
      </div>

      <div className="grid gap-3">
        {filtered.map((lead) => (
          <button
            key={lead.id}
            type="button"
            onClick={() => setSelectedLeadId(lead.id)}
            className="group grid gap-3 rounded-2xl border border-border/30 bg-card/70 p-4 text-left transition hover:border-primary/30 hover:bg-card sm:grid-cols-[1.2fr_.8fr_.8fr_auto] sm:items-center"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-display font-semibold text-primary">
                {lead.studentName.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-white">{lead.studentName}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{lead.guardianName || 'Contato direto'} · {lead.whatsapp}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-white/85">{stageLabel(lead.stage)}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{lead.source}</p>
            </div>
            <div>
              <p className={cn('text-xs', isOverdue(lead.nextActionAt) ? 'text-rose-300' : 'text-white/85')}>{lead.nextAction || 'Sem próxima ação'}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(lead.nextActionAt)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={temperatureMeta[lead.temperature].className}>{temperatureMeta[lead.temperature].label}</Badge>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </div>
          </button>
        ))}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/30 p-10 text-center text-sm text-muted-foreground">
            Nenhum lead encontrado com esses filtros.
          </div>
        ) : null}
      </div>

      {showForm ? <LeadFormModal open onClose={() => setShowForm(false)} /> : null}
      <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  )
}

function LeadCardContent({ lead }: { lead: CrmLead }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold text-white">{lead.studentName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{lead.guardianName || lead.whatsapp}</p>
        </div>
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {lead.tags.slice(0, 2).map((tag) => <span key={tag} className="rounded-md bg-white/[.05] px-1.5 py-0.5 text-[9px] text-white/65">{tag}</span>)}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-border/20 pt-2">
        <span className={cn('text-[10px]', isOverdue(lead.nextActionAt) ? 'text-rose-300' : 'text-muted-foreground')}>
          {lead.nextAction || 'Definir ação'}
        </span>
        <span className={cn('h-2 w-2 rounded-full', lead.temperature === 'hot' ? 'bg-rose-400' : lead.temperature === 'warm' ? 'bg-amber-400' : 'bg-sky-400')} />
      </div>
    </>
  )
}

function DraggableLeadCard({ lead, onOpen }: { lead: CrmLead; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id })

  // O movimento visual fica por conta do DragOverlay; aqui o card original só esmaece
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'cursor-grab rounded-xl border border-border/30 bg-card p-3 shadow-soft-sm transition hover:border-primary/30',
        isDragging && 'opacity-30',
      )}
      {...listeners}
      {...attributes}
    >
      <button type="button" className="w-full text-left" onClick={onOpen}>
        <LeadCardContent lead={lead} />
      </button>
    </div>
  )
}

function PipelineColumn({
  stage,
  leads,
  onOpen,
}: {
  stage: (typeof pipelineStages)[number]
  leads: CrmLead[]
  onOpen: (id: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-[68vh] w-[286px] shrink-0 flex-col rounded-2xl border border-border/30 bg-white/[.015]',
        isOver && 'border-primary/50 bg-primary/[.04]',
      )}
    >
      <div className="flex items-center justify-between border-b border-border/25 p-3">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', stage.color)} />
          <p className="font-display text-xs font-semibold text-white">{stage.shortLabel}</p>
        </div>
        <span className="rounded-full bg-white/[.06] px-2 py-0.5 text-[10px] text-muted-foreground">{leads.length}</span>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
        {leads.map((lead) => <DraggableLeadCard key={lead.id} lead={lead} onOpen={() => onOpen(lead.id)} />)}
        {leads.length === 0 ? <div className="rounded-xl border border-dashed border-border/25 p-4 text-center text-[11px] text-muted-foreground">Arraste um lead para cá</div> : null}
      </div>
    </div>
  )
}

export function CrmPipelineView() {
  const { crmLeads, moveCrmLead } = useStore()
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [activeLead, setActiveLead] = useState<CrmLead | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleDragStart = (event: DragStartEvent) => {
    setActiveLead(crmLeads.find((lead) => lead.id === event.active.id) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null)
    const leadId = String(event.active.id)
    const nextStage = event.over?.id as PipelineStage | undefined
    if (!nextStage || !pipelineStages.some((item) => item.id === nextStage)) return
    if (nextStage === 'lost') {
      const reason = window.prompt('Informe o motivo da perda para mover este lead:')
      if (!reason) return
      moveCrmLead(leadId, nextStage, reason)
      return
    }
    moveCrmLead(leadId, nextStage)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/30 bg-surface-gradient p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-sm font-semibold text-white">Pipeline comercial</p>
          <p className="mt-1 text-xs text-muted-foreground">Arraste os cards. Cada mudança fica no histórico e pode gerar uma tarefa automática.</p>
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />Novo lead</Button>
      </div>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLead(null)}
      >
        <div className="flex snap-x gap-3 overflow-x-auto pb-3">
          {pipelineStages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              leads={crmLeads.filter((lead) => lead.stage === stage.id)}
              onOpen={setSelectedLeadId}
            />
          ))}
        </div>
        <DragOverlay>
          {activeLead ? (
            <div className="w-[260px] cursor-grabbing rounded-xl border border-primary/40 bg-card p-3 shadow-soft-lg">
              <LeadCardContent lead={activeLead} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      {showForm ? <LeadFormModal open onClose={() => setShowForm(false)} /> : null}
      <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  )
}
