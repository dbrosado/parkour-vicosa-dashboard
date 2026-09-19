import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react'

import { BirthdayView } from './components/birthday-view'
import { DailyView } from './components/daily-view'
import { WeeklyView } from './components/weekly-view'
import { EventsBoard } from './components/events-board'
import { FinanceView } from './components/finance-view'
import { InstructorView } from './components/instructor-view'
import { LoginPage } from './components/login-page'
import { ProgressView } from './components/progress-view'
import { ReportsView } from './components/reports-view'
import { SettingsView } from './components/settings-view'
import { MobileBottomNav, MobileTopBar, Sidebar } from './components/sidebar'
import { StudentsTable } from './components/students-table'
import { CrmDashboardView, CrmReportsView } from './components/crm/crm-dashboard'
import { CrmLeadsView, CrmPipelineView } from './components/crm/crm-leads'
import {
  CrmInboxView,
  CrmTasksView,
  CrmTemplatesView,
  CrmTrialsView,
  CrmWhatsAppView,
} from './components/crm/crm-operations'
import { useAuth } from './lib/auth'
import { useDataSync } from './lib/data-sync'
import { Button } from './components/ui/button'
import { useStore } from './store/useStore'
import { type AppSection } from './types'

const sectionCopy: Record<AppSection, { title: string; subtitle: string }> = {
  'crm-dashboard': {
    title: 'Central Comercial',
    subtitle: 'Prioridades de hoje, conversão e disciplina de follow-up.',
  },
  'crm-leads': {
    title: 'Leads',
    subtitle: 'Todos os contatos, dados, tags e próximos passos em um só lugar.',
  },
  'crm-pipeline': {
    title: 'Pipeline de Vendas',
    subtitle: 'Mova cada família até a aula experimental, fechamento e matrícula.',
  },
  'crm-inbox': {
    title: 'Inbox WhatsApp',
    subtitle: 'Conversa, templates e histórico comercial ligado ao lead.',
  },
  'crm-trials': {
    title: 'Aulas Experimentais',
    subtitle: 'Presença, feedback, plano recomendado e pedido de matrícula.',
  },
  'crm-tasks': {
    title: 'Tarefas & Follow-ups',
    subtitle: 'Nada fica na memória: cada contato tem dono, prazo e próxima ação.',
  },
  'crm-templates': {
    title: 'Templates de Mensagens',
    subtitle: 'Scripts humanos para atendimento, confirmação, fechamento e recuperação.',
  },
  'crm-whatsapp': {
    title: 'Conectar WhatsApp',
    subtitle: 'Status da sessão e conexão modular por QR Code.',
  },
  'crm-reports': {
    title: 'Relatórios Comerciais',
    subtitle: 'Conversão, origem dos leads e disciplina no fechamento das experimentais.',
  },
  daily: {
    title: 'Operação do Dia',
    subtitle: 'Check-ins rápidos e remanejamento de turmas em drag-and-drop.',
  },
  weekly: {
    title: 'Visão Semanal',
    subtitle: 'Planejamento de ocupação e grade de horários da academia.',
  },
  students: {
    title: 'CRM de Alunos',
    subtitle: 'Cadastro completo com busca de alto desempenho.',
  },
  instructors: {
    title: 'Professores & Equipe',
    subtitle: 'Escala de horários, carga horária e gestão de funções.',
  },
  progress: {
    title: 'Check-up do Traceur',
    subtitle: 'Avaliação física, condicionamento Big Six e árvore de habilidades.',
  },
  events: {
    title: 'Pipeline de Eventos',
    subtitle: 'Kanban de execução com calendário mensal e datas confirmadas.',
  },
  finance: {
    title: 'Controle Financeiro',
    subtitle: 'Gestão de mensalidades, cobranças e formas de pagamento.',
  },
  reports: {
    title: 'Relatórios & Análises',
    subtitle: 'Visão geral, financeiro, evolução dos alunos e impressão de relatórios.',
  },
  birthdays: {
    title: 'Aniversariantes',
    subtitle: 'Alunos que fazem aniversário neste mês e nos próximos.',
  },
  settings: {
    title: 'Preferências Gerais',
    subtitle: 'Sua conta, acesso da equipe e backup do servidor.',
  },
}

