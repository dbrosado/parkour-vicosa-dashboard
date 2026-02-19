import type {
  Student,
  OperationalExpense,
  SkillCategory,
  ConditioningTest,
} from '../types'
import {
  getAge,
  calculateBMI,
  classifyBMI,
  waistHeightRatio,
  getConditioningLevel,
  formatDateBR,
} from './utils'
import { categoryLabels, skillDefinitions } from '../data/skills-data'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function levelLabel(level: string): string {
  const map: Record<string, string> = {
    gold: 'Ouro',
    silver: 'Prata',
    bronze: 'Bronze',
    below: 'Abaixo',
  }
  return map[level] ?? level
}

function todayDDMMYYYY(): string {
  const d = new Date()
  return d.toLocaleDateString('pt-BR')
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function currentMonthRef(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

const TABLE_STYLES = {
  theme: 'striped' as const,
  styles: { fontSize: 9 },
  headStyles: { fillColor: [41, 128, 185] as [number, number, number] },
}

// ---------------------------------------------------------------------------
// 1. Individual Student Report
// ---------------------------------------------------------------------------

export async function generateStudentReport(student: Student): Promise<void> {
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()
  let y = 20

  // ---- PAGE 1 ----

  // Header
  doc.setFontSize(18)
  doc.text('Parkour Vicosa - Relatorio do Aluno', 14, y)
  y += 8
  doc.setFontSize(10)
  doc.text(`Gerado em: ${todayDDMMYYYY()}`, 14, y)
  y += 10

  // Student bio table
  const age = getAge(student.birthDate)
  const statusMap: Record<string, string> = {
    'Em dia': 'Em dia',
    Atrasado: 'Atrasado',
    Pendente: 'Pendente',
  }

  autoTable(doc, {
    startY: y,
    ...TABLE_STYLES,
    head: [['Campo', 'Valor']],
    body: [
      ['Nome', student.name],
      ['Idade', `${age} anos`],
      ['Turma', student.mainClass],
      ['Plano', student.plan],
      ['Mensalidade', `R$ ${student.monthlyFee.toFixed(2)}`],
      ['Status', statusMap[student.paymentStatus] ?? student.paymentStatus],
    ],
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // Physical Assessment (latest)
  const sortedAssessments = [...student.physicalAssessments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  if (sortedAssessments.length > 0) {
    const latest = sortedAssessments[0]
    const bmi = calculateBMI(latest.weight, latest.height)
    const bmiClass = classifyBMI(bmi, age)
    const whr = waistHeightRatio(latest.waistCircumference, latest.height)

    doc.setFontSize(13)
    doc.text('Avaliacao Fisica', 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      ...TABLE_STYLES,
      head: [['Medida', 'Valor']],
      body: [
        ['Peso', `${latest.weight} kg`],
        ['Altura', `${latest.height} cm`],
        ['IMC', `${bmi}`],
        ['Classificacao IMC', bmiClass.label],
        ['Circunferencia da Cintura', `${latest.waistCircumference} cm`],
        ['Razao Cintura/Altura', `${whr.ratio}`],
      ],
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // Physical assessment history table
    if (sortedAssessments.length > 1) {
      if (y > 260) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(13)
      doc.text('Historico de Avaliacoes Fisicas', 14, y)
      y += 6

      autoTable(doc, {
        startY: y,
        ...TABLE_STYLES,
        head: [['Data', 'Peso (kg)', 'Altura (cm)', 'Cintura (cm)', 'IMC']],
        body: sortedAssessments.map((a) => [
          formatDateBR(a.date),
          `${a.weight}`,
          `${a.height}`,
          `${a.waistCircumference}`,
          `${calculateBMI(a.weight, a.height)}`,
        ]),
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }
  }

  // ---- PAGE 2 (if needed) ----

  // Conditioning section
  const sortedTests = [...student.conditioningTests].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  if (sortedTests.length > 0) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    const latestTest = sortedTests[0]

    doc.setFontSize(13)
    doc.text('Condicionamento Fisico', 14, y)
    y += 6

    const exercises: { label: string; key: string; value: number; unit: string }[] = [
      { label: 'Flexoes', key: 'pushUps', value: latestTest.pushUps, unit: '' },
      { label: 'Barra Fixa', key: 'pullUps', value: latestTest.pullUps, unit: '' },
      { label: 'Abdominais', key: 'sitUps', value: latestTest.sitUps, unit: '' },
      { label: 'Salto Vertical', key: 'verticalJump', value: latestTest.verticalJump, unit: ' cm' },
      { label: 'Salto Horizontal', key: 'horizontalJump', value: latestTest.horizontalJump, unit: ' cm' },
    ]

    autoTable(doc, {
      startY: y,
      ...TABLE_STYLES,
      head: [['Exercicio', 'Valor', 'Nivel']],
      body: exercises.map((ex) => {
        const result = getConditioningLevel(ex.key, ex.value, age)
        return [ex.label, `${ex.value}${ex.unit}`, levelLabel(result.level)]
      }),
    })
    y = (doc as any).lastAutoTable.finalY + 10

    // Conditioning history table
    if (sortedTests.length > 1) {
      if (y > 260) {
        doc.addPage()
        y = 20
      }

      doc.setFontSize(13)
      doc.text('Historico de Condicionamento', 14, y)
      y += 6

      autoTable(doc, {
        startY: y,
        ...TABLE_STYLES,
        head: [['Data', 'Flexoes', 'Barra', 'Abdom.', 'S.Vert', 'S.Horiz']],
        body: sortedTests.map((t) => [
          formatDateBR(t.date),
          `${t.pushUps}`,
          `${t.pullUps}`,
          `${t.sitUps}`,
          `${t.verticalJump}`,
          `${t.horizontalJump}`,
        ]),
      })
      y = (doc as any).lastAutoTable.finalY + 10
    }
  }

  // Skill Tree summary
  if (student.skillAchievements.length > 0) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(13)
    doc.text('Arvore de Habilidades', 14, y)
    y += 6

    const categories = Object.keys(categoryLabels) as SkillCategory[]
    const skillRows: string[][] = []

    for (const cat of categories) {
      const totalInCategory = skillDefinitions.filter((s) => s.category === cat).length
      const achievements = student.skillAchievements.filter((sa) => sa.category === cat)
      const masteredOrFluid = achievements.filter(
        (sa) => sa.status === 'mastered' || sa.status === 'fluid',
      ).length
      const pct = totalInCategory > 0 ? Math.round((masteredOrFluid / totalInCategory) * 100) : 0
      skillRows.push([
        categoryLabels[cat],
        `${masteredOrFluid}`,
        `${totalInCategory}`,
        `${pct}%`,
      ])
    }

    autoTable(doc, {
      startY: y,
      ...TABLE_STYLES,
      head: [['Categoria', 'Dominadas', 'Total', 'Percentual']],
      body: skillRows,
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ---- PAGE 3 (if needed) ----

  // Attendance summary
  if (student.attendanceHistory.length > 0) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    const totalClasses = student.attendanceHistory.length
    const presences = student.attendanceHistory.filter(
      (a) => a.status === 'present' || a.status === 'late',
    ).length
    const rate = totalClasses > 0 ? Math.round((presences / totalClasses) * 100) : 0

    doc.setFontSize(13)
    doc.text('Frequencia', 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      ...TABLE_STYLES,
      head: [['Metrica', 'Valor']],
      body: [
        ['Total de Aulas', `${totalClasses}`],
        ['Presencas', `${presences}`],
        ['Taxa', `${rate}%`],
      ],
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // Payment history (last 12)
  if (student.paymentHistory.length > 0) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    const sortedPayments = [...student.paymentHistory]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12)

    const statusLabelMap: Record<string, string> = {
      paid: 'Pago',
      pending: 'Pendente',
      overdue: 'Atrasado',
    }

    doc.setFontSize(13)
    doc.text('Historico de Pagamentos', 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      ...TABLE_STYLES,
      head: [['Data', 'Referencia', 'Valor', 'Pago', 'Status']],
      body: sortedPayments.map((p) => [
        formatDateBR(p.date),
        p.monthReference,
        `R$ ${p.amount.toFixed(2)}`,
        `R$ ${p.amountPaid.toFixed(2)}`,
        statusLabelMap[p.status] ?? p.status,
      ]),
    })
  }

  // Save
  doc.save(`relatorio-${slugify(student.name)}.pdf`)
}

// ---------------------------------------------------------------------------
// 2. General Academy Report
// ---------------------------------------------------------------------------

export async function generateAcademyReport(
  students: Student[],
  expenses: OperationalExpense[],
): Promise<void> {
  const jsPDF = (await import('jspdf')).default
  const autoTable = (await import('jspdf-autotable')).default

  const doc = new jsPDF()
  let y = 20

  const monthRef = currentMonthRef()

  // ---- PAGE 1 ----

  // Header
  doc.setFontSize(18)
  doc.text('Parkour Vicosa - Relatorio Geral da Academia', 14, y)
  y += 8
  doc.setFontSize(10)
  doc.text(`Gerado em: ${todayDDMMYYYY()}`, 14, y)
  y += 10

  // Statistics table
  const totalStudents = students.length
  const active = students.filter((s) => s.status === 'Ativo').length
  const inactive = students.filter((s) => s.status === 'Inativo').length
  const locked = students.filter((s) => s.status === 'Trancado').length
  const trial = students.filter((s) => s.isTrial).length

  autoTable(doc, {
    startY: y,
    ...TABLE_STYLES,
    head: [['Indicador', 'Quantidade']],
    body: [
      ['Total Alunos', `${totalStudents}`],
      ['Ativos', `${active}`],
      ['Inativos', `${inactive}`],
      ['Trancados', `${locked}`],
      ['Experimentais', `${trial}`],
    ],
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // Financial summary for current month
  const monthPayments = students.flatMap((s) =>
    s.paymentHistory.filter((p) => p.monthReference === monthRef),
  )
  const revenue = monthPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountPaid, 0)

  const monthExpenses = expenses.filter((e) => e.monthReference === monthRef)
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const profit = revenue - totalExpenses

  doc.setFontSize(13)
  doc.text('Resumo Financeiro (Mes Atual)', 14, y)
  y += 6

  autoTable(doc, {
    startY: y,
    ...TABLE_STYLES,
    head: [['Item', 'Valor']],
    body: [
      ['Receita', `R$ ${revenue.toFixed(2)}`],
      ['Despesas', `R$ ${totalExpenses.toFixed(2)}`],
      ['Lucro/Prejuizo', `R$ ${profit.toFixed(2)}`],
    ],
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // Expense breakdown by category
  if (monthExpenses.length > 0) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    const categoryMap = new Map<string, number>()
    for (const exp of monthExpenses) {
      categoryMap.set(exp.category, (categoryMap.get(exp.category) ?? 0) + exp.amount)
    }

    const categoryLabelMap: Record<string, string> = {
      aluguel: 'Aluguel',
      salarios: 'Salarios',
      energia: 'Energia',
      agua: 'Agua',
      materiais: 'Materiais',
      manutencao: 'Manutencao',
      marketing: 'Marketing',
      outros: 'Outros',
    }

    doc.setFontSize(13)
    doc.text('Despesas por Categoria', 14, y)
    y += 6

    autoTable(doc, {
      startY: y,
      ...TABLE_STYLES,
      head: [['Categoria', 'Valor']],
      body: Array.from(categoryMap.entries()).map(([cat, val]) => [
        categoryLabelMap[cat] ?? cat,
        `R$ ${val.toFixed(2)}`,
      ]),
    })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // ---- PAGE 2 ----
  doc.addPage()
  y = 20

  // Monthly revenue table (last 12 months)
  doc.setFontSize(13)
  doc.text('Receita Mensal (Ultimos 12 Meses)', 14, y)
  y += 6

  const allPayments = students.flatMap((s) => s.paymentHistory)
  const monthsSet = new Set<string>()
  for (const p of allPayments) {
    monthsSet.add(p.monthReference)
  }
  const sortedMonths = Array.from(monthsSet)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 12)

  const monthlyRows: string[][] = sortedMonths.map((m) => {
    const mPayments = allPayments.filter((p) => p.monthReference === m)
    const mRevenue = mPayments
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amountPaid, 0)
    const mPending = mPayments
      .filter((p) => p.status === 'pending' || p.status === 'overdue')
      .reduce((sum, p) => sum + (p.amount - p.amountPaid), 0)
    const totalPayments = mPayments.length
    return [m, `R$ ${mRevenue.toFixed(2)}`, `R$ ${mPending.toFixed(2)}`, `${totalPayments}`]
  })

  autoTable(doc, {
    startY: y,
    ...TABLE_STYLES,
    head: [['Mes', 'Receita', 'Pendente', 'Total Pgtos']],
    body: monthlyRows,
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // Top attendance ranking
  if (y > 260) {
    doc.addPage()
    y = 20
  }

  doc.setFontSize(13)
  doc.text('Ranking de Frequencia (Top 20)', 14, y)
  y += 6

  const attendanceRanking = students
    .filter((s) => s.attendanceHistory.length > 0)
    .map((s) => {
      const total = s.attendanceHistory.length
      const presences = s.attendanceHistory.filter(
        (a) => a.status === 'present' || a.status === 'late',
      ).length
      const rate = total > 0 ? Math.round((presences / total) * 100) : 0
      return { name: s.name, presences, total, rate }
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 20)

  autoTable(doc, {
    startY: y,
    ...TABLE_STYLES,
    head: [['Nome', 'Presencas', 'Total', 'Taxa']],
    body: attendanceRanking.map((r) => [
      r.name,
      `${r.presences}`,
      `${r.total}`,
      `${r.rate}%`,
    ]),
  })
  y = (doc as any).lastAutoTable.finalY + 10

  // ---- PAGE 3 (if needed) ----

  // Conditioning averages across all students
  const allTests: { test: ConditioningTest; age: number }[] = []
  for (const s of students) {
    if (s.conditioningTests.length > 0) {
      const age = getAge(s.birthDate)
      const latest = [...s.conditioningTests].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )[0]
      allTests.push({ test: latest, age })
    }
  }

  if (allTests.length > 0) {
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(13)
    doc.text('Medias de Condicionamento Fisico', 14, y)
    y += 6

    const exerciseKeys: { label: string; key: keyof ConditioningTest }[] = [
      { label: 'Flexoes', key: 'pushUps' },
      { label: 'Barra Fixa', key: 'pullUps' },
      { label: 'Abdominais', key: 'sitUps' },
      { label: 'Salto Vertical', key: 'verticalJump' },
      { label: 'Salto Horizontal', key: 'horizontalJump' },
    ]

    const condRows: string[][] = exerciseKeys.map((ex) => {
      const values = allTests.map((t) => t.test[ex.key] as number)
      const avg = values.reduce((s, v) => s + v, 0) / values.length
      const best = Math.max(...values)
      const worst = Math.min(...values)
      return [ex.label, `${avg.toFixed(1)}`, `${best}`, `${worst}`]
    })

    autoTable(doc, {
      startY: y,
      ...TABLE_STYLES,
      head: [['Exercicio', 'Media', 'Melhor', 'Pior']],
      body: condRows,
    })
  }

  // Save
  doc.save(`relatorio-geral-academia-${todayISO()}.pdf`)
}
