import { create } from 'zustand'
import { dbService, Student } from '../services/db'

interface StudentState {
    students: Student[]
    classes: any[]
    schoolYears: any[]
    subjects: any[]
    selectedClass: string
    selectedYear: string
    searchTerm: string
    loading: boolean

    setSelectedClass: (id: string) => void
    setSelectedYear: (id: string) => void
    setSearchTerm: (term: string) => void
    fetchMetadata: () => Promise<void>
    fetchStudents: (yearId?: string) => Promise<void>
    deleteStudent: (id: string) => Promise<void>
}

export const useStudentStore = create<StudentState>((set, get) => ({
    students: [],
    classes: [],
    schoolYears: [],
    subjects: [],
    selectedClass: 'all',
    selectedYear: '',
    searchTerm: '',
    loading: false,

    setSelectedClass: (selectedClass) => set({ selectedClass }),
    setSelectedYear: (selectedYear) => {
        set({ selectedYear })
        get().fetchStudents(selectedYear)
    },
    setSearchTerm: (searchTerm) => set({ searchTerm }),

    fetchMetadata: async () => {
        try {
            const [classData, yearData, subjectsData] = await Promise.all([
                dbService.getClasses(),
                dbService.getSchoolYears(),
                dbService.getSubjects()
            ])
            const activeYear = yearData.find((y: any) => y.is_active)
            const defaultYear = activeYear ? activeYear.id.toString() : yearData[0]?.id?.toString() || ''
            set({ classes: classData, schoolYears: yearData, subjects: subjectsData, selectedYear: defaultYear })
            if (defaultYear) get().fetchStudents(defaultYear)
        } catch (error) {
            console.error('[StudentStore] fetchMetadata failed:', error)
        }
    },

    fetchStudents: async (yearId?: string) => {
        const year = yearId || get().selectedYear
        if (!year) return
        set({ loading: true })
        try {
            const data = await dbService.getStudents(year)
            set({ students: data })
        } catch (error) {
            console.error('[StudentStore] fetchStudents failed:', error)
        } finally {
            set({ loading: false })
        }
    },

    deleteStudent: async (id: string) => {
        await dbService.deleteStudent(id)
        set(state => ({ students: state.students.filter(s => s.id !== id) }))
    },
}))
