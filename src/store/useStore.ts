import { newId } from '../lib/id.ts'
import { create } from 'zustand'
import { format } from 'date-fns'
import {
    type ClassNote,
    type ClassNotesByDate,
    type CrmLead,
    type CrmMessage,
    type CrmOpportunity,
    type CrmTask,
    type EventColumns,
    type Instructor,
    type MessageTemplate,
    type PipelineStage,
    type Student,
    type AttendanceStatus,
    type OperationalExpense,
    type TrialClass,
} from '../types'
import { initialMessageTemplates } from '../data/crm-data'
import { getScheduleForDay, getWeekdayKey } from '../data/schedule'
import { createDefaultSkillAchievements } from '../data/skills-data'

export interface DashboardState {
    // Navigation
    selectedDate: Date
    setSelectedDate: (date: Date) => void

    // Data
    students: Student[]
    instructors: Instructor[]

    // date string (YYYY-MM-DD) -> slotId -> studentIds[]
    dailyAssignments: Record<string, Record<string, string[]>>

    // date string (YYYY-MM-DD) -> studentId -> AttendanceStatus
    dailyAttendance: Record<string, Record<string, AttendanceStatus>>

    // date string (YYYY-MM-DD) -> slotId -> class note
    classNotes: ClassNotesByDate

    // Event planning Kanban columns
    eventColumns: EventColumns

    // Operational expenses
    operationalExpenses: OperationalExpense[]

    // CRM
    crmLeads: CrmLead[]
    crmTasks: CrmTask[]
    trialClasses: TrialClass[]
    crmMessages: CrmMessage[]
    messageTemplates: MessageTemplate[]
    crmOpportunities: CrmOpportunity[]

    // Actions
    addStudent: (student: Student) => void
    updateStudent: (student: Student) => void
    deleteStudent: (studentId: string) => void
    setInstructors: (instructors: Instructor[]) => void
    setAttendance: (date: string, studentId: string, status: AttendanceStatus, slotId: string) => void
    setAssignment: (date: string, slotId: string, studentIds: string[]) => void
    moveStudent: (
        sourceDate: string,
        studentId: string,
        fromSlotId: string,
        toSlotId: string,
        targetDate?: string,
    ) => void
    setClassNote: (note: ClassNote) => void
    updateEventColumns: (updater: (columns: EventColumns) => EventColumns) => void

    // Expenses
    addExpense: (expense: OperationalExpense) => void
    updateExpense: (expense: OperationalExpense) => void
    deleteExpense: (expenseId: string) => void

    // CRM actions
    addCrmLead: (lead: CrmLead) => void
    updateCrmLead: (lead: CrmLead) => void
    moveCrmLead: (leadId: string, stage: PipelineStage, lostReason?: string) => void
    convertCrmLeadToStudent: (leadId: string) => void
    addCrmTask: (task: CrmTask) => void
    updateCrmTask: (task: CrmTask) => void
    addTrialClass: (trial: TrialClass) => void
    updateTrialClass: (trial: TrialClass) => void
    addCrmMessage: (message: CrmMessage) => void
    addMessageTemplate: (template: MessageTemplate) => void
    updateMessageTemplate: (template: MessageTemplate) => void

    // Backup local
    exportBackup: () => string
    importBackup: (json: string) => string | null
    resetAllData: () => void

    // Helpers
    getAssignmentsForDate: (date: Date) => Record<string, string[]>
    getAttendanceForDate: (date: Date) => Record<string, AttendanceStatus>
}

// ─── Backup local ──────────────────────────────────────────────────

// Campos incluídos no backup JSON e restaurados na importação
const backupFields = [
    'students',
    'instructors',
    'dailyAssignments',
    'dailyAttendance',
    'classNotes',
    'eventColumns',
    'operationalExpenses',
    'crmLeads',
    'crmTasks',
    'trialClasses',
    'crmMessages',
    'messageTemplates',
    'crmOpportunities',
] as const

type BackupField = (typeof backupFields)[number]
type BackupData = Pick<DashboardState, BackupField>

function createInitialEventColumns(): EventColumns {
    return { ideas: [], planning: [], promoting: [], done: [] }
}