function Dashboard() {
  const { user, loading, signOut } = useAuth()
  const sync = useDataSync(Boolean(user), user?.id)
  const [requestedSection, setRequestedSection] = useState<AppSection>('crm-dashboard')
  const trainerSections: AppSection[] = ['daily', 'weekly', 'progress', 'settings']
  const activeSection = user?.role === 'trainer' && !trainerSections.includes(requestedSection) ? 'daily' : requestedSection
  const setActiveSection = (section: AppSection) => { if (user?.role === 'admin' || trainerSections.includes(section)) setRequestedSection(section) }
  const { students, instructors, addStudent, updateStudent, setInstructors } = useStore()

  const copy = useMemo(() => sectionCopy[activeSection] || sectionCopy.daily, [activeSection])

  if (loading || !user) {
    return <LoginPage />
  }

  if (!sync.ready) return (
    <div className="flex min-h-screen items-center justify-center px-4"><div className="w-full max-w-lg space-y-4 rounded-2xl border border-border/30 bg-surface/70 p-6"><h1 className="font-display text-xl">Abrindo os dados da academia</h1><p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">{sync.status === 'connecting' && <Loader2 className="h-4 w-4 animate-spin" />}{sync.error || 'Aguarde a resposta do servidor.'}</p><div className="flex gap-2"><Button onClick={() => void sync.retry()} disabled={sync.status === 'connecting'}>Tentar novamente</Button><Button variant="outline" onClick={() => void signOut()}>Sair</Button></div></div></div>
  )

  const blocked = sync.status === 'offline' || sync.status === 'error' || sync.status === 'connecting'
  const downloadPending = () => {
    const url = URL.createObjectURL(new Blob([useStore.getState().exportBackup()], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = `alteracoes-pendentes-${new Date().toISOString().slice(0, 10)}.json`; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const renderSection = () => {
    switch (activeSection) {
      case 'crm-dashboard':
        return <CrmDashboardView onNavigate={setActiveSection} />
      case 'crm-leads':
        return <CrmLeadsView />
      case 'crm-pipeline':
        return <CrmPipelineView />
      case 'crm-inbox':
        return <CrmInboxView />
      case 'crm-trials':
        return <CrmTrialsView />
      case 'crm-tasks':
        return <CrmTasksView />
      case 'crm-templates':
        return <CrmTemplatesView />
      case 'crm-whatsapp':
        return <CrmWhatsAppView />
      case 'crm-reports':
        return <CrmReportsView />
      case 'daily':
        return <DailyView key={students.length} />
      case 'weekly':
        return <WeeklyView onOpenDaily={() => setActiveSection('daily')} />
      case 'students':
        return <StudentsTable students={students} onAddStudent={addStudent} onUpdateStudent={updateStudent} />
      case 'instructors':
        return <InstructorView instructors={instructors} onUpdateInstructors={setInstructors} />
      case 'progress':
        return <ProgressView students={students} onUpdateStudent={updateStudent} />
      case 'events':
        return <EventsBoard />
      case 'finance':
        return <FinanceView students={students} onUpdateStudent={updateStudent} />
      case 'reports':
        return <ReportsView />
      case 'birthdays':
        return <BirthdayView students={students} />
      case 'settings':
        return <SettingsView canBackup={sync.status === 'synced'} />
      default:
        return <SettingsView canBackup={sync.status === 'synced'} />
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      <MobileTopBar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="mx-auto flex w-full max-w-[1800px] gap-0 lg:min-h-screen">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

        <main className="w-full flex-1 px-3 pb-24 pt-3 sm:px-5 lg:p-8 lg:pb-8">
          <div role={blocked ? 'alert' : 'status'} className={`mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm ${blocked ? 'border-amber-500/40 bg-amber-500/10 text-amber-200' : 'border-border/25 bg-surface/40 text-muted-foreground'}`}><div className="flex items-start gap-2">{sync.status === 'saving' ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" /> : blocked ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />}<div><p>{sync.status === 'saving' ? 'Salvando no servidor — aguarde antes de sair.' : blocked ? 'Edições pausadas até confirmar o salvamento no servidor.' : 'Dados salvos no servidor'}</p>{sync.error && <p className="mt-1 text-xs">{sync.error}</p>}</div></div>{blocked && <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" className="gap-2" onClick={() => void sync.retry()}><RefreshCw className="h-4 w-4" />Tentar novamente</Button>{user.role === 'admin' && <Button size="sm" variant="outline" className="gap-2" onClick={downloadPending}><Download className="h-4 w-4" />Salvar cópia pendente</Button>}<Button size="sm" variant="outline" onClick={() => { if (window.confirm('Recarregar os dados do servidor? As alterações ainda não salvas deste aparelho serão descartadas. Salve uma cópia pendente antes, se necessário.')) void sync.refresh() }}>Recarregar do servidor</Button></div>}</div>
          {/* Section Header */}
          <div className="animate-mount mb-4 rounded-2xl border border-border/20 bg-surface-gradient p-4 shadow-soft-sm sm:p-5 lg:mb-5">
            <h1 className="font-display text-lg font-semibold text-white sm:text-xl lg:text-2xl">{copy.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{copy.subtitle}</p>
          </div>

          <div className="animate-mount" inert={blocked} aria-disabled={blocked} style={{ animationDelay: '80ms', opacity: blocked ? 0.5 : 1 }}>
            {renderSection()}
          </div>
        </main>
      </div>

      <MobileBottomNav activeSection={activeSection} onSectionChange={setActiveSection} />
    </div>
  )
}

function App() {
  const {user, loading} = useAuth()
  if (loading || !user) return <LoginPage />
  return <Dashboard key={user.id} />
}
export default App
