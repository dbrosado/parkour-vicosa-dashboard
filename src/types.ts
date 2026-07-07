export type AppSection =
  | 'crm-dashboard'
  | 'crm-leads'
  | 'crm-pipeline'
  | 'crm-inbox'
  | 'crm-trials'
  | 'crm-tasks'
  | 'crm-templates'
  | 'crm-whatsapp'
  | 'crm-reports'
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

export type PipelineStage =
  | 'new'
  | 'contacted'
  | 'waiting'
  | 'trial_scheduled'
  | 'trial_confirmed'
  | 'attended'
  | 'no_show'
  | 'feedback_pending'
  | 'plan_recommended'
  | 'negotiation'
  | 'enrolled'
  | 'lost'
  | 'reactivation'

export type LeadTemperature = 'cold' | 'warm' | 'hot'

export type LeadSource =
  | 'Instagram'
  | 'Facebook'
  | 'Google'
  | 'Indicação'
  | 'WhatsApp direto'
  | 'Evento'
  | 'Panfleto'
  | 'Escola'
  | 'Tráfego pago'
  | 'Site'
  | 'Aula experimental anterior'
  | 'Ex-aluno'
  | 'Outro'

export type LeadStudentType =
  | 'Criança'
  | 'Adolescente'
  | 'Adulto'
  | 'Família'
  | 'Calistenia'
  | 'Evento'

export interface LeadHistoryItem {
  id: string
  type: 'stage' | 'note' | 'task' | 'trial' | 'message' | 'enrollment'
  description: string
  createdAt: string
}

export interface CrmLead {
  id: string
  studentName: string
  guardianName: string
  whatsapp: string
  email: string
  instagram: string
  age?: number
  birthDate: string
  city: string
  neighborhood: string
  source: LeadSource
  sourceCampaign: string
  referralBy: string
  mainInterest: string
  studentType: LeadStudentType
  stage: PipelineStage
  temperature: LeadTemperature
  recommendedPlan: string
  recommendedSchedule: string
  presentedValue?: number
  objections: string
  lostReason: string
  nextAction: string
  nextActionAt: string
  salesOwner: string
  instructorOwner: string
  internalNotes: string
  communicationConsent: boolean
  doNotContact: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
  lastContactAt: string
  history: LeadHistoryItem[]
}

export type CrmTaskType =
  | 'call'
  | 'whatsapp'
  | 'email'
  | 'confirm_trial'
  | 'follow_up'
  | 'close_sale'
  | 'reactivate'
  | 'other'

export type CrmTaskStatus = 'pending' | 'completed' | 'cancelled'
export type CrmTaskPriority = 'low' | 'medium' | 'high'

export interface CrmTask {
  id: string
  title: string
  leadId: string
  owner: string
  dueAt: string
  type: CrmTaskType
  status: CrmTaskStatus
  priority: CrmTaskPriority
  notes: string
  createdAt: string
}

export type TrialStatus =
  | 'scheduled'
  | 'confirmed'
  | 'attended'
  | 'no_show'
  | 'rescheduled'
  | 'cancelled'

export type TrialCommercialResult =
  | 'pending'
  | 'enrolled'
  | 'thinking'
  | 'no_response'
  | 'not_interested'
  | 'reschedule'

export interface TrialClass {
  id: string
  leadId: string
  date: string
  time: string
  className: string
  instructor: string
  status: TrialStatus
  guardianAttendance: 'yes' | 'no' | 'partial' | 'not_applicable'
  studentLiked: boolean | null
  instructorFeedback: string
  strengths: string
  improvements: string
  recommendedPlan: string
  planPresented: boolean
  enrollmentOffered: boolean
  commercialResult: TrialCommercialResult
  nextFollowUpAt: string
  notes: string
  createdAt: string
}

export type MessageDirection = 'incoming' | 'outgoing' | 'internal'
export type MessageStatus = 'received' | 'sent' | 'delivered' | 'read' | 'failed'

export interface CrmMessage {
  id: string
  leadId: string
  direction: MessageDirection
  channel: 'whatsapp' | 'email' | 'phone' | 'internal'
  content: string
  status: MessageStatus
  createdAt: string
}

export interface MessageTemplate {
  id: string
  name: string
  category: string
  channel: 'whatsapp' | 'email' | 'sms'
  content: string
  active: boolean
}

export interface CrmOpportunity {
  id: string
  leadId: string
  product: string
  value: number
  status: 'open' | 'won' | 'lost'
  expectedCloseAt: string
  owner: string
  notes: string
  lostReason: string
  createdAt: string
}
