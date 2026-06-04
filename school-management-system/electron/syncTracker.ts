import crypto from 'node:crypto';
import db, { getCurrentSchoolId } from './db';
import { getDeviceId } from './deviceId';
import { checkThresholdSync } from './services/syncService';

export { getDeviceId } from './deviceId';

export function trackChange(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId:   string,
    payload:    Record<string, any> | null
): void {
    const schoolId = getCurrentSchoolId() ?? '';
    db.prepare(`
        INSERT INTO sync_queue (id, operation, entity_type, entity_id, payload, device_id, school_id, created_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
        crypto.randomUUID(),
        operation,
        entityType,
        entityId,
        payload ? JSON.stringify(payload) : null,
        getDeviceId(),
        schoolId,
        new Date().toISOString()
    );
    checkThresholdSync();
}
