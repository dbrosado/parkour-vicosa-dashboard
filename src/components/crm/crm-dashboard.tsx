import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Flame,
  MessageCircle,
  Plus,
  Target,
  TrendingUp,
  UserPlus,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { cn } from '../../lib/utils'
import {
  formatCurrency,
  formatDateTime,
  isOverdue,
  stageLabel,
  temperatureMeta,
} from '../../lib/crm-utils'
import { useStore } from '../../store/useStore'
import type { AppSection } from '../../types'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { LeadDetailModal } from './crm-leads'

function isToday(value: string): boolean {
  const date = new Date(value)
  const now = new Date()
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
}

export function CrmDashboardView({
  onNavigate,
}: {
  onNavigate: (section: AppSection) => void
}) {
  const { crmLeads, crmTasks, trialClasses, crmMessages, crmOpportunities } = useStore()
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const metrics = useMemo(() => {
    const pendingTasks = crmTasks.filter((task) => task.status === 'pending')
    const overdueTasks = pendingTasks.filter((task) => isOverdue(task.dueAt))
    const todayTrials = trialClasses.filter((trial) => isToday(`${trial.date}T${trial.time}:00`))
    const enrolled = crmLeads.filter((lead) => lead.stage === 'enrolled')
    const activeBase = crmLeads.filter((lead) => lead.stage !== 'lost' && lead.stage !== 'reactivation')
    const conversion = activeBase.length ? (enrolled.length / activeBase.length) * 100 : 0
    const openRevenue = crmOpportunities
      .filter((item) => item.status === 'open')
      .reduce((sum, item) => sum + item.value, 0)
    const closedRevenue = crmOpportunities
      .filter((item) => item.status === 'won')
      .reduce((sum, item) => sum + item.value, 0)
    const unanswered = crmLeads.filter((lead) => {
      const latest = crmMessages
        .filter((message) => message.leadId === lead.id && message.direction !== 'internal')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      return latest?.direction === 'incoming'
    }).length
    return {
      newLeads: crmLeads.filter((lead) => lead.stage === 'new').length,
      todayTrials,
      overdueTasks,
      unanswered,
      hotLeads: crmLeads.filter((lead) => lead.temperature === 'hot' && !['enrolled', 'lost'].includes(lead.stage)),
      enrolled: enrolled.length,
      conversion,
      openRevenue,
      closedRevenue,
    }
  }, [crmLeads, crmTasks, trialClasses, crmMessages, crmOpportunities])

  const funnel = [
    { label: 'Leads', value: crmLeads.length, color: 'bg-sky-500' },
    { label: 'Experimentais agendadas', value: crmLeads.filter((lead) => ['trial_scheduled', 'trial_confirmed', 'attended', 'feedback_pending', 'plan_recommended', 'negotiation', 'enrolled'].includes(lead.stage)).length, color: 'bg-violet-500' },
    { label: 'Compareceram', value: crmLeads.filter((lead) => ['attended', 'feedback_pending', 'plan_recommended', 'negotiation', 'enrolled'].includes(lead.stage)).length, color: 'bg-cyan-500' },
    { label: 'Matrículas', value: metrics.enrolled, color: 'bg-emerald-500' },
  ]

  const maxFunnel = Math.max(...funnel.map((item) => item.value), 1)

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-primary/20 bg-hero-grid">
        <CardContent className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
          <div>
            <Badge className="mb-3 border-emerald-500/25 bg-emerald-500/10 text-emerald-300">CRM comercial ativo</Badge>
            <h2 className="max-w-2xl font-display text-xl font-semibold leading-tight text-white sm:text-2xl">
              A aula experimental termina quando a família entende o valor e decide o próximo passo.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
              Hoje o foco é responder rápido, garantir a presença do responsável e não deixar nenhum feedback sem fechamento.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => onNavigate('crm-leads')}><Plus className="mr-2 h-4 w-4" />Novo lead</Button>
            <Button variant="secondary" onClick={() => onNavigate('crm-trials')}><CalendarCheck2 className="mr-2 h-4 w-4" />Agendar aula</Button>
            <Button variant="secondary" onClick={() => onNavigate('crm-inbox')}><MessageCircle className="mr-2 h-4 w-4" />Abrir Inbox</Button>
            <Button variant="outline" onClick={() => onNavigate('crm-pipeline')}><Target className="mr-2 h-4 w-4" />Ver pipeline</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={UserPlus} label="Leads novos" value={metrics.newLeads} detail="aguardando primeiro contato" tone="blue" />
        <MetricCard icon={CalendarCheck2} label="Experimentais hoje" value={metrics.todayTrials.length} detail={`${metrics.todayTrials.filter((trial) => trial.status === 'confirmed').length} confirmadas`} tone="violet" />
        <MetricCard icon={Clock3} label="Follow-ups vencidos" value={metrics.overdueTasks.length} detail="pedem ação agora" tone="rose" />
        <MetricCard icon={MessageCircle} label="Não respondidas" value={metrics.unanswered} detail="última mensagem do lead" tone="amber" />
        <MetricCard icon={Flame} label="Leads quentes" value={metrics.hotLeads.length} detail="com chance de fechar" tone="rose" />
        <MetricCard icon={CheckCircle2} label="Matrículas" value={metrics.enrolled} detail="na base comercial" tone="green" />
        <MetricCard icon={TrendingUp} label="Conversão" value={`${metrics.conversion.toFixed(1)}%`} detail="lead para matrícula" tone="blue" />
        <MetricCard icon={CircleDollarSign} label="Receita fechada" value={formatCurrency(metrics.closedRevenue)} detail={`${formatCurrency(metrics.openRevenue)} em aberto`} tone="green" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
        <Card className="border-border/30">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Funil de conversão</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('crm-reports')}>Relatório <ArrowRight className="ml-1 h-4 w-4" /></Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {funnel.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-white/75">{item.label}</span>
                  <span className="font-semibold text-white">{item.value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/[.05]">
                  <div className={cn('h-full rounded-full', item.color)} style={{ width: `${Math.max(6, (item.value / maxFunnel) * 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4 text-amber-400" />Ações atrasadas</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('crm-tasks')}>Ver tarefas</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.overdueTasks.slice(0, 5).map((task) => {
              const lead = crmLeads.find((item) => item.id === task.leadId)
              return (
                <button key={task.id} type="button" onClick={() => setSelectedLeadId(task.leadId)} className="flex w-full items-center gap-3 rounded-xl border border-rose-500/15 bg-rose-500/[.04] p-3 text-left hover:border-rose-500/30">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-rose-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-white">{task.title}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{lead?.studentName} · {formatDateTime(task.dueAt)}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )
            })}
            {metrics.overdueTasks.length === 0 ? <p className="rounded-xl border border-dashed border-border/30 p-6 text-center text-xs text-muted-foreground">Tudo em dia por aqui.</p> : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/30">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><Flame className="h-4 w-4 text-rose-400" />Leads quentes</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => onNavigate('crm-leads')}>Ver todos</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {metrics.hotLeads.map((lead) => (
              <button key={lead.id} type="button" onClick={() => setSelectedLeadId(lead.id)} className="flex w-full items-center gap-3 rounded-xl border border-border/25 p-3 text-left hover:border-primary/30">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/10 text-xs font-bold text-rose-300">{lead.studentName.slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{lead.studentName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{stageLabel(lead.stage)} · {lead.nextAction}</p>
                </div>
                <Badge className={temperatureMeta[lead.temperature].className}>Quente</Badge>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><CalendarCheck2 className="h-4 w-4 text-violet-400" />Experimentais de hoje</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {metrics.todayTrials.map((trial) => {
              const lead = crmLeads.find((item) => item.id === trial.leadId)
              return (
                <button key={trial.id} type="button" onClick={() => setSelectedLeadId(trial.leadId)} className="flex w-full items-center gap-3 rounded-xl border border-border/25 p-3 text-left hover:border-primary/30">
                  <div className="rounded-lg bg-violet-500/10 px-2.5 py-2 text-xs font-bold text-violet-300">{trial.time}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{lead?.studentName ?? 'Lead removido'}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{trial.className} · {trial.instructor}</p>
                  </div>
                  <Badge variant={trial.status === 'confirmed' ? 'success' : 'secondary'}>{trial.status === 'confirmed' ? 'Confirmada' : 'Agendada'}</Badge>
                </button>
              )
            })}
            {metrics.todayTrials.length === 0 ? <p className="rounded-xl border border-dashed border-border/30 p-6 text-center text-xs text-muted-foreground">Nenhuma experimental hoje.</p> : null}
          </CardContent>
        </Card>
      </div>

      <LeadDetailModal leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  )
}

const toneClasses = {
  blue: 'bg-sky-500/10 text-sky-300',
  violet: 'bg-violet-500/10 text-violet-300',
  rose: 'bg-rose-500/10 text-rose-300',
  amber: 'bg-amber-500/10 text-amber-300',
  green: 'bg-emerald-500/10 text-emerald-300',
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Users
  label: string
  value: number | string
  detail: string
  tone: keyof typeof toneClasses
}) {
  return (
    <Card className="border-border/30">
      <CardContent className="p-4">
        <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', toneClasses[tone])}><Icon className="h-4 w-4" /></div>
        <p className="font-display text-xl font-semibold text-white">{value}</p>
        <p className="mt-0.5 text-xs font-medium text-white/75">{label}</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

export function CrmReportsView() {
  const { crmLeads, trialClasses, crmOpportunities } = useStore()

  const sourceRows = useMemo(() => {
    const counts = new Map<string, number>()
    crmLeads.forEach((lead) => counts.set(lead.source, (counts.get(lead.source) ?? 0) + 1))
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  }, [crmLeads])

  const scheduled = trialClasses.length
  const attended = trialClasses.filter((trial) => trial.status === 'attended').length
  const feedback = trialClasses.filter((trial) => trial.instructorFeedback.trim()).length
  const planPresented = trialClasses.filter((trial) => trial.planPresented).length
  const offered = trialClasses.filter((trial) => trial.enrollmentOffered).length
  const enrolled = crmLeads.filter((lead) => lead.stage === 'enrolled').length
  const wonRevenue = crmOpportunities.filter((item) => item.status === 'won').reduce((sum, item) => sum + item.value, 0)
  const maxSource = Math.max(...sourceRows.map(([, count]) => count), 1)

  const conversions = [
    { label: 'Lead → aula agendada', value: crmLeads.length ? (scheduled / crmLeads.length) * 100 : 0 },
    { label: 'Agendada → comparecimento', value: scheduled ? (attended / scheduled) * 100 : 0 },
    { label: 'Comparecimento → matrícula', value: attended ? (enrolled / attended) * 100 : 0 },
    { label: 'Lead → matrícula', value: crmLeads.length ? (enrolled / crmLeads.length) * 100 : 0 },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={Users} label="Leads totais" value={crmLeads.length} detail="base comercial" tone="blue" />
        <MetricCard icon={CalendarCheck2} label="Comparecimentos" value={attended} detail={`${scheduled} aulas agendadas`} tone="violet" />
        <MetricCard icon={CheckCircle2} label="Matrículas" value={enrolled} detail="conversões registradas" tone="green" />
        <MetricCard icon={CircleDollarSign} label="Receita ganha" value={formatCurrency(wonRevenue)} detail="oportunidades fechadas" tone="green" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/30">
          <CardHeader><CardTitle className="text-base">Taxas de conversão</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {conversions.map((item) => (
              <div key={item.label}>
                <div className="mb-1.5 flex justify-between text-xs"><span className="text-white/75">{item.label}</span><span className="font-semibold text-white">{item.value.toFixed(1)}%</span></div>
                <div className="h-2.5 rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400" style={{ width: `${Math.min(item.value, 100)}%` }} /></div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/30">
          <CardHeader><CardTitle className="text-base">Origem dos leads</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {sourceRows.map(([source, count]) => (
              <div key={source} className="grid grid-cols-[110px_1fr_24px] items-center gap-2 text-xs">
                <span className="truncate text-white/70">{source}</span>
                <div className="h-2 rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-sky-500" style={{ width: `${(count / maxSource) * 100}%` }} /></div>
                <span className="text-right font-semibold text-white">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/30">
        <CardHeader>
          <CardTitle className="text-base">Disciplina comercial das experimentais</CardTitle>
          <p className="text-xs text-muted-foreground">O ponto crítico não é só a presença. É concluir feedback, recomendação e pedido de matrícula.</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <DisciplineCard label="Com feedback" value={feedback} total={attended} />
          <DisciplineCard label="Com plano recomendado" value={planPresented} total={attended} />
          <DisciplineCard label="Com pedido de matrícula" value={offered} total={attended} />
          <DisciplineCard label="Sem follow-up" value={trialClasses.filter((trial) => trial.status === 'attended' && !trial.nextFollowUpAt).length} total={attended} danger />
        </CardContent>
      </Card>
    </div>
  )
}

function DisciplineCard({ label, value, total, danger = false }: { label: string; value: number; total: number; danger?: boolean }) {
  const percent = total ? (value / total) * 100 : 0
  return (
    <div className={cn('rounded-2xl border p-4', danger ? 'border-rose-500/20 bg-rose-500/[.04]' : 'border-border/30 bg-white/[.02]')}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-white">{value}<span className="text-sm font-normal text-muted-foreground">/{total}</span></p>
      <p className={cn('mt-1 text-xs', danger ? 'text-rose-300' : 'text-emerald-300')}>{percent.toFixed(0)}%</p>
    </div>
  )
}
