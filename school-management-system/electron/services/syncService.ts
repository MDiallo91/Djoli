import { ipcMain, BrowserWindow } from 'electron';
import crypto from 'node:crypto';
import db from '../db';
import { getDeviceId } from '../syncTracker';
import { currentSyncSession } from '../syncState';

const SYNC_INTERVAL_MS  = 30_000;          // 30 s
const CRITICAL_ENTITIES = new Set(['grade', 'payment']);

let syncTimer: ReturnType<typeof setInterval> | null = null;
let win: BrowserWindow | null = null;

// ── Helpers ──────────────────────────────────────────────────────────────────

function apiUrl(): string {
    return process.env.SAAS_API_URL || 'https://djoli.vercel.app';
}

function getLastPullAt(schoolId: string): string {
    const row = db.prepare('SELECT last_pull_at FROM sync_meta WHERE school_id = ?').get(schoolId) as any;
    return row?.last_pull_at ?? new Date(0).toISOString();
}

function setLastPullAt(schoolId: string, dt: string): void {
    db.prepare('INSERT OR REPLACE INTO sync_meta (school_id, last_pull_at) VALUES (?, ?)').run(schoolId, dt);
}

function setLastPushAt(schoolId: string, dt: string): void {
    db.prepare(`INSERT INTO sync_meta (school_id, last_push_at) VALUES (?, ?)
        ON CONFLICT(school_id) DO UPDATE SET last_push_at = excluded.last_push_at`
    ).run(schoolId, dt);
}

function pendingCount(): number {
    return (db.prepare(`SELECT COUNT(*) as c FROM sync_queue WHERE sync_status = 'pending'`).get() as any)?.c ?? 0;
}

// ── Apply a pulled record to local SQLite ────────────────────────────────────

const TABLE_MAP: Record<string, string> = {
    student:          'students',
    parent:           'parents',
    enrollment:       'enrollments',
    grade:            'grades',
    payment:          'payments',
    cash_transaction: 'cash_transactions',
    staff:            'staff',
    class:            'classes',
    subject:          'subjects',
};

