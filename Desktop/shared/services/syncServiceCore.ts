// Moteur de sync cloud partagé — logique pure portée depuis
// electron/services/syncService.ts. L'émission d'événements UI
// (webContents.send côté Electron, postMessage côté Worker) est injectée via
// `notify`, pour rester agnostique de la plateforme.
import db from '../db/core'
import { getDeviceId } from '../deviceId'
import { currentSyncSession } from '../state/syncState'
import { trackChange } from '../syncTracker'

export const SYNC_THRESHOLD = 10 // déclenche un sync après N modifications locales
export const CRITICAL_ENTITIES = new Set(['grade', 'payment', 'school_user'])

export type Notify = (channel: string, payload: any) => void

let notify: Notify = () => {}

export function setNotify(fn: Notify): void {
    notify = fn
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function apiUrl(): string {
    return (typeof process !== 'undefined' && process.env?.SAAS_API_URL) || 'https://djoli.vercel.app'
}

function getLastPullAt(schoolId: string): string {
    const row = db.prepare('SELECT last_pull_at FROM sync_meta WHERE school_id = ?').get(schoolId) as any
    return row?.last_pull_at ?? new Date(0).toISOString()
}

function setLastPullAt(schoolId: string, dt: string): void {
    db.prepare('INSERT OR REPLACE INTO sync_meta (school_id, last_pull_at) VALUES (?, ?)').run(schoolId, dt)
}

function setLastPushAt(schoolId: string, dt: string): void {
    db.prepare(`INSERT INTO sync_meta (school_id, last_push_at) VALUES (?, ?)
        ON CONFLICT(school_id) DO UPDATE SET last_push_at = excluded.last_push_at`
    ).run(schoolId, dt)
}

function pendingCount(): number {
    const session = currentSyncSession
    if (!session) return 0
    return (db.prepare(`SELECT COUNT(*) as c FROM sync_queue WHERE sync_status = 'pending' AND school_id = ?`).get(session.schoolId) as any)?.c ?? 0
}

// ── Apply a pulled record to local SQLite ────────────────────────────────────

export const TABLE_MAP: Record<string, string> = {
    student:          'students',
    parent:           'parents',
    enrollment:       'enrollments',
    grade:            'grades',
    payment:          'payments',
    cash_transaction: 'cash_transactions',
    staff:            'staff',
    class:            'classes',
    subject:          'subjects',
    school_year:      'school_years',
    school_user:      'school_users',
}

// school_user est un cas particulier : password_hash/must_change_pwd ne sont jamais
// envoyés au backend, donc un INSERT OR REPLACE générique (TABLE_MAP) écraserait ces
// colonnes locales avec NULL. On ne met à jour que les colonnes réellement synchronisées.
function applyPulledSchoolUser(entityId: string, data: any): void {
    const exists = db.prepare('SELECT id FROM school_users WHERE id = ?').get(entityId)
    if (!exists) return // compte créé sur un autre poste : pas de mot de passe local, ignoré tant qu'il n'est pas créé ici
    db.prepare(`
        UPDATE school_users SET name = ?, email = ?, username = ?, role = ?, permissions = ?, scope_levels = ?, photo_url = ?, is_active = ?, updated_at = ?
        WHERE id = ?
    `).run(data.name, data.email, data.username, data.role, data.permissions, data.scope_levels, data.photo_url ?? null, data.is_active, data.updated_at, entityId)
}

function applyPulledRecord(entityType: string, entityId: string, data: any): void {
    if (!data) return
    if (entityType === 'school_user') {
        try {
            applyPulledSchoolUser(entityId, data)
        } catch (e) {
            console.error(`[Sync] applyPulledRecord ${entityType}/${entityId}:`, e)
        }
        return
    }
    const table = TABLE_MAP[entityType]
    if (!table) return
    try {
        const cols   = Object.keys(data)
        const values = cols.map((k) => data[k])
        db.prepare(
            `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
        ).run(...values)
    } catch (e) {
        console.error(`[Sync] applyPulledRecord ${entityType}/${entityId}:`, e)
    }
}

// ── Push ─────────────────────────────────────────────────────────────────────

async function pushChanges(schoolId: string, licenseKey: string): Promise<number> {
    const pending = db.prepare(
        `SELECT * FROM sync_queue WHERE sync_status = 'pending' AND school_id = ? ORDER BY created_at ASC LIMIT 200`
    ).all(schoolId) as any[]

    if (pending.length === 0) return 0

    const response = await fetch(`${apiUrl()}/api/sync/push`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${licenseKey}` },
        body:    JSON.stringify({ changes: pending }),
        signal:  AbortSignal.timeout(120_000),
    })
    if (!response.ok) throw new Error(`Erreur serveur lors de l'envoi (code ${response.status}). Vérifiez votre connexion.`)

    const result = await response.json()
    const conflictIds = new Set((result.conflicts ?? []).map((c: any) => c.entity_id))
    const failedIds   = new Set((result.failed   ?? []) as string[])

    for (const change of pending) {
        const isConflict = conflictIds.has(change.entity_id)
        const isFailed   = failedIds.has(change.entity_id)
        db.prepare(`UPDATE sync_queue SET sync_status = ?, synced_at = ? WHERE id = ?`).run(
            isConflict ? 'conflict' : isFailed ? 'pending' : 'synced',
            new Date().toISOString(),
            change.id
        )
    }

    if (result.conflicts?.length > 0) {
        notify('sync-conflicts', result.conflicts)
    }

    setLastPushAt(schoolId, new Date().toISOString())
    return pending.length - conflictIds.size
}

