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
    photoUrl: `https://i.pravatar.cc/160?u=${encodeURIComponent(data.id)}`,
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
  buildStudent({ id: 'stu-joao-001', name: 'João', parentName: 'Jamille Queiroz C Oliveira', registrationStatus: 'Incompleto', mainClass: '09:00 (4-6 anos)' }),
  buildStudent({ id: 'stu-murilo-santana', name: 'Murilo Santana', registrationStatus: 'Incompleto', mainClass: '10:00 (7-12 anos)' }),
  buildStudent({
    id: 'stu-pedro-martins',
    name: 'Pedro Martins Presentino Fontes',
    birthDate: parseDateToIso('15/07/2017'),
    parentName: 'Tamiris Dalila Martins Presentino Fontes',
    parentContact: '31999786581',
    emergencyPhone: '(31) 98927-6581',
    registrationStatus: 'Completo',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({
    id: 'stu-henrique-luna',
    name: 'Henrique Fontes Luna',
    birthDate: parseDateToIso('30/07/2014'),
    parentName: 'Patrícia Fontes Longuinho Luna',
    parentContact: '31 983748666',
    emergencyPhone: '31 983748666',
    registrationStatus: 'Completo',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({ id: 'stu-thiago', name: 'Thiago', registrationStatus: 'Incompleto', mainClass: '11:00 (Adultos)' }),
  buildStudent({ id: 'stu-pedro-teens', name: 'Pedro', registrationStatus: 'Incompleto', mainClass: '16:30 (Teens/Adultos)' }),
  buildStudent({
    id: 'stu-heitor-levi',
    name: 'Heitor Levi Lima Santos',
    birthDate: parseDateToIso('02/02/2018'),
    parentName: 'Vagson Luiz de Carvalho Santos',
    parentContact: '31 99229-5080',
    emergencyPhone: '31994945083',
    registrationStatus: 'Completo',
    mainClass: '18:30 (7-12 anos)'
  }),
  buildStudent({
    id: 'stu-ravi-marques',
    name: 'Ravi Marques Chizzolini',
    birthDate: parseDateToIso('14/07/2018'),
    parentName: 'Caio Enrique Barbosa Chizzolini',
    parentContact: '31999849170',
    emergencyPhone: '31 992559170',
    registrationStatus: 'Completo',
    mainClass: '18:30 (7-12 anos)'
  }),
  buildStudent({
    id: 'stu-carlos-eduardo',
    name: 'Carlos Eduardo Pereira Sampaio Rigueira',
    birthDate: parseDateToIso('15/04/2013'),
    parentName: 'Vivian Pereira Monteiro',
    parentContact: '31999668897',
    emergencyPhone: '31998768897',
    registrationStatus: 'Completo',
    mainClass: '18:30 (7-12 anos)'
  }),
  buildStudent({ id: 'stu-gabriela', name: 'Gabriela', registrationStatus: 'Incompleto', mainClass: '18:30 (7-12 anos)' }),
  buildStudent({ id: 'stu-bernardo', name: 'Bernardo', registrationStatus: 'Incompleto', mainClass: '18:30 (7-12 anos)' }),
  buildStudent({ id: 'stu-joao-souza', name: 'João Souza', registrationStatus: 'Incompleto', mainClass: '19:30 (Teens/Adultos)' }),
  buildStudent({
    id: 'stu-mateus-junqueira',
    name: 'Mateus Junqueira Reis',
    birthDate: parseDateToIso('17/06/2019'),
    parentName: 'Denise Pereira Junqueira Reis',
    parentContact: '31999635001',
    emergencyPhone: '31987085001',
    registrationStatus: 'Completo',
    mainClass: '09:00 (4-6 anos)'
  }),
  buildStudent({
    id: 'stu-pietra-santana',
    name: 'Pietra Santana Mounteer',
    birthDate: parseDateToIso('30/11/2019'),
    parentName: 'Cheyene Santana',
    parentContact: '31988541374',
    emergencyPhone: '31993741374',
    registrationStatus: 'Completo',
    mainClass: '09:00 (4-6 anos)'
  }),
  buildStudent({
    id: 'stu-gabriel-vilela',
    name: 'Gabriel Vilela Gonçalves',
    birthDate: parseDateToIso('06/10/2018'),
    parentName: 'Jaqueline Vilela',
    parentContact: '31999176474',
    emergencyPhone: '31996476474',
    registrationStatus: 'Completo',
    mainClass: '09:00 (4-6 anos)'
  }),
  buildStudent({ id: 'stu-augusto', name: 'Augusto', registrationStatus: 'Incompleto', mainClass: '10:00 (7-12 anos)' }),
  buildStudent({ id: 'stu-nathan', name: 'Nathan', registrationStatus: 'Incompleto', mainClass: '10:00 (7-12 anos)' }),
  buildStudent({
    id: 'stu-davi-teixeira',
    name: 'Davi Teixeira Lopes Fernandes',
    birthDate: parseDateToIso('09/03/2015'),
    parentName: 'Fabiana Teixeira da Fonseca',
    parentContact: '31999741431',
    emergencyPhone: '31 986381431',
    registrationStatus: 'Completo',
    mainClass: '16:00 (7-12 anos)'
  }),
  buildStudent({
    id: 'stu-caio-tristao',
    name: 'Caio Tristão Jannotti Santana',
    birthDate: parseDateToIso('24/10/2017'),
    parentName: 'Patrícia Tristão Mendonça Santana',
    parentContact: '31999313021',
    emergencyPhone: '31998833021',
    registrationStatus: 'Completo',
    mainClass: '16:00 (7-12 anos)'
  }),
  buildStudent({ id: 'stu-arthur', name: 'Arthur', registrationStatus: 'Incompleto', mainClass: '16:00 (7-12 anos)' }),
  buildStudent({ id: 'stu-roman', name: 'Roman', registrationStatus: 'Incompleto', mainClass: '17:00 (4-6 anos)' }),
  buildStudent({ id: 'stu-ruda', name: 'Ruda', registrationStatus: 'Incompleto', mainClass: '17:00 (4-6 anos)' }),
  buildStudent({ id: 'stu-alicia', name: 'Alicia', registrationStatus: 'Incompleto', mainClass: '17:00 (4-6 anos)' }),
  buildStudent({ id: 'stu-alice', name: 'Alice', registrationStatus: 'Incompleto', mainClass: '18:30 (7-12 anos)' }),
  buildStudent({
    id: 'stu-miriam-ribeiro',
    name: 'Miriam Ribeiro de Freitas',
    birthDate: parseDateToIso('11/04/2016'),
    parentName: 'Juliana de Morais Ribeiro Freitas',
    parentContact: '31991995350',
    emergencyPhone: '31984735350',
    registrationStatus: 'Completo',
    mainClass: '18:30 (7-12 anos)'
  }),
  buildStudent({ id: 'stu-rafa', name: 'Rafa', registrationStatus: 'Incompleto', mainClass: '18:30 (7-12 anos)' }),
  buildStudent({
    id: 'stu-theo-cacador',
    name: 'Théo Santos Caçador',
    birthDate: parseDateToIso('25/10/2020'),
    parentName: 'Beatriz Santana Caçador',
    parentContact: '31998370907',
    emergencyPhone: '31991780907',
    registrationStatus: 'Completo',
    mainClass: '09:00 (4-6 anos)'
  }),
  buildStudent({
    id: 'stu-joao-viana',
    name: 'Joao Guilherme gomide Viana',
    birthDate: parseDateToIso('18/04/2018'),
    parentName: 'Guilherme Lopes Viana',
    parentContact: '31999141016',
    emergencyPhone: '31999041016',
    registrationStatus: 'Completo',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({
    id: 'stu-giovanna-oliva',
    name: 'Giovanna Oliva Rodrigues',
    birthDate: parseDateToIso('18/04/2018'),
    parentName: 'Amanda Oliva Pereira',
    parentContact: '31999838733',
    emergencyPhone: '(32) 99815-8733',
    registrationStatus: 'Completo',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({ id: 'stu-vitor', name: 'Vitor', registrationStatus: 'Incompleto', mainClass: '16:30 (Teens/Adultos)' }),
  buildStudent({
    id: 'stu-theo-fausto',
    name: 'Théo Fausto de Oliveira',
    birthDate: parseDateToIso('20/01/2019'),
    parentName: 'Otávia Luiza Carneiro Fausto de Oliveira',
    parentContact: '31998193805',
    emergencyPhone: '31987313805',
    registrationStatus: 'Completo',
    mainClass: '09:00 (4-6 anos)'
  }),
  buildStudent({
    id: 'stu-samuel-bueno',
    name: 'Samuel da Silva Bueno',
    birthDate: parseDateToIso('09/03/2015'),
    parentName: 'Bráulio Martins Bueno',
    parentContact: '31998146409',
    emergencyPhone: '31987576409',
    registrationStatus: 'Completo',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({
    id: 'stu-henrique-schaefer',
    name: 'Henrique F. Schaefer',
    birthDate: parseDateToIso('19/12/2017'),
    parentName: 'Mariana Albuquerque Reynaud Schaefer',
    parentContact: '21987661603',
    emergencyPhone: '21987661603',
    registrationStatus: 'Completo',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({ id: 'stu-lucas', name: 'Lucas', registrationStatus: 'Incompleto', mainClass: '09:00 (4-6 anos)' }),
  buildStudent({ id: 'stu-helena', name: 'Helena', registrationStatus: 'Incompleto', mainClass: '10:00 (7-12 anos)' }),
  buildStudent({
    id: 'stu-camila-alves',
    name: 'Camila Cordeiro Alves',
    birthDate: parseDateToIso('23/05/2018'),
    parentName: 'Marina Cordeiro Alves',
    parentContact: '31998883380',
    emergencyPhone: '31998833380',
    registrationStatus: 'Completo',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({
    id: 'stu-luis-henrique',
    name: 'Luís Henrique Melo e Moura',
    birthDate: parseDateToIso('19/09/2014'),
    parentName: 'Taís Melo e Silva',
    parentContact: '31 99611-6241',
    emergencyPhone: '31 99611-6241',
    registrationStatus: 'Completo',
    mainClass: '10:00 (7-12 anos)'
  }),
  buildStudent({ id: 'stu-levi', name: 'Levi', registrationStatus: 'Incompleto', mainClass: '18:30 (7-12 anos)' }),
  buildStudent({
    id: 'stu-noah-goularte',
    name: 'Noah da Silva Goularte',
    birthDate: parseDateToIso('19/04/2017'),
    parentName: 'Claudeci Severino Goularte',
    parentContact: '31997528095',
    emergencyPhone: '(31) 982568095',
    registrationStatus: 'Completo',
    mainClass: '18:30 (7-12 anos)'
  }),
  buildStudent({
    id: 'stu-theodoro-oliveira',
    name: 'Theodoro Oliveira',
    birthDate: parseDateToIso('20/08/2019'),
    parentName: 'Tássia Oliveira',
    parentContact: '3199609977',
    emergencyPhone: '21982709977',
    registrationStatus: 'Completo',
    mainClass: '09:00 (4-6 anos)'
  }),
  buildStudent({ id: 'stu-marcelo', name: 'Marcelo', registrationStatus: 'Incompleto', mainClass: '10:00 (7-12 anos)' }),
  buildStudent({ id: 'stu-lara', name: 'Lara', registrationStatus: 'Incompleto', mainClass: '10:00 (7-12 anos)' }),
]

type WeeklyAssignmentTemplate = Record<WeekdayKey, Record<string, string[]>>

export const initialWeeklyAssignments: WeeklyAssignmentTemplate = {
  domingo: {},
  segunda: {
    'segunda-0900': ['stu-joao-001'],
    'segunda-1000': ['stu-murilo-santana', 'stu-pedro-martins', 'stu-henrique-luna'],
    'segunda-1100': ['stu-thiago'],
    'segunda-1630': ['stu-pedro-teens'],
    'segunda-1830': ['stu-heitor-levi', 'stu-ravi-marques', 'stu-carlos-eduardo', 'stu-gabriela', 'stu-bernardo'],
    'segunda-1930': ['stu-joao-souza'],
  },
  terca: {
    'terca-0900': ['stu-mateus-junqueira', 'stu-pietra-santana', 'stu-gabriel-vilela'],
    'terca-1000': ['stu-augusto', 'stu-nathan'],
    'terca-1100': [],
    'terca-1600': ['stu-davi-teixeira', 'stu-caio-tristao', 'stu-arthur'],
    'terca-1700': ['stu-roman', 'stu-ruda', 'stu-alicia'],
    'terca-1830': ['stu-alice', 'stu-miriam-ribeiro', 'stu-rafa'],
    'terca-1930': [],
  },
  quarta: {
    'quarta-0900': ['stu-theo-cacador'],
    'quarta-1000': ['stu-pedro-martins', 'stu-murilo-santana', 'stu-joao-viana', 'stu-giovanna-oliva'],
    'quarta-1100': [],
    'quarta-1630': ['stu-pedro-teens', 'stu-vitor'],
    'quarta-1830': [],
    'quarta-1930': ['stu-joao-souza'],
  },
  quinta: {
    'quinta-0900': ['stu-pietra-santana', 'stu-theo-fausto', 'stu-mateus-junqueira'],
    'quinta-1000': ['stu-augusto', 'stu-nathan', 'stu-samuel-bueno', 'stu-henrique-schaefer'],
    'quinta-1100': ['stu-thiago'],
    'quinta-1600': ['stu-davi-teixeira', 'stu-caio-tristao', 'stu-arthur', 'stu-gabriela'],
    'quinta-1830': ['stu-alice', 'stu-rafa'],
  },
  sexta: {
    'sexta-0900': ['stu-lucas', 'stu-joao-viana'],
    'sexta-1000': ['stu-samuel-bueno', 'stu-murilo-santana', 'stu-helena', 'stu-camila-alves', 'stu-giovanna-oliva', 'stu-luis-henrique'],
    'sexta-1830': ['stu-levi', 'stu-ravi-marques', 'stu-noah-goularte', 'stu-miriam-ribeiro'],
  },
  sabado: {
    'sabado-0900': ['stu-theodoro-oliveira'],
    'sabado-1000': ['stu-helena', 'stu-camila-alves', 'stu-noah-goularte', 'stu-marcelo', 'stu-lara'],
    'sabado-1100': ['stu-thiago', 'stu-vitor'],
  },
}

export const initialInstructors: Instructor[] = [
  {
    id: 'inst-001',
    name: 'Danilo Silva',
    role: 'Professor Principal',
    photoUrl: 'https://i.pravatar.cc/160?img=70',
    phone: '(31) 99999-0001',
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
    name: 'Lucas Ferreira',
    role: 'Assistente',
    photoUrl: 'https://i.pravatar.cc/160?img=52',
    phone: '(31) 99888-0002',
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
    name: 'Mariana Costa',
    role: 'Estagiária',
    photoUrl: 'https://i.pravatar.cc/160?img=44',
    phone: '(31) 99777-0003',
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
