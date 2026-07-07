import { useMemo, useState } from 'react'

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
    subtitle: 'Conta local, backup e preferências da academia.',
  },
}

function App() {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState<AppSection>('crm-dashboard')
  const { students, instructors, addStudent, updateStudent, setInstructors } = useStore()

  const copy = useMemo(() => sectionCopy[activeSection] || sectionCopy.daily, [activeSection])

  if (!user) {
    return <LoginPage />
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
        return <SettingsView />
      default:
        return <SettingsView />
    }
  }

  return (
    <div className="min-h-screen bg-transparent text-white">
      <MobileTopBar activeSection={activeSection} onSectionChange={setActiveSection} />

      <div className="mx-auto flex w-full max-w-[1800px] gap-0 lg:min-h-screen">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />

        <main className="w-full flex-1 px-3 pb-24 pt-3 sm:px-5 lg:p-8 lg:pb-8">
          {/* Section Header */}
          <div className="animate-mount mb-4 rounded-2xl border border-border/20 bg-surface-gradient p-4 shadow-soft-sm sm:p-5 lg:mb-5">
            <h1 className="font-display text-lg font-semibold text-white sm:text-xl lg:text-2xl">{copy.title}</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{copy.subtitle}</p>
          </div>

          <div className="animate-mount" style={{ animationDelay: '80ms' }}>
            {renderSection()}
          </div>
        </main>
      </div>

      <MobileBottomNav activeSection={activeSection} onSectionChange={setActiveSection} />
    </div>
  )
}

export default App
