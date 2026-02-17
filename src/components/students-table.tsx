import {
  AlertTriangle,
  CalendarCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Edit,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { createDefaultSkillAchievements } from '../data/skills-data'
import { cn, getAge } from '../lib/utils'
import type { PlanType, RegistrationStatus, Student, StudentStatus } from '../types'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Checkbox } from './ui/checkbox'
import { Input } from './ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table'

type StudentsTableProps = {
  students: Student[]
  onAddStudent: (student: Student) => void
  onUpdateStudent: (student: Student) => void
}

function getAttendanceRate(student: Student) {
  if (!student.attendanceHistory.length) return 0
  const present = student.attendanceHistory.filter((a) => a.status === 'present' || a.status === 'late').length
  return Math.round((present / student.attendanceHistory.length) * 100)
}

function getAbsences(student: Student) {
  return student.attendanceHistory.filter((a) => a.status === 'absent').length
}

function getLateCount(student: Student) {
  return student.attendanceHistory.filter((a) => a.status === 'late').length
}

function paymentChip(status: string) {
  if (status === 'Em dia') return 'chip-success'
  if (status === 'Pendente') return 'chip-warning'
  return 'chip-error'
}

function statusChip(status: StudentStatus) {
  if (status === 'Ativo') return 'chip-success'
  if (status === 'Inativo') return 'chip-neutral'
  return 'chip-error'
}

function registrationChip(status: RegistrationStatus) {
  if (status === 'Completo') return 'chip-success'
  return 'chip-warning'
}

interface StudentFormState {
  name: string
  birthDate: string
  parentName: string
  parentContact: string
  emergencyPhone: string
  allergies: string
  mainClass: string
  plan: PlanType
  monthlyFee: string
  isTrial: boolean
  status: StudentStatus
}

const emptyForm: StudentFormState = {
  name: '',
  birthDate: '',
  parentName: '',
  parentContact: '',
  emergencyPhone: '',
  allergies: '',
  mainClass: '',
  plan: 'Mensal',
  monthlyFee: '',
  isTrial: false,
  status: 'Ativo',
}