function parseLocalDate(value: string): Date {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
}

function defaultAssignmentsForDate(date: Date, students: Student[]): Record<string, string[]> {
    const slots = getScheduleForDay(getWeekdayKey(date))
    return Object.fromEntries(slots.map(slot => [slot.id, students.filter(student =>
        student.status === 'Ativo' && student.classSlots?.includes(slot.id)
    ).map(student => student.id)]))
}

const stageLabels: Record<PipelineStage, string> = {
    new: 'Novo Lead',
    contacted: 'Primeiro Contato Feito',
    waiting: 'Aguardando Resposta',
    trial_scheduled: 'Aula Experimental Agendada',
    trial_confirmed: 'Aula Confirmada',
    attended: 'Compareceu à Aula',
    no_show: 'Não Compareceu',
    feedback_pending: 'Feedback Pós-Aula Pendente',
    plan_recommended: 'Plano Recomendado',
    negotiation: 'Negociação',
    enrolled: 'Matriculado',
    lost: 'Perdido',
    reactivation: 'Reativação Futura',
}

function automaticTaskForStage(lead: CrmLead, stage: PipelineStage): CrmTask | null {
    const now = new Date()
    const dueAt = new Date(now)
    let title = ''
    let type: CrmTask['type'] = 'follow_up'
    let priority: CrmTask['priority'] = 'medium'

    if (stage === 'new') {
        title = `Responder ${lead.studentName} em até 5 minutos`
        type = 'whatsapp'
        priority = 'high'
        dueAt.setMinutes(dueAt.getMinutes() + 5)
    } else if (stage === 'trial_scheduled') {
        title = `Confirmar aula experimental de ${lead.studentName}`
        type = 'confirm_trial'
        dueAt.setDate(dueAt.getDate() + 1)
    } else if (stage === 'attended' || stage === 'feedback_pending') {
        title = `Fazer feedback e apresentar plano para ${lead.studentName}`
        type = 'close_sale'
        priority = 'high'
        dueAt.setHours(dueAt.getHours() + 1)
    } else if (stage === 'no_show') {
        title = `Remarcar experimental de ${lead.studentName}`
        type = 'whatsapp'
        dueAt.setHours(dueAt.getHours() + 1)
    } else if (stage === 'negotiation') {
        title = `Follow-up da proposta de ${lead.studentName}`
        priority = 'high'
        dueAt.setDate(dueAt.getDate() + 1)
    } else {
        return null
    }

    return {
        id: `task-${newId()}`,
        title,
        leadId: lead.id,
        owner: lead.salesOwner || 'Danilo',
        dueAt: dueAt.toISOString(),
        type,
        status: 'pending',
        priority,
        notes: '',
        createdAt: now.toISOString(),
    }
}

// ─── Store ─────────────────────────────────────────────────────────

