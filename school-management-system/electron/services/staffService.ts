import { ipcMain } from 'electron'
import crypto from 'node:crypto'
import db from '../db'
import { staffSchema } from '../validation'
import { trackChange } from '../syncTracker'
import { logAction } from '../auditLogger'

export function registerStaffHandlers() {

    ipcMain.handle('get-staff', () => {
        return db.prepare(`
            SELECT s.*,
                (SELECT GROUP_CONCAT(DISTINCT sub.name)
                 FROM timetables t
                 JOIN subjects sub ON t.subject_id = sub.id
                 WHERE t.teacher_id = s.id) as subjects_list
            FROM staff s
            WHERE s.deleted_at IS NULL
            ORDER BY s.last_name ASC
        `).all()
    })

    ipcMain.handle('add-staff', (_event, staffMember: any) => {
        const parsed = staffSchema.safeParse(staffMember)
        if (!parsed.success) throw new Error(parsed.error.issues.map((e: any) => e.message).join(', '))

        const { first_name, last_name, role, phone, email, address, salary_base, hire_date } = parsed.data
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()
        db.prepare(`INSERT INTO staff (id, first_name, last_name, role, phone, email, address, salary_base, hire_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, first_name, last_name, role, phone || null, email || null, address || null, salary_base || 0, hire_date || new Date().toISOString().split('T')[0], now, now)
        trackChange('INSERT', 'staff', id, { id, first_name, last_name, role, phone: phone || null, email: email || null, address: address || null, salary_base: salary_base || 0, hire_date: hire_date || null, created_at: now, updated_at: now })
        logAction({ action: 'add_staff', entityType: 'staff', entityId: id, entityLabel: `${first_name} ${last_name}`, newValue: parsed.data })
        return { success: true, id }
    })

    ipcMain.handle('update-staff', (_event, staffMember: any) => {
        const { id, first_name, last_name, role, phone, email, address, salary_base, hire_date } = staffMember
        const now = new Date().toISOString()
        const oldRow = db.prepare('SELECT * FROM staff WHERE id = ?').get(id)
        db.prepare(`UPDATE staff SET first_name=?, last_name=?, role=?, phone=?, email=?, address=?, salary_base=?, hire_date=?, updated_at=? WHERE id=?`)
            .run(first_name, last_name, role, phone || null, email || null, address || null, salary_base || 0, hire_date || null, now, id)
        const updated = db.prepare('SELECT * FROM staff WHERE id = ?').get(id) as any
        trackChange('UPDATE', 'staff', id, updated)
        logAction({ action: 'edit_staff', entityType: 'staff', entityId: id, entityLabel: `${first_name} ${last_name}`, oldValue: oldRow, newValue: updated })
        return { success: true }
    })

    ipcMain.handle('delete-staff', (_event, id: string) => {
        if (!id) throw new Error('ID requis')
        const staffRow = db.prepare('SELECT first_name, last_name FROM staff WHERE id = ?').get(id) as any
        const now = new Date().toISOString()
        db.prepare('UPDATE staff SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id)
        trackChange('DELETE', 'staff', id, null)
        logAction({ action: 'delete_staff', entityType: 'staff', entityId: id, entityLabel: staffRow ? `${staffRow.first_name} ${staffRow.last_name}` : id })
        return { success: true }
    })

    ipcMain.handle('get-salaries', (_event, month: string) => {
        return db.prepare(`
            SELECT s.*, st.first_name, st.last_name, st.role, st.salary_base
            FROM salaries s
            JOIN staff st ON s.staff_id = st.id
            WHERE s.month = ?
        `).all(month)
    })

    ipcMain.handle('pay-salary', (_event, data: any) => {
        const { staff_id, month, year, base_salary, net_salary, bonus } = data
        const monthStr = `${year}-${month}`
        const id  = crypto.randomUUID()
        const now = new Date().toISOString()

        db.prepare(`INSERT INTO salaries (id, staff_id, month, year, base_salary, net_salary, bonus, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID')`)
            .run(id, staff_id, monthStr, year, base_salary, net_salary, bonus || 0)

        const cashId = crypto.randomUUID()
        const reason = `Paiement Salaire ${month}/${year} — Personnel #${staff_id}`
        db.prepare('INSERT INTO cash_transactions (id, type, amount, reason, reference_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .run(cashId, 'OUT', net_salary, reason, id, now, now)
        trackChange('INSERT', 'cash_transaction', cashId, { id: cashId, type: 'OUT', amount: net_salary, reason, reference_id: id, created_at: now, updated_at: now })

        return { success: true, id }
    })
}
