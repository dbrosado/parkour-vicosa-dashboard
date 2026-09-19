import { newId } from '../../lib/id.ts'
import {
  AlertTriangle,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Link2,
  Plus,
  Power,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  UserRound,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { cn } from '../../lib/utils'
import { formatDate, formatDateTime, isOverdue, stageLabel, temperatureMeta } from '../../lib/crm-utils'
import { useStore } from '../../store/useStore'
import {
  whatsappProvider, safeToRetrySend, whatsappLink, messageStatusLabel,
  type WhatsAppConnectionSnapshot,
} from '../../lib/whatsapp-provider'
import type {
  CrmTask,
  CrmTaskPriority,
  CrmTaskType,
  MessageTemplate,
  TrialClass,
  TrialCommercialResult,
  TrialStatus,
} from '../../types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Field, Modal, Select, Textarea } from './crm-common'
import { LeadDetailModal } from './crm-leads'

function localDateTime(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

const taskTypeLabels: Record<CrmTaskType, string> = {
  call: 'Ligar',
  whatsapp: 'Enviar WhatsApp',
  email: 'Enviar e-mail',
  confirm_trial: 'Confirmar aula',
  follow_up: 'Fazer follow-up',
  close_sale: 'Fazer fechamento',
  reactivate: 'Reativar ex-aluno',
  other: 'Outro',
}

export function CrmTasksView() {
  const { crmTasks, crmLeads, addCrmTask, updateCrmTask } = useStore()
  const [filter, setFilter] = useState<'pending' | 'overdue' | 'completed' | 'all'>('pending')
  const [showForm, setShowForm] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const tasks = useMemo(() => crmTasks
    .filter((task) => {
      if (filter === 'all') return true
      if (filter === 'overdue') return task.status === 'pending' && isOverdue(task.dueAt)
      return task.status === filter
    })
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()), [crmTasks, filter])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/30 bg-surface-gradient p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 gap-2 overflow-x-auto">
          {([
            ['pending', 'Pendentes'],
            ['overdue', 'Atrasadas'],
            ['completed', 'Concluídas'],
            ['all', 'Todas'],
          ] as const).map(([id, label]) => (
            <Button key={id} size="sm" variant={filter === id ? 'default' : 'secondary'} onClick={() => setFilter(id)}>{label}</Button>
          ))}
        </div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />Nova tarefa</Button>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => {
          const lead = crmLeads.find((item) => item.id === task.leadId)
          const overdue = task.status === 'pending' && isOverdue(task.dueAt)
          return (
            <Card key={task.id} className={cn('border-border/30', overdue && 'border-rose-500/25 bg-rose-500/[.025]')}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => updateCrmTask({ ...task, status: task.status === 'completed' ? 'pending' : 'completed' })}
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                    task.status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300' : 'border-border/40 text-muted-foreground hover:border-emerald-500/30 hover:text-emerald-300',
                  )}
                >
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setSelectedLeadId(task.leadId)} className="min-w-0 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className={cn('font-display text-sm font-semibold text-white', task.status === 'completed' && 'line-through opacity-55')}>{task.title}</p>
                    <Badge className={task.priority === 'high' ? 'border-rose-500/25 bg-rose-500/10 text-rose-300' : task.priority === 'medium' ? 'border-amber-500/25 bg-amber-500/10 text-amber-300' : 'chip-neutral'}>
                      {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{lead?.studentName ?? 'Sem lead'} · {taskTypeLabels[task.type]}</p>
                </button>
                <div className="text-left sm:text-right">
                  <p className={cn('flex items-center gap-1.5 text-xs sm:justify-end', overdue ? 'font-semibold text-rose-300' : 'text-white/75')}>
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatDateTime(task.dueAt)}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{task.owner}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {showForm ? <TaskFormModal open onClose={() => setShowForm(false)} onAdd={addCrmTask} /> : null}
      <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  )
}

