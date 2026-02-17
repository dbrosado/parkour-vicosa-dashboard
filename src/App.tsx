import { useEffect, useMemo, useState } from 'react'

import { BirthdayView } from './components/birthday-view'
import { DailyView } from './components/daily-view'
import { WeeklyView } from './components/weekly-view'
import { EventsBoard } from './components/events-board'
import { FinanceView } from './components/finance-view'
import { InstructorView } from './components/instructor-view'
import { LoginPage } from './components/login-page'
import { ProgressView } from './components/progress-view'
import { SettingsView } from './components/settings-view'
import { MobileBottomNav, MobileTopBar, Sidebar } from './components/sidebar'
import { StudentsTable } from './components/students-table'
import { useAuth } from './lib/auth'
import { supabase } from './lib/supabase'
import { useStore } from './store/useStore'
import { type AppSection } from './types'

const sectionCopy: Record<AppSection, { title: string; subtitle: string }> = {
  daily: {
    title: 'Operacao do Dia',
    subtitle: 'Check-ins rapidos e remanejamento de turmas em drag-and-drop.',
  },
  weekly: {
    title: 'Visao Semanal',
    subtitle: 'Planejamento de ocupacao e grade de horarios da academia.',
  },
  students: {
    title: 'CRM de Alunos',
    subtitle: 'Cadastro completo com busca de alto desempenho.',
  },
  instructors: {
    title: 'Professores & Equipe',
    subtitle: 'Escala de horarios, carga horaria e gestao de funcoes.',
  },
  progress: {
    title: 'Check-up do Traceur',
    subtitle: 'Avaliacao fisica, condicionamento Big Six e arvore de habilidades.',
  },
  events: {
    title: 'Pipeline de Eventos',
    subtitle: 'Kanban de execucao com calendario mensal e datas confirmadas.',
  },
  finance: {
    title: 'Controle Financeiro',
    subtitle: 'Gestao de mensalidades, cobrancas e formas de pagamento.',
  },
  birthdays: {
    title: 'Aniversariantes',
    subtitle: 'Alunos que fazem aniversario neste mes e proximos.',
  },
  settings: {
    title: 'Preferencias Gerais',
    subtitle: 'Governanca operacional e notificacoes da academia.',
  },
}

function App() {
  const { user, loading: authLoading } = useAuth()
  const [activeSection, setActiveSection] = useState<AppSection>('daily')
  const { students, instructors, addStudent, updateStudent, loadFromSupabase } = useStore()

  // Load data from Supabase when user is authenticated
  useEffect(() => {
    if (user && supabase) {
      loadFromSupabase()
    }
  }, [user, loadFromSupabase])

  const copy = useMemo(() => sectionCopy[activeSection] || sectionCopy.daily, [activeSection])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(220,15%,8%)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  // Show login if not authenticated and Supabase is configured
  if (!user && supabase) {
    return <LoginPage />
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'daily':
        return <DailyView key={students.length} />
      case 'weekly':
        return <WeeklyView />
      case 'students':
        return <StudentsTable students={students} onAddStudent={addStudent} onUpdateStudent={updateStudent} />
      case 'instructors':
        return <InstructorView instructors={instructors} onUpdateInstructors={() => { }} />
      case 'progress':
        return <ProgressView students={students} onUpdateStudent={updateStudent} />
      case 'events':
        return <EventsBoard />
      case 'finance':
        return <FinanceView students={students} onUpdateStudent={updateStudent} />
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
      <MobileTopBar activeSection={activeSection} />

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