export const useStore = create<DashboardState>()(
        (set, get) => ({
            selectedDate: new Date(),
            setSelectedDate: (date) => set({ selectedDate: date }),

            students: [],
            instructors: [],

            dailyAssignments: {},
            dailyAttendance: {},
            classNotes: {},
            eventColumns: createInitialEventColumns(),
            operationalExpenses: [],
            crmLeads: [],
            crmTasks: [],
            trialClasses: [],
            crmMessages: [],
            messageTemplates: initialMessageTemplates,
            crmOpportunities: [],

            // ── Backup local ────────────────────────────────────────
            exportBackup: () => {
                const state = get()
                const data = Object.fromEntries(
                    backupFields.map((field) => [field, state[field]]),
                )
                return JSON.stringify(
                    { app: 'parkour-vicosa', version: 3, exportedAt: new Date().toISOString(), data },
                    null,
                    2,
                )
            },

            importBackup: (json) => {
                let parsed: unknown
                try {
                    parsed = JSON.parse(json)
                } catch {
                    return 'Arquivo inválido: não é um JSON válido.'
                }

                if (!parsed || typeof parsed !== 'object') return 'Backup inválido.'
                const backup = parsed as { app?: string; data?: Partial<BackupData> }
                const data = backup.data
                if (backup.app !== 'parkour-vicosa' || !data || !Array.isArray(data.students)) {
                    return 'Arquivo inválido: este não é um backup do painel Parkour Viçosa.'
                }

                const arrayFields = ['students', 'instructors', 'operationalExpenses', 'crmLeads', 'crmTasks', 'trialClasses', 'crmMessages', 'messageTemplates', 'crmOpportunities'] as const
                for (const field of arrayFields) {
                    if (data[field] !== undefined && (!Array.isArray(data[field]) || data[field]!.some(item => !item || typeof item.id !== 'string'))) return `Lista inválida: ${field}.`
                }
                for (const field of ['dailyAssignments', 'dailyAttendance', 'classNotes', 'eventColumns'] as const) {
                    if (data[field] !== undefined && (!data[field] || typeof data[field] !== 'object' || Array.isArray(data[field]))) return `Campo inválido: ${field}.`
                }
                for (const student of data.students) {
                    if (typeof student.name !== 'string' || ['attendanceHistory', 'paymentHistory', 'physicalAssessments', 'conditioningTests', 'skillAchievements'].some(key => !Array.isArray(student[key as keyof Student]))) return 'Cadastro de aluno inválido no backup.'
                }
                for (const lead of data.crmLeads ?? []) {
                    if (typeof lead.studentName !== 'string' || !Array.isArray(lead.history) || !Array.isArray(lead.tags)) return 'Lead inválido no backup.'
                }
                // Backups anteriores à versão 3 não possuem notas nem eventos
                // persistidos. Nesses casos, usa valores seguros em vez de manter
                // dados que já estavam abertos no navegador atual.
                const updates: Partial<DashboardState> = {
                    classNotes: data.classNotes ?? {},
                    eventColumns: data.eventColumns ?? createInitialEventColumns(),
                }
                for (const field of backupFields) {
                    if (data[field] !== undefined) {
                        updates[field] = data[field] as never
                    }
                }
                set(updates)
                return null
            },

            resetAllData: () => {
                set({
                    students: [],
                    instructors: [],
                    dailyAssignments: {},
                    dailyAttendance: {},
                    classNotes: {},
                    eventColumns: createInitialEventColumns(),
                    operationalExpenses: [],
                    crmLeads: [],
                    crmTasks: [],
                    trialClasses: [],
                    crmMessages: [],
                    messageTemplates: initialMessageTemplates,
                    crmOpportunities: [],
                })
            },

            // ── Mutations ───────────────────────────────────────────

            addStudent: (student) => {
                set((state) => ({
                    students: [student, ...state.students]
                }))
            },

            updateStudent: (student) => {
                set((state) => ({
                    students: state.students.map((s) => s.id === student.id ? student : s)
                }))
            },

            setInstructors: (instructors) => {
                set({ instructors })
            },

            addExpense: (expense) => {
                set((state) => {
                    const updated = [expense, ...state.operationalExpenses]
                    return { operationalExpenses: updated }
                })
            },

            updateExpense: (expense) => {
                set((state) => {
                    const updated = state.operationalExpenses.map(
                        (e) => e.id === expense.id ? expense : e
                    )
                    return { operationalExpenses: updated }
                })
            },

            deleteExpense: (expenseId) => {
                set((state) => {
                    const updated = state.operationalExpenses.filter((e) => e.id !== expenseId)
                    return { operationalExpenses: updated }
                })
            },

            addCrmLead: (lead) => {
                set((state) => {
                    const automaticTask = automaticTaskForStage(lead, lead.stage)
                    const next = {
                        crmLeads: [lead, ...state.crmLeads],
                        crmTasks: automaticTask ? [automaticTask, ...state.crmTasks] : state.crmTasks,
                    }
                    return next
                })
            },

            updateCrmLead: (lead) => {
                set((state) => {
                    const next = {
                        crmLeads: state.crmLeads.map((item) => item.id === lead.id ? lead : item),
                    }
                    return next
                })
            },

            moveCrmLead: (leadId, stage, lostReason = '') => {
                set((state) => {
                    const currentLead = state.crmLeads.find((lead) => lead.id === leadId)
                    if (!currentLead || currentLead.stage === stage) return state

                    const now = new Date().toISOString()
                    const updatedLead: CrmLead = {
                        ...currentLead,
                        stage,
                        lostReason: stage === 'lost' ? lostReason || currentLead.lostReason : currentLead.lostReason,
                        updatedAt: now,
                        tags: Array.from(new Set([
                            ...currentLead.tags.filter((tag) => tag !== 'Novo'),
                            ...(stage === 'enrolled' ? ['Matriculado'] : []),
                            ...(stage === 'lost' ? ['Perdido'] : []),
                        ])),
                        history: [
                            {
                                id: `history-${newId()}`,
                                type: 'stage',
                                description: `Etapa alterada para ${stageLabels[stage]}`,
                                createdAt: now,
                            },
                            ...currentLead.history,
                        ],
                    }
                    const automaticTask = automaticTaskForStage(updatedLead, stage)
                    const next = {
                        crmLeads: state.crmLeads.map((lead) => lead.id === leadId ? updatedLead : lead),
                        crmTasks: automaticTask ? [automaticTask, ...state.crmTasks] : state.crmTasks,
                    }
                    return next
                })
            },

            convertCrmLeadToStudent: (leadId) => {
                set((state) => {
                    const lead = state.crmLeads.find((item) => item.id === leadId)
                    if (!lead) return state

                    const studentId = `crm-${lead.id}`
                    const alreadyExists = state.students.some((student) => student.id === studentId)
                    if (alreadyExists) return state
                    const student: Student = {
                        id: studentId,
                        name: lead.studentName,
                        birthDate: lead.birthDate || '',
                        parentName: lead.guardianName,
                        parentContact: lead.whatsapp,
                        emergencyPhone: lead.whatsapp,
                        allergies: '',
                        status: 'Ativo',
                        registrationStatus: 'Incompleto',
                        paymentStatus: 'Pendente',
                        mainClass: lead.recommendedSchedule,
                        isTrial: false,
                        photoUrl: '',
                        enrolledAt: new Date().toISOString().slice(0, 10),
                        plan: 'Mensal',
                        monthlyFee: lead.presentedValue ?? 0,
                        attendanceHistory: [],
                        paymentHistory: [],
                        physicalAssessments: [],
                        conditioningTests: [],
                        skillAchievements: createDefaultSkillAchievements(),
                    }
                    const now = new Date().toISOString()
                    const updatedLead: CrmLead = {
                        ...lead,
                        stage: 'enrolled',
                        updatedAt: now,
                        tags: Array.from(new Set([...lead.tags.filter((tag) => tag !== 'Lead'), 'Matriculado'])),
                        history: [
                            {
                                id: `history-${newId()}`,
                                type: 'enrollment',
                                description: 'Lead convertido em aluno e onboarding iniciado',
                                createdAt: now,
                            },
                            ...lead.history,
                        ],
                    }
                    const onboardingTasks: CrmTask[] = [
                        'Confirmar pagamento e plano',
                        'Enviar boas-vindas e horários',
                        'Adicionar ao grupo de WhatsApp correto',
                    ].map((title, index) => ({
                        id: `task-${newId()}`,
                        title: `${title}: ${lead.studentName}`,
                        leadId,
                        owner: lead.salesOwner || 'Danilo',
                        dueAt: new Date(Date.now() + index * 60 * 60 * 1000).toISOString(),
                        type: index === 0 ? 'close_sale' : 'whatsapp',
                        status: 'pending',
                        priority: index === 0 ? 'high' : 'medium',
                        notes: 'Checklist automático de onboarding.',
                        createdAt: now,
                    }))
                    const next = {
                        students: alreadyExists ? state.students : [student, ...state.students],
                        crmLeads: state.crmLeads.map((item) => item.id === leadId ? updatedLead : item),
                        crmTasks: [...onboardingTasks, ...state.crmTasks],
                    }
                    return next
                })
            },

            addCrmTask: (task) => {
                set((state) => {
                    const next = { crmTasks: [task, ...state.crmTasks] }
                    return next
                })
            },

            updateCrmTask: (task) => {
                set((state) => {
                    const next = {
                        crmTasks: state.crmTasks.map((item) => item.id === task.id ? task : item),
                    }
                    return next
                })
            },

            addTrialClass: (trial) => {
                set((state) => {
                    const lead = state.crmLeads.find((item) => item.id === trial.leadId)
                    const now = new Date().toISOString()
                    const updatedLeads = lead
                        ? state.crmLeads.map((item) => item.id === trial.leadId
                            ? {
                                ...item,
                                stage: 'trial_scheduled' as const,
                                nextAction: 'Confirmar aula experimental',
                                nextActionAt: trial.nextFollowUpAt,
                                updatedAt: now,
                                history: [
                                    {
                                        id: `history-${newId()}`,
                                        type: 'trial' as const,
                                        description: `Aula experimental agendada para ${trial.date} às ${trial.time}`,
                                        createdAt: now,
                                    },
                                    ...item.history,
                                ],
                            }
                            : item)
                        : state.crmLeads
                    const next = {
                        trialClasses: [trial, ...state.trialClasses],
                        crmLeads: updatedLeads,
                    }
                    return next
                })
            },

            updateTrialClass: (trial) => {
                set((state) => {
                    const stage: PipelineStage | null =
                        trial.status === 'confirmed' ? 'trial_confirmed'
                            : trial.status === 'no_show' ? 'no_show'
                                : trial.status === 'attended' && !trial.planPresented ? 'feedback_pending'
                                    : trial.status === 'attended' && trial.planPresented ? 'plan_recommended'
                                        : null
                    const currentLead = state.crmLeads.find((lead) => lead.id === trial.leadId)
                    const updatedLeads = stage
                        ? state.crmLeads.map((lead) => lead.id === trial.leadId
                            ? {
                                ...lead,
                                stage,
                                recommendedPlan: trial.recommendedPlan || lead.recommendedPlan,
                                nextAction: trial.planPresented ? 'Pedir matrícula' : 'Dar feedback e apresentar plano',
                                nextActionAt: trial.nextFollowUpAt,
                                updatedAt: new Date().toISOString(),
                            }
                            : lead)
                        : state.crmLeads
                    const updatedLead = updatedLeads.find((lead) => lead.id === trial.leadId)
                    const automaticTask = stage && currentLead?.stage !== stage && updatedLead
                        ? automaticTaskForStage(updatedLead, stage)
                        : null
                    const next = {
                        trialClasses: state.trialClasses.map((item) => item.id === trial.id ? trial : item),
                        crmLeads: updatedLeads,
                        crmTasks: automaticTask ? [automaticTask, ...state.crmTasks] : state.crmTasks,
                    }
                    return next
                })
            },

            addCrmMessage: (message) => {
                set((state) => {
                    const next = {
                        crmMessages: [message, ...state.crmMessages],
                        crmLeads: state.crmLeads.map((lead) => lead.id === message.leadId
                            ? {
                                ...lead,
                                lastContactAt: message.createdAt,
                                updatedAt: message.createdAt,
                                history: [
                                    {
                                        id: `history-${newId()}`,
                                        type: 'message' as const,
                                        description: message.direction === 'internal'
                                            ? 'Observação interna registrada'
                                            : `Mensagem ${message.direction === 'incoming' ? 'recebida' : 'enviada'}`,
                                        createdAt: message.createdAt,
                                    },
                                    ...lead.history,
                                ],
                            }
                            : lead),
                    }
                    return next
                })
            },

            addMessageTemplate: (template) => {
                set((state) => {
                    const next = { messageTemplates: [template, ...state.messageTemplates] }
                    return next
                })
            },

            updateMessageTemplate: (template) => {
                set((state) => {
                    const next = {
                        messageTemplates: state.messageTemplates.map((item) => item.id === template.id ? template : item),
                    }
                    return next
                })
            },

            deleteStudent: (studentId) => {
                set((state) => ({
                    students: state.students.filter((s) => s.id !== studentId)
                }))
            },

            setAttendance: (date, studentId, status, slotId) => {
                set((state) => {
                    if (!state.students.some((student) => student.id === studentId)) return state
                    if (status !== 'none' && !slotId) return state

                    const attendanceForDate = {
                        ...(state.dailyAttendance[date] || {}),
                    }
                    if (status === 'none') {
                        delete attendanceForDate[studentId]
                    } else {
                        attendanceForDate[studentId] = status
                    }

                    const students = state.students.map((student) => {
                        if (student.id !== studentId) return student

                        const history = student.attendanceHistory ?? []
                        const previousRecord = history.find(
                            (record) => record.date === date && record.slotId === slotId,
                        )
                        const historyWithoutSession = history.filter(
                            (record) => record.date !== date || record.slotId !== slotId,
                        )

                        return {
                            ...student,
                            attendanceHistory: status === 'none'
                                ? historyWithoutSession
                                : [
                                    {
                                        ...previousRecord,
                                        date,
                                        status,
                                        slotId,
                                    },
                                    ...historyWithoutSession,
                                ],
                        }
                    })

                    return {
                        students,
                        dailyAttendance: {
                            ...state.dailyAttendance,
                            [date]: attendanceForDate,
                        },
                    }
                })
            },

            setAssignment: (date, slotId, studentIds) => {
                set((state) => {
                    const assignmentsForDate = {
                        ...defaultAssignmentsForDate(parseLocalDate(date), state.students),
                        ...(state.dailyAssignments[date] || {}),
                    }
                    const updated = {
                        ...state.dailyAssignments,
                        [date]: {
                            ...assignmentsForDate,
                            [slotId]: studentIds
                        }
                    }
                    return { dailyAssignments: updated }
                })
            },

            moveStudent: (sourceDate, studentId, fromSlotId, toSlotId, targetDate = sourceDate) => {
                set((state) => {
                    const sourceAssignments = {
                        ...defaultAssignmentsForDate(parseLocalDate(sourceDate), state.students),
                        ...(state.dailyAssignments[sourceDate] || {}),
                    }
                    const sourceWithoutStudent = {
                        ...sourceAssignments,
                        [fromSlotId]: (sourceAssignments[fromSlotId] || []).filter((id) => id !== studentId),
                    }

                    if (sourceDate === targetDate) {
                        const targetItems = (sourceWithoutStudent[toSlotId] || []).filter((id) => id !== studentId)
                        return {
                            dailyAssignments: {
                                ...state.dailyAssignments,
                                [sourceDate]: {
                                    ...sourceWithoutStudent,
                                    [toSlotId]: [...targetItems, studentId],
                                },
                            },
                        }
                    }

                    const targetAssignments = {
                        ...defaultAssignmentsForDate(parseLocalDate(targetDate), state.students),
                        ...(state.dailyAssignments[targetDate] || {}),
                    }
                    const targetWithoutStudent = Object.fromEntries(
                        Object.entries(targetAssignments).map(([slotId, ids]) => [
                            slotId,
                            ids.filter((id) => id !== studentId),
                        ]),
                    )

                    return {
                        dailyAssignments: {
                            ...state.dailyAssignments,
                            [sourceDate]: sourceWithoutStudent,
                            [targetDate]: {
                                ...targetWithoutStudent,
                                [toSlotId]: [...(targetWithoutStudent[toSlotId] || []), studentId],
                            },
                        },
                    }
                })
            },

            setClassNote: (note) => {
                set((state) => ({
                    classNotes: {
                        ...state.classNotes,
                        [note.date]: {
                            ...(state.classNotes[note.date] || {}),
                            [note.slotId]: {
                                ...note,
                                content: note.content.trim(),
                            },
                        },
                    },
                }))
            },

            updateEventColumns: (updater) => {
                set((state) => ({ eventColumns: updater(state.eventColumns) }))
            },

            getAssignmentsForDate: (date) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const existing = get().dailyAssignments[dateStr]
                return {
                    ...defaultAssignmentsForDate(date, get().students),
                    ...(existing || {}),
                }
            },

            getAttendanceForDate: (date) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                return get().dailyAttendance[dateStr] || {}
            }
        })
)
