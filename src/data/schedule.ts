import { type AgeGroup, type ClassSlot, type WeekdayKey } from '../types'

type SlotTemplate = Omit<ClassSlot, 'id'>

const mondayAndWednesday: SlotTemplate[] = [
  { time: '09:00', ageGroup: '4-6 anos' },
  { time: '10:00', ageGroup: '7-12 anos' },
  { time: '11:00', ageGroup: 'Adultos' },
  { time: '16:30', ageGroup: 'Teens/Adultos' },
  { time: '18:30', ageGroup: '7-12 anos' },
  { time: '19:30', ageGroup: 'Teens/Adultos' },
]

const tuesdayAndThursday: SlotTemplate[] = [
  { time: '09:00', ageGroup: '4-6 anos' },
  { time: '10:00', ageGroup: '7-12 anos' },
  { time: '11:00', ageGroup: 'Adultos' },
  { time: '16:00', ageGroup: '7-12 anos' },
  { time: '17:00', ageGroup: '4-6 anos' },
  { time: '18:30', ageGroup: '7-12 anos' },
  { time: '19:30', ageGroup: 'Teens/Adultos' },
]

const friday: SlotTemplate[] = [
  { time: '09:00', ageGroup: '4-6 anos' },
  { time: '10:00', ageGroup: '7-12 anos' },
  { time: '11:00', ageGroup: 'Adultos' },
  { time: '18:30', ageGroup: '7-12 anos' },
  { time: '19:30', ageGroup: 'Teens/Adultos' },
]

const saturday: SlotTemplate[] = [
  { time: '09:00', ageGroup: '4-6 anos' },
  { time: '10:00', ageGroup: '7-12 anos' },
  { time: '11:00', ageGroup: 'Adultos' },
]

const emptyDay: SlotTemplate[] = []

const scheduleTemplate: Record<WeekdayKey, SlotTemplate[]> = {
  domingo: emptyDay,
  segunda: mondayAndWednesday,
  terca: tuesdayAndThursday,
  quarta: mondayAndWednesday,
  quinta: tuesdayAndThursday,
  sexta: friday,
  sabado: saturday,
}

export const weekdayLabel: Record<WeekdayKey, string> = {
  domingo: 'Domingo',
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira',
  sabado: 'Sábado',
}

export const capacityPerClass = 12

function buildSlotId(day: WeekdayKey, time: string) {
  return `${day}-${time.replace(':', '')}`
}

export function getScheduleForDay(day: WeekdayKey): ClassSlot[] {
  return scheduleTemplate[day].map((slot) => ({
    ...slot,
    id: buildSlotId(day, slot.time),
  }))
}

export function getWeekdayKey(date = new Date()): WeekdayKey {
  const keys: WeekdayKey[] = [
    'domingo',
    'segunda',
    'terca',
    'quarta',
    'quinta',
    'sexta',
    'sabado',
  ]

  return keys[date.getDay()]
}

export const ageGroupPalette: Record<
  AgeGroup,
  {
    badge: string
    border: string
    dot: string
  }
> = {
  '4-6 anos': {
    badge: 'bg-emerald-500/12 text-emerald-300 border-emerald-500/25',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  '7-12 anos': {
    badge: 'bg-blue-500/12 text-blue-300 border-blue-500/25',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
  },
  'Teens/Adultos': {
    badge: 'bg-indigo-500/12 text-indigo-300 border-indigo-500/25',
    border: 'border-indigo-500/20',
    dot: 'bg-indigo-400',
  },
  Adultos: {
    badge: 'bg-cyan-500/12 text-cyan-300 border-cyan-500/25',
    border: 'border-cyan-500/20',
    dot: 'bg-cyan-400',
  },
}
