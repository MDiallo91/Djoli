import { describe, it, expect, beforeAll } from 'vitest'
import path from 'node:path'
import type { DbPersistenceAdapter } from '../db/types'

// Handlers partagés testables comme de simples fonctions (effet positif du
// portage Phase 2) — un vrai sql.js en mémoire, aucun mock d'Electron requis.
function makeMemoryAdapter(): DbPersistenceAdapter {
    let globalBytes: Uint8Array | null = null
    const schoolBytes: Record<string, Uint8Array> = {}
    return {
        loadGlobal: () => globalBytes,
        saveGlobal: (bytes) => { globalBytes = bytes },
        loadSchool: (id) => schoolBytes[id] ?? null,
        saveSchool: (id, bytes) => { schoolBytes[id] = bytes },
        locateSqlWasmFile: (file) => path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    }
}

describe('shared/services/studentService', () => {
    let studentHandlers: typeof import('./studentService')['studentHandlers']
    let schoolHandlers: Record<string, (...args: any[]) => any>

    beforeAll(async () => {
        const { initDatabase, switchSchoolDatabase } = await import('../db/core')
        await initDatabase(makeMemoryAdapter())
        await switchSchoolDatabase('school-test')

        studentHandlers = (await import('./studentService')).studentHandlers
        const { createSchoolHandlers } = await import('./schoolService')
        schoolHandlers = createSchoolHandlers({
            reinitDatabase: async () => {},
            requestLevels: async () => ({ levels: [], pendingLevels: [] }),
            refreshAccessToken: async () => null,
        })
    })

    it('add-student crée un élève et son inscription', () => {
        const year = schoolHandlers['add-school-year']({ name: '2025-2026', start_date: '2025-09-01', end_date: '2026-06-30', is_active: true })
        const klass = schoolHandlers['add-class']({ name: '6ème A', level: 'Collège' })

        const res = studentHandlers['add-student']({
            student: { first_name: 'Mariam', last_name: 'Diallo', gender: 'F' },
            parent:  { first_name: 'Sekou', last_name: 'Diallo', phone: '622333444' },
            enrollment: { class_id: klass.id, school_year_id: year.id },
        })

        expect(res.studentId).toBeTruthy()
        const students = studentHandlers['get-students']() as any[]
        expect(students).toHaveLength(1)
        expect(students[0].first_name).toBe('Mariam')
        expect(students[0].class_name).toBe('6ème A')
    })

    it('add-student rejette une classe inexistante', () => {
        const year = schoolHandlers['add-school-year']({ name: '2026-2027', start_date: '2026-09-01', end_date: '2027-06-30', is_active: false })
        expect(() => studentHandlers['add-student']({
            student: { first_name: 'Xavier', last_name: 'Yattara', gender: 'M' },
            parent:  {},
            enrollment: { class_id: 'classe-inexistante', school_year_id: year.id },
        })).toThrow(/classe/i)
    })

    it('delete-student supprime l\'élève et ses inscriptions', () => {
        const year = schoolHandlers['add-school-year']({ name: '2027-2028', start_date: '2027-09-01', end_date: '2028-06-30', is_active: false })
        const klass = schoolHandlers['add-class']({ name: 'CM2', level: 'Primaire' })
        const res = studentHandlers['add-student']({
            student: { first_name: 'Aboubacar', last_name: 'Sow', gender: 'M' },
            parent:  {},
            enrollment: { class_id: klass.id, school_year_id: year.id },
        })

        const before = (studentHandlers['get-students']() as any[]).length
        studentHandlers['delete-student'](res.studentId)
        const after = (studentHandlers['get-students']() as any[]).length
        expect(after).toBe(before - 1)
    })

    it('get-stats compte les élèves, le personnel et les classes', () => {
        const stats = studentHandlers['get-stats']() as any
        expect(stats).toHaveProperty('studentCount')
        expect(stats).toHaveProperty('staffCount')
        expect(stats).toHaveProperty('classCount')
    })
})
