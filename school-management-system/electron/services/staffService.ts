import { ipcMain } from 'electron'
import crypto from 'node:crypto'
import db from '../db'
import { staffSchema } from '../validation'

export function registerStaffHandlers() {

    ipcMain.handle('get-staff', () => {
        return db.prepare(`
            SELECT s.*,
                (SELECT GROUP_CONCAT(DISTINCT sub.name)
                 FROM timetables t
                 JOIN subjects sub ON t.subject_id = sub.id
                 WHERE t.teacher_id = s.id) as subjects_list
            FROM staff s
            ORDER BY s.last_name ASC
        `).all()
    })

    ipcMain.handle('add-staff', (_event, staffMember: any) => {
        const parsed = staffSchema.safeParse(staffMember)
        if (!parsed.success) throw new Error(parsed.error.issues.map((e: any) => e.message).join(', '))

        const { first_name, last_name, role, phone, email, address, salary_base, hire_date } = parsed.data
        const id = crypto.randomUUID()
        db.prepare(`INSERT INTO staff (id, first_name, last_name, role, phone, email, address, salary_base, hire_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(id, first_name, last_name, role, phone || null, email || null, address || null, salary_base || 0, hire_date || new Date().toISOString().split('T')[0])
        return { success: true, id }
    })

    ipcMain.handle('update-staff', (_event, staffMember: any) => {
        const { id, first_name, last_name, role, phone, email, address, salary_base, hire_date } = staffMember
        const result = db.prepare(`UPDATE staff SET first_name=?, last_name=?, role=?, phone=?, email=?, address=?, salary_base=?, hire_date=? WHERE id=?`)
            .run(first_name, last_name, role, phone || null, email || null, address || null, salary_base || 0, hire_date || null, id)
        return { success: true, changes: (result as any).changes }
    })

    ipcMain.handle('delete-staff', (_event, id: string) => {
        if (!id) throw new Error('ID requis')
        return db.prepare('DELETE FROM staff WHERE id = ?').run(id)
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
        const id = crypto.randomUUID()

        db.prepare(`INSERT INTO salaries (id, staff_id, month, year, base_salary, net_salary, bonus, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'PAID')`)
            .run(id, staff_id, monthStr, year, base_salary, net_salary, bonus || 0)

        db.prepare('INSERT INTO cash_transactions (id, type, amount, reason, reference_id) VALUES (?, ?, ?, ?, ?)')
            .run(crypto.randomUUID(), 'OUT', net_salary, `Paiement Salaire ${month}/${year} - Employé #${staff_id}`, id)

        return { success: true, id }
    })
}