function TaskFormModal({ open, onClose, onAdd }: { open: boolean; onClose: () => void; onAdd: (task: CrmTask) => void }) {
  const leads = useStore((state) => state.crmLeads)
  const [leadId, setLeadId] = useState(leads[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState(() => localDateTime(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()))
  const [type, setType] = useState<CrmTaskType>('follow_up')
  const [priority, setPriority] = useState<CrmTaskPriority>('medium')
  const [notes, setNotes] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !leadId) return
    onAdd({
      id: `task-${newId()}`,
      title: title.trim(),
      leadId,
      owner: 'Danilo',
      dueAt: new Date(dueAt).toISOString(),
      type,
      status: 'pending',
      priority,
      notes,
      createdAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova tarefa" description="Toda tarefa precisa ter dono, prazo e um próximo passo claro.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Lead">
          <Select required value={leadId} onChange={(event) => setLeadId(event.target.value)}>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.studentName}</option>)}
          </Select>
        </Field>
        <Field label="Título"><Input required value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Prazo"><Input type="datetime-local" required value={dueAt} onChange={(event) => setDueAt(event.target.value)} /></Field>
          <Field label="Tipo"><Select value={type} onChange={(event) => setType(event.target.value as CrmTaskType)}>{Object.entries(taskTypeLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</Select></Field>
          <Field label="Prioridade"><Select value={priority} onChange={(event) => setPriority(event.target.value as CrmTaskPriority)}><option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option></Select></Field>
        </div>
        <Field label="Observações"><Textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit">Criar tarefa</Button></div>
      </form>
    </Modal>
  )
}

const trialStatusLabels: Record<TrialStatus, string> = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  attended: 'Compareceu',
  no_show: 'Não compareceu',
  rescheduled: 'Remarcada',
  cancelled: 'Cancelada',
}

export function CrmTrialsView() {
  const { trialClasses, crmLeads, updateTrialClass, convertCrmLeadToStudent } = useStore()
  const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null)
  const selectedTrial = trialClasses.find((item) => item.id === selectedTrialId)

  const sorted = [...trialClasses].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[.07] p-4">
        <p className="flex items-center gap-2 font-display text-sm font-semibold text-amber-200"><AlertTriangle className="h-4 w-4" />Regra de fechamento</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-100/70">Para crianças e adolescentes, confirme que o responsável estará presente nos últimos 10 a 15 minutos. Uma aula realizada sem feedback, plano e pedido de matrícula fica sinalizada como pendente.</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {sorted.map((trial) => {
          const lead = crmLeads.find((item) => item.id === trial.leadId)
          const incompleteClosing = trial.status === 'attended' && (!trial.planPresented || !trial.enrollmentOffered)
          return (
            <button key={trial.id} type="button" onClick={() => setSelectedTrialId(trial.id)} className={cn('rounded-2xl border bg-card/70 p-4 text-left transition hover:border-primary/30', incompleteClosing ? 'border-amber-500/30' : 'border-border/30')}>
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-violet-500/10 px-3 py-2 text-center">
                  <p className="font-display text-lg font-semibold text-violet-300">{trial.time}</p>
                  <p className="text-[10px] text-violet-200/60">{formatDate(trial.date)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-sm font-semibold text-white">{lead?.studentName ?? 'Lead removido'}</p>
                    <Badge variant={trial.status === 'confirmed' || trial.status === 'attended' ? 'success' : trial.status === 'no_show' ? 'danger' : 'secondary'}>{trialStatusLabels[trial.status]}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{trial.className} · {trial.instructor}</p>
                  {incompleteClosing ? <p className="mt-3 text-xs font-semibold text-amber-300">Plano ou pedido de matrícula ainda pendente.</p> : null}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selectedTrial ? (
        <TrialReviewModal
          trial={selectedTrial}
          leadName={crmLeads.find((item) => item.id === selectedTrial.leadId)?.studentName ?? ''}
          onClose={() => setSelectedTrialId(null)}
          onSave={(trial) => {
            updateTrialClass(trial)
            if (trial.commercialResult === 'enrolled') convertCrmLeadToStudent(trial.leadId)
          }}
        />
      ) : null}
    </div>
  )
}

