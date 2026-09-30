import { create } from 'zustand'
import { dbService } from '../services/db'

interface SchoolState {
    classes: any[]
    schoolYears: any[]
    subjects: any[]
    schoolInfo: any | null
    schoolLevels: string[]
    activeYear: any | null
    loading: boolean

    fetchAll: () => Promise<void>
    fetchSchoolInfo: () => Promise<void>
    addClass: (data: { name: string; level: string }) => Promise<void>
    deleteClass: (id: string) => Promise<void>
    addSchoolYear: (year: any) => Promise<void>
    updateSchoolYear: (year: any) => Promise<void>
    deleteSchoolYear: (id: string) => Promise<void>
    addSubject: (data: { name: string; coefficient: number }) => Promise<void>
    deleteSubject: (id: string) => Promise<void>
    updateSchoolInfo: (info: any) => Promise<void>
}

export const useSchoolStore = create<SchoolState>((set, get) => ({
    classes: [],
    schoolYears: [],
    subjects: [],
    schoolInfo: null,
    schoolLevels: [],
    activeYear: null,
    loading: false,

    fetchAll: async () => {
        set({ loading: true })
        try {
            const [classes, schoolYears, subjects] = await Promise.all([
                dbService.getClasses(),
                dbService.getSchoolYears(),
                dbService.getSubjects()
            ])
            set({
                classes,
                schoolYears,
                subjects,
                activeYear: schoolYears.find((y: any) => y.is_active) || null
            })
        } finally {
            set({ loading: false })
        }
    },

    fetchSchoolInfo: async () => {
        const info = await dbService.getSchoolInfo()
        let schoolLevels: string[] = []
        try { schoolLevels = JSON.parse(info?.levels || '[]') } catch {}
        set({ schoolInfo: info, schoolLevels })
    },

    addClass: async (data) => {
        await dbService.addClass(data)
        await get().fetchAll()
    },

    deleteClass: async (id) => {
        await dbService.deleteClass(id)
        set(state => ({ classes: state.classes.filter(c => c.id !== id) }))
    },

    addSchoolYear: async (year) => {
        await dbService.addSchoolYear(year)
        await get().fetchAll()
    },

    updateSchoolYear: async (year) => {
        await dbService.updateSchoolYear(year)
        await get().fetchAll()
    },

    deleteSchoolYear: async (id) => {
        await dbService.deleteSchoolYear(id)
        set(state => ({ schoolYears: state.schoolYears.filter(y => y.id !== id) }))
    },

    addSubject: async (data) => {
        await dbService.addSubject(data)
        await get().fetchAll()
    },

    deleteSubject: async (id) => {
        await dbService.deleteSubject(id)
        set(state => ({ subjects: state.subjects.filter(s => s.id !== id) }))
    },

    updateSchoolInfo: async (info) => {
        await dbService.updateSchoolInfo(info)
        set({ schoolInfo: info })
    },
}))
