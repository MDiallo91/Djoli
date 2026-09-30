import db from './db/core'

export function getDeviceId(): string {
    const row = db.prepare('SELECT value FROM global_config WHERE key = ?').get('device_id') as any;
    if (row) return row.value;
    const newId = crypto.randomUUID();
    db.prepare('INSERT INTO global_config (key, value) VALUES (?, ?)').run('device_id', newId);
    return newId;
}
