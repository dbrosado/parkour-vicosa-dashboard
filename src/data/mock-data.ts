import {
  type AgeGroup,
  type Instructor,
  type Student,
  type WeekdayKey,
} from '../types'
import { createDefaultSkillAchievements } from './skills-data'

function parseDateToIso(dateBR: string): string {
  const [day, month, year] = dateBR.split('/')
  return `${year}-${month}-${day}`
}

function buildStudent(data: {
  id: string
  name: string
  birthDate?: string
  parentName?: string
  parentContact?: string
  emergencyPhone?: string
  mainClass?: string
  registrationStatus: 'Completo' | 'Incompleto'
  paymentStatus?: 'Em dia' | 'Atrasado' | 'Pendente'
  status?: 'Ativo' | 'Inativo' | 'Trancado'
}): Student {
  return {
    id: data.id,
    name: data.name,
    birthDate: data.birthDate ?? '2015-01-01',
    parentName: data.parentName ?? '',
    parentContact: data.parentContact ?? '',
    emergencyPhone: data.emergencyPhone ?? data.parentContact ?? '',
    allergies: '',
    status: data.status ?? 'Ativo',
    registrationStatus: data.registrationStatus,
    paymentStatus: data.paymentStatus ?? 'Pendente',
    mainClass: data.mainClass ?? '',
    isTrial: false,
    photoUrl: '',
    enrolledAt: '2026-02-15',
    plan: 'Mensal',
    monthlyFee: 150,
    attendanceHistory: [],
    paymentHistory: [],
    physicalAssessments: [],
    conditioningTests: [],
    skillAchievements: createDefaultSkillAchievements(),
  }
}

