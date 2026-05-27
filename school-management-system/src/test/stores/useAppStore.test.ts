import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useAppStore } from '../../stores/useAppStore'

vi.mock('../../services/db', () => ({
    dbService: {
        getStats:             vi.fn().mockResolvedValue({ studentCount: 120, staffCount: 15, classCount: 8 }),
        getStudentGenderStats: vi.fn().mockResolvedValue([{ gender: 'M', count: 70 }, { gender: 'F', count: 50 }]),
        getEnrollmentStats:   vi.fn().mockResolvedValue([{ year: '2024-2025', count: 100 }, { year: '2025-2026', count: 120 }]),
        getSubscription:      vi.fn().mockResolvedValue({ status: 'ACTIVE', expires_at: new Date(Date.now() + 86400000 * 30).toISOString() }),
        checkLicense:         vi.fn().mockResolvedValue({ status: 'valid', daysLeft: 30 }),
        getAccounts:          vi.fn().mockResolvedValue([]),
        initSchoolSession:    vi.fn().mockResolvedValue({ success: true }),
        openPaymentPage:      vi.fn().mockResolvedValue(undefined),
        cloudVerifyLicense:   vi.fn().mockResolvedValue(null),
    }
}))

describe('useAppStore', () => {
    beforeEach(() => {
        useAppStore.setState({
            user:          null,
            accounts:      [],
            phase:         'login',
            licenseStatus: 'valid',
            daysLeft:      999,
            loading:       false,
            activeTab:     'dashboard',
            stats:         { studentCount: 0, staffCount: 0, classCount: 0 },
            genderData:    [],
            enrollmentData: [],
        })
        vi.clearAllMocks()
    })

    it('has correct initial state', () => {
        const state = useAppStore.getState()
        expect(state.user).toBeNull()
        expect(state.activeTab).toBe('dashboard')
        expect(state.stats.studentCount).toBe(0)
    })

    it('setUser updates user state', () => {
        const { setUser } = useAppStore.getState()
        const mockUser = { id: '1', username: 'admin', role: 'SUPER_ADMIN', name: 'Admin', permissions: null }
        act(() => setUser(mockUser))
        expect(useAppStore.getState().user).toEqual(mockUser)
    })

    it('setActiveTab updates active tab', () => {
        const { setActiveTab } = useAppStore.getState()
        act(() => setActiveTab('students'))
        expect(useAppStore.getState().activeTab).toBe('students')
    })

    it('logout clears user and resets phase to login', () => {
        useAppStore.setState({ user: { id: '1', username: 'admin', role: 'SUPER_ADMIN', name: 'Admin', permissions: null }, activeTab: 'finance', phase: 'app' })
        act(() => useAppStore.getState().logout())
        const state = useAppStore.getState()
        expect(state.user).toBeNull()
        expect(state.activeTab).toBe('dashboard')
        expect(state.phase).toBe('login')
    })

    it('triggerRefresh increments refreshKey', () => {
        const initial = useAppStore.getState().refreshKey
        act(() => useAppStore.getState().triggerRefresh())
        expect(useAppStore.getState().refreshKey).toBe(initial + 1)
    })

    it('loadDashboardData populates stats', async () => {
        await act(async () => {
            await useAppStore.getState().loadDashboardData()
        })
        const state = useAppStore.getState()
        expect(state.stats.studentCount).toBe(120)
        expect(state.stats.staffCount).toBe(15)
        expect(state.genderData).toHaveLength(2)
        expect(state.enrollmentData).toHaveLength(2)
    })

    it('checkSubscription sets licenseStatus=valid for active subscription', async () => {
        useAppStore.setState({ user: { id: '1', username: 'admin', role: 'SUPER_ADMIN', name: 'Admin', permissions: null, isCloud: true } })
        await act(async () => {
            await useAppStore.getState().checkSubscription()
        })
        expect(useAppStore.getState().licenseStatus).toBe('valid')
    })

    it('checkSubscription sets phase=blocked for expired subscription', async () => {
        const { dbService } = await import('../../services/db')
        vi.mocked(dbService.checkLicense).mockResolvedValueOnce({ status: 'expired', daysLeft: -1 })
        useAppStore.setState({ user: { id: '1', username: 'admin', role: 'SUPER_ADMIN', name: 'Admin', permissions: null, isCloud: true } })
        await act(async () => {
            await useAppStore.getState().checkSubscription()
        })
        expect(useAppStore.getState().licenseStatus).toBe('expired')
        expect(useAppStore.getState().phase).toBe('blocked')
    })
})
