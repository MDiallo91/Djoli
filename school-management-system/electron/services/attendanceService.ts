import { ipcMain } from 'electron'
import crypto from 'node:crypto'
import db from '../db'

export function registerAttendanceHandlers() {

    ipcMain.handle('get-student-attendance', (_event, classId: number, date: string) => {
        return db.prepare(`
            SELECT s.id as student_id, s.first_name, s.last_name, sa.status
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            LEFT JOIN student_attendance sa ON s.id = sa.student_id AND sa.date = ?
            WHERE e.class_id = ?
        `).all(date, classId)
    })

    ipcMain.handle('add-student-attendance', (_event, attendanceRecords: any[]) => {
        for (const record of attendanceRecords) {
            const existing = db.prepare('SELECT id FROM student_attendance WHERE student_id = ? AND date = ?').get(record.student_id, record.date)
            if (existing) {
                db.prepare('UPDATE student_attendance SET status = ? WHERE student_id = ? AND date = ?').run(record.status, record.student_id, record.date)
            } else {
                db.prepare('INSERT INTO student_attendance (id, student_id, date, status) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), record.student_id, record.date, record.status)
            }
        }
        return { success: true }
    })

    ipcMain.handle('get-teacher-attendance', (_event, month: string) => {
        return db.prepare("SELECT * FROM teacher_attendance WHERE strftime('%Y-%m', date) = ?").all(month)
    })

    ipcMain.handle('add-teacher-attendance', (_event, attendance: any) => {
        const { teacher_id, date, status, hours_worked } = attendance
        const existing = db.prepare('SELECT id FROM teacher_attendance WHERE staff_id = ? AND date = ?').get(teacher_id, date) as any
        if (existing) {
            db.prepare('UPDATE teacher_attendance SET status = ?, hours_worked = ? WHERE id = ?').run(status, hours_worked || 0, existing.id)
            return { success: true }
        }
        const id = crypto.randomUUID()
        db.prepare('INSERT INTO teacher_attendance (id, staff_id, date, status, hours_worked) VALUES (?, ?, ?, ?, ?)').run(id, teacher_id, date, status, hours_worked || 0)
        return { success: true, id }
    })
}