export function StudentsTable({ students, onAddStudent, onUpdateStudent }: StudentsTableProps) {
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [form, setForm] = useState<StudentFormState>({ ...emptyForm })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) =>
      s.name.toLowerCase().includes(q) ||
      s.parentContact.toLowerCase().includes(q) ||
      s.mainClass.toLowerCase().includes(q),
    )
  }, [search, students])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.parentContact.trim()) return

    if (editingStudent) {
      // Update existing student
      const updatedStudent: Student = {
        ...editingStudent,
        name: form.name.trim(),
        birthDate: form.birthDate,
        parentName: form.parentName.trim(),
        parentContact: form.parentContact.trim(),
        emergencyPhone: form.emergencyPhone.trim(),
        allergies: form.allergies.trim(),
        status: form.status,
        registrationStatus: form.birthDate && form.parentName && form.parentContact ? 'Completo' : 'Incompleto',
        mainClass: form.mainClass.trim(),
        isTrial: form.isTrial,
        plan: form.plan,
        monthlyFee: Number(form.monthlyFee) || 0,
      }
      onUpdateStudent(updatedStudent)
    } else {
      // Create new student
      const now = Date.now()
      const newStudent: Student = {
        id: `stu-${now}`,
        name: form.name.trim(),
        birthDate: form.birthDate,
        parentName: form.parentName.trim(),
        parentContact: form.parentContact.trim(),
        emergencyPhone: form.emergencyPhone.trim(),
        allergies: form.allergies.trim(),
        status: form.status,
        registrationStatus: 'Incompleto',
        paymentStatus: 'Pendente',
        mainClass: form.mainClass.trim(),
        isTrial: form.isTrial,
        photoUrl: `https://i.pravatar.cc/160?u=${now}`,
        enrolledAt: new Date().toISOString().slice(0, 10),
        plan: form.plan,
        monthlyFee: Number(form.monthlyFee) || 0,
        attendanceHistory: [],
        paymentHistory: [],
        physicalAssessments: [],
        conditioningTests: [],
        skillAchievements: createDefaultSkillAchievements(),
      }
      onAddStudent(newStudent)
    }

    setForm({ ...emptyForm })
    setEditingStudent(null)
    setShowForm(false)
  }

  const toggleExpand = (id: string) => setExpandedId((prev) => (prev === id ? null : id))

  const updateField = <K extends keyof StudentFormState>(key: K, value: StudentFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    setForm({
      name: student.name,
      birthDate: student.birthDate,
      parentName: student.parentName,
      parentContact: student.parentContact,
      emergencyPhone: student.emergencyPhone,
      allergies: student.allergies,
      mainClass: student.mainClass,
      plan: student.plan,
      monthlyFee: student.monthlyFee.toString(),
      isTrial: student.isTrial,
      status: student.status,
    })
    setShowForm(true)
  }

  const handleCancelForm = () => {
    setShowForm(false)
    setEditingStudent(null)
    setForm({ ...emptyForm })
  }

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card className="border-primary/10 bg-hero-grid shadow-soft-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 font-display text-xl sm:text-2xl">
                <Users className="h-5 w-5 text-primary" />
                Lista de Alunos
              </CardTitle>
              <CardDescription className="mt-1 text-muted-foreground">
                Consulte cadastro, pagamentos e turma principal com pesquisa rapida.
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} className="tactile btn-glow">
              <Plus className="mr-1.5 h-4 w-4" />
              Adicionar Aluno
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Registration Form */}
      {showForm && (
        <Card className="animate-scale-in border-primary/20 shadow-soft">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                {editingStudent ? (
                  <>
                    <Edit className="h-4 w-4 text-primary" />
                    Editar Aluno
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 text-primary" />
                    Novo Aluno
                  </>
                )}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={handleCancelForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {/* Name */}
              <Input
                placeholder="Nome completo *"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                required
              />

              {/* Birth Date */}
              <div className="relative">
                <Input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => updateField('birthDate', e.target.value)}
                  className="text-white/80"
                  placeholder="Data de nascimento"
                />
                {!form.birthDate && (
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    Data de nascimento
                  </span>
                )}
              </div>

              {/* Parent Name */}
              <Input
                placeholder="Nome do responsavel"
                value={form.parentName}
                onChange={(e) => updateField('parentName', e.target.value)}
              />

              {/* Parent Contact */}
              <Input
                type="tel"
                placeholder="Contato do responsavel *"
                value={form.parentContact}
                onChange={(e) => updateField('parentContact', e.target.value)}
                required
              />

              {/* Emergency Phone */}
              <Input
                type="tel"
                placeholder="Telefone de emergencia"
                value={form.emergencyPhone}
                onChange={(e) => updateField('emergencyPhone', e.target.value)}
              />

              {/* Main Class */}
              <Input
                placeholder="Turma principal (ex: 09:00)"
                value={form.mainClass}
                onChange={(e) => updateField('mainClass', e.target.value)}
              />

              {/* Plan Select */}
              <select
                value={form.plan}
                onChange={(e) => updateField('plan', e.target.value as PlanType)}
                className="flex h-10 w-full rounded-xl border border-border/20 bg-surface/40 px-3 py-2 text-sm text-white/80 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                <option value="Mensal">Mensal</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Semestral">Semestral</option>
              </select>

              {/* Monthly Fee */}
              <Input
                type="number"
                placeholder="Mensalidade (R$)"
                value={form.monthlyFee}
                onChange={(e) => updateField('monthlyFee', e.target.value)}
                min="0"
                step="0.01"
              />

              {/* Status Select */}
              <select
                value={form.status}
                onChange={(e) => updateField('status', e.target.value as StudentStatus)}
                className="flex h-10 w-full rounded-xl border border-border/20 bg-surface/40 px-3 py-2 text-sm text-white/80 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2"
              >
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
                <option value="Trancado">Trancado</option>
              </select>

              {/* Allergies */}
              <div className="sm:col-span-2 lg:col-span-3">
                <textarea
                  placeholder="Alergias ou observacoes medicas"
                  value={form.allergies}
                  onChange={(e) => updateField('allergies', e.target.value)}
                  rows={2}
                  className="flex w-full rounded-xl border border-border/20 bg-surface/40 px-3 py-2 text-sm text-white/80 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 resize-none"
                />
              </div>

              {/* Is Trial Checkbox */}
              <label className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 rounded-xl border border-border/20 bg-surface/40 px-3 py-2.5 text-sm text-white/80 cursor-pointer">
                <Checkbox
                  checked={form.isTrial}
                  onCheckedChange={(v) => updateField('isTrial', v === true)}
                />
                Aula Experimental
              </label>

              {/* Actions */}
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={handleCancelForm}>
                  Cancelar
                </Button>
                <Button type="submit" className="tactile btn-glow">
                  {editingStudent ? 'Atualizar' : 'Salvar'}

                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, contato ou turma"
          className="pl-9"
        />
      </div>

      {/* Mobile Card View */}
      <div className="space-y-3 stagger-children lg:hidden">
        {filtered.map((student) => {
          const isExpanded = expandedId === student.id
          const attendanceRate = getAttendanceRate(student)
          const absences = getAbsences(student)
          const lateCount = getLateCount(student)
          const age = student.birthDate ? getAge(student.birthDate) : null

          return (
            <Card
              key={student.id}
              className={cn(
                'shadow-soft-sm transition-all duration-200',
                isExpanded && 'border-primary/20',
              )}
            >
              <CardContent className="p-0">
                {/* Collapsed row */}
                <button
                  type="button"
                  onClick={() => toggleExpand(student.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <Avatar className="h-10 w-10 border border-border/20">
                    <AvatarImage src={student.photoUrl} alt={student.name} />
                    <AvatarFallback className="bg-primary/10 text-xs text-white">
                      {student.name
                        .split(' ')
                        .slice(0, 2)
                        .map((c) => c[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">{student.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {age !== null ? `${age} anos` : '--'} &bull; {student.mainClass || '--'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn('text-[10px]', paymentChip(student.paymentStatus))}>
                      {student.paymentStatus}
                    </Badge>
                    <Badge className={cn('text-[10px]', statusChip(student.status))}>
                      {student.status}
                    </Badge>
                    <Badge className={cn('text-[10px]', registrationChip(student.registrationStatus))}>
                      {student.registrationStatus}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="animate-fade-in border-t border-border/20 p-3 space-y-2">
                    {/* Attendance stats */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="stat-card border-emerald-500/20 text-center">
                        <p className="flex items-center justify-center gap-1 text-xs text-emerald-400">
                          <CalendarCheck className="h-3 w-3" />
                          {attendanceRate}%
                        </p>
                        <p className="text-[10px] text-emerald-300/60">Frequencia</p>
                      </div>
                      <div className="stat-card border-rose-500/20 text-center">
                        <p className="flex items-center justify-center gap-1 text-xs text-rose-400">
                          <XCircle className="h-3 w-3" />
                          {absences}
                        </p>
                        <p className="text-[10px] text-rose-300/60">Faltas</p>
                      </div>
                      <div className="stat-card border-amber-500/20 text-center">
                        <p className="flex items-center justify-center gap-1 text-xs text-amber-400">
                          <Clock className="h-3 w-3" />
                          {lateCount}
                        </p>
                        <p className="text-[10px] text-amber-300/60">Atrasos</p>
                      </div>
                    </div>

                    {/* Contact / details */}
                    <div className="rounded-xl border border-border/20 bg-surface/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
                      <p>
                        <span className="text-white/80">Contato:</span> {student.parentContact}
                      </p>
                      {student.parentName && (
                        <p>
                          <span className="text-white/80">Responsavel:</span> {student.parentName}
                        </p>
                      )}
                      {student.emergencyPhone && (
                        <p>
                          <span className="text-white/80">Emergencia:</span> {student.emergencyPhone}
                        </p>
                      )}
                      {student.enrolledAt && (
                        <p>
                          <span className="text-white/80">Matricula:</span>{' '}
                          {new Date(student.enrolledAt).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      {student.plan && (
                        <p>
                          <span className="text-white/80">Plano:</span> {student.plan}
                          {student.monthlyFee > 0 && ` - R$ ${student.monthlyFee.toFixed(2)}`}
                        </p>
                      )}
                      {student.isTrial && (
                        <Badge className="chip-info text-[9px]">Aula Experimental</Badge>
                      )}
                    </div>

                    {/* Allergies warning */}
                    {student.allergies && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
                        <span>{student.allergies}</span>
                      </div>
                    )}

                    {/* Edit button */}
                    <Button
                      onClick={() => handleEdit(student)}
                      variant="outline"
                      size="sm"
                      className="w-full tactile"
                    >
                      <Edit className="mr-1.5 h-3 w-3" />
                      Editar Cadastro
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Desktop Table View */}
      <Card className="hidden lg:block shadow-soft-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Aluno</TableHead>
                <TableHead className="text-muted-foreground">Idade</TableHead>
                <TableHead className="text-muted-foreground">Contato</TableHead>
                <TableHead className="text-muted-foreground">Turma</TableHead>
                <TableHead className="text-muted-foreground">Frequencia</TableHead>
                <TableHead className="text-muted-foreground">Faltas</TableHead>
                <TableHead className="text-muted-foreground">Pagamento</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Cadastro</TableHead>
                <TableHead className="text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((student) => {
                const age = student.birthDate ? getAge(student.birthDate) : null
                const attendanceRate = getAttendanceRate(student)

                return (
                  <TableRow
                    key={student.id}
                    className="border-border/10 hover:bg-white/[.02] transition-colors duration-150"
                  >
                    {/* Name + Avatar */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 border border-border/20">
                          <AvatarImage src={student.photoUrl} alt={student.name} />
                          <AvatarFallback className="bg-primary/10 text-[10px] text-white">
                            {student.name
                              .split(' ')
                              .slice(0, 2)
                              .map((c) => c[0])
                              .join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-white">{student.name}</p>
                          {student.isTrial && (
                            <Badge className="chip-info text-[9px]">Exp.</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Age */}
                    <TableCell className="text-sm text-white/80">
                      {age !== null ? age : '--'}
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="text-sm text-muted-foreground">
                      {student.parentContact}
                    </TableCell>

                    {/* Class */}
                    <TableCell className="text-sm text-white/80">{student.mainClass}</TableCell>

                    {/* Attendance Rate */}
                    <TableCell>
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          attendanceRate >= 80 ? 'text-emerald-400' : 'text-amber-400',
                        )}
                      >
                        {attendanceRate}%
                      </span>
                    </TableCell>

                    {/* Absences */}
                    <TableCell className="text-sm text-rose-400">
                      {getAbsences(student)}
                    </TableCell>

                    {/* Payment Status */}
                    <TableCell>
                      <Badge className={cn('text-[10px]', paymentChip(student.paymentStatus))}>
                        {student.paymentStatus}
                      </Badge>
                    </TableCell>

                    {/* Student Status */}
                    <TableCell>
                      <Badge className={cn('text-[10px]', statusChip(student.status))}>
                        {student.status}
                      </Badge>
                    </TableCell>

                    {/* Registration Status */}
                    <TableCell>
                      <Badge className={cn('text-[10px]', registrationChip(student.registrationStatus))}>
                        {student.registrationStatus}
                      </Badge>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <Button
                        onClick={() => handleEdit(student)}
                        variant="ghost"
                        size="sm"
                        className="tactile h-8 px-2"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
