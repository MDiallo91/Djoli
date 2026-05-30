import { ipcMain } from 'electron'
import crypto from 'node:crypto'
import db from '../db'
import { paymentSchema, cashTransactionSchema } from '../validation'
import { trackChange } from '../syncTracker'
import { logAction } from '../auditLogger'

export function registerFinanceHandlers() {

    ipcMain.handle('add-payment', (_event, data: any) => {
        const parsed = paymentSchema.safeParse(data)
        if (!parsed.success) throw new Error(parsed.error.issues.map((e: any) => e.message).join(', '))

        const { studentId, amount, yearId, method, description, months } = parsed.data
        const paymentId = crypto.randomUUID()
        const monthsStr = months ? JSON.stringify(months) : null
        const now = new Date().toISOString()

        db.prepare(`INSERT INTO payments (id, student_id, amount, payment_method, description, school_year_id, payment_date, months, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(paymentId, studentId, amount, method, description, yearId, now, monthsStr, now, now)

        const cashId = crypto.randomUUID()
        db.prepare(`INSERT INTO cash_transactions (id, type, amount, reason, reference_id, school_year_id, created_at, updated_at) VALUES (?, 'IN', ?, ?, ?, ?, ?, ?)`)
            .run(cashId, amount, `Paiement Scolarité: ${description}`, paymentId, yearId, now, now)

        trackChange('INSERT', 'payment', paymentId, { id: paymentId, student_id: studentId, amount, payment_method: method, description, school_year_id: yearId, months: monthsStr, updated_at: now })
        trackChange('INSERT', 'cash_transaction', cashId, { id: cashId, type: 'IN', amount, reason: `Paiement Scolarité: ${description}`, reference_id: paymentId, school_year_id: yearId, created_at: now, updated_at: now })

        const studentRow = db.prepare('SELECT first_name, last_name FROM students WHERE id = ?').get(studentId) as any
        const label = studentRow ? `${studentRow.first_name} ${studentRow.last_name} — ${amount} GNF` : `${amount} GNF`
        logAction({ action: 'add_payment', entityType: 'payment', entityId: paymentId, entityLabel: label, newValue: { studentId, amount, method, description } })

        return { success: true, paymentId }
    })

    ipcMain.handle('get-student-payments', (_event, data: { studentId: number, yearId: number }) => {
        return db.prepare('SELECT * FROM payments WHERE student_id = ? AND school_year_id = ?').all(data.studentId, data.yearId)
    })

    ipcMain.handle('get-class-payment-status', (_event, data: { classId: number, month: string, yearId: number }) => {
        const { classId, month, yearId } = data

        const students = db.prepare(`
            SELECT s.id, s.first_name, s.last_name, p.phone as parent_phone
            FROM students s
            JOIN enrollments e ON s.id = e.student_id
            LEFT JOIN parents p ON s.parent_id = p.id
            WHERE e.class_id = ? AND e.school_year_id = ?
            ORDER BY s.last_name ASC
        `).all(classId, yearId) as any[]

        const payments = db.prepare(`
            SELECT student_id, amount, months FROM payments WHERE school_year_id = ? AND months LIKE ?
        `).all(yearId, `%${month}%`) as any[]

        return students.map(student => {
            const payment = payments.find(p => {
                if (p.student_id !== student.id) return false
                try {
                    const ms = JSON.parse(p.months)
                    return Array.isArray(ms) && ms.includes(month)
                } catch { return false }
            })
            return { ...student, has_paid: !!payment, payment_amount: payment ? payment.amount : 0 }
        })
    })

    ipcMain.handle('get-student-balance', (_event, data: { studentId: number, yearId: number }) => {
        const { studentId, yearId } = data

        const tuition = db.prepare(`
            SELECT c.tuition_fee FROM classes c
            JOIN enrollments e ON e.class_id = c.id
            WHERE e.student_id = ? AND e.school_year_id = ?
        `).get(studentId, yearId) as any

        const payments = db.prepare('SELECT amount, months FROM payments WHERE student_id = ? AND school_year_id = ?')
            .all(studentId, yearId) as any[]

        const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0)
        const paidMonths: string[] = []
        payments.forEach(p => {
            if (p.months) {
                try {
                    const ms = JSON.parse(p.months)
                    if (Array.isArray(ms)) paidMonths.push(...ms)
                } catch { /* ignore */ }
            }
        })

        return {
            tuitionFee: tuition?.tuition_fee || 0,
            totalPaid,
            balance: (tuition?.tuition_fee || 0) - totalPaid,
            paidMonths: Array.from(new Set(paidMonths))
        }
    })

    ipcMain.handle('add-cash-transaction', (_event, transaction: { type: 'IN' | 'OUT', amount: number, reason: string, yearId?: string }) => {
        const parsed = cashTransactionSchema.safeParse(transaction)
        if (!parsed.success) throw new Error(parsed.error.issues.map((e: any) => e.message).join(', '))
        const { type, amount, reason } = parsed.data
        const yearId = transaction.yearId || null
        const id = crypto.randomUUID()
        const now = new Date().toISOString()
        db.prepare('INSERT INTO cash_transactions (id, type, amount, reason, school_year_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, type, amount, reason, yearId, now, now)
        trackChange('INSERT', 'cash_transaction', id, { id, type, amount, reason, school_year_id: yearId, created_at: now, updated_at: now })
        logAction({ action: 'add_cash_transaction', entityType: 'cash_transaction', entityId: id, entityLabel: `${type} — ${amount} GNF`, newValue: { type, amount, reason } })
        return { success: true, id }
    })

    ipcMain.handle('get-transactions', (_event, yearId?: string) => {
        const base = `
            SELECT
                ct.*,
                s.first_name  AS student_first_name,
                s.last_name   AS student_last_name,
                s.matricule   AS student_matricule,
                cl.name       AS student_class_name,
                par.phone     AS student_parent_phone,
                p.payment_method,
                p.months      AS payment_months,
                p.description AS payment_description
            FROM cash_transactions ct
            LEFT JOIN payments    p   ON ct.reference_id = p.id
            LEFT JOIN students    s   ON p.student_id    = s.id
            LEFT JOIN enrollments e   ON (e.student_id = s.id AND e.school_year_id = ct.school_year_id)
            LEFT JOIN classes     cl  ON e.class_id      = cl.id
            LEFT JOIN parents     par ON s.parent_id     = par.id
        `
        if (yearId) {
            return db.prepare(base + ' WHERE ct.school_year_id = ? ORDER BY ct.date DESC LIMIT 100').all(yearId)
        }
        return db.prepare(base + ' ORDER BY ct.date DESC LIMIT 100').all()
    })

    ipcMain.handle('delete-transaction', (_event, id: string) => {
        trackChange('DELETE', 'cash_transaction', id, null)
        db.prepare('DELETE FROM cash_transactions WHERE id = ?').run(id)
        return { success: true }
    })

    ipcMain.handle('update-transaction', (_event, data: { id: string; reason: string; amount: number }) => {
        const now = new Date().toISOString()
        db.prepare('UPDATE cash_transactions SET reason = ?, amount = ?, updated_at = ? WHERE id = ?').run(data.reason, data.amount, now, data.id)
        const updated = db.prepare('SELECT * FROM cash_transactions WHERE id = ?').get(data.id)
        trackChange('UPDATE', 'cash_transaction', data.id, updated as any)
        return { success: true }
    })
}
