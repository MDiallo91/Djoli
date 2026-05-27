import crypto from 'node:crypto'
import db, { getCurrentSchoolId } from './db'
import { getDeviceId } from './syncTracker'
import { currentUser } from './currentSession'

export interface AuditEntry {
    action:       string
    entityType?:  string
    entityId?:    string
    entityLabel?: string
    oldValue?:    any
    newValue?:    any
    // Override current session user if needed (e.g. login event itself)
    userId?:      string
    userName?:    string
    schoolId?:    string
}

export function logAction(entry: AuditEntry): void {
    try {
        db.prepare(`
            INSERT INTO audit_log
                (id, school_id, user_id, user_name, action, entity_type, entity_id, entity_label, old_value, new_value, device_id, synced, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
        `).run(
            crypto.randomUUID(),
            entry.schoolId ?? getCurrentSchoolId() ?? null,
            entry.userId   ?? currentUser?.id   ?? null,
            entry.userName ?? currentUser?.name ?? null,
            entry.action,
            entry.entityType  ?? null,
            entry.entityId    ?? null,
            entry.entityLabel ?? null,
            entry.oldValue != null ? JSON.stringify(entry.oldValue) : null,
            entry.newValue != null ? JSON.stringify(entry.newValue) : null,
            getDeviceId(),
            new Date().toISOString()
        )
    } catch (e) {
        // Never let audit logging crash the app
        console.warn('[Audit] logAction failed:', e)
    }
}