function TrialReviewModal({ trial, leadName, onClose, onSave }: { trial: TrialClass; leadName: string; onClose: () => void; onSave: (trial: TrialClass) => void }) {
  const [draft, setDraft] = useState(trial)
  const setValue = <K extends keyof TrialClass>(key: K, value: TrialClass[K]) => setDraft((current) => ({ ...current, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSave(draft)
    onClose()
  }

  const incomplete = draft.status === 'attended' && (!draft.planPresented || !draft.enrollmentOffered)

  return (
    <Modal open onClose={onClose} title={`Experimental: ${leadName}`} description="Registro rápido para usar logo após a aula." wide>
      <form onSubmit={submit} className="space-y-5">
        {incomplete ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="font-display text-sm font-semibold text-amber-200">A aula experimental ainda não terminou comercialmente.</p>
            <p className="mt-1 text-xs text-amber-100/70">Faça o feedback e apresente o plano recomendado.</p>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Compareceu?">
            <Select value={draft.status} onChange={(event) => setValue('status', event.target.value as TrialStatus)}>
              {Object.entries(trialStatusLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Responsável acompanhou?">
            <Select value={draft.guardianAttendance} onChange={(event) => setValue('guardianAttendance', event.target.value as TrialClass['guardianAttendance'])}>
              <option value="not_applicable">Não se aplica</option><option value="yes">Sim</option><option value="partial">Parcialmente</option><option value="no">Não</option>
            </Select>
          </Field>
          <Field label="Aluno gostou?">
            <Select value={draft.studentLiked === null ? '' : String(draft.studentLiked)} onChange={(event) => setValue('studentLiked', event.target.value === '' ? null : event.target.value === 'true')}>
              <option value="">Ainda não registrado</option><option value="true">Sim</option><option value="false">Não</option>
            </Select>
          </Field>
        </div>
        <Field label="Feedback do professor"><Textarea value={draft.instructorFeedback} onChange={(event) => setValue('instructorFeedback', event.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Pontos fortes"><Textarea value={draft.strengths} onChange={(event) => setValue('strengths', event.target.value)} /></Field>
          <Field label="Pontos a desenvolver"><Textarea value={draft.improvements} onChange={(event) => setValue('improvements', event.target.value)} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Plano recomendado"><Input value={draft.recommendedPlan} onChange={(event) => setValue('recommendedPlan', event.target.value)} /></Field>
          <Field label="Resultado">
            <Select value={draft.commercialResult} onChange={(event) => setValue('commercialResult', event.target.value as TrialCommercialResult)}>
              <option value="pending">Pendente</option><option value="enrolled">Fechou</option><option value="thinking">Vai pensar</option><option value="no_response">Sem resposta</option><option value="not_interested">Não fechou</option><option value="reschedule">Remarcar</option>
            </Select>
          </Field>
          <Field label="Próximo follow-up"><Input type="datetime-local" value={localDateTime(draft.nextFollowUpAt)} onChange={(event) => setValue('nextFollowUpAt', new Date(event.target.value).toISOString())} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-border/30 p-3 text-sm text-white"><input type="checkbox" checked={draft.planPresented} onChange={(event) => setValue('planPresented', event.target.checked)} />O plano foi apresentado?</label>
          <label className="flex items-center gap-3 rounded-xl border border-border/30 p-3 text-sm text-white"><input type="checkbox" checked={draft.enrollmentOffered} onChange={(event) => setValue('enrollmentOffered', event.target.checked)} />A matrícula foi oferecida?</label>
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit">Salvar fechamento</Button></div>
      </form>
    </Modal>
  )
}

export function CrmInboxView() {
  const { crmLeads, crmMessages, messageTemplates } = useStore()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'hot'>('all')
  const [selectedLeadId, setSelectedLeadId] = useState(crmLeads[0]?.id ?? '')
  const [showLead, setShowLead] = useState(false)
  const [content, setContent] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [waConnected, setWaConnected] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const requestKey = useRef({ key: '', id: '' })

  // Detecta a sessão do WhatsApp para alternar entre envio direto e modo manual
  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const status = await whatsappProvider.getStatus()
        if (active) setWaConnected(status.status === 'connected')
      } catch {
        if (active) setWaConnected(false)
      }
    }
    void check()
    const timer = setInterval(check, 15000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [])

  const conversations = useMemo(() => crmLeads.map((lead) => {
    const messages = crmMessages
      .filter((message) => message.leadId === lead.id && message.direction !== 'internal')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return { lead, latest: messages[0], unanswered: messages[0]?.direction === 'incoming' }
  }).filter(({ lead, unanswered }) => {
    const query = search.toLocaleLowerCase('pt-BR')
    const matches = !query || `${lead.studentName} ${lead.guardianName} ${lead.whatsapp}`.toLocaleLowerCase('pt-BR').includes(query)
    return matches && (filter === 'all' || (filter === 'unanswered' && unanswered) || (filter === 'hot' && lead.temperature === 'hot'))
  }).sort((a, b) => new Date(b.latest?.createdAt ?? b.lead.createdAt).getTime() - new Date(a.latest?.createdAt ?? a.lead.createdAt).getTime()), [crmLeads, crmMessages, search, filter])

  const selectedLead = crmLeads.find((lead) => lead.id === selectedLeadId) ?? conversations[0]?.lead
  const messages = selectedLead ? crmMessages
    .filter((message) => message.leadId === selectedLead.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : []

  const fillTemplate = (id: string) => {
    setTemplateId(id)
    const template = messageTemplates.find((item) => item.id === id)
    if (!template || !selectedLead) return
    setContent(template.content
      .replaceAll('[aluno]', selectedLead.studentName)
      .replaceAll('[responsável]', selectedLead.guardianName || selectedLead.studentName)
      .replaceAll('[plano]', selectedLead.recommendedPlan || 'plano recomendado')
      .replaceAll('[horários]', selectedLead.recommendedSchedule || 'horário combinado'))
  }

  const registerSend = async () => {
    if (!selectedLead || !content.trim() || selectedLead.doNotContact || sending) return
    const text = content.trim()

    if (!waConnected) { setSendError('Conecte o WhatsApp para enviar pelo painel ou abra a conversa no celular.'); return }
    const key = `${selectedLead.id}:${text}`
    if (requestKey.current.key !== key) requestKey.current = {key, id: newId()}
    setSending(true)
    setSendError('')
    try {
      const result = await whatsappProvider.sendMessage(selectedLead.id, text, requestKey.current.id)
      if (!['sent', 'delivered', 'read'].includes(result.message.status)) throw new Error(result.message.error || 'Envio não confirmado. Confira o histórico e o celular antes de repetir.')
      requestKey.current = {key: '', id: ''}
      setContent('')
    } catch (error) { if (safeToRetrySend(error)) requestKey.current = {key: '', id: ''}; setSendError(error instanceof Error ? error.message : 'Não foi possível enviar. O texto foi preservado.') }
    finally { setSending(false) }
    setTemplateId('')
  }

  return (
    <div className="grid min-h-[68vh] overflow-hidden rounded-2xl border border-border/30 bg-card/60 lg:grid-cols-[340px_1fr]">
      <div className="border-b border-border/30 lg:border-b-0 lg:border-r">
        <div className="space-y-2 border-b border-border/30 p-3">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar conversa..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <div className="flex gap-1.5 overflow-x-auto">
            <Button size="sm" variant={filter === 'all' ? 'default' : 'secondary'} onClick={() => setFilter('all')}>Todas</Button>
            <Button size="sm" variant={filter === 'unanswered' ? 'default' : 'secondary'} onClick={() => setFilter('unanswered')}>Não respondidas</Button>
            <Button size="sm" variant={filter === 'hot' ? 'default' : 'secondary'} onClick={() => setFilter('hot')}>Quentes</Button>
          </div>
        </div>
        <div className="max-h-[300px] overflow-y-auto lg:max-h-[62vh]">
          {conversations.map(({ lead, latest, unanswered }) => (
            <button key={lead.id} type="button" onClick={() => setSelectedLeadId(lead.id)} className={cn('flex w-full gap-3 border-b border-border/20 p-3 text-left hover:bg-white/[.03]', selectedLead?.id === lead.id && 'bg-primary/[.07]')}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">{lead.studentName.slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-semibold text-white">{lead.guardianName || lead.studentName}</p>{unanswered ? <span className="h-2 w-2 rounded-full bg-emerald-400" /> : null}</div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{latest?.content ?? 'Sem mensagens'}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{stageLabel(lead.stage)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedLead ? (
        <div className="flex min-h-[520px] flex-col">
          <div className="flex items-center gap-3 border-b border-border/30 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300"><UserRound className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1"><p className="font-display text-sm font-semibold text-white">{selectedLead.guardianName || selectedLead.studentName}</p><p className="truncate text-[11px] text-muted-foreground">{selectedLead.studentName} · {selectedLead.whatsapp}</p></div>
            <Badge className={temperatureMeta[selectedLead.temperature].className}>{temperatureMeta[selectedLead.temperature].label}</Badge>
            <Button size="sm" variant="secondary" onClick={() => setShowLead(true)}>Abrir ficha</Button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto bg-black/10 p-4">
            {messages.map((message) => (
              <div key={message.id} className={cn('max-w-[85%] rounded-2xl px-3 py-2.5 text-sm', message.direction === 'incoming' ? 'mr-auto bg-white/[.07]' : message.direction === 'internal' ? 'mx-auto border border-amber-500/20 bg-amber-500/10 text-amber-100' : 'ml-auto bg-emerald-500/15 text-emerald-50')}>
                <p>{message.content}</p>
                <p className="mt-1 text-[10px] opacity-55">
                  {formatDateTime(message.createdAt)}
                  <span className="ml-1.5">· {messageStatusLabel[message.status] || message.status}</span>{message.error && <span> · {message.error}</span>}
                </p>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-border/30 p-3">
            {selectedLead.doNotContact ? <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-2 text-xs text-rose-200">Este lead está marcado como “não contactar”.</p> : null}
            <p role="alert" className="text-xs text-rose-300">{sendError}</p>
            <div className="grid gap-2 sm:grid-cols-[220px_1fr]">
              <Select value={templateId} onChange={(event) => fillTemplate(event.target.value)}><option value="">Usar template...</option>{messageTemplates.filter((item) => item.active).map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</Select>
              <div className="flex gap-2"><Input value={content} onChange={(event) => setContent(event.target.value)} placeholder={waConnected ? 'Escreva e envie direto pelo painel...' : 'Escreva a resposta...'} onKeyDown={(event) => { if (event.key === 'Enter') void registerSend() }} /><Button size="icon" onClick={() => void registerSend()} aria-label="Enviar mensagem" disabled={selectedLead.doNotContact || sending || !waConnected || !content.trim()}>{sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button></div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className={cn('inline-flex items-center gap-1.5 text-[11px]', waConnected ? 'text-emerald-300' : 'text-muted-foreground')}>
                {waConnected ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                {waConnected ? 'WhatsApp conectado — envio direto pelo painel' : 'Desconectado — conecte o WhatsApp para enviar pelo painel'}
              </span>
              <a href={whatsappLink(selectedLead.whatsapp, content)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200">Abrir conversa no WhatsApp <ExternalLink className="h-3.5 w-3.5" /></a>
            </div>
          </div>
        </div>
      ) : <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">Selecione uma conversa.</div>}

      <LeadDetailModal leadId={showLead ? selectedLead?.id ?? null : null} onClose={() => setShowLead(false)} />
    </div>
  )
}

export function CrmTemplatesView() {
  const { messageTemplates, addMessageTemplate, updateMessageTemplate } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<MessageTemplate | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-border/30 bg-surface-gradient p-4">
        <div><p className="font-display text-sm font-semibold text-white">Biblioteca de mensagens</p><p className="mt-1 text-xs text-muted-foreground">Revise o texto antes de enviar. No MVP, automações ficam como sugestões manuais.</p></div>
        <Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />Novo template</Button>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {messageTemplates.map((template) => (
          <Card key={template.id} className="border-border/30">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div><CardTitle className="text-base">{template.name}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{template.category} · {template.channel}</p></div>
                <Badge variant={template.active ? 'success' : 'secondary'}>{template.active ? 'Ativo' : 'Inativo'}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="rounded-xl border border-border/25 bg-black/10 p-3 text-sm leading-relaxed text-white/75">{template.content}</p>
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(template.content)}><Copy className="mr-1.5 h-4 w-4" />Copiar</Button>
                <Button size="sm" variant="secondary" onClick={() => setSelected(template)}>Editar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {(showForm || selected) ? <TemplateFormModal initial={selected} onClose={() => { setShowForm(false); setSelected(null) }} onAdd={addMessageTemplate} onUpdate={updateMessageTemplate} /> : null}
    </div>
  )
}

function TemplateFormModal({ initial, onClose, onAdd, onUpdate }: { initial: MessageTemplate | null; onClose: () => void; onAdd: (template: MessageTemplate) => void; onUpdate: (template: MessageTemplate) => void }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? 'Atendimento')
  const [content, setContent] = useState(initial?.content ?? '')
  const [active, setActive] = useState(initial?.active ?? true)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const template: MessageTemplate = { id: initial?.id ?? `template-${newId()}`, name, category, content, active, channel: 'whatsapp' }
    if (initial) onUpdate(template)
    else onAdd(template)
    onClose()
  }
  return (
    <Modal open onClose={onClose} title={initial ? 'Editar template' : 'Novo template'}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Nome"><Input required value={name} onChange={(event) => setName(event.target.value)} /></Field><Field label="Categoria"><Input value={category} onChange={(event) => setCategory(event.target.value)} /></Field></div>
        <Field label="Mensagem" hint="Use [aluno], [responsável], [plano] e [horários] como variáveis."><Textarea className="min-h-40" required value={content} onChange={(event) => setContent(event.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm text-white"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Template ativo</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit">Salvar template</Button></div>
      </form>
    </Modal>
  )
}

const statusMeta: Record<WhatsAppConnectionSnapshot['status'], { label: string; className: string; icon: typeof Wifi }> = {
  disconnected: { label: 'Desconectado', className: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/25', icon: WifiOff },
  waiting_qr: { label: 'Aguardando QR Code', className: 'text-amber-300 bg-amber-500/10 border-amber-500/25', icon: QrCode },
  connecting: { label: 'Conectando', className: 'text-sky-300 bg-sky-500/10 border-sky-500/25', icon: RefreshCw },
  connected: { label: 'Conectado', className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/25', icon: Wifi },
  error: { label: 'Erro de conexão', className: 'text-rose-300 bg-rose-500/10 border-rose-500/25', icon: AlertTriangle },
}

export function CrmWhatsAppView() {
  const [snapshot, setSnapshot] = useState<WhatsAppConnectionSnapshot>({ status: 'disconnected' })
  const [loading, setLoading] = useState(false)

  const requestVersion = useRef(0)
  const actionPending = useRef(false)

  const runAction = async (action: () => Promise<WhatsAppConnectionSnapshot>) => {
    const version = ++requestVersion.current
    actionPending.current = true
    setLoading(true)
    try {
      const result = await action()
      if (version === requestVersion.current) setSnapshot(result)
    } catch (error) {
      if (version === requestVersion.current) setSnapshot({ status: 'error', error: error instanceof Error ? error.message : 'O serviço não respondeu. Verifique a conexão e tente novamente.' })
    } finally {
      actionPending.current = false
      setLoading(false)
    }
  }
  const refresh = () => runAction(() => whatsappProvider.getStatus())

  useEffect(() => {
    let stopped = false
    const versions = requestVersion
    let timer: ReturnType<typeof setTimeout>
    const poll = async () => {
      if (!actionPending.current) {
        const version = ++requestVersion.current
        try {
          const result = await whatsappProvider.getStatus()
          if (!stopped && version === requestVersion.current) setSnapshot(result)
        } catch {
          if (!stopped && version === requestVersion.current) setSnapshot({ status: 'error', error: 'Sem comunicação com o servidor. Tentando novamente…' })
        }
      }
      if (!stopped) timer = setTimeout(poll, 2000)
    }
    void poll()
    return () => { stopped = true; clearTimeout(timer); ++versions.current }
  }, [])

  useEffect(() => {
    if (snapshot.status !== 'waiting_qr' || !snapshot.qrExpiresAt) return
    const expiresAt = snapshot.qrExpiresAt
    const timer = setTimeout(() => setSnapshot(current => current.qrExpiresAt === expiresAt
      ? { status: 'connecting', error: 'Aguardando a renovação do QR Code…' } : current), Math.max(0, Date.parse(expiresAt) - Date.now()))
    return () => clearTimeout(timer)
  }, [snapshot.status, snapshot.qrExpiresAt])

  const connect = () => {
    setSnapshot({ status: 'connecting' })
    return runAction(() => whatsappProvider.connect())
  }
  const disconnect = () => runAction(async () => {
    await whatsappProvider.disconnect()
    return { status: 'disconnected' }
  })
  const reset = () => {
    setSnapshot({ status: 'connecting' })
    return runAction(async () => {
      await whatsappProvider.disconnect()
      return whatsappProvider.connect()
    })
  }
  const hasQr = snapshot.status === 'waiting_qr' && snapshot.qrCodeDataUrl && snapshot.qrExpiresAt && Date.parse(snapshot.qrExpiresAt) > Date.now()
  const busy = snapshot.status === 'connecting' || snapshot.status === 'waiting_qr'

  const meta = statusMeta[snapshot.status]
  const StatusIcon = meta.icon

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_.9fr]">
      <Card className="border-border/30">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg"><Smartphone className="h-5 w-5 text-emerald-400" />Conectar WhatsApp</CardTitle>
            <Badge className={meta.className}><StatusIcon className={cn('mr-1.5 h-3.5 w-3.5', loading && 'animate-spin')} />{meta.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasQr ? (
            <div className="mx-auto max-w-xs rounded-3xl bg-white p-5"><img src={snapshot.qrCodeDataUrl} alt="QR Code para conectar WhatsApp" className="w-full" /></div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-border/40 bg-black/10 p-8 text-center">
              {snapshot.status === 'connected' ? <Wifi className="h-12 w-12 text-emerald-400" /> : busy ? <RefreshCw className="h-12 w-12 animate-spin text-sky-400" /> : <WifiOff className="h-12 w-12 text-muted-foreground" />}
              <p className="mt-4 font-display text-sm font-semibold text-white">{snapshot.status === 'connected' ? 'WhatsApp conectado' : busy ? 'Aguardando o WhatsApp…' : 'Nenhum QR Code disponível'}</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{snapshot.status === 'connected' ? 'Abra a Inbox WhatsApp para atender seus clientes.' : busy ? 'O código aparecerá aqui assim que o WhatsApp responder. Depois de escanear, aguarde a confirmação da conexão.' : 'Clique em Gerar QR Code. Se a sessão estiver com erro, use Reiniciar sessão.'}</p>
            </div>
          )}
          {hasQr ? <p className="text-center text-xs text-muted-foreground">Escaneie com seu WhatsApp em Dispositivos conectados. O código é renovado automaticamente.</p> : null}
          {snapshot.status === 'connected' && snapshot.phoneNumber ? <p className="text-center text-sm text-white">Número conectado: <strong>{snapshot.phoneNumber}</strong></p> : null}
          {snapshot.error ? <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200">{snapshot.error}</p> : null}
          <div className="flex flex-wrap justify-center gap-2">
            {snapshot.status !== 'connected' && <Button onClick={connect} disabled={loading || busy}><Smartphone className="mr-2 h-4 w-4" />Gerar QR Code</Button>}
            {(snapshot.status === 'connected' || busy) && <Button variant="destructive" onClick={disconnect} disabled={loading}><Power className="mr-2 h-4 w-4" />{snapshot.status === 'connected' ? 'Desconectar' : 'Cancelar conexão'}</Button>}
            {!busy && snapshot.status !== 'connected' && <Button variant="secondary" onClick={reset} disabled={loading}>Reiniciar sessão</Button>}
            <Button variant="secondary" onClick={refresh} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Atualizar status</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-emerald-500/15 bg-emerald-500/[.025]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4 text-emerald-400" />Como conectar</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-white/75">
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>1. Clique em <strong className="text-white/80">Gerar QR Code</strong> e aguarde o código aparecer (o servidor sobe junto com o painel, nada para instalar ou rodar à parte).</p>
              <p>2. No celular: WhatsApp → Configurações → Dispositivos conectados → Conectar dispositivo, e aponte a câmera para o QR.</p>
              <p>3. A sessão fica salva neste computador — nas próximas vezes conecta sozinho, sem QR.</p>
              <p>4. Se aparecer erro de sessão, clique em Reiniciar sessão e escaneie o novo código. Mantenha o celular com internet até aparecer Conectado.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/30">
          <CardHeader><CardTitle className="text-base">Como funciona</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>A conexão usa o Baileys, uma integração não oficial com o WhatsApp Web. As mensagens passam pelo WhatsApp e ficam registradas no servidor da academia. O servidor precisa continuar ligado e com internet.</p>
            <p>Com a sessão conectada, a Inbox envia as mensagens direto pelo painel. Sem conexão, ela continua no modo manual com histórico, templates e abertura pelo <code>wa.me</code>.</p>
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/80">Use com moderação: envios em massa podem levar o WhatsApp a restringir o número. Prefira mensagens individuais para leads que iniciaram contato.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
