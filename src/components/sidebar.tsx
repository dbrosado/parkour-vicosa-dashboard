import {
  Cake,
  CalendarDays,
  CalendarCheck2,
  ChartColumn,
  Columns3,
  ContactRound,
  CreditCard,
  FileBarChart,
  Files,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Rocket,
  Settings,
  Smartphone,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { useState } from 'react'

import { useAuth } from '../lib/auth'
import { cn } from '../lib/utils'
import { type AppSection } from '../types'

type NavigationProps = {
  activeSection: AppSection
  onSectionChange: (section: AppSection) => void
}

const crmMenuItems = [
  { id: 'crm-dashboard', label: 'Central Comercial', shortLabel: 'Início', icon: LayoutDashboard },
  { id: 'crm-leads', label: 'Leads', shortLabel: 'Leads', icon: ContactRound },
  { id: 'crm-pipeline', label: 'Pipeline', shortLabel: 'Pipeline', icon: Columns3 },
  { id: 'crm-inbox', label: 'Inbox WhatsApp', shortLabel: 'Inbox', icon: Inbox },
  { id: 'crm-trials', label: 'Aulas Experimentais', shortLabel: 'Aulas', icon: CalendarCheck2 },
  { id: 'crm-tasks', label: 'Tarefas', shortLabel: 'Tarefas', icon: ListChecks },
  { id: 'crm-templates', label: 'Templates', shortLabel: 'Templates', icon: Files },
  { id: 'crm-reports', label: 'Relatórios Comerciais', shortLabel: 'Métricas', icon: ChartColumn },
  { id: 'crm-whatsapp', label: 'Conectar WhatsApp', shortLabel: 'Conectar', icon: Smartphone },
] as const satisfies Array<{
  id: AppSection
  label: string
  shortLabel: string
  icon: typeof CalendarDays
}>

const operationMenuItems = [
  { id: 'daily', label: 'Visão Diária', shortLabel: 'Diária', icon: CalendarDays },
  { id: 'weekly', label: 'Visão Semanal', shortLabel: 'Semana', icon: CalendarDays },
  { id: 'students', label: 'Alunos', shortLabel: 'Alunos', icon: Users },
  { id: 'instructors', label: 'Professores', shortLabel: 'Equipe', icon: GraduationCap },
  { id: 'progress', label: 'Progresso', shortLabel: 'Progresso', icon: TrendingUp },
  { id: 'events', label: 'Eventos', shortLabel: 'Eventos', icon: Rocket },
  { id: 'finance', label: 'Financeiro', shortLabel: 'Finan.', icon: CreditCard },
  { id: 'reports', label: 'Relatórios Gerais', shortLabel: 'Relat.', icon: FileBarChart },
  { id: 'birthdays', label: 'Aniversários', shortLabel: 'Aniver.', icon: Cake },
  { id: 'settings', label: 'Configurações', shortLabel: 'Ajustes', icon: Settings },
] as const satisfies Array<{
  id: AppSection
  label: string
  shortLabel: string
  icon: typeof CalendarDays
}>

const menuItems = [...crmMenuItems, ...operationMenuItems]

function MenuButton({
  item,
  activeSection,
  onSectionChange,
}: {
  item: (typeof menuItems)[number]
  activeSection: AppSection
  onSectionChange: (section: AppSection) => void
}) {
  const Icon = item.icon
  const isActive = activeSection === item.id
  return (
    <button
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
}

export function Sidebar({ activeSection, onSectionChange }: NavigationProps) {
  const { user, signOut } = useAuth()

  return (
    <aside className="sticky top-0 hidden h-screen w-[280px] shrink-0 flex-col border-r border-border/40 bg-surface/60 p-5 backdrop-blur-sm lg:flex">
      <div className="mb-4 rounded-2xl border border-border/30 bg-surface-gradient p-4 shadow-soft-sm">
        <img
          src="/parkour-vicosa-logo.jpg"
          alt="Logo Parkour Viçosa"
          className="h-16 w-auto rounded-lg object-contain"
        />
        <p className="mt-3 font-display text-xl font-semibold tracking-tight text-white">
          Parkour Viçosa
        </p>
        <p className="mt-1 text-sm text-muted-foreground">CRM & Gestão</p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground/70">Comercial</p>
          {crmMenuItems.map((item) => <MenuButton key={item.id} item={item} activeSection={activeSection} onSectionChange={onSectionChange} />)}
        </div>
        <div className="space-y-1">
          <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground/70">Operação da academia</p>
          {operationMenuItems.map((item) => <MenuButton key={item.id} item={item} activeSection={activeSection} onSectionChange={onSectionChange} />)}
        </div>
      </nav>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-border/20 bg-surface-gradient p-4 shadow-soft-sm">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-white">{user?.name ?? 'Painel local'}</p>
          <p className="truncate text-xs text-muted-foreground">Dados salvos neste computador</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="tactile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/40 text-muted-foreground transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-400"
          title="Sair"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}

export function MobileTopBar({ activeSection, onSectionChange }: NavigationProps) {
  const [open, setOpen] = useState(false)
  const sectionLabel = menuItems.find((item) => item.id === activeSection)?.label ?? 'Dashboard'

  return (
    <>
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
          <button type="button" onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-white/[.03]" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm lg:hidden">
          <div className="ml-auto h-full w-[88%] max-w-sm overflow-y-auto border-l border-border/40 bg-[#101010] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div><p className="font-display font-semibold text-white">Navegação</p><p className="text-xs text-muted-foreground">CRM & Gestão</p></div>
              <button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/40"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-5">
              <div className="space-y-1"><p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Comercial</p>{crmMenuItems.map((item) => <div key={item.id} onClick={() => setOpen(false)}><MenuButton item={item} activeSection={activeSection} onSectionChange={onSectionChange} /></div>)}</div>
              <div className="space-y-1"><p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">Operação</p>{operationMenuItems.map((item) => <div key={item.id} onClick={() => setOpen(false)}><MenuButton item={item} activeSection={activeSection} onSectionChange={onSectionChange} /></div>)}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export function MobileBottomNav({ activeSection, onSectionChange }: NavigationProps) {
  const mobileItems = [
    crmMenuItems[0],
    crmMenuItems[2],
    crmMenuItems[3],
    crmMenuItems[4],
    crmMenuItems[5],
  ]
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/30 bg-background/95 px-1 py-1.5 backdrop-blur-md lg:hidden">
      <nav className="mx-auto flex w-full max-w-[1800px] justify-around gap-0.5">
        {mobileItems.map((item) => {
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
