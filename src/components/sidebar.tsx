import {
  Cake,
  CalendarDays,
  CreditCard,
  FileBarChart,
  GraduationCap,
  Rocket,
  Settings,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react'

import { cn } from '../lib/utils'
import { type AppSection } from '../types'

type NavigationProps = {
  activeSection: AppSection
  onSectionChange: (section: AppSection) => void
}

const menuItems = [
  { id: 'daily', label: 'Visão Diária', shortLabel: 'Diária', icon: CalendarDays },
  { id: 'weekly', label: 'Visão Semanal', shortLabel: 'Semana', icon: CalendarDays },
  { id: 'students', label: 'Alunos', shortLabel: 'Alunos', icon: Users },
  { id: 'instructors', label: 'Professores', shortLabel: 'Equipe', icon: GraduationCap },
  { id: 'progress', label: 'Progresso', shortLabel: 'Progresso', icon: TrendingUp },
  { id: 'events', label: 'Eventos', shortLabel: 'Eventos', icon: Rocket },
  { id: 'finance', label: 'Financeiro', shortLabel: 'Finan.', icon: CreditCard },
  { id: 'reports', label: 'Relatorios', shortLabel: 'Relat.', icon: FileBarChart },
  { id: 'birthdays', label: 'Aniversarios', shortLabel: 'Aniver.', icon: Cake },
  { id: 'settings', label: 'Configurações', shortLabel: 'Ajustes', icon: Settings },
] as const satisfies Array<{
  id: AppSection
  label: string
  shortLabel: string
  icon: typeof CalendarDays
}>

export function Sidebar({ activeSection, onSectionChange }: NavigationProps) {
  return (
    <aside className="hidden w-[280px] flex-col border-r border-border/40 bg-surface/60 p-5 backdrop-blur-sm lg:flex">
      <div className="mb-8 rounded-2xl border border-border/30 bg-surface-gradient p-4 shadow-soft-sm">
        <img
          src="/parkour-vicosa-logo.jpg"
          alt="Logo Parkour Viçosa"
          className="h-16 w-auto rounded-lg object-contain"
        />
        <p className="mt-3 font-display text-xl font-semibold tracking-tight text-white">
          Parkour Viçosa
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Dashboard de Gestão</p>
      </div>

      <nav className="space-y-1 stagger-children">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'tactile flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-all duration-200',
                isActive
                  ? 'border-primary/30 bg-primary/10 text-white shadow-glow'
                  : 'border-transparent text-muted-foreground hover:border-border/40 hover:bg-white/[.03] hover:text-white',
              )}
            >
              <Icon className={cn('h-[18px] w-[18px]', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className="font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-border/20 bg-surface-gradient p-4 text-sm shadow-soft-sm">
        <p className="mb-2 inline-flex items-center gap-2 font-display font-semibold text-white">
          <Shield className="h-4 w-4 text-primary" />
          Painel seguro
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Check-in rápido, controle de turmas e planejamento de eventos em um único lugar.
        </p>
      </div>
    </aside>
  )
}

export function MobileTopBar({ activeSection }: Pick<NavigationProps, 'activeSection'>) {
  const sectionLabel = menuItems.find((item) => item.id === activeSection)?.label ?? 'Dashboard'

  return (
    <header className="sticky top-0 z-40 border-b border-border/30 bg-background/90 px-3 py-2 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src="/parkour-vicosa-logo.jpg"
            alt="Logo Parkour Viçosa"
            className="h-9 w-9 rounded-lg object-cover shadow-soft-sm"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-white">Parkour Viçosa</p>
            <p className="truncate text-[11px] text-muted-foreground">{sectionLabel}</p>
          </div>
        </div>
        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
          Online
        </span>
      </div>
    </header>
  )
}

export function MobileBottomNav({ activeSection, onSectionChange }: NavigationProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/30 bg-background/95 px-1 py-1.5 backdrop-blur-md lg:hidden">
      <nav className="mx-auto flex w-full max-w-[1800px] justify-around gap-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'tactile inline-flex min-h-[44px] min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border px-1 py-1.5 text-[9px] font-medium transition-all duration-200',
                isActive
                  ? 'border-primary/30 bg-primary/10 text-white'
                  : 'border-transparent text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="leading-none truncate">{item.shortLabel}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