function applyPulledRecord(entityType: string, entityId: string, data: any): void {
    const table = TABLE_MAP[entityType];
    if (!table || !data) return;
    try {
        const cols   = Object.keys(data);
        const values = cols.map((k) => data[k]);
        db.prepare(
            `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
        ).run(...values);
    } catch (e) {
        console.error(`[Sync] applyPulledRecord ${entityType}/${entityId}:`, e);
    }
}

// ── Push ─────────────────────────────────────────────────────────────────────

async function pushChanges(schoolId: string, licenseKey: string): Promise<number> {
    const pending = db.prepare(
        `SELECT * FROM sync_queue WHERE sync_status = 'pending' ORDER BY created_at ASC LIMIT 200`
    ).all() as any[];

    if (pending.length === 0) return 0;

    const response = await fetch(`${apiUrl()}/api/sync/push`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${licenseKey}` },
        body:    JSON.stringify({ changes: pending }),
        signal:  AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Erreur serveur lors de l'envoi (code ${response.status}). Vérifiez votre connexion.`);

    const result = await response.json();
    const conflictIds = new Set((result.conflicts ?? []).map((c: any) => c.entity_id));
    const failedIds   = new Set((result.failed   ?? []) as string[]);

    for (const change of pending) {
        const isConflict = conflictIds.has(change.entity_id);
        const isFailed   = failedIds.has(change.entity_id);
        db.prepare(`UPDATE sync_queue SET sync_status = ?, synced_at = ? WHERE id = ?`).run(
            isConflict ? 'conflict' : isFailed ? 'pending' : 'synced',
            new Date().toISOString(),
            change.id
        );
    }

    if (result.conflicts?.length > 0) {
        win?.webContents.send('sync-conflicts', result.conflicts);
    }

    setLastPushAt(schoolId, new Date().toISOString());
    return pending.length - conflictIds.size;
}

// ── Pull ─────────────────────────────────────────────────────────────────────

async function pullChanges(schoolId: string, licenseKey: string): Promise<number> {
    const since = getLastPullAt(schoolId);
    const serverNow = new Date().toISOString();
    const deviceId = getDeviceId();

    const response = await fetch(
        `${apiUrl()}/api/sync/pull?since=${encodeURIComponent(since)}`,
        { headers: { Authorization: `Bearer ${licenseKey}` }, signal: AbortSignal.timeout(120_000) }
    );
    if (!response.ok) throw new Error(`Erreur serveur lors de la réception (code ${response.status}). Vérifiez votre connexion.`);

    const result = await response.json();
    const records: any[] = result.records ?? [];

    const inboundConflicts: any[] = [];

    for (const record of records) {
        if (record.device_id === deviceId) continue; // Own changes already applied locally

        const localPending = db.prepare(
            `SELECT * FROM sync_queue WHERE entity_id = ? AND sync_status = 'pending'`
        ).get(record.entity_id) as any;

        if (localPending && CRITICAL_ENTITIES.has(record.entity_type)) {
            // Conflict on critical entity — alert the user
            inboundConflicts.push({
                conflict_id:  localPending.id,
                entity_type:  record.entity_type,
                entity_id:    record.entity_id,
                local_data:   localPending.payload ? JSON.parse(localPending.payload) : null,
                remote_data:  record.data ? JSON.parse(record.data) : null,
                remote_updated_at: record.updated_at,
            });
            db.prepare(`UPDATE sync_queue SET sync_status = 'conflict' WHERE id = ?`).run(localPending.id);
        } else {
            applyPulledRecord(record.entity_type, record.entity_id, record.data ? JSON.parse(record.data) : null);
        }
    }

    if (inboundConflicts.length > 0) {
        win?.webContents.send('sync-conflicts', inboundConflicts);
    }

    setLastPullAt(schoolId, serverNow);
    return records.length;
}

// ── Main sync cycle ───────────────────────────────────────────────────────────

async function pushAuditLogs(schoolId: string, licenseKey: string): Promise<void> {
    const pending = db.prepare(
        `SELECT * FROM audit_log WHERE (synced = 0 OR synced IS NULL) AND (school_id = ? OR school_id IS NULL) ORDER BY created_at ASC LIMIT 200`
    ).all(schoolId) as any[]
    if (pending.length === 0) return

    const response = await fetch(`${apiUrl()}/api/audit/push`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${licenseKey}` },
        body:    JSON.stringify({ logs: pending }),
    })
    if (!response.ok) return

    for (const log of pending) {
        db.prepare('UPDATE audit_log SET synced = 1 WHERE id = ?').run(log.id)
    }
}

async function syncCycle(): Promise<void> {
    const session = currentSyncSession;
    if (!session) return;

    win?.webContents.send('sync-status', { status: 'syncing' });
    try {
        const pushed = await pushChanges(session.schoolId, session.licenseKey);
        let pulled = 0;
        try {
            pulled = await pullChanges(session.schoolId, session.licenseKey);
        } catch (pullErr: any) {
            const pc = pullErr.cause ? ` (cause: ${pullErr.cause?.code ?? pullErr.cause?.message ?? pullErr.cause})` : '';
            console.warn('[SyncService] PULL failed:', pullErr.message + pc);
            throw pullErr;
        }
        pushAuditLogs(session.schoolId, session.licenseKey).catch(() => {});
        const pending = pendingCount();

        win?.webContents.send('sync-status', {
            status:      pending > 0 ? 'pending' : 'synced',
            pendingCount: pending,
            lastSyncAt:  new Date().toISOString(),
            pushed,
            pulled,
        });
    } catch (err: any) {
        const cause = err.cause ? ` (cause: ${err.cause?.code ?? err.cause?.message ?? err.cause})` : '';
        console.warn('[SyncService] cycle failed:', err.message + cause);
        win?.webContents.send('sync-status', { status: 'offline', error: err.message });
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startSyncLoop(mainWin: BrowserWindow): void {
    win = mainWin;
    if (syncTimer) clearInterval(syncTimer);
    setTimeout(() => syncCycle(), 2000);
    syncTimer = setInterval(syncCycle, SYNC_INTERVAL_MS);
}

export function stopSyncLoop(): void {
    if (syncTimer) { clearInterval(syncTimer); syncTimer = null; }
}

export function registerSyncHandlers(mainWin: BrowserWindow): void {
    win = mainWin;

    ipcMain.handle('sync-now', async () => {
        await syncCycle();
        return { success: true };
    });

    ipcMain.handle('get-sync-status', () => {
        const session = currentSyncSession;
        const pending = pendingCount();
        const meta = session
            ? db.prepare('SELECT last_pull_at, last_push_at FROM sync_meta WHERE school_id = ?').get(session.schoolId) as any
            : null;
        return {
            status:       session ? (pending > 0 ? 'pending' : 'synced') : 'offline',
            pendingCount: pending,
            lastSyncAt:   meta?.last_push_at ?? meta?.last_pull_at ?? null,
        };
    });

    ipcMain.handle('resolve-conflict', (_event, data: {
        conflict_id: string;
        choice:      'local' | 'remote';
        entity_type?: string;
        entity_id?:   string;
        remote_data?: any;
    }) => {
        const { conflict_id, choice, entity_type, entity_id, remote_data } = data;
        if (choice === 'remote' && entity_type && entity_id && remote_data) {
            applyPulledRecord(entity_type, entity_id, remote_data);
            db.prepare(`UPDATE sync_queue SET sync_status = 'resolved' WHERE id = ?`).run(conflict_id);
        } else {
            db.prepare(`UPDATE sync_queue SET sync_status = 'pending' WHERE id = ?`).run(conflict_id);
        }
        return { success: true };
    });

    ipcMain.handle('force-full-sync', async () => {
        const TABLES: Array<{ table: string; entityType: string }> = [
            { table: 'students',          entityType: 'student'           },
            { table: 'parents',           entityType: 'parent'            },
            { table: 'enrollments',       entityType: 'enrollment'        },
            { table: 'payments',          entityType: 'payment'           },
            { table: 'cash_transactions', entityType: 'cash_transaction'  },
            { table: 'staff',             entityType: 'staff'             },
            { table: 'grades',            entityType: 'grade'             },
            { table: 'classes',           entityType: 'class'             },
            { table: 'subjects',          entityType: 'subject'           },
        ];

        const session = currentSyncSession;
        if (!session) throw new Error('Aucune session de synchronisation active.');

        // Step 1: wipe backend records so deleted-locally-but-not-tracked records are removed
        try {
            await fetch(`${apiUrl()}/api/sync/reset`, {
                method:  'DELETE',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.licenseKey}` },
                body:    JSON.stringify({ entity_types: TABLES.map(t => t.entityType) }),
                signal:  AbortSignal.timeout(30_000),
            });
        } catch (e: any) {
            console.warn('[SyncService] force-full-sync reset failed:', e.message);
        }

        // Step 2: clear pending queue to avoid conflicts with the incoming fresh push
        db.prepare(`DELETE FROM sync_queue WHERE sync_status = 'pending'`).run();

        // Step 3: queue every current local record
        const deviceId = getDeviceId();
        let total = 0;
        const now = new Date().toISOString();

        for (const { table, entityType } of TABLES) {
            let rows: any[] = [];
            try {
                // Try with deleted_at filter first; fall back to full table scan if column doesn't exist
                rows = db.prepare(`SELECT * FROM ${table} WHERE deleted_at IS NULL`).all() as any[];
            } catch {
                try {
                    rows = db.prepare(`SELECT * FROM ${table}`).all() as any[];
                } catch {
                    continue;
                }
            }
            for (const row of rows) {
                if (!row.id) continue;
                db.prepare(`
                    INSERT INTO sync_queue (id, operation, entity_type, entity_id, payload, device_id, created_at, sync_status)
                    VALUES (?, 'INSERT', ?, ?, ?, ?, ?, 'pending')
                `).run(
                    crypto.randomUUID(),
                    entityType,
                    row.id,
                    JSON.stringify(row),
                    deviceId,
                    now
                );
                total++;
            }
        }

        // Step 4: reset last_pull_at so the next pull fetches fresh data from the server
        db.prepare(`DELETE FROM sync_meta WHERE school_id = ?`).run(session.schoolId);

        win?.webContents.send('sync-status', { status: 'syncing' });
        await syncCycle();
        return { queued: total };
    });
}
