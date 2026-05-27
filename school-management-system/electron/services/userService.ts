import { ipcMain } from 'electron'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import db, { getCurrentSchoolId } from '../db'
import { logAction } from '../auditLogger'

export function registerUserHandlers() {

    // ── List school users ────────────────────────────────────────────────────
    ipcMain.handle('get-school-users', () => {
        const schoolId = getCurrentSchoolId()
        if (!schoolId) return []
        return db.prepare(
            `SELECT id, school_id, name, email, username, role, permissions, photo_url, must_change_pwd, is_active, created_at
             FROM school_users WHERE school_id = ? AND deleted_at IS NULL ORDER BY created_at ASC`
        ).all(schoolId)
    })

    // ── Create a school user ─────────────────────────────────────────────────
    ipcMain.handle('create-school-user', async (_event, data: {
        name: string; email: string; username: string; password: string;
        role: string; permissions: string[]; photo_url?: string;
    }) => {
        const schoolId = getCurrentSchoolId()
        if (!schoolId) throw new Error('Aucune école active')

        const { name, email, username, password, role, permissions, photo_url } = data
        if (!name || !email || !username || !password) throw new Error('Champs obligatoires manquants')

        const exists = db.prepare(
            `SELECT id FROM school_users WHERE school_id = ? AND (email = ? OR username = ?) AND deleted_at IS NULL`
        ).get(schoolId, email, username)
        if (exists) throw new Error('Cet email ou nom d\'utilisateur existe déjà')

        const id   = crypto.randomUUID()
        const hash = await bcrypt.hash(password, 10)
        const now  = new Date().toISOString()

        db.prepare(`
            INSERT INTO school_users (id, school_id, name, email, username, password_hash, role, permissions, photo_url, must_change_pwd, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)
        `).run(id, schoolId, name, email, username, hash, role, JSON.stringify(permissions), photo_url ?? null, now, now)

        logAction({ action: 'create_user', entityType: 'user', entityId: id, entityLabel: name, newValue: { name, email, username, role, permissions } })
        return { success: true, id, username, password_plain: password }
    })

    // ── Update user (name, role, permissions, photo) ─────────────────────────
    ipcMain.handle('update-school-user', (_event, data: {
        id: string; name: string; role: string; permissions: string[]; photo_url?: string; is_active?: number;
    }) => {
        const { id, name, role, permissions, photo_url, is_active } = data
        const oldUser = db.prepare('SELECT name, role, permissions FROM school_users WHERE id = ?').get(id)
        db.prepare(`
            UPDATE school_users SET name = ?, role = ?, permissions = ?, photo_url = ?, is_active = ?, updated_at = ?
            WHERE id = ?
        `).run(name, role, JSON.stringify(permissions), photo_url ?? null, is_active ?? 1, new Date().toISOString(), id)
        logAction({ action: 'update_user', entityType: 'user', entityId: id, entityLabel: name, oldValue: oldUser, newValue: { name, role, permissions } })
        return { success: true }
    })

    // ── Soft-delete a user ───────────────────────────────────────────────────
    ipcMain.handle('delete-school-user', (_event, id: string) => {
        const userRow = db.prepare('SELECT name FROM school_users WHERE id = ?').get(id) as any
        db.prepare(`UPDATE school_users SET deleted_at = ?, is_active = 0, updated_at = ? WHERE id = ?`)
            .run(new Date().toISOString(), new Date().toISOString(), id)
        logAction({ action: 'delete_user', entityType: 'user', entityId: id, entityLabel: userRow?.name ?? id })
        return { success: true }
    })

    // ── Admin reset password ─────────────────────────────────────────────────
    ipcMain.handle('reset-user-password', async (_event, data: { id: string; newPassword: string }) => {
        const hash = await bcrypt.hash(data.newPassword, 10)
        const userRow2 = db.prepare('SELECT name FROM school_users WHERE id = ?').get(data.id) as any
        db.prepare(`UPDATE school_users SET password_hash = ?, must_change_pwd = 1, updated_at = ? WHERE id = ?`)
            .run(hash, new Date().toISOString(), data.id)
        logAction({ action: 'reset_password', entityType: 'user', entityId: data.id, entityLabel: userRow2?.name ?? data.id })
        return { success: true }
    })
}
