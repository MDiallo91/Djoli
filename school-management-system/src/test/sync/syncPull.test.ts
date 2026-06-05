import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks Electron ─────────────────────────────────────────────────────────────
vi.mock('electron', () => ({
    ipcMain:      { handle: vi.fn() },
    BrowserWindow: vi.fn(),
}))

vi.mock('../../../electron/syncState', () => ({
    currentSyncSession: { schoolId: 'school-abc', licenseKey: 'license-xyz' },
    setSyncSession:     vi.fn(),
}))

vi.mock('../../../electron/deviceId', () => ({
    getDeviceId: vi.fn().mockReturnValue('device-B'),
}))

vi.mock('../../../electron/syncTracker', () => ({
    trackChange: vi.fn(),
    getDeviceId: vi.fn().mockReturnValue('device-B'),
}))

vi.mock('../../../electron/auditLogger', () => ({ logAction: vi.fn() }))

// ── Mock DB avec des fonctions capturables ─────────────────────────────────────
vi.mock('../../../electron/db', () => {
    const runFn = vi.fn()
    const getFn = vi.fn().mockReturnValue(null)
    const allFn = vi.fn().mockReturnValue([])
    const prepareFn = vi.fn().mockReturnValue({ run: runFn, get: getFn, all: allFn })
    return {
        default: { prepare: prepareFn, exec: vi.fn() },
        getCurrentSchoolId: vi.fn().mockReturnValue('school-abc'),
    }
})

// ── Import après mocks ─────────────────────────────────────────────────────────
import { _testPullChanges, _testTABLE_MAP } from '../../../electron/services/syncService'
import db from '../../../electron/db'

// ── Helper ─────────────────────────────────────────────────────────────────────
function makeFetch(records: any[], serverTime = '2026-06-05T12:00:00.000Z') {
    global.fetch = vi.fn().mockResolvedValue({
        ok:   true,
        json: () => Promise.resolve({ records, server_time: serverTime }),
    } as any)
}

// ── Tests Bug 1 : les suppressions se propagent ────────────────────────────────
describe('Bug 1 — suppression propagée au pull', () => {
    beforeEach(() => vi.clearAllMocks())

    it('applique un soft-delete (deleted_at) quand data=null vient d\'un autre PC', async () => {
        makeFetch([{
            entity_type: 'student',
            entity_id:   'student-123',
            data:        null,
            device_id:   'device-A',      // autre PC
            operation:   'DELETE',
            updated_at:  '2026-06-05T11:00:00.000Z',
        }])

        await _testPullChanges('school-abc', 'license-xyz')

        const prepareMock = vi.mocked(db.prepare)
        const sqlCalls = prepareMock.mock.calls.map(c => c[0] as string)
        const softDeleteSql = sqlCalls.find(s => s.includes('deleted_at') && s.includes('students'))
        expect(softDeleteSql).toBeTruthy()
    })

    it('n\'applique PAS de soft-delete si device_id est le sien propre', async () => {
        makeFetch([{
            entity_type: 'student',
            entity_id:   'student-456',
            data:        null,
            device_id:   'device-B',      // même PC → ignoré
            operation:   'DELETE',
            updated_at:  '2026-06-05T11:00:00.000Z',
        }])

        await _testPullChanges('school-abc', 'license-xyz')

        const prepareMock = vi.mocked(db.prepare)
        const sqlCalls = prepareMock.mock.calls.map(c => c[0] as string)
        const softDeleteSql = sqlCalls.find(s => s.includes('deleted_at') && s.includes('students'))
        expect(softDeleteSql).toBeUndefined()
    })

    it('ne plante pas si entity_type inconnu (absent du TABLE_MAP)', async () => {
        makeFetch([{
            entity_type: 'unknown_entity',
            entity_id:   'x-1',
            data:        null,
            device_id:   'device-A',
            operation:   'DELETE',
            updated_at:  '2026-06-05T11:00:00.000Z',
        }])

        await expect(_testPullChanges('school-abc', 'license-xyz')).resolves.toBe(1)
    })

    it('applique un INSERT OR REPLACE quand data est présent (modification normale)', async () => {
        makeFetch([{
            entity_type: 'student',
            entity_id:   'student-789',
            data:        JSON.stringify({ id: 'student-789', first_name: 'Ali', last_name: 'Bah' }),
            device_id:   'device-A',
            operation:   'UPDATE',
            updated_at:  '2026-06-05T11:00:00.000Z',
        }])

        await _testPullChanges('school-abc', 'license-xyz')

        const prepareMock = vi.mocked(db.prepare)
        const sqlCalls = prepareMock.mock.calls.map(c => c[0] as string)
        const upsertSql = sqlCalls.find(s => s.includes('INSERT OR REPLACE INTO students'))
        expect(upsertSql).toBeTruthy()
    })
})

// ── Tests Bug 2 : server_time utilisé comme curseur ───────────────────────────
describe('Bug 2 — server_time utilisé dans last_pull_at', () => {
    beforeEach(() => vi.clearAllMocks())

    it('passe server_time à sync_meta, pas l\'heure locale', async () => {
        const serverTime = '2026-06-05T10:30:00.000Z'
        makeFetch([], serverTime)

        await _testPullChanges('school-abc', 'license-xyz')

        const prepareMock = vi.mocked(db.prepare)
        const prepareAndRunCalls = prepareMock.mock.calls.map(c => c[0] as string)

        // L'INSERT OR REPLACE INTO sync_meta doit avoir été appelé
        const syncMetaIdx = prepareAndRunCalls.findIndex(s => s.includes('sync_meta'))
        expect(syncMetaIdx).toBeGreaterThanOrEqual(0)

        // La valeur passée au run() correspondant doit être server_time
        const runCalls = prepareMock.mock.results[syncMetaIdx]?.value?.run?.mock?.calls
        expect(runCalls?.[0]).toContain(serverTime)
    })

    it('utilise new Date() comme fallback si server_time absent', async () => {
        // Réponse sans server_time
        global.fetch = vi.fn().mockResolvedValue({
            ok:   true,
            json: () => Promise.resolve({ records: [] }),  // pas de server_time
        } as any)

        // Ne doit pas planter
        await expect(_testPullChanges('school-abc', 'license-xyz')).resolves.toBe(0)
    })
})

// ── Test TABLE_MAP complet ─────────────────────────────────────────────────────
describe('TABLE_MAP', () => {
    it('couvre toutes les entités syncables', () => {
        const expected = ['student', 'parent', 'enrollment', 'grade', 'payment',
                          'cash_transaction', 'staff', 'class', 'subject', 'school_year']
        for (const entity of expected) {
            expect(_testTABLE_MAP[entity], `${entity} absent du TABLE_MAP`).toBeTruthy()
        }
    })
})
