import type { LeadTemperature, PipelineStage } from '../types'

export const pipelineStages: Array<{
  id: PipelineStage
  label: string
  shortLabel: string
  color: string
}> = [
  { id: 'new', label: 'Novo Lead', shortLabel: 'Novos', color: 'bg-sky-400' },
  { id: 'contacted', label: 'Primeiro Contato Feito', shortLabel: 'Contato feito', color: 'bg-blue-400' },
  { id: 'waiting', label: 'Aguardando Resposta', shortLabel: 'Aguardando', color: 'bg-indigo-400' },
  { id: 'trial_scheduled', label: 'Aula Experimental Agendada', shortLabel: 'Experimental', color: 'bg-violet-400' },
  { id: 'trial_confirmed', label: 'Aula Confirmada', shortLabel: 'Confirmada', color: 'bg-fuchsia-400' },
  { id: 'attended', label: 'Compareceu à Aula', shortLabel: 'Compareceu', color: 'bg-cyan-400' },
  { id: 'no_show', label: 'Não Compareceu', shortLabel: 'Faltou', color: 'bg-rose-400' },
  { id: 'feedback_pending', label: 'Feedback Pós-Aula Pendente', shortLabel: 'Feedback pendente', color: 'bg-amber-400' },
  { id: 'plan_recommended', label: 'Plano Recomendado', shortLabel: 'Plano indicado', color: 'bg-lime-400' },
  { id: 'negotiation', label: 'Negociação', shortLabel: 'Negociação', color: 'bg-orange-400' },
  { id: 'enrolled', label: 'Matriculado', shortLabel: 'Matriculados', color: 'bg-emerald-400' },
  { id: 'lost', label: 'Perdido', shortLabel: 'Perdidos', color: 'bg-zinc-400' },
  { id: 'reactivation', label: 'Reativação Futura', shortLabel: 'Reativar', color: 'bg-teal-400' },
]

export const temperatureMeta: Record<LeadTemperature, { label: string; className: string }> = {
  cold: { label: 'Frio', className: 'border-sky-500/25 bg-sky-500/10 text-sky-300' },
  warm: { label: 'Morno', className: 'border-amber-500/25 bg-amber-500/10 text-amber-300' },
  hot: { label: 'Quente', className: 'border-rose-500/25 bg-rose-500/10 text-rose-300' },
}

export function stageLabel(stage: PipelineStage): string {
  return pipelineStages.find((item) => item.id === stage)?.label ?? stage
}

export function formatDateTime(value: string): string {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatDate(value: string): string {
  if (!value) return 'Sem data'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function isOverdue(value: string): boolean {
  return Boolean(value) && new Date(value).getTime() < Date.now()
}
