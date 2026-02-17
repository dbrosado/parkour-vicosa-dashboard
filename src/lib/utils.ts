import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

export function calculateBMI(weight: number, heightCm: number): number {
  const heightM = heightCm / 100
  if (heightM <= 0) return 0
  return Math.round((weight / (heightM * heightM)) * 10) / 10
}

export function classifyBMI(bmi: number, age: number): { label: string; color: string; level: number } {
  if (age >= 18) {
    if (bmi < 18.5) return { label: 'Baixo Peso', color: 'text-sky-400', level: 1 }
    if (bmi < 25) return { label: 'Normal', color: 'text-emerald-400', level: 2 }
    if (bmi < 30) return { label: 'Sobrepeso', color: 'text-amber-400', level: 3 }
    return { label: 'Obesidade', color: 'text-rose-400', level: 4 }
  }

  // Simplified WHO BMI-for-age cutoffs (children/adolescents 5-17)
  const cutoffs: Record<number, [number, number, number]> = {
    5:  [13.0, 16.5, 18.0],
    6:  [13.0, 16.8, 18.5],
    7:  [13.2, 17.2, 19.3],
    8:  [13.4, 17.7, 20.0],
    9:  [13.7, 18.3, 21.0],
    10: [14.0, 19.0, 22.0],
    11: [14.3, 19.8, 23.0],
    12: [14.8, 20.6, 24.2],
    13: [15.2, 21.5, 25.2],
    14: [15.7, 22.2, 26.0],
    15: [16.2, 23.0, 27.0],
    16: [16.5, 23.5, 27.5],
    17: [16.8, 24.0, 28.0],
  }

  const clampedAge = Math.max(5, Math.min(17, age))
  const [underweight, overweight, obese] = cutoffs[clampedAge] ?? [14.0, 19.0, 22.0]

  if (bmi < underweight) return { label: 'Baixo Peso', color: 'text-sky-400', level: 1 }
  if (bmi < overweight) return { label: 'Normal', color: 'text-emerald-400', level: 2 }
  if (bmi < obese) return { label: 'Sobrepeso', color: 'text-amber-400', level: 3 }
  return { label: 'Obesidade', color: 'text-rose-400', level: 4 }
}

export function waistHeightRatio(waistCm: number, heightCm: number): { ratio: number; risk: boolean } {
  if (heightCm <= 0) return { ratio: 0, risk: false }
  const ratio = Math.round((waistCm / heightCm) * 100) / 100
  return { ratio, risk: ratio > 0.5 }
}

export type ConditioningLevel = 'bronze' | 'silver' | 'gold' | 'below'

interface ConditioningThresholds {
  bronze: number
  silver: number
  gold: number
}

const conditioningTables: Record<string, Record<string, ConditioningThresholds>> = {
  pushUps: {
    '7-8': { bronze: 5, silver: 10, gold: 15 },
    '9-10': { bronze: 8, silver: 15, gold: 20 },
    '11-12': { bronze: 10, silver: 18, gold: 25 },
    '13-14': { bronze: 12, silver: 22, gold: 30 },
    '15-16': { bronze: 15, silver: 25, gold: 40 },
    '17+': { bronze: 20, silver: 30, gold: 50 },
  },
  pullUps: {
    '7-8': { bronze: 1, silver: 2, gold: 4 },
    '9-10': { bronze: 1, silver: 3, gold: 5 },
    '11-12': { bronze: 2, silver: 4, gold: 7 },
    '13-14': { bronze: 3, silver: 6, gold: 10 },
    '15-16': { bronze: 5, silver: 8, gold: 13 },
    '17+': { bronze: 6, silver: 10, gold: 15 },
  },
  sitUps: {
    '7-8': { bronze: 15, silver: 25, gold: 35 },
    '9-10': { bronze: 20, silver: 30, gold: 40 },
    '11-12': { bronze: 25, silver: 35, gold: 45 },
    '13-14': { bronze: 28, silver: 38, gold: 48 },
    '15-16': { bronze: 30, silver: 40, gold: 50 },
    '17+': { bronze: 32, silver: 42, gold: 52 },
  },
  verticalJump: {
    '7-8': { bronze: 18, silver: 24, gold: 30 },
    '9-10': { bronze: 22, silver: 28, gold: 36 },
    '11-12': { bronze: 25, silver: 33, gold: 42 },
    '13-14': { bronze: 28, silver: 38, gold: 48 },
    '15-16': { bronze: 32, silver: 42, gold: 55 },
    '17+': { bronze: 35, silver: 48, gold: 60 },
  },
  horizontalJump: {
    '7-8': { bronze: 100, silver: 130, gold: 155 },
    '9-10': { bronze: 120, silver: 150, gold: 175 },
    '11-12': { bronze: 140, silver: 170, gold: 200 },
    '13-14': { bronze: 155, silver: 190, gold: 220 },
    '15-16': { bronze: 170, silver: 210, gold: 240 },
    '17+': { bronze: 185, silver: 225, gold: 260 },
  },
}

function getAgeGroup(age: number): string {
  if (age <= 8) return '7-8'
  if (age <= 10) return '9-10'
  if (age <= 12) return '11-12'
  if (age <= 14) return '13-14'
  if (age <= 16) return '15-16'
  return '17+'
}

export function getConditioningLevel(
  exercise: string,
  value: number,
  age: number,
): { level: ConditioningLevel; thresholds: ConditioningThresholds } {
  const ageGroup = getAgeGroup(age)
  const table = conditioningTables[exercise]
  const thresholds = table?.[ageGroup] ?? { bronze: 0, silver: 0, gold: 0 }

  let level: ConditioningLevel = 'below'
  if (value >= thresholds.gold) level = 'gold'
  else if (value >= thresholds.silver) level = 'silver'
  else if (value >= thresholds.bronze) level = 'bronze'

  return { level, thresholds }
}

export function formatDateBR(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

export function formatMonthYear(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
