export type AppSection =
  | 'daily'
  | 'weekly'
  | 'students'
  | 'instructors'
  | 'progress'
  | 'events'
  | 'finance'
  | 'birthdays'
  | 'reports'
  | 'settings'

export type WeekdayKey =
  | 'domingo'
  | 'segunda'
  | 'terca'
  | 'quarta'
  | 'quinta'
  | 'sexta'
  | 'sabado'

export type AgeGroup = '4-6 anos' | '7-12 anos' | 'Adultos' | 'Teens/Adultos'

export type PaymentStatus = 'Em dia' | 'Atrasado' | 'Pendente'

export type AttendanceStatus = 'none' | 'present' | 'absent' | 'late'

export type StudentStatus = 'Ativo' | 'Inativo' | 'Trancado'

export type RegistrationStatus = 'Completo' | 'Incompleto'

export type PaymentMethod = 'Pix' | 'Cartão' | 'Dinheiro'

export type PlanType = 'Mensal' | 'Trimestral' | 'Semestral'

export type SkillStatus = 'not_started' | 'learning' | 'mastered' | 'fluid'

export type SkillCategory =
  | 'saltos'
  | 'escaladas'
  | 'corridas'
  | 'giros'
  | 'vaults'
  | 'equilibrios'
  | 'rolamentos'
  | 'balancos'

export interface AttendanceRecord {
  date: string
  status: AttendanceStatus
  slotId: string
  note?: string
}

export interface PaymentRecord {
  id: string
  date: string
  monthReference: string
  amount: number
  amountPaid: number
  description: string
  status: 'paid' | 'pending' | 'overdue'
  paymentMethod?: PaymentMethod
  paidAt?: string
  plan?: PlanType
}

export interface PhysicalAssessment {
  id: string
  date: string
  weight: number
  height: number
  waistCircumference: number
}

export interface ConditioningTest {
  id: string
  date: string
  pushUps: number
  pullUps: number
  verticalJump: number
  horizontalJump: number
  sitUps: number
}

export interface SkillAchievement {
  id: string
  skillName: string
  category: SkillCategory
  status: SkillStatus
  quality: {
    control: boolean
    silence: boolean
    flow: boolean
    courage: boolean
  }
  updatedAt?: string
}

export interface Student {
  id: string
  name: string
  birthDate: string
  parentName: string
  parentContact: string
  emergencyPhone: string
  allergies: string
  status: StudentStatus
  registrationStatus: RegistrationStatus
  paymentStatus: PaymentStatus
  mainClass: string
  isTrial: boolean
  photoUrl: string
  enrolledAt: string
  plan: PlanType
  monthlyFee: number
  attendanceHistory: AttendanceRecord[]
  paymentHistory: PaymentRecord[]
  physicalAssessments: PhysicalAssessment[]
  conditioningTests: ConditioningTest[]
  skillAchievements: SkillAchievement[]
}

export interface Instructor {
  id: string
  name: string
  role: string
  photoUrl: string
  phone: string
  weeklyHours: number
  maxHours: number
  assignedSlots: InstructorSlotAssignment[]
}

export interface InstructorSlotAssignment {
  day: WeekdayKey
  slotTime: string
  ageGroup: AgeGroup
}

export interface ClassSlot {
  id: string
  time: string
  ageGroup: AgeGroup
}

export interface ClassNote {
  slotId: string
  date: string
  content: string
  createdAt: string
}

export type ExpenseCategory =
  | 'aluguel'
  | 'salarios'
  | 'energia'
  | 'agua'
  | 'materiais'
  | 'manutencao'
  | 'marketing'
  | 'outros'

export interface OperationalExpense {
  id: string
  description: string
  amount: number
  category: ExpenseCategory
  monthReference: string
  createdAt: string
}
