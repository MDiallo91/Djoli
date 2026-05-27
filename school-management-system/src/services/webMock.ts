/**
 * Mock ipcRenderer pour le contexte navigateur (hors Electron).
 * Remplace les appels IPC par des données vides ou simulées.
 */

type Handler = (...args: any[]) => any

const handlers: Record<string, Handler> = {
    // ── Auth ──────────────────────────────────────────────────────────────
    'login': async (_creds: any) => {
        return { id: 'web-user', username: 'admin', name: 'Administrateur', role: 'SUPER_ADMIN', isCloud: false, isSubUser: false, permissions: null }
    },
    'cloud-activate': async () => { throw new Error('Cloud non disponible en mode web') },
    'change-password': async () => ({ success: true }),
    'get-accounts': async () => [],
    'get-license': async () => null,
    'check-license': async () => ({ status: 'valid', daysLeft: 365 }),
    'select-account': async () => { throw new Error('Non disponible') },
    'cloud-verify-license': async () => null,
    'open-payment-page': async () => {},
    'get-subscription': async () => ({ status: 'ACTIVE', expires_at: '2099-12-31' }),
    'init-school-session': async () => ({ success: true }),

    // ── School info ───────────────────────────────────────────────────────
    'get-school-info': async () => ({ id: '1', name: 'Mon École', motto: 'Excellence', region: '', commune: '', logo_url: '' }),
    'update-school-info': async () => ({ success: true }),

    // ── School years ──────────────────────────────────────────────────────
    'get-school-years': async () => [],
    'add-school-year': async () => ({ success: true }),
    'set-active-year': async () => ({ success: true }),
    'delete-school-year': async () => ({ success: true }),

    // ── Stats ─────────────────────────────────────────────────────────────
    'get-stats': async () => ({ studentCount: 0, staffCount: 0, classCount: 0 }),

    // ── Students ──────────────────────────────────────────────────────────
    'get-students': async () => [],
    'add-student': async () => ({ success: true, id: crypto.randomUUID() }),
    'update-student': async () => ({ success: true }),
    'delete-student': async () => ({ success: true }),
    'search-students': async () => [],
    'get-student-balance': async () => ({ tuitionFee: 0, totalPaid: 0, balance: 0, paidMonths: [] }),

    // ── Classes ───────────────────────────────────────────────────────────
    'get-classes': async () => [],
    'add-class': async () => ({ success: true }),
    'update-class': async () => ({ success: true }),
    'delete-class': async () => ({ success: true }),
    'get-class-subjects': async () => [],
    'add-class-subject': async () => ({ success: true }),
    'remove-class-subject': async () => ({ success: true }),
    'get-class-rankings': async () => [],
    'get-class-payment-status': async () => [],

    // ── Subjects ──────────────────────────────────────────────────────────
    'get-subjects': async () => [],
    'add-subject': async () => ({ success: true }),
    'delete-subject': async () => ({ success: true }),

    // ── Grades ────────────────────────────────────────────────────────────
    'add-grade': async () => ({ success: true }),
    'get-student-grades': async () => [],
    'get-class-grades': async () => [],
    'save-class-grades-bulk': async () => ({ success: true }),
    'get-grading-configs': async () => ({}),
    'save-grading-config': async () => ({ success: true }),

    // ── Staff ─────────────────────────────────────────────────────────────
    'get-staff': async () => [],
    'add-staff': async () => ({ success: true }),
    'update-staff': async () => ({ success: true }),
    'delete-staff': async () => ({ success: true }),
    'get-school-users': async () => [],
    'add-school-user': async () => ({ success: true }),
    'update-school-user': async () => ({ success: true }),
    'delete-school-user': async () => ({ success: true }),
    'toggle-school-user': async () => ({ success: true }),

    // ── Finance ───────────────────────────────────────────────────────────
    'add-payment': async () => ({ success: true }),
    'get-student-payments': async () => [],
    'add-cash-transaction': async () => ({ success: true }),
    'get-transactions': async () => [],
    'delete-transaction': async () => ({ success: true }),
    'update-transaction': async () => ({ success: true }),

    // ── Salaries ──────────────────────────────────────────────────────────
    'get-salaries': async () => [],
    'pay-salary': async () => ({ success: true }),
    'get-teacher-attendance': async () => [],
    'add-teacher-attendance': async () => ({ success: true }),

    // ── Timetable ─────────────────────────────────────────────────────────
    'get-timetable': async () => [],
    'add-timetable-entry': async () => ({ success: true }),
    'delete-timetable-entry': async () => ({ success: true }),

    // ── Attendance ────────────────────────────────────────────────────────
    'get-student-attendance': async () => [],
    'add-student-attendance': async () => ({ success: true }),

    // ── Sync / audit ──────────────────────────────────────────────────────
    'get-audit-log': async () => [],
    'get-sync-status': async () => ({ pending: 0, lastSync: null }),
    'force-sync': async () => ({ success: true }),
    'get-conflict-queue': async () => [],
    'resolve-conflict': async () => ({ success: true }),
}

export function createWebMockIpc() {
    const listeners: Record<string, Array<(...args: any[]) => void>> = {}

    return {
        invoke: async (channel: string, ...args: any[]) => {
            const handler = handlers[channel]
            if (handler) {
                try {
                    return await handler(...args)
                } catch (err) {
                    throw err
                }
            }
            console.warn(`[WebMock] Canal non géré : ${channel}`)
            return null
        },
        on: (channel: string, listener: (...args: any[]) => void) => {
            if (!listeners[channel]) listeners[channel] = []
            listeners[channel].push(listener)
        },
        off: (channel: string, listener: (...args: any[]) => void) => {
            if (listeners[channel]) {
                listeners[channel] = listeners[channel].filter(l => l !== listener)
            }
        },
        send: (_channel: string, ..._args: any[]) => {},
    }
}
