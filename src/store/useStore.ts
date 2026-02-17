import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { format } from 'date-fns'
import {
    type Instructor,
    type Student,
    type AttendanceStatus
} from '../types'
import { initialInstructors, initialStudents, initialWeeklyAssignments } from '../data/mock-data'
import { getScheduleForDay, getWeekdayKey } from '../data/schedule'
import { supabase } from '../lib/supabase'

interface DashboardState {
    // Navigation
    selectedDate: Date
    setSelectedDate: (date: Date) => void

    // Data
    students: Student[]
    instructors: Instructor[]
    hydrated: boolean

    // date string (YYYY-MM-DD) -> slotId -> studentIds[]
    dailyAssignments: Record<string, Record<string, string[]>>

    // date string (YYYY-MM-DD) -> studentId -> AttendanceStatus
    dailyAttendance: Record<string, Record<string, AttendanceStatus>>

    // Actions
    addStudent: (student: Student) => void
    updateStudent: (student: Student) => void
    deleteStudent: (studentId: string) => void
    setAttendance: (date: string, studentId: string, status: AttendanceStatus) => void
    setAssignment: (date: string, slotId: string, studentIds: string[]) => void
    moveStudent: (date: string, studentId: string, fromSlotId: string, toSlotId: string) => void

    // Supabase sync
    loadFromSupabase: () => Promise<void>
    syncStudentToSupabase: (student: Student) => Promise<void>

    // Helpers
    getAssignmentsForDate: (date: Date) => Record<string, string[]>
    getAttendanceForDate: (date: Date) => Record<string, AttendanceStatus>
}

// ─── Supabase helpers ──────────────────────────────────────────────

async function sbUpsertStudent(student: Student) {
    if (!supabase) return
    await supabase
        .from('students')
        .upsert({ id: student.id, data: student, updated_at: new Date().toISOString() })
}

async function sbDeleteStudent(studentId: string) {
    if (!supabase) return
    await supabase.from('students').delete().eq('id', studentId)
}

async function sbSaveAppState(key: string, data: unknown) {
    if (!supabase) return
    await supabase
        .from('app_state')
        .upsert({ key, data, updated_at: new Date().toISOString() })
}

// ─── Store ─────────────────────────────────────────────────────────

export const useStore = create<DashboardState>()(
    persist(
        (set, get) => ({
            selectedDate: new Date(),
            setSelectedDate: (date) => set({ selectedDate: date }),

            students: initialStudents,
            instructors: initialInstructors,
            hydrated: false,

            dailyAssignments: {},
            dailyAttendance: {},

            // ── Load data from Supabase ─────────────────────────────
            loadFromSupabase: async () => {
                if (!supabase) {
                    set({ hydrated: true })
                    return
                }

                try {
                    const [studentsRes, instructorsRes, assignmentsRes, attendanceRes] =
                        await Promise.all([
                            supabase.from('students').select('id, data'),
                            supabase.from('instructors').select('id, data'),
                            supabase.from('app_state').select('data').eq('key', 'daily_assignments').single(),
                            supabase.from('app_state').select('data').eq('key', 'daily_attendance').single(),
                        ])

                    const updates: Partial<DashboardState> = { hydrated: true }

                    if (studentsRes.data && studentsRes.data.length > 0) {
                        updates.students = studentsRes.data.map(
                            (row: { id: string; data: Student }) => ({ ...row.data, id: row.id }),
                        )
                    }

                    if (instructorsRes.data && instructorsRes.data.length > 0) {
                        updates.instructors = instructorsRes.data.map(
                            (row: { id: string; data: Instructor }) => ({ ...row.data, id: row.id }),
                        )
                    }

                    if (assignmentsRes.data?.data) {
                        updates.dailyAssignments = assignmentsRes.data
                            .data as Record<string, Record<string, string[]>>
                    }

                    if (attendanceRes.data?.data) {
                        updates.dailyAttendance = attendanceRes.data
                            .data as Record<string, Record<string, AttendanceStatus>>
                    }

                    set(updates)
                } catch (err) {
                    console.error('Failed to load from Supabase:', err)
                    set({ hydrated: true })
                }
            },

            syncStudentToSupabase: async (student) => {
                await sbUpsertStudent(student)
            },

            // ── Mutations ───────────────────────────────────────────

            addStudent: (student) => {
                set((state) => ({
                    students: [student, ...state.students]
                }))
                sbUpsertStudent(student)
            },

            updateStudent: (student) => {
                set((state) => ({
                    students: state.students.map((s) => s.id === student.id ? student : s)
                }))
                sbUpsertStudent(student)
            },

            deleteStudent: (studentId) => {
                set((state) => ({
                    students: state.students.filter((s) => s.id !== studentId)
                }))
                sbDeleteStudent(studentId)
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
                    sbSaveAppState('daily_attendance', updated)
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
                    sbSaveAppState('daily_assignments', updated)
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
                sbSaveAppState('daily_assignments', updated)
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
                dailyAssignments: state.dailyAssignments,
                dailyAttendance: state.dailyAttendance,
            }),
        }
    )
)
