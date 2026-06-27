import { ipcMain } from 'electron'
import crypto from 'node:crypto'
import db, { initDatabase } from '../db'
import { currentUser } from '../currentSession'
import { trackChange } from '../syncTracker'

export function registerSchoolHandlers() {

    ipcMain.handle('get-school-years', () => {
        return db.prepare('SELECT * FROM school_years WHERE deleted_at IS NULL ORDER BY start_date DESC').all()
    })

    ipcMain.handle('add-school-year', (_event, year: any) => {
        const { name, start_date, end_date, is_active } = year
        if (!name) throw new Error('Nom de l\'année requis')
        const now = new Date().toISOString()
        if (is_active) db.prepare('UPDATE school_years SET is_active = 0').run()
        const id = crypto.randomUUID()
        db.prepare('INSERT INTO school_years (id, name, start_date, end_date, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, name, start_date, end_date, is_active ? 1 : 0, now, now)
        trackChange('INSERT', 'school_year', id, { id, name, start_date, end_date, is_active: is_active ? 1 : 0, created_at: now, updated_at: now })
        return { success: true, id }
    })

    ipcMain.handle('update-school-year', (_event, year: any) => {
        const { id, name, start_date, end_date, is_active } = year
        const now = new Date().toISOString()
        if (is_active) db.prepare('UPDATE school_years SET is_active = 0').run()
        db.prepare('UPDATE school_years SET name=?, start_date=?, end_date=?, is_active=?, updated_at=? WHERE id=?').run(name, start_date, end_date, is_active ? 1 : 0, now, id)
        const updated = db.prepare('SELECT * FROM school_years WHERE id = ?').get(id) as any
        if (updated) trackChange('UPDATE', 'school_year', id, updated)
        return { success: true }
    })

    ipcMain.handle('delete-school-year', (_event, id: string) => {
        const now = new Date().toISOString()
        db.prepare('UPDATE school_years SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id)
        trackChange('DELETE', 'school_year', id, null)
        return { success: true }
    })

    ipcMain.removeHandler('get-classes')
    ipcMain.handle('get-classes', () => {
        const scopeLevels = currentUser?.scope_levels ?? []
        if (scopeLevels.length === 0) {
            return db.prepare('SELECT * FROM classes WHERE deleted_at IS NULL ORDER BY name ASC').all()
        }
        const placeholders = scopeLevels.map(() => '?').join(',')
        return db.prepare(`SELECT * FROM classes WHERE deleted_at IS NULL AND level IN (${placeholders}) ORDER BY name ASC`).all(...scopeLevels)
    })

    ipcMain.handle('add-class', (_event, info: any) => {
        const { name, level } = info
        if (!name) throw new Error('Nom de la classe requis')
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        db.prepare('INSERT INTO classes (id, name, level, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, name, level, now, now)
        trackChange('INSERT', 'class', id, { id, name, level, created_at: now, updated_at: now })
        return { success: true, id }
    })

    ipcMain.handle('delete-class', (_event, id: string) => {
        const now = new Date().toISOString()
        db.prepare('UPDATE classes SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id)
        trackChange('DELETE', 'class', id, null)
        return { success: true }
    })

    ipcMain.handle('update-class-tuition', (_event, data: { classId: string, tuitionFee: number }) => {
        const { classId, tuitionFee } = data
        if (tuitionFee < 0) throw new Error('Le montant des frais ne peut pas être négatif')
        return db.prepare('UPDATE classes SET tuition_fee = ? WHERE id = ?').run(tuitionFee, classId)
    })

    ipcMain.handle('get-subjects', () => {
        return db.prepare('SELECT * FROM subjects WHERE deleted_at IS NULL ORDER BY name ASC').all()
    })

    ipcMain.handle('add-subject', (_event, info: any) => {
        const { name, coefficient, level } = info
        if (!name) throw new Error('Nom de la matière requis')
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        db.prepare('INSERT INTO subjects (id, name, coefficient, level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, coefficient || 1, level ?? null, now, now)
        trackChange('INSERT', 'subject', id, { id, name, coefficient: coefficient || 1, level: level ?? null, created_at: now, updated_at: now })
        return { success: true, id }
    })

    ipcMain.handle('delete-subject', (_event, id: string) => {
        const now = new Date().toISOString()
        db.prepare('UPDATE subjects SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id)
        trackChange('DELETE', 'subject', id, null)
        return { success: true }
    })

    ipcMain.handle('get-school-info', () => {
        return db.prepare('SELECT * FROM school_info WHERE id = 1').get()
    })

    ipcMain.handle('update-school-info', (_event, info: any) => {
        const { name, address, phone, email, logo_url, motto, city, region, commune, sous_prefecture, director_name, color_sidebar, color_accent, levels } = info
        const levelsJson = JSON.stringify(Array.isArray(levels) ? levels : [])
        return db.prepare(`UPDATE school_info SET
            name=?, address=?, phone=?, email=?, logo_url=?, motto=?,
            city=?, region=?, commune=?, sous_prefecture=?,
            director_name=?, color_sidebar=?, color_accent=?, levels=?
            WHERE id=1`
        ).run(name, address, phone, email, logo_url, motto,
              city ?? null, region ?? null, commune ?? null, sous_prefecture ?? null,
              director_name ?? null, color_sidebar ?? '#1a2f6e', color_accent ?? '#2563eb', levelsJson)
    })

    ipcMain.handle('get-timetable', (_event, classId: number) => {
        return db.prepare(`
            SELECT t.*, s.name as subject_name, st.first_name as teacher_first, st.last_name as teacher_last
            FROM timetables t
            JOIN subjects s ON t.subject_id = s.id
            JOIN staff st ON t.teacher_id = st.id
            WHERE t.class_id = ?
        `).all(classId)
    })

    ipcMain.handle('add-timetable-entry', (_event, entry: any) => {
        const { class_id, subject_id, teacher_id, day_of_week, start_time, end_time } = entry
        const id = crypto.randomUUID()
        db.prepare('INSERT INTO timetables (id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time)
        return { success: true, id }
    })

    ipcMain.handle('delete-timetable-entry', (_event, id: string) => {
        return db.prepare('DELETE FROM timetables WHERE id = ?').run(id)
    })

    ipcMain.handle('get-composition-schedules', () => {
        return db.prepare('SELECT * FROM composition_schedules WHERE deleted_at IS NULL ORDER BY created_at DESC').all()
    })

    ipcMain.handle('add-composition-schedule', (_event, data: any) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        db.prepare('INSERT INTO composition_schedules (id, name, term, school_year_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, data.name, data.term ?? null, data.school_year_id ?? null, now, now)
        return { success: true, id }
    })

    ipcMain.handle('delete-composition-schedule', (_event, id: string) => {
        const now = new Date().toISOString()
        db.prepare('UPDATE composition_schedules SET deleted_at = ? WHERE id = ?').run(now, id)
        db.prepare('UPDATE composition_schedule_entries SET deleted_at = ? WHERE schedule_id = ?').run(now, id)
        return { success: true }
    })

    ipcMain.handle('get-composition-schedule-entries', (_event, scheduleId: string) => {
        return db.prepare(`
            SELECT e.*, s.name as subject_name
            FROM composition_schedule_entries e
            JOIN subjects s ON e.subject_id = s.id
            WHERE e.schedule_id = ? AND e.deleted_at IS NULL
            ORDER BY e.start_time, e.day_of_week
        `).all(scheduleId)
    })

    ipcMain.handle('add-composition-schedule-entry', (_event, data: any) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const classIds = JSON.stringify(Array.isArray(data.class_ids) ? data.class_ids : [])
        db.prepare('INSERT INTO composition_schedule_entries (id, schedule_id, subject_id, day_of_week, start_time, end_time, class_ids, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
            .run(id, data.schedule_id, data.subject_id, data.day_of_week, data.start_time, data.end_time, classIds, data.notes ?? null, now, now)
        return { success: true, id }
    })

    ipcMain.handle('delete-composition-schedule-entry', (_event, id: string) => {
        return db.prepare('DELETE FROM composition_schedule_entries WHERE id = ?').run(id)
    })

    ipcMain.handle('get-parent-by-phone', (_event, phone: string) => {
        return db.prepare('SELECT * FROM parents WHERE phone = ?').get(phone)
    })

    // ── Grading configs ──────────────────────────────────────────────────────

    const DEFAULT_GRADING_CONFIGS: Record<string, { scale: number; config: any[] }> = {
        Maternelle: {
            scale: 10,
            config: [
                { min: 0, max: 4,  label: 'Insuffisant',  color: 'red' },
                { min: 4, max: 6,  label: 'En progrès',   color: 'orange' },
                { min: 6, max: 8,  label: 'Satisfaisant', color: 'yellow' },
                { min: 8, max: 9,  label: 'Bien',         color: 'blue' },
                { min: 9, max: 10, label: 'Très Bien',    color: 'green' },
            ],
        },
        Primaire: {
            scale: 10,
            config: [
                { min: 0,   max: 4,  label: 'Insuffisant', color: 'red' },
                { min: 4,   max: 6,  label: 'Passable',    color: 'orange' },
                { min: 6,   max: 7,  label: 'Assez Bien',  color: 'yellow' },
                { min: 7,   max: 8.5,label: 'Bien',        color: 'blue' },
                { min: 8.5, max: 10, label: 'Très Bien',   color: 'green' },
            ],
        },
        Collège: {
            scale: 20,
            config: [
                { min: 0,  max: 6,  label: 'Insuffisant', color: 'red' },
                { min: 6,  max: 10, label: 'Passable',    color: 'orange' },
                { min: 10, max: 14, label: 'Assez Bien',  color: 'yellow' },
                { min: 14, max: 16, label: 'Bien',        color: 'blue' },
                { min: 16, max: 18, label: 'Très Bien',   color: 'green' },
                { min: 18, max: 20, label: 'Excellent',   color: 'purple' },
            ],
        },
        Lycée: {
            scale: 20,
            config: [
                { min: 0,  max: 6,  label: 'Insuffisant', color: 'red' },
                { min: 6,  max: 10, label: 'Passable',    color: 'orange' },
                { min: 10, max: 14, label: 'Assez Bien',  color: 'yellow' },
                { min: 14, max: 16, label: 'Bien',        color: 'blue' },
                { min: 16, max: 18, label: 'Très Bien',   color: 'green' },
                { min: 18, max: 20, label: 'Excellent',   color: 'purple' },
            ],
        },
    }

    ipcMain.handle('get-grading-configs', () => {
        const stored = db.prepare('SELECT * FROM grading_configs').all() as any[]
        const storedMap: Record<string, any> = {}
        for (const row of stored) {
            storedMap[row.level] = { scale: row.scale, config: JSON.parse(row.config) }
        }
        const result: Record<string, any> = {}
        for (const [level, defaults] of Object.entries(DEFAULT_GRADING_CONFIGS)) {
            result[level] = storedMap[level] ?? defaults
        }
        return result
    })

    ipcMain.handle('save-grading-config', (_event, data: { level: string; scale: number; config: any[] }) => {
        const { level, scale, config } = data
        db.prepare('INSERT OR REPLACE INTO grading_configs (level, scale, config) VALUES (?, ?, ?)')
            .run(level, scale, JSON.stringify(config))
        return { success: true }
    })

    ipcMain.handle('reset-grading-config', (_event, level: string) => {
        db.prepare('DELETE FROM grading_configs WHERE level = ?').run(level)
        return { success: true }
    })

    ipcMain.handle('reset-database', () => {
        db.exec('DROP TABLE IF EXISTS enrollments')
        db.exec('DROP TABLE IF EXISTS student_attendance')
        db.exec('DROP TABLE IF EXISTS grades')
        db.exec('DROP TABLE IF EXISTS payments')
        db.exec('DROP TABLE IF EXISTS cash_transactions')
        db.exec('DROP TABLE IF EXISTS students')
        db.exec('DROP TABLE IF EXISTS parents')
        db.exec('DROP TABLE IF EXISTS timetables')
        return initDatabase().then(() => ({ success: true }))
    })
}
