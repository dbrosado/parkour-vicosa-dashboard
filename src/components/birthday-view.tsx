import { Cake, Calendar, Gift, PartyPopper } from 'lucide-react'

import { cn } from '../lib/utils'
import type { Student } from '../types'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

type BirthdayViewProps = {
  students: Student[]
}

const monthNames = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function formatBirthdayDate(birthDate: string): string {
  const date = new Date(birthDate)
  const day = date.getUTCDate()
  const month = monthNames[date.getUTCMonth()]
  return `${day} de ${month}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((chunk) => chunk[0])
    .join('')
}

function getTurningAge(birthDate: string): number {
  const birth = new Date(birthDate)
  const now = new Date()
  return now.getFullYear() - birth.getUTCFullYear()
}

function isBirthdayToday(birthDate: string): boolean {
  const now = new Date()
  const birth = new Date(birthDate)
  return birth.getUTCDate() === now.getDate() && birth.getUTCMonth() === now.getMonth()
}

export function BirthdayView({ students }: BirthdayViewProps) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentMonthName = monthNames[currentMonth]
  const nextMonth = (currentMonth + 1) % 12
  const nextMonthName = monthNames[nextMonth]

  const activeStudents = students.filter((s) => s.status === 'Ativo')

  const birthdaysThisMonth = activeStudents
    .filter((s) => {
      const birth = new Date(s.birthDate)
      return birth.getUTCMonth() === currentMonth
    })
    .sort((a, b) => {
      const dayA = new Date(a.birthDate).getUTCDate()
      const dayB = new Date(b.birthDate).getUTCDate()
      return dayA - dayB
    })

  const birthdaysNextMonth = activeStudents
    .filter((s) => {
      const birth = new Date(s.birthDate)
      return birth.getUTCMonth() === nextMonth
    })
    .sort((a, b) => {
      const dayA = new Date(a.birthDate).getUTCDate()
      const dayB = new Date(b.birthDate).getUTCDate()
      return dayA - dayB
    })

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header card */}
      <Card className="border-amber-500/15 shadow-soft-sm bg-hero-grid">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div>
              <CardTitle className="font-display text-lg sm:text-xl lg:text-2xl flex items-center gap-2.5">
                <Cake className="h-5 w-5 text-amber-400 sm:h-6 sm:w-6" />
                Aniversariantes do Mes
              </CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">
                {currentMonthName} de {now.getFullYear()}
              </CardDescription>
            </div>
            <Badge className="gap-1.5 border-amber-400/30 bg-amber-500/15 text-amber-200 text-[10px] sm:text-xs sm:gap-2">
              <PartyPopper className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {birthdaysThisMonth.length}{' '}
              {birthdaysThisMonth.length === 1 ? 'aniversariante' : 'aniversariantes'}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="stagger-children">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="stat-card border-amber-500/20 text-center">
              <p className="font-display text-lg font-semibold text-amber-400 sm:text-xl">
                {birthdaysThisMonth.length}
              </p>
              <p className="text-[10px] text-amber-300/60 sm:text-xs">Este mes</p>
            </div>
            <div className="stat-card border-yellow-500/20 text-center">
              <p className="font-display text-lg font-semibold text-yellow-400 sm:text-xl">
                {birthdaysNextMonth.length}
              </p>
              <p className="text-[10px] text-yellow-300/60 sm:text-xs">Proximo mes</p>
            </div>
            <div className="stat-card border-orange-500/20 text-center col-span-2 sm:col-span-1">
              <p className="font-display text-lg font-semibold text-orange-400 sm:text-xl">
                {birthdaysThisMonth.filter((s) => isBirthdayToday(s.birthDate)).length}
              </p>
              <p className="text-[10px] text-orange-300/60 sm:text-xs">Hoje!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Birthday students this month */}
      {birthdaysThisMonth.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 stagger-children">
          {birthdaysThisMonth.map((student) => {
            const isToday = isBirthdayToday(student.birthDate)
            const turningAge = getTurningAge(student.birthDate)

            return (
              <Card
                key={student.id}
                className={cn(
                  'animate-fade-in rounded-2xl border p-0 shadow-soft-sm transition-all duration-200',
                  isToday
                    ? 'border-amber-400/40 bg-amber-500/[.06] ring-1 ring-amber-400/20'
                    : 'border-border/20',
                )}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar
                        className={cn(
                          'h-12 w-12 border-2 sm:h-14 sm:w-14',
                          isToday ? 'border-amber-400/50' : 'border-border/30',
                        )}
                      >
                        <AvatarImage src={student.photoUrl} alt={student.name} />
                        <AvatarFallback className="bg-amber-500/10 text-xs font-semibold text-amber-200">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      {isToday && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] shadow-lg">
                          <PartyPopper className="h-3 w-3 text-white" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-white sm:text-base">
                          {student.name}
                        </p>
                        {isToday && (
                          <Badge className="shrink-0 border-amber-400/30 bg-amber-500/20 text-[9px] text-amber-200 sm:text-[10px]">
                            HOJE!
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-amber-400/70" />
                          {formatBirthdayDate(student.birthDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Gift className="h-3 w-3 text-yellow-400/70" />
                          {turningAge} anos
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="secondary"
                          className="text-[9px] sm:text-[10px]"
                        >
                          {student.mainClass}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="animate-fade-in border-border/20 shadow-soft-sm">
          <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface/60 border border-border/20 sm:h-20 sm:w-20">
              <Cake className="h-8 w-8 text-muted-foreground/50 sm:h-10 sm:w-10" />
            </div>
            <p className="mt-4 font-display text-base font-semibold text-white sm:text-lg">
              Nenhum aniversariante este mes
            </p>
            <p className="mt-1 text-center text-xs text-muted-foreground sm:text-sm">
              Nao ha alunos ativos com aniversario em {currentMonthName}.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Next month preview */}
      {birthdaysNextMonth.length > 0 && (
        <Card className="animate-fade-in border-border/20 shadow-soft-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="font-display text-base font-semibold text-white sm:text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-yellow-400/70" />
                  Proximo Mes
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Aniversariantes de {nextMonthName}
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="text-[10px] sm:text-xs"
              >
                {birthdaysNextMonth.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 stagger-children">
            {birthdaysNextMonth.map((student) => {
              const turningAge = getTurningAge(student.birthDate)

              return (
                <div
                  key={student.id}
                  className="flex items-center gap-3 rounded-xl border border-border/20 bg-surface/40 px-3 py-2.5 transition-colors duration-150"
                >
                  <Avatar className="h-8 w-8 border border-border/30">
                    <AvatarImage src={student.photoUrl} alt={student.name} />
                    <AvatarFallback className="bg-yellow-500/10 text-[10px] font-semibold text-yellow-200">
                      {getInitials(student.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white sm:text-sm">
                      {student.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground sm:text-xs">
                      {formatBirthdayDate(student.birthDate)} &middot; {turningAge} anos
                    </p>
                  </div>

                  <Badge variant="secondary" className="shrink-0 text-[9px] sm:text-[10px]">
                    {student.mainClass}
                  </Badge>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
