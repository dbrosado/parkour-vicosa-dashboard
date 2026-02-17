import type { SkillCategory, SkillAchievement, SkillStatus } from '../types'

export interface SkillDefinition {
  name: string
  category: SkillCategory
}

export const skillDefinitions: SkillDefinition[] = [
  // Saltos
  { name: 'Precision Jump 1m', category: 'saltos' },
  { name: 'Precision Jump 2m', category: 'saltos' },
  { name: 'Running Precision', category: 'saltos' },
  { name: 'Standing Broad Jump', category: 'saltos' },
  { name: 'Gap Jump', category: 'saltos' },

  // Escaladas
  { name: 'Cat Leap', category: 'escaladas' },
  { name: 'Climb-up', category: 'escaladas' },
  { name: 'Wall Run Up', category: 'escaladas' },
  { name: 'Dyno', category: 'escaladas' },
  { name: 'Lache (Escalada)', category: 'escaladas' },

  // Corridas
  { name: 'Sprint Approach', category: 'corridas' },
  { name: 'Wall Run', category: 'corridas' },
  { name: 'Tic-Tac', category: 'corridas' },
  { name: 'Running Cat Leap', category: 'corridas' },

  // Giros
  { name: 'Front Flip', category: 'giros' },
  { name: 'Side Flip', category: 'giros' },
  { name: 'Back Flip', category: 'giros' },
  { name: 'Wall Flip', category: 'giros' },
  { name: 'Cork', category: 'giros' },

  // Vaults
  { name: 'Safety Vault', category: 'vaults' },
  { name: 'Kong Vault', category: 'vaults' },
  { name: 'Speed Vault', category: 'vaults' },
  { name: 'Dash Vault', category: 'vaults' },
  { name: 'Kash Vault', category: 'vaults' },
  { name: 'Lazy Vault', category: 'vaults' },

  // Equilíbrios
  { name: 'Rail Walk', category: 'equilibrios' },
  { name: 'Cat Walk', category: 'equilibrios' },
  { name: 'Crane Stance', category: 'equilibrios' },
  { name: 'Rail Squat', category: 'equilibrios' },
  { name: 'Handstand', category: 'equilibrios' },

  // Rolamentos
  { name: 'Rolamento Frontal', category: 'rolamentos' },
  { name: 'PK Roll (Shoulder Roll)', category: 'rolamentos' },
  { name: 'Dive Roll', category: 'rolamentos' },
  { name: 'Rolamento Para Trás', category: 'rolamentos' },

  // Balanços
  { name: 'Bar Swing', category: 'balancos' },
  { name: 'Lache Swing', category: 'balancos' },
  { name: '180 Swing', category: 'balancos' },
  { name: 'Underbar', category: 'balancos' },
]

export const categoryLabels: Record<SkillCategory, string> = {
  saltos: 'Saltos',
  escaladas: 'Escaladas',
  corridas: 'Corridas',
  giros: 'Giros',
  vaults: 'Vaults',
  equilibrios: 'Equilíbrios',
  rolamentos: 'Rolamentos',
  balancos: 'Balanços',
}

export const categoryColors: Record<SkillCategory, { text: string; bg: string; border: string }> = {
  saltos: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/25' },
  escaladas: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/25' },
  corridas: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25' },
  giros: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/25' },
  vaults: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25' },
  equilibrios: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/25' },
  rolamentos: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/25' },
  balancos: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/25' },
}

export const skillStatusLabels: Record<SkillStatus, { label: string; color: string; bgColor: string }> = {
  not_started: { label: 'Não Iniciado', color: 'text-zinc-500', bgColor: 'bg-zinc-500/10' },
  learning: { label: 'Em Aprendizado', color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
  mastered: { label: 'Dominado', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
  fluid: { label: 'Mestre/Fluido', color: 'text-yellow-300', bgColor: 'bg-yellow-500/10' },
}

export function createDefaultSkillAchievements(): SkillAchievement[] {
  return skillDefinitions.map((def, i) => ({
    id: `skill-${i}`,
    skillName: def.name,
    category: def.category,
    status: 'not_started' as SkillStatus,
    quality: { control: false, silence: false, flow: false, courage: false },
  }))
}