// ── Pull ─────────────────────────────────────────────────────────────────────

const PULL_PAGE_SIZE = 500

async function pullChanges(schoolId: string, licenseKey: string): Promise<number> {
    let since = getLastPullAt(schoolId)
    let serverNow: string | null = null // sera fixé depuis l'heure serveur à la 1ère page
    const deviceId = getDeviceId()
    const inboundConflicts: any[] = []
    let totalPulled = 0

    // Paginate: keep fetching until a page returns fewer than PULL_PAGE_SIZE records
    while (true) {
        const response = await fetch(
            `${apiUrl()}/api/sync/pull?since=${encodeURIComponent(since)}`,
            { headers: { Authorization: `Bearer ${licenseKey}` }, signal: AbortSignal.timeout(120_000) }
        )
        if (!response.ok) throw new Error(`Erreur serveur lors de la réception (code ${response.status}). Vérifiez votre connexion.`)

        const result = await response.json()
        const records: any[] = result.records ?? []

        // Utilise l'heure du serveur (1ère page) comme curseur pour éviter les décalages d'horloge
        if (!serverNow) serverNow = result.server_time ?? new Date().toISOString()

        for (const record of records) {
            if (record.device_id === deviceId) continue

            // Suppression propagée : data=null signifie que l'entité a été supprimée sur l'autre PC
            if (!record.data) {
                const table = TABLE_MAP[record.entity_type]
                if (table) {
                    const now = new Date().toISOString()
                    try {
                        db.prepare(`UPDATE ${table} SET deleted_at = ?, updated_at = ? WHERE id = ?`)
                          .run(now, now, record.entity_id)
                    } catch { /* table sans deleted_at — ignoré */ }
                }
                continue
            }

            const localPending = db.prepare(
                `SELECT * FROM sync_queue WHERE entity_id = ? AND sync_status = 'pending'`
            ).get(record.entity_id) as any

            if (localPending && CRITICAL_ENTITIES.has(record.entity_type)) {
                inboundConflicts.push({
                    conflict_id:  localPending.id,
                    entity_type:  record.entity_type,
                    entity_id:    record.entity_id,
                    local_data:   localPending.payload ? JSON.parse(localPending.payload) : null,
                    remote_data:  JSON.parse(record.data),
                    remote_updated_at: record.updated_at,
                })
                db.prepare(`UPDATE sync_queue SET sync_status = 'conflict' WHERE id = ?`).run(localPending.id)
            } else {
                applyPulledRecord(record.entity_type, record.entity_id, JSON.parse(record.data))
            }
        }

        totalPulled += records.length

        // If fewer records than page size, we've received everything
        if (records.length < PULL_PAGE_SIZE) break

        // Advance cursor to 1ms after the last record's timestamp to get the next page
        const lastUpdatedAt = records[records.length - 1].updated_at
        since = new Date(new Date(lastUpdatedAt).getTime() + 1).toISOString()
    }

    if (inboundConflicts.length > 0) {
        notify('sync-conflicts', inboundConflicts)
    }

    setLastPullAt(schoolId, serverNow!)
    return totalPulled
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
    const session = currentSyncSession
    if (!session) return

    try { backfillSchoolUsers(session.schoolId) } catch (e) { console.error('[Sync] backfillSchoolUsers:', e) }

    notify('sync-status', { status: 'syncing' })
    try {
        const pushed = await pushChanges(session.schoolId, session.licenseKey)
        let pulled = 0
        try {
            pulled = await pullChanges(session.schoolId, session.licenseKey)
        } catch (pullErr: any) {
            const pc = pullErr.cause ? ` (cause: ${pullErr.cause?.code ?? pullErr.cause?.message ?? pullErr.cause})` : ''
            console.warn('[SyncService] PULL failed:', pullErr.message + pc)
            throw pullErr
        }
        pushAuditLogs(session.schoolId, session.licenseKey).catch(() => {})
        const pending = pendingCount()

        notify('sync-status', {
            status:      pending > 0 ? 'pending' : 'synced',
            pendingCount: pending,
            lastSyncAt:  new Date().toISOString(),
            pushed,
            pulled,
        })
    } catch (err: any) {
        const cause = err.cause ? ` (cause: ${err.cause?.code ?? err.cause?.message ?? err.cause})` : ''
        console.warn('[SyncService] cycle failed:', err.message + cause)
        notify('sync-status', { status: 'offline', error: err.message })
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

export { syncCycle }

export function triggerSyncNow(): void {
    setTimeout(() => syncCycle(), 500)
}

/** Appelé après chaque trackChange — déclenche un sync si le seuil est atteint. */
export function checkThresholdSync(): void {
    if (pendingCount() >= SYNC_THRESHOLD) triggerSyncNow()
}

// Backfill unique : pousse les school_users existants qui n'ont jamais été suivis par
// la sync (ajoutée après coup), pour que le backend récupère l'état sans attendre
// une prochaine modification. password_hash/must_change_pwd exclus (cf. userService.ts).
function backfillSchoolUsers(schoolId: string): void {
    const flag = db.prepare('SELECT school_users_backfilled FROM sync_meta WHERE school_id = ?').get(schoolId) as any
    if (flag?.school_users_backfilled) return

    const rows = db.prepare(
        `SELECT id, school_id, name, email, username, role, permissions, scope_levels, photo_url, is_active, created_at, updated_at
         FROM school_users WHERE school_id = ? AND deleted_at IS NULL`
    ).all(schoolId) as any[]
    for (const row of rows) {
        trackChange('INSERT', 'school_user', row.id, row)
    }

    db.prepare(`INSERT INTO sync_meta (school_id, school_users_backfilled) VALUES (?, 1)
        ON CONFLICT(school_id) DO UPDATE SET school_users_backfilled = 1`
    ).run(schoolId)
}

/** Sync de démarrage : pull immédiat au lancement de l'app. */
export function startupSync(): void {
    setTimeout(() => syncCycle(), 2000)
}

/** Sync bloquant à la fermeture, avec timeout de 8s pour ne pas bloquer le quit. */
export async function syncOnQuit(): Promise<void> {
    await Promise.race([
        syncCycle(),
        new Promise<void>(resolve => setTimeout(resolve, 8000)),
    ])
}

export function getSyncStatus() {
    const session = currentSyncSession
    const pending = pendingCount()
    const meta = session
        ? db.prepare('SELECT last_pull_at, last_push_at FROM sync_meta WHERE school_id = ?').get(session.schoolId) as any
        : null
    return {
        status:       session ? (pending > 0 ? 'pending' : 'synced') : 'offline',
        pendingCount: pending,
        lastSyncAt:   meta?.last_push_at ?? meta?.last_pull_at ?? null,
    }
}

export function resolveConflict(data: {
    conflict_id: string
    choice:      'local' | 'remote'
    entity_type?: string
    entity_id?:   string
    remote_data?: any
}) {
    const { conflict_id, choice, entity_type, entity_id, remote_data } = data
    if (choice === 'remote' && entity_type && entity_id && remote_data) {
        applyPulledRecord(entity_type, entity_id, remote_data)
        db.prepare(`UPDATE sync_queue SET sync_status = 'resolved' WHERE id = ?`).run(conflict_id)
    } else {
        db.prepare(`UPDATE sync_queue SET sync_status = 'pending' WHERE id = ?`).run(conflict_id)
    }
    return { success: true }
}

export async function forceFullSync() {
    const TABLES: Array<{ table: string; entityType: string }> = [
        { table: 'school_years',      entityType: 'school_year'       },
        { table: 'students',          entityType: 'student'           },
        { table: 'parents',           entityType: 'parent'            },
        { table: 'enrollments',       entityType: 'enrollment'        },
        { table: 'payments',          entityType: 'payment'           },
        { table: 'cash_transactions', entityType: 'cash_transaction'  },
        { table: 'staff',             entityType: 'staff'             },
        { table: 'grades',            entityType: 'grade'             },
        { table: 'classes',           entityType: 'class'             },
        { table: 'subjects',          entityType: 'subject'           },
        { table: 'school_users',      entityType: 'school_user'       },
    ]

    const session = currentSyncSession
    if (!session) throw new Error('Aucune session de synchronisation active.')

    // Step 1: wipe backend records so deleted-locally-but-not-tracked records are removed
    try {
        await fetch(`${apiUrl()}/api/sync/reset`, {
            method:  'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.licenseKey}` },
            body:    JSON.stringify({ entity_types: TABLES.map(t => t.entityType) }),
            signal:  AbortSignal.timeout(30_000),
        })
    } catch (e: any) {
        console.warn('[SyncService] force-full-sync reset failed:', e.message)
    }

    // Step 2: clear pending queue to avoid conflicts with the incoming fresh push
    db.prepare(`DELETE FROM sync_queue WHERE sync_status = 'pending' AND school_id = ?`).run(session.schoolId)

    // Step 3: queue every current local record
    const deviceId = getDeviceId()
    let total = 0
    const now = new Date().toISOString()

    for (const { table, entityType } of TABLES) {
        let rows: any[] = []
        try {
            // school_users vit dans la base globale (device-wide) et peut contenir plusieurs
            // écoles : il faut filtrer par school_id, contrairement aux tables per-school-db.
            rows = table === 'school_users'
                ? db.prepare(`SELECT * FROM ${table} WHERE deleted_at IS NULL AND school_id = ?`).all(session.schoolId) as any[]
                : db.prepare(`SELECT * FROM ${table} WHERE deleted_at IS NULL`).all() as any[]
        } catch {
            try {
                rows = db.prepare(`SELECT * FROM ${table}`).all() as any[]
            } catch {
                continue
            }
        }
        for (const row of rows) {
            if (!row.id) continue
            // password_hash/must_change_pwd ne quittent jamais l'appareil.
            if (entityType === 'school_user') { delete row.password_hash; delete row.must_change_pwd }
            db.prepare(`
                INSERT INTO sync_queue (id, operation, entity_type, entity_id, payload, device_id, school_id, created_at, sync_status)
                VALUES (?, 'INSERT', ?, ?, ?, ?, ?, ?, 'pending')
            `).run(
                crypto.randomUUID(),
                entityType,
                row.id,
                JSON.stringify(row),
                deviceId,
                session.schoolId,
                now
            )
            total++
        }
    }

    // Step 4: reset last_pull_at so the next pull fetches fresh data from the server
    db.prepare(`DELETE FROM sync_meta WHERE school_id = ?`).run(session.schoolId)

    notify('sync-status', { status: 'syncing' })
    await syncCycle()
    return { queued: total }
}

// Exported for unit tests only
export { pullChanges as _testPullChanges }