export const initialStudents: Student[] = [
  buildStudent({
    id: 'demo-lia',
    name: 'Lia Demo',
    birthDate: parseDateToIso('14/04/2020'),
    parentName: 'Responsável 01',
    parentContact: '(00) 90000-0001',
    emergencyPhone: '(00) 90000-0001',
    registrationStatus: 'Completo',
    mainClass: '09:00 (4-6 anos)'
  }),
  buildStudent({
    id: 'demo-mateo',
    name: 'Mateo Demo',
    birthDate: parseDateToIso('02/09/2019'),
    parentName: 'Responsável 02',
    parentContact: '(00) 90000-0002',
    emergencyPhone: '(00) 90000-0002',
    registrationStatus: 'Completo',
    paymentStatus: 'Em dia',
    mainClass: '09:00 (4-6 anos)'
  }),
  buildStudent({
    id: 'demo-sofia',
    name: 'Sofia Demo',
    birthDate: parseDateToIso('18/06/2017'),
    parentName: 'Responsável 03',
    parentContact: '(00) 90000-0003',
    emergencyPhone: '(00) 90000-0003',
    registrationStatus: 'Completo',
    paymentStatus: 'Em dia',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({
    id: 'demo-rafael',
    name: 'Rafael Demo',
    birthDate: parseDateToIso('22/11/2016'),
    parentName: 'Responsável 04',
    parentContact: '(00) 90000-0004',
    emergencyPhone: '(00) 90000-0004',
    registrationStatus: 'Completo',
    paymentStatus: 'Atrasado',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({
    id: 'demo-clara',
    name: 'Clara Demo',
    birthDate: parseDateToIso('09/03/2015'),
    parentName: 'Responsável 05',
    parentContact: '(00) 90000-0005',
    emergencyPhone: '(00) 90000-0005',
    registrationStatus: 'Completo',
    mainClass: '16:00 (7-12 anos)'
  }),
  buildStudent({
    id: 'demo-bento',
    name: 'Bento Demo',
    birthDate: parseDateToIso('28/01/2018'),
    parentName: 'Responsável 06',
    parentContact: '(00) 90000-0006',
    emergencyPhone: '(00) 90000-0006',
    registrationStatus: 'Completo',
    paymentStatus: 'Pendente',
    mainClass: '18:30 (7-12 anos)'
  }),
  buildStudent({
    id: 'demo-helena',
    name: 'Helena Demo',
    birthDate: parseDateToIso('12/12/2014'),
    parentName: 'Responsável 07',
    parentContact: '(00) 90000-0007',
    emergencyPhone: '(00) 90000-0007',
    registrationStatus: 'Completo',
    mainClass: '18:30 (7-12 anos)'
  }),
  buildStudent({
    id: 'demo-ian',
    name: 'Ian Demo',
    birthDate: parseDateToIso('05/05/2016'),
    parentName: 'Responsável 08',
    parentContact: '(00) 90000-0008',
    emergencyPhone: '(00) 90000-0008',
    registrationStatus: 'Completo',
    mainClass: '18:30 (7-12 anos)'
  }),
  buildStudent({
    id: 'demo-malu',
    name: 'Malu Demo',
    birthDate: parseDateToIso('21/07/2020'),
    parentName: 'Responsável 09',
    parentContact: '(00) 90000-0009',
    emergencyPhone: '(00) 90000-0009',
    registrationStatus: 'Completo',
    mainClass: '17:00 (4-6 anos)'
  }),
  buildStudent({
    id: 'demo-vitor',
    name: 'Vitor Demo',
    birthDate: parseDateToIso('30/08/2010'),
    parentName: 'Responsável 10',
    parentContact: '(00) 90000-0010',
    emergencyPhone: '(00) 90000-0010',
    registrationStatus: 'Completo',
    paymentStatus: 'Em dia',
    mainClass: '16:30 (Teens/Adultos)'
  }),
  buildStudent({
    id: 'demo-nina',
    name: 'Nina Demo',
    birthDate: parseDateToIso('08/10/2019'),
    parentName: 'Responsável 11',
    parentContact: '(00) 90000-0011',
    emergencyPhone: '(00) 90000-0011',
    registrationStatus: 'Completo',
    mainClass: '09:00 (4-6 anos)'
  }),
  buildStudent({
    id: 'demo-gael',
    name: 'Gael Demo',
    birthDate: parseDateToIso('17/02/2017'),
    parentName: 'Responsável 12',
    parentContact: '(00) 90000-0012',
    emergencyPhone: '(00) 90000-0012',
    registrationStatus: 'Completo',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({
    id: 'demo-olivia',
    name: 'Olívia Demo',
    birthDate: parseDateToIso('26/06/2015'),
    parentName: 'Responsável 13',
    parentContact: '(00) 90000-0013',
    emergencyPhone: '(00) 90000-0013',
    registrationStatus: 'Completo',
    mainClass: '18:30 (7-12 anos)'
  }),
  buildStudent({
    id: 'demo-thiago',
    name: 'Thiago Demo',
    birthDate: parseDateToIso('11/11/1998'),
    parentName: '',
    parentContact: '(00) 90000-0014',
    emergencyPhone: '(00) 90000-0014',
    registrationStatus: 'Completo',
    status: 'Ativo',
    mainClass: '11:00 (Adultos)'
  }),
  buildStudent({
    id: 'demo-luiza',
    name: 'Luiza Demo',
    birthDate: parseDateToIso('01/05/2012'),
    parentName: 'Responsável 15',
    parentContact: '(00) 90000-0015',
    emergencyPhone: '(00) 90000-0015',
    registrationStatus: 'Completo',
    mainClass: '19:30 (Teens/Adultos)'
  }),
  buildStudent({
    id: 'demo-arthur',
    name: 'Arthur Demo',
    birthDate: parseDateToIso('19/12/2016'),
    parentName: 'Responsável 16',
    parentContact: '(00) 90000-0016',
    emergencyPhone: '(00) 90000-0016',
    registrationStatus: 'Completo',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({
    id: 'demo-caue',
    name: 'Cauê Demo',
    birthDate: parseDateToIso('24/03/2011'),
    parentName: 'Responsável 17',
    parentContact: '(00) 90000-0017',
    emergencyPhone: '(00) 90000-0017',
    registrationStatus: 'Completo',
    mainClass: '19:30 (Teens/Adultos)'
  }),
  buildStudent({
    id: 'demo-marcos',
    name: 'Marcos Demo',
    birthDate: parseDateToIso('03/02/1993'),
    parentName: '',
    parentContact: '(00) 90000-0018',
    emergencyPhone: '(00) 90000-0018',
    registrationStatus: 'Completo',
    mainClass: '11:00 (Adultos)'
  }),
]

type WeeklyAssignmentTemplate = Record<WeekdayKey, Record<string, string[]>>

export const initialWeeklyAssignments: WeeklyAssignmentTemplate = {
  domingo: {},
  segunda: {
    'segunda-0900': ['demo-lia', 'demo-mateo'],
    'segunda-1000': ['demo-sofia', 'demo-rafael', 'demo-arthur'],
    'segunda-1100': ['demo-marcos'],
    'segunda-1630': ['demo-vitor'],
    'segunda-1830': ['demo-bento', 'demo-helena', 'demo-ian'],
    'segunda-1930': ['demo-luiza', 'demo-caue'],
  },
  terca: {
    'terca-0900': ['demo-lia', 'demo-nina'],
    'terca-1000': ['demo-sofia', 'demo-gael'],
    'terca-1100': [],
    'terca-1600': ['demo-rafael', 'demo-clara'],
    'terca-1700': ['demo-malu'],
    'terca-1830': ['demo-bento', 'demo-olivia'],
    'terca-1930': ['demo-vitor', 'demo-caue'],
  },
  quarta: {
    'quarta-0900': ['demo-mateo'],
    'quarta-1000': ['demo-sofia', 'demo-arthur', 'demo-gael'],
    'quarta-1100': ['demo-thiago'],
    'quarta-1630': ['demo-vitor'],
    'quarta-1830': ['demo-helena', 'demo-ian', 'demo-olivia'],
    'quarta-1930': ['demo-luiza', 'demo-caue'],
  },
  quinta: {
    'quinta-0900': ['demo-lia', 'demo-nina'],
    'quinta-1000': ['demo-rafael', 'demo-clara', 'demo-arthur'],
    'quinta-1100': ['demo-marcos'],
    'quinta-1600': ['demo-sofia', 'demo-gael'],
    'quinta-1830': ['demo-bento', 'demo-helena'],
  },
  sexta: {
    'sexta-0900': ['demo-mateo', 'demo-malu'],
    'sexta-1000': ['demo-sofia', 'demo-rafael', 'demo-arthur', 'demo-gael'],
    'sexta-1100': ['demo-thiago'],
    'sexta-1830': ['demo-bento', 'demo-ian', 'demo-olivia'],
    'sexta-1930': ['demo-vitor', 'demo-luiza'],
  },
  sabado: {
    'sabado-0900': ['demo-lia', 'demo-nina', 'demo-malu'],
    'sabado-1000': ['demo-clara', 'demo-gael', 'demo-olivia'],
    'sabado-1100': ['demo-marcos', 'demo-thiago'],
  },
}

export const initialInstructors: Instructor[] = [
  {
    id: 'inst-001',
    name: 'Instrutor Demo',
    role: 'Professor Principal',
    photoUrl: '',
    phone: '(00) 90000-0101',
    weeklyHours: 35,
    maxHours: 40,
    assignedSlots: [
      { day: 'segunda', slotTime: '09:00', ageGroup: '4-6 anos' },
      { day: 'segunda', slotTime: '10:00', ageGroup: '7-12 anos' },
      { day: 'segunda', slotTime: '11:00', ageGroup: 'Adultos' },
      { day: 'segunda', slotTime: '18:30', ageGroup: '7-12 anos' },
      { day: 'segunda', slotTime: '19:30', ageGroup: 'Teens/Adultos' },
      { day: 'quarta', slotTime: '09:00', ageGroup: '4-6 anos' },
      { day: 'quarta', slotTime: '10:00', ageGroup: '7-12 anos' },
      { day: 'quarta', slotTime: '11:00', ageGroup: 'Adultos' },
      { day: 'quarta', slotTime: '18:30', ageGroup: '7-12 anos' },
      { day: 'quarta', slotTime: '19:30', ageGroup: 'Teens/Adultos' },
      { day: 'sexta', slotTime: '09:00', ageGroup: '4-6 anos' },
      { day: 'sexta', slotTime: '10:00', ageGroup: '7-12 anos' },
      { day: 'sexta', slotTime: '11:00', ageGroup: 'Adultos' },
      { day: 'sexta', slotTime: '18:30', ageGroup: '7-12 anos' },
      { day: 'sexta', slotTime: '19:30', ageGroup: 'Teens/Adultos' },
      { day: 'sabado', slotTime: '09:00', ageGroup: '4-6 anos' },
      { day: 'sabado', slotTime: '10:00', ageGroup: '7-12 anos' },
      { day: 'sabado', slotTime: '11:00', ageGroup: 'Adultos' },
    ],
  },
  {
    id: 'inst-002',
    name: 'Assistente Demo',
    role: 'Assistente',
    photoUrl: '',
    phone: '(00) 90000-0102',
    weeklyHours: 20,
    maxHours: 25,
    assignedSlots: [
      { day: 'segunda', slotTime: '16:30', ageGroup: 'Teens/Adultos' },
      { day: 'terca', slotTime: '09:00', ageGroup: '4-6 anos' },
      { day: 'terca', slotTime: '10:00', ageGroup: '7-12 anos' },
      { day: 'terca', slotTime: '11:00', ageGroup: 'Adultos' },
      { day: 'terca', slotTime: '16:00', ageGroup: '7-12 anos' },
      { day: 'terca', slotTime: '17:00', ageGroup: '4-6 anos' },
      { day: 'terca', slotTime: '19:30', ageGroup: 'Teens/Adultos' },
      { day: 'quinta', slotTime: '09:00', ageGroup: '4-6 anos' },
      { day: 'quinta', slotTime: '10:00', ageGroup: '7-12 anos' },
      { day: 'quinta', slotTime: '11:00', ageGroup: 'Adultos' },
      { day: 'quinta', slotTime: '16:00', ageGroup: '7-12 anos' },
      { day: 'quinta', slotTime: '17:00', ageGroup: '4-6 anos' },
      { day: 'quinta', slotTime: '19:30', ageGroup: 'Teens/Adultos' },
    ],
  },
  {
    id: 'inst-003',
    name: 'Estagiária Demo',
    role: 'Estagiária',
    photoUrl: '',
    phone: '(00) 90000-0103',
    weeklyHours: 12,
    maxHours: 20,
    assignedSlots: [
      { day: 'quarta', slotTime: '16:30', ageGroup: 'Teens/Adultos' },
      { day: 'sexta', slotTime: '18:30', ageGroup: '7-12 anos' },
      { day: 'sexta', slotTime: '19:30', ageGroup: 'Teens/Adultos' },
      { day: 'sabado', slotTime: '09:00', ageGroup: '4-6 anos' },
      { day: 'sabado', slotTime: '10:00', ageGroup: '7-12 anos' },
    ],
  },
]

export function inferAgeGroup(age: number): AgeGroup {
  if (age <= 6) return '4-6 anos'
  if (age <= 12) return '7-12 anos'
  if (age <= 17) return 'Teens/Adultos'
  return 'Adultos'
}
