import { ipcMain } from 'electron'
import db, { getCurrentSchoolId } from '../db'

export function registerAuditHandlers() {

    ipcMain.handle('get-audit-logs', (_event, filters: {
        search?:  string
        action?:  string
        userId?:  string
        from?:    string
        to?:      string
        limit?:   number
    } = {}) => {
        const { search, action, userId, from, to, limit = 300 } = filters
        const schoolId = getCurrentSchoolId()

        let query = `SELECT * FROM audit_log WHERE 1=1`
        const params: any[] = []

        if (schoolId) {
            query += ` AND (school_id = ? OR school_id IS NULL)`
            params.push(schoolId)
        }
        if (search?.trim()) {
            query += ` AND (entity_label LIKE ? OR user_name LIKE ? OR action LIKE ?)`
            const like = `%${search.trim()}%`
            params.push(like, like, like)
        }
        if (action) {
            query += ` AND action = ?`
            params.push(action)
        }
        if (userId) {
            query += ` AND user_id = ?`
            params.push(userId)
        }
        if (from) {
            query += ` AND created_at >= ?`
            params.push(from)
        }
        if (to) {
            query += ` AND created_at <= ?`
            params.push(to + 'T23:59:59')
        }

        query += ` ORDER BY created_at DESC LIMIT ?`
        params.push(limit)

        return db.prepare(query).all(...params)
    })

    // Distinct action types present in the log (for filter dropdown)
    ipcMain.handle('get-audit-action-types', () => {
        const schoolId = getCurrentSchoolId()
        if (!schoolId) return []
        return db.prepare(
            `SELECT DISTINCT action FROM audit_log WHERE school_id = ? OR school_id IS NULL ORDER BY action ASC`
        ).all(schoolId).map((r: any) => r.action)
    })

    // Export as CSV string — renderer triggers download
    ipcMain.handle('export-audit-csv', (_event, filters: any = {}) => {
        const logs = db.prepare(`SELECT * FROM audit_log WHERE 1=1 ORDER BY created_at DESC LIMIT 5000`).all() as any[]

        const header = ['Date', 'Utilisateur', 'Action', 'Type entité', 'Entité', 'Ancienne valeur', 'Nouvelle valeur', 'Appareil']
        const rows = logs.map(l => [
            l.created_at,
            l.user_name ?? '',
            l.action,
            l.entity_type ?? '',
            l.entity_label ?? '',
            l.old_value ? l.old_value.replace(/"/g, '""') : '',
            l.new_value ? l.new_value.replace(/"/g, '""') : '',
            l.device_id ?? '',
        ].map(v => `"${v}"`).join(','))

        return [header.map(h => `"${h}"`).join(','), ...rows].join('\n')
    })
}
