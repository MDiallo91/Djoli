import db from '../db/core'

export const attendanceHandlers: Record<string, (...args: any[]) => any> = {

    // Appel d'une classe à une date donnée (date passée = consultation/correction de l'appel).
    // Élèves inscrits dans la classe pour l'année scolaire ACTIVE (sinon, un élève passé en
    // classe supérieure apparaîtrait aussi dans son ancienne classe) ; toutes années si
    // aucune année n'est marquée active. Élèves/inscriptions supprimés exclus.
    'get-student-attendance': (classId: number, date: string) => {
        return db.prepare(`
            SELECT s.id as student_id, s.first_name, s.last_name, s.matricule, sa.status
            FROM students s
            JOIN enrollments e ON s.id = e.student_id AND e.deleted_at IS NULL
            LEFT JOIN student_attendance sa ON s.id = sa.student_id AND sa.date = ? AND sa.deleted_at IS NULL
            WHERE e.class_id = ?
              AND s.deleted_at IS NULL
              AND (
                  e.school_year_id = (SELECT id FROM school_years WHERE is_active = 1 AND deleted_at IS NULL LIMIT 1)
                  OR NOT EXISTS (SELECT 1 FROM school_years WHERE is_active = 1 AND deleted_at IS NULL)
              )
            GROUP BY s.id
            ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE
        `).all(date, classId)
    },

    'add-student-attendance': (attendanceRecords: any[]) => {
        for (const record of attendanceRecords) {
            const existing = db.prepare('SELECT id FROM student_attendance WHERE student_id = ? AND date = ?').get(record.student_id, record.date)
            if (existing) {
                db.prepare('UPDATE student_attendance SET status = ? WHERE student_id = ? AND date = ?').run(record.status, record.student_id, record.date)
            } else {
                db.prepare('INSERT INTO student_attendance (id, student_id, date, status) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), record.student_id, record.date, record.status)
            }
        }
        return { success: true }
    },

    'get-teacher-attendance': (month: string) => {
        return db.prepare("SELECT * FROM teacher_attendance WHERE strftime('%Y-%m', date) = ?").all(month)
    },

    'add-teacher-attendance': (attendance: any) => {
        const { teacher_id, date, status, hours_worked } = attendance
        const existing = db.prepare('SELECT id FROM teacher_attendance WHERE staff_id = ? AND date = ?').get(teacher_id, date) as any
        if (existing) {
            db.prepare('UPDATE teacher_attendance SET status = ?, hours_worked = ? WHERE id = ?').run(status, hours_worked || 0, existing.id)
            return { success: true }
        }
        const id = crypto.randomUUID()
        db.prepare('INSERT INTO teacher_attendance (id, staff_id, date, status, hours_worked) VALUES (?, ?, ?, ?, ?)').run(id, teacher_id, date, status, hours_worked || 0)
        return { success: true, id }
    },
}
