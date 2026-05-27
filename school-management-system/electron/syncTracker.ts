import crypto from 'node:crypto';
import db from './db';

export function getDeviceId(): string {
    const row = db.prepare('SELECT value FROM global_config WHERE key = ?').get('device_id') as any;
    if (row) return row.value;
    const newId = crypto.randomUUID();
    db.prepare('INSERT INTO global_config (key, value) VALUES (?, ?)').run('device_id', newId);
    return newId;
}

export function trackChange(
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    entityType: string,
    entityId:   string,
    payload:    Record<string, any> | null
): void {
    db.prepare(`
        INSERT INTO sync_queue (id, operation, entity_type, entity_id, payload, device_id, created_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(
        crypto.randomUUID(),
        operation,
        entityType,
        entityId,
        payload ? JSON.stringify(payload) : null,
        getDeviceId(),
        new Date().toISOString()
    );
}
