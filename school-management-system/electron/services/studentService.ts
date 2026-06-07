import { ipcMain } from 'electron'
import crypto from 'node:crypto'
import db from '../db'
import { studentSchema } from '../validation'
import { trackChange } from '../syncTracker'
import { logAction } from '../auditLogger'
import { currentUser } from '../currentSession'

export function registerStudentHandlers() {

    ipcMain.handle('get-stats', (_event, yearId?: string) => {
        const resolvedYearId = yearId || (db.prepare('SELECT id FROM school_years WHERE is_active = 1 LIMIT 1').get() as any)?.id
        const studentCount = resolvedYearId
            ? (db.prepare(`
                SELECT COUNT(DISTINCT e.student_id) as count
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                WHERE e.school_year_id = ?
              `).get(resolvedYearId) as any)?.count || 0
            : (db.prepare('SELECT COUNT(*) as count FROM students').get() as any)?.count || 0
        const staffCount = (db.prepare('SELECT COUNT(*) as count FROM staff').get() as any)?.count || 0
        const classCount = resolvedYearId
            ? (db.prepare(`
                SELECT COUNT(DISTINCT e.class_id) as count
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                WHERE e.school_year_id = ?
              `).get(resolvedYearId) as any)?.count || 0
            : (db.prepare('SELECT COUNT(*) as count FROM classes').get() as any)?.count || 0
        return { studentCount, staffCount, classCount }
    })

    ipcMain.handle('get-students', (_event, schoolYearId?: number) => {
        const base = `
            SELECT
                s.*,
                c.name as class_name,
                e.class_id, e.school_year_id,
                p.first_name as parent_first_name,
                p.last_name as parent_last_name,
                p.address as parent_address,
                p.profession as parent_profession,
                p.phone as parent_phone
            FROM students s
            LEFT JOIN enrollments e ON s.id = e.student_id
            LEFT JOIN classes c ON e.class_id = c.id
            LEFT JOIN parents p ON s.parent_id = p.id
        `
        const scopeLevels = currentUser?.scope_levels ?? []
        const conditions: string[] = []
        const params: any[] = []

        if (schoolYearId) {
            conditions.push('e.school_year_id = ?')
            params.push(schoolYearId)
        }
        if (scopeLevels.length > 0) {
            const placeholders = scopeLevels.map(() => '?').join(',')
            conditions.push(`(c.level IN (${placeholders}) OR c.level IS NULL)`)
            params.push(...scopeLevels)
        }

        const query = conditions.length > 0 ? base + ' WHERE ' + conditions.join(' AND ') : base
        return db.prepare(query).all(...params)
    })

    ipcMain.handle('search-students', (_event, searchTerm: string) => {
        if (!searchTerm || searchTerm.length < 2) return []
        const query = `
            SELECT s.*, p.first_name as parent_first_name, p.last_name as parent_last_name,
                   p.phone as parent_phone, p.address as parent_address, p.profession as parent_profession
            FROM students s
            LEFT JOIN parents p ON s.parent_id = p.id
            WHERE s.first_name LIKE ? OR s.last_name LIKE ? OR s.matricule LIKE ? OR p.phone LIKE ?
            LIMIT 10
        `
        const pattern = `%${searchTerm}%`
        return db.prepare(query).all(pattern, pattern, pattern, pattern)
    })

    ipcMain.handle('add-student', (_event, data: any) => {
        const parsed = studentSchema.safeParse(data)
        if (!parsed.success) {
            throw new Error(parsed.error.issues.map((e: any) => e.message).join(', '))
        }

        const { student, parent, enrollment } = parsed.data

        let parentId = parent.id || undefined

        if (!parentId && parent.phone) {
            const existing = db.prepare('SELECT id FROM parents WHERE phone = ?').get(parent.phone) as any
            if (existing) {
                parentId = existing.id
            } else {
                parentId = crypto.randomUUID()
                db.prepare(`INSERT INTO parents (id, first_name, last_name, phone, address, profession) VALUES (?, ?, ?, ?, ?, ?)`)
                    .run(parentId, parent.first_name || '', parent.last_name || '', parent.phone, parent.address || null, parent.profession || null)
            }
        }

        const now = new Date().toISOString()
        let finalStudentId = student.id
        const fullName = `${student.first_name} ${student.last_name}`
        if (finalStudentId) {
            const oldRow = db.prepare('SELECT * FROM students WHERE id = ?').get(finalStudentId)
            db.prepare(`UPDATE students SET matricule=?, first_name=?, last_name=?, gender=?, birth_date=?, address=?, pere=?, mere=?, phone=?, parent_id=?, updated_at=? WHERE id=?`)
                .run(student.matricule || null, student.first_name, student.last_name, student.gender, student.birth_date, student.address, student.pere || null, student.mere || null, student.phone || null, parentId, now, finalStudentId)
            trackChange('UPDATE', 'student', finalStudentId, { ...student, parent_id: parentId, updated_at: now })
            logAction({ action: 'edit_student', entityType: 'student', entityId: finalStudentId, entityLabel: fullName, oldValue: oldRow, newValue: { ...student, parent_id: parentId } })
        } else {
            finalStudentId = crypto.randomUUID()
            db.prepare(`INSERT INTO students (id, matricule, first_name, last_name, gender, birth_date, address, pere, mere, phone, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(finalStudentId, student.matricule || null, student.first_name, student.last_name, student.gender || 'M', student.birth_date || null, student.address || null, student.pere || null, student.mere || null, student.phone || null, parentId, now, now)
            trackChange('INSERT', 'student', finalStudentId, { ...student, id: finalStudentId, parent_id: parentId, created_at: now, updated_at: now })
            logAction({ action: 'add_student', entityType: 'student', entityId: finalStudentId, entityLabel: fullName, newValue: { ...student, parent_id: parentId } })
        }

        const classCheck = db.prepare('SELECT id FROM classes WHERE id = ?').get(enrollment.class_id)
        const yearCheck = db.prepare('SELECT id FROM school_years WHERE id = ?').get(enrollment.school_year_id)
        if (!classCheck) throw new Error('La classe sélectionnée est introuvable. Veuillez recharger la liste des classes.')
        if (!yearCheck) throw new Error("L'année scolaire sélectionnée est introuvable. Veuillez recharger la page.")

        const existingEnrollment = db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND school_year_id = ?').get(finalStudentId, enrollment.school_year_id) as any
        if (existingEnrollment) {
            db.prepare('UPDATE enrollments SET class_id = ? WHERE id = ?').run(enrollment.class_id, existingEnrollment.id)
            trackChange('UPDATE', 'enrollment', existingEnrollment.id, { id: existingEnrollment.id, student_id: finalStudentId, class_id: enrollment.class_id, school_year_id: enrollment.school_year_id, updated_at: now })
        } else {
            const enrollmentId = crypto.randomUUID()
            const regDate = new Date().toISOString().split('T')[0]
            db.prepare(`INSERT INTO enrollments (id, student_id, class_id, school_year_id, registration_date) VALUES (?, ?, ?, ?, ?)`)
                .run(enrollmentId, finalStudentId, enrollment.class_id, enrollment.school_year_id, regDate)
            trackChange('INSERT', 'enrollment', enrollmentId, { id: enrollmentId, student_id: finalStudentId, class_id: enrollment.class_id, school_year_id: enrollment.school_year_id, registration_date: regDate, created_at: now, updated_at: now })
        }

        return { studentId: finalStudentId, parentId }
    })

    ipcMain.handle('delete-student', (_event, id: string) => {
        if (!id) throw new Error('ID étudiant requis')
        const enrollments = db.prepare('SELECT id FROM enrollments WHERE student_id = ?').all(id) as any[]
        db.prepare('DELETE FROM enrollments WHERE student_id = ?').run(id)
        for (const e of enrollments) trackChange('DELETE', 'enrollment', e.id, null)
        const studentRow = db.prepare('SELECT first_name, last_name FROM students WHERE id = ?').get(id) as any
        const result = db.prepare('DELETE FROM students WHERE id = ?').run(id)
        trackChange('DELETE', 'student', id, null)
        logAction({ action: 'delete_student', entityType: 'student', entityId: id, entityLabel: studentRow ? `${studentRow.first_name} ${studentRow.last_name}` : id })
        return result
    })

    ipcMain.handle('get-student-gender-stats', (_event, yearId?: string) => {
        const resolvedYearId = yearId || (db.prepare('SELECT id FROM school_years WHERE is_active = 1 LIMIT 1').get() as any)?.id
        if (resolvedYearId) {
            return db.prepare(`
                SELECT s.gender, COUNT(*) as count
                FROM students s
                JOIN enrollments e ON s.id = e.student_id
                WHERE e.school_year_id = ?
                GROUP BY s.gender
            `).all(resolvedYearId)
        }
        return db.prepare('SELECT gender, COUNT(*) as count FROM students GROUP BY gender').all()
    })

    ipcMain.handle('get-enrollment-stats', () => {
        return db.prepare(`
            SELECT sy.name as year, COUNT(e.id) as count
            FROM school_years sy
            LEFT JOIN enrollments e ON sy.id = e.school_year_id
            GROUP BY sy.id
            ORDER BY sy.start_date ASC
        `).all()
    })

    ipcMain.handle('get-class-enrollment-stats', () => {
        const stats = db.prepare(`
            SELECT c.name as class_name, COUNT(e.id) as count
            FROM classes c
            LEFT JOIN enrollments e ON c.id = e.class_id
            LEFT JOIN school_years y ON e.school_year_id = y.id
            WHERE y.is_active = 1 OR y.id IS NULL
            GROUP BY c.id
        `).all() as any[]
        return {
            byClass: stats,
            total: stats.reduce((acc, s) => acc + s.count, 0)
        }
    })

    ipcMain.handle('export-class-excel', async (_event, data: { students: any[], className: string }) => {
        const { students, className } = data
        const XLSX = await import('xlsx')
        const exportData = students.map(s => ({
            'Matricule': s.matricule || '',
            'Prénom': s.first_name,
            'Nom': s.last_name,
            'Sexe': s.gender,
            'Date Naissance': s.birth_date,
            'Père': s.pere || '',
            'Mère': s.mere || '',
            'Téléphone': s.phone || '',
            'Adresse': s.address || ''
        }))
        const worksheet = XLSX.utils.json_to_sheet(exportData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Liste Élèves')
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    })

    ipcMain.handle('import-class-excel', async (_event, { buffer, classId, schoolYearId }: { buffer: Uint8Array, classId: string, schoolYearId: string }) => {
        const XLSX = await import('xlsx')
        const workbook = XLSX.read(Buffer.from(buffer), { type: 'buffer' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

        let count = 0
        for (const row of rows) {
            const firstName = (row['Prénom'] || row['Prenom'] || row['PRENOM'] || '').toString().trim()
            const lastName  = (row['Nom'] || row['NOM'] || '').toString().trim()
            const gender    = (row['Sexe'] || row['Genre'] || 'M').toString().trim().toUpperCase().charAt(0)
            const birthDate = (row['Date_Naissance'] || row['DateNaissance'] || '').toString().trim()
            const pere      = (row['Père'] || row['Pere'] || '').toString().trim()
            const mere      = (row['Mère'] || row['Mere'] || '').toString().trim()
            const matricule = (row['Matricule'] || '').toString().trim()

            if (!firstName && !lastName) continue

            const studentId = crypto.randomUUID()
            db.prepare(`INSERT INTO students (id, matricule, first_name, last_name, gender, birth_date, pere, mere) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
                .run(studentId, matricule || `IMP-${Date.now()}-${count}`, firstName, lastName, gender, birthDate, pere, mere)
            db.prepare(`INSERT INTO enrollments (id, student_id, class_id, school_year_id, registration_date) VALUES (?, ?, ?, ?, ?)`)
                .run(crypto.randomUUID(), studentId, classId, schoolYearId, new Date().toISOString().split('T')[0])
            count++
        }
        return { count }
    })
}
