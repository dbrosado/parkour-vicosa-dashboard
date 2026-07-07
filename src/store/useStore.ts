import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { format } from 'date-fns'
import {
    type CrmLead,
    type CrmMessage,
    type CrmOpportunity,
    type CrmTask,
    type Instructor,
    type MessageTemplate,
    type PipelineStage,
    type Student,
    type AttendanceStatus,
    type OperationalExpense,
    type TrialClass,
} from '../types'
import { initialInstructors, initialStudents, initialWeeklyAssignments } from '../data/mock-data'
import {
    initialCrmLeads,
    initialCrmMessages,
    initialCrmOpportunities,
    initialCrmTasks,
    initialMessageTemplates,
    initialTrialClasses,
} from '../data/crm-data'
import { getScheduleForDay, getWeekdayKey } from '../data/schedule'
import { createDefaultSkillAchievements } from '../data/skills-data'

interface DashboardState {
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
    setAttendance: (date: string, studentId: string, status: AttendanceStatus) => void
    setAssignment: (date: string, slotId: string, studentIds: string[]) => void
    moveStudent: (date: string, studentId: string, fromSlotId: string, toSlotId: string) => void

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
        id: `task-${crypto.randomUUID()}`,
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
    persist(
        (set, get) => ({
            selectedDate: new Date(),
            setSelectedDate: (date) => set({ selectedDate: date }),

            students: initialStudents,
            instructors: initialInstructors,

            dailyAssignments: {},
            dailyAttendance: {},
            operationalExpenses: [],
            crmLeads: initialCrmLeads,
            crmTasks: initialCrmTasks,
            trialClasses: initialTrialClasses,
            crmMessages: initialCrmMessages,
            messageTemplates: initialMessageTemplates,
            crmOpportunities: initialCrmOpportunities,

            // ── Backup local ────────────────────────────────────────
            exportBackup: () => {
                const state = get()
                const data = Object.fromEntries(
                    backupFields.map((field) => [field, state[field]]),
                )
                return JSON.stringify(
                    { app: 'parkour-vicosa', version: 2, exportedAt: new Date().toISOString(), data },
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

                const backup = parsed as { app?: string; data?: Partial<BackupData> }
                const data = backup.data
                if (backup.app !== 'parkour-vicosa' || !data || !Array.isArray(data.students)) {
                    return 'Arquivo inválido: este não é um backup do painel Parkour Viçosa.'
                }

                const updates: Partial<DashboardState> = {}
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
                    students: initialStudents,
                    instructors: initialInstructors,
                    dailyAssignments: {},
                    dailyAttendance: {},
                    operationalExpenses: [],
                    crmLeads: initialCrmLeads,
                    crmTasks: initialCrmTasks,
                    trialClasses: initialTrialClasses,
                    crmMessages: initialCrmMessages,
                    messageTemplates: initialMessageTemplates,
                    crmOpportunities: initialCrmOpportunities,
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
                                id: `history-${crypto.randomUUID()}`,
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
                    const birthYear = new Date().getFullYear() - (lead.age ?? 10)
                    const student: Student = {
                        id: studentId,
                        name: lead.studentName,
                        birthDate: lead.birthDate || `${birthYear}-01-01`,
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
                                id: `history-${crypto.randomUUID()}`,
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
                        id: `task-${crypto.randomUUID()}`,
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
                                        id: `history-${crypto.randomUUID()}`,
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
                                        id: `history-${crypto.randomUUID()}`,
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

            setAttendance: (date, studentId, status) => {
                set((state) => {
                    const updated = {
                        ...state.dailyAttendance,
                        [date]: {
                            ...(state.dailyAttendance[date] || {}),
                            [studentId]: status
                        }
                    }
                    return { dailyAttendance: updated }
                })
            },

            setAssignment: (date, slotId, studentIds) => {
                set((state) => {
                    const updated = {
                        ...state.dailyAssignments,
                        [date]: {
                            ...(state.dailyAssignments[date] || {}),
                            [slotId]: studentIds
                        }
                    }
                    return { dailyAssignments: updated }
                })
            },

            moveStudent: (date, studentId, fromSlotId, toSlotId) => set((state) => {
                const dateAssignments = state.dailyAssignments[date] || get().getAssignmentsForDate(new Date(date))
                const fromItems = (dateAssignments[fromSlotId] || []).filter(id => id !== studentId)
                const toItems = [...(dateAssignments[toSlotId] || []), studentId]

                const updated = {
                    ...state.dailyAssignments,
                    [date]: {
                        ...dateAssignments,
                        [fromSlotId]: fromItems,
                        [toSlotId]: toItems
                    }
                }
                return { dailyAssignments: updated }
            }),

            getAssignmentsForDate: (date) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                const existing = get().dailyAssignments[dateStr]
                if (existing) return existing

                const weekday = getWeekdayKey(date)
                const slots = getScheduleForDay(weekday)
                const weeklyBase = initialWeeklyAssignments[weekday] || {}

                return Object.fromEntries(
                    slots.map((slot) => [slot.id, [...(weeklyBase[slot.id] || [])]])
                )
            },

            getAttendanceForDate: (date) => {
                const dateStr = format(date, 'yyyy-MM-dd')
                return get().dailyAttendance[dateStr] || {}
            }
        }),
        {
            name: 'parkour-vicosa-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                students: state.students,
                instructors: state.instructors,
                dailyAssignments: state.dailyAssignments,
                dailyAttendance: state.dailyAttendance,
                operationalExpenses: state.operationalExpenses,
                crmLeads: state.crmLeads,
                crmTasks: state.crmTasks,
                trialClasses: state.trialClasses,
                crmMessages: state.crmMessages,
                messageTemplates: state.messageTemplates,
                crmOpportunities: state.crmOpportunities,
            }),
        }
    )
)
