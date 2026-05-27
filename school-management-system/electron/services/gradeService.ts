import { ipcMain } from 'electron'
import crypto from 'node:crypto'
import db from '../db'
import { trackChange } from '../syncTracker'
import { logAction } from '../auditLogger'

export function registerGradeHandlers() {

    ipcMain.handle('add-grade', (_event, grade: any) => {
        const { student_id, subject_id, score, exam_type, term, school_year_id } = grade

        // Determine the max score from the student's class level (Primaire = /10, others = /20)
        const enrollment = db.prepare(`
            SELECT c.level FROM enrollments e
            JOIN classes c ON e.class_id = c.id
            WHERE e.student_id = ?
            ORDER BY e.created_at DESC LIMIT 1
        `).get(student_id) as any
        const isPrimaire = ['Maternelle', 'Primaire'].includes(enrollment?.level ?? '')
        const maxScore   = isPrimaire ? 10 : 20

        if (score < 0 || score > maxScore) throw new Error(`La note doit être entre 0 et ${maxScore}`)
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        const yearId = school_year_id || (db.prepare('SELECT id FROM school_years WHERE is_active = 1 LIMIT 1').get() as any)?.id || null
        db.prepare('INSERT INTO grades (id, student_id, subject_id, score, exam_type, term, school_year_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, student_id, subject_id, score, exam_type, term, yearId, now, now)
        trackChange('INSERT', 'grade', id, { id, student_id, subject_id, score, exam_type, term, created_at: now, updated_at: now })
        const subjectRow = db.prepare('SELECT name FROM subjects WHERE id = ?').get(subject_id) as any
        logAction({ action: 'add_grade', entityType: 'grade', entityId: id, entityLabel: `${subjectRow?.name ?? subject_id} — ${score}/20 (${term})`, newValue: { student_id, subject_id, score, exam_type, term } })
        return { success: true, id }
    })

    ipcMain.handle('get-student-grades', (_event, data: string | { studentId: string, yearId?: string }) => {
        const studentId = typeof data === 'string' ? data : data.studentId
        const yearId = typeof data === 'object' ? data.yearId : undefined
        if (yearId) {
            return db.prepare(`
                SELECT g.*, s.name as subject_name, s.coefficient
                FROM grades g
                JOIN subjects s ON g.subject_id = s.id
                WHERE g.student_id = ? AND g.school_year_id = ?
            `).all(studentId, yearId)
        }
        return db.prepare(`
            SELECT g.*, s.name as subject_name, s.coefficient
            FROM grades g
            JOIN subjects s ON g.subject_id = s.id
            WHERE g.student_id = ?
        `).all(studentId)
    })

    ipcMain.handle('get-class-grades', (_event, data: { classId: number, subjectId: number, term: string, yearId?: string }) => {
        const { classId, subjectId, term, yearId } = data
        if (yearId) {
            return db.prepare(`
                SELECT
                    s.id as student_id, s.first_name, s.last_name, s.matricule,
                    MAX(CASE WHEN g.exam_type = 'Moyenne' THEN g.score END) as moyenne
                FROM students s
                JOIN enrollments e ON s.id = e.student_id AND e.school_year_id = ?
                LEFT JOIN grades g ON s.id = g.student_id AND g.subject_id = ? AND g.term = ? AND g.school_year_id = ?
                WHERE e.class_id = ?
                GROUP BY s.id
                ORDER BY s.last_name ASC, s.first_name ASC
            `).all(yearId, subjectId, term, yearId, classId)
        }
        return db.prepare(`
            SELECT
                s.id as student_id, s.first_name, s.last_name, s.matricule,
                MAX(CASE WHEN g.exam_type = 'Moyenne' THEN g.score END) as moyenne
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            LEFT JOIN grades g ON s.id = g.student_id AND g.subject_id = ? AND g.term = ?
            WHERE e.class_id = ?
            GROUP BY s.id
            ORDER BY s.last_name ASC, s.first_name ASC
        `).all(subjectId, term, classId)
    })

    ipcMain.handle('save-class-grades-bulk', (_event, data: { grades: any[], subjectId: string, term: string, yearId?: string }) => {
        const { grades, subjectId, term, yearId } = data

        const now = new Date().toISOString()
        const resolvedYearId = yearId || (db.prepare('SELECT id FROM school_years WHERE is_active = 1 LIMIT 1').get() as any)?.id || null
        const deleteStmt = yearId
            ? db.prepare('DELETE FROM grades WHERE student_id = ? AND subject_id = ? AND term = ? AND exam_type = ? AND school_year_id = ?')
            : db.prepare('DELETE FROM grades WHERE student_id = ? AND subject_id = ? AND term = ? AND exam_type = ?')
        const insertStmt = db.prepare('INSERT INTO grades (id, student_id, subject_id, score, exam_type, term, school_year_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')

        const transaction = db.transaction((gradeList: any[]) => {
            for (const g of gradeList) {
                if (g.moyenne !== null && g.moyenne !== undefined && g.moyenne !== '') {
                    const score = parseFloat(g.moyenne)
                    if (score < 0 || score > 20) continue
                    if (yearId) {
                        deleteStmt.run(g.student_id, subjectId, term, 'Moyenne', yearId)
                    } else {
                        deleteStmt.run(g.student_id, subjectId, term, 'Moyenne')
                    }
                    const gradeId = crypto.randomUUID()
                    insertStmt.run(gradeId, g.student_id, subjectId, score, 'Moyenne', term, resolvedYearId, now, now)
                    trackChange('INSERT', 'grade', gradeId, { id: gradeId, student_id: g.student_id, subject_id: subjectId, score, exam_type: 'Moyenne', term, school_year_id: resolvedYearId, updated_at: now })
                }
            }
        })

        transaction(grades)
        const saved = grades.filter(g => g.moyenne !== null && g.moyenne !== undefined && g.moyenne !== '')
        if (saved.length > 0) {
            logAction({ action: 'bulk_grades', entityType: 'grade', entityLabel: `${saved.length} note(s) — ${term}`, newValue: { count: saved.length, subject_id: subjectId, term } })
        }
        return { success: true }
    })

    ipcMain.handle('get-class-rankings', (_event, classId: number, term: string) => {
        return db.prepare(`
            WITH ActiveSubjects AS (
                SELECT s.id, s.coefficient
                FROM subjects s
                WHERE NOT EXISTS (SELECT 1 FROM class_subjects WHERE class_id = ?)
                UNION ALL
                SELECT s.id, COALESCE(cs.coefficient, s.coefficient) as coefficient
                FROM class_subjects cs
                JOIN subjects s ON cs.subject_id = s.id
                WHERE cs.class_id = ?
            ),
            ActiveTotalCoeff AS (
                SELECT SUM(coefficient) as total_coeff FROM ActiveSubjects
            ),
            StudentAverages AS (
                SELECT
                    e.student_id,
                    COALESCE(SUM(g.score * act.coefficient), 0) / (SELECT total_coeff FROM ActiveTotalCoeff) as average
                FROM enrollments e
                CROSS JOIN ActiveSubjects act
                LEFT JOIN grades g ON g.student_id = e.student_id AND g.subject_id = act.id AND g.term = ? AND g.exam_type = 'Moyenne'
                WHERE e.class_id = ? AND e.school_year_id = (SELECT id FROM school_years WHERE is_active = 1 LIMIT 1)
                GROUP BY e.student_id
            )
            SELECT sa.*, st.first_name, st.last_name, st.matricule,
                   RANK() OVER (ORDER BY average DESC) as rank
            FROM StudentAverages sa
            JOIN students st ON sa.student_id = st.id
            ORDER BY average DESC
        `).all(classId, classId, term, classId)
    })

    ipcMain.handle('get-class-subjects', (_event, classId: number) => {
        return db.prepare(`
            SELECT cs.id, s.name, cs.coefficient, cs.subject_id
            FROM class_subjects cs
            JOIN subjects s ON cs.subject_id = s.id
            WHERE cs.class_id = ?
        `).all(classId)
    })

    ipcMain.handle('add-class-subject', (_event, data: { classId: string, subjectId: string, coefficient: number }) => {
        const { classId, subjectId, coefficient } = data
        const id = crypto.randomUUID()
        return db.prepare('INSERT INTO class_subjects (id, class_id, subject_id, coefficient) VALUES (?, ?, ?, ?)').run(id, classId, subjectId, coefficient)
    })

    ipcMain.handle('remove-class-subject', (_event, id: string) => {
        return db.prepare('DELETE FROM class_subjects WHERE id = ?').run(id)
    })
}
