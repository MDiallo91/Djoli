import db, { getCurrentSchoolId } from './db/core';
import { getDeviceId } from './deviceId';

export { getDeviceId } from './deviceId';

// Injecté par la plateforme (electron/main.ts ou src/worker/index.ts) pour
// éviter un import direct de syncService, dont l'implémentation diverge
// (webContents.send côté Electron vs postMessage côté Worker — cf. Phase 5).
let onThreshold: (() => void) | null = null;

export function setThresholdCallback(cb: (() => void) | null): void {
    onThreshold = cb;
}

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
    onThreshold?.();
}
