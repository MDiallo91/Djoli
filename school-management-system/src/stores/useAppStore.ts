import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { dbService, Stats } from '../services/db'

interface User {
    id:            string
    schoolId?:     string       // pour les sous-utilisateurs : l'ID de l'école
    username:      string
    role:          string
    name:          string
    permissions:   string[] | null  // null = admin (tout autorisé)
    isCloud?:      boolean
    isSubUser?:    boolean
    mustChangePwd?: boolean
    licenseStatus?: string
    daysLeft?:     number
}

export type { User }

interface Account {
    school_id:           string
    school_name:         string
    email:               string
    country:             string | null
    level:               string | null
    last_login_at:       string | null
    subscription_status: string
}

type AppPhase = 'loading' | 'account-selector' | 'login' | 'blocked' | 'change-password' | 'app'
export type { AppPhase }

interface AppState {
    user:         User | null
    accounts:     Account[]
    phase:        AppPhase
    licenseStatus: string        // 'valid' | 'trial' | 'warning' | 'expired' | 'invalid'
    daysLeft:     number
    loading:      boolean
    activeTab:    string
    staffSubTab:  string
    activeStudentSubTab: string
    stats:        Stats
    genderData:   { name: string; value: number }[]
    enrollmentData: any[]
    refreshKey:   number
    dashboardYearId: string | null

    setUser:                (user: User | null) => void
    setActiveTab:           (tab: string) => void
    setStaffSubTab:         (tab: string) => void
    setActiveStudentSubTab: (tab: string) => void
    setPhase:               (phase: AppPhase) => void
    setDashboardYear:       (yearId: string | null) => Promise<void>
    logout:                 () => void
    triggerRefresh:         () => void
    loadDashboardData:      () => Promise<void>
    checkSubscription:      () => Promise<void>
    initSession:            () => Promise<void>
    loadAccounts:           () => Promise<void>
    selectAccount:          (schoolId: string) => Promise<void>
    handleLogin:            (u: any) => void
    dismissWarning:         () => void
    renewSubscription:      () => void
}

export const useAppStore = create<AppState>()(
    persist(
        (set, get) => ({
            user:               null,
            accounts:           [],
            phase:              'loading',
            licenseStatus:      'valid',
            daysLeft:           999,
            loading:            true,
            activeTab:          'dashboard',
            staffSubTab:        'staff',
            activeStudentSubTab: 'list',
            stats:              { studentCount: 0, staffCount: 0, classCount: 0 },
            genderData:         [],
            enrollmentData:     [],
            refreshKey:         0,
            dashboardYearId:    null,

            setUser:                (user) => set({ user }),
            setActiveTab:           (activeTab) => set({ activeTab }),
            setStaffSubTab:         (staffSubTab) => set({ staffSubTab }),
            setActiveStudentSubTab: (activeStudentSubTab) => set({ activeStudentSubTab }),
            setPhase:               (phase) => set({ phase }),

            setDashboardYear: async (yearId) => {
                set({ dashboardYearId: yearId })
                await get().loadDashboardData()
            },

            logout: () => {
                localStorage.removeItem('user')
                set({ user: null, phase: 'login', activeTab: 'dashboard' })
            },

            triggerRefresh: () => set(state => ({ refreshKey: state.refreshKey + 1 })),

            dismissWarning: () => set({ phase: 'app' }),

            renewSubscription: () => {
                dbService.openPaymentPage()
            },

            handleLogin: (u: any) => {
                if (!u) return
                localStorage.setItem('user', JSON.stringify(u))
                const licenseStatus = u.licenseStatus ?? 'valid'
                const daysLeft      = u.daysLeft      ?? 999
                set({ user: u, licenseStatus, daysLeft })

                if (licenseStatus === 'expired') {
                    set({ phase: 'blocked' })
                } else if (u.mustChangePwd) {
                    set({ phase: 'change-password' })
                } else {
                    set({ phase: 'app' })
                    get().triggerRefresh()
                }
            },

            checkSubscription: async () => {
                const { user } = get()
                if (!user) return
                try {
                    if (user.isCloud) {
                        const result = await dbService.checkLicense(user.id)
                        set({
                            licenseStatus: result.status,
                            daysLeft:      result.daysLeft ?? 0
                        })
                        if (result.status === 'expired') {
                            set({ phase: 'blocked' })
                        }
                    } else {
                        const sub = await dbService.getSubscription()
                        if (sub?.expires_at) {
                            const expired = new Date(sub.expires_at) < new Date()
                            set({ licenseStatus: expired ? 'expired' : 'valid' })
                            if (expired) set({ phase: 'blocked' })
                        }
                    }
                } catch {
                    // Keep current state on error
                }
            },

            loadDashboardData: async () => {
                try {
                    const yearId = get().dashboardYearId || undefined
                    const [data, gender, enrollment] = await Promise.all([
                        dbService.getStats(yearId),
                        dbService.getStudentGenderStats(yearId),
                        dbService.getEnrollmentStats()
                    ])
                    set({
                        stats: data || { studentCount: 0, staffCount: 0, classCount: 0 },
                        genderData: (Array.isArray(gender) ? gender : []).map((g: any) => ({
                            name:  g.gender === 'M' ? 'Garçons' : 'Filles',
                            value: g.count
                        })),
                        enrollmentData: Array.isArray(enrollment) ? enrollment : []
                    })
                } catch {
                    set({ stats: { studentCount: 0, staffCount: 0, classCount: 0 } })
                }
            },

            loadAccounts: async () => {
                try {
                    const accounts = await dbService.getAccounts()
                    set({ accounts: accounts ?? [] })
                } catch {
                    set({ accounts: [] })
                }
            },

            selectAccount: async (schoolId: string) => {
                set({ loading: true })
                try {
                    const u = await dbService.selectAccount(schoolId)
                    get().handleLogin(u)

                    // Background cloud verification (non-blocking)
                    if (u.isCloud) {
                        dbService.cloudVerifyLicense(schoolId).catch(() => {})
                    }
                } catch (error: any) {
                    console.error('[selectAccount]', error)
                } finally {
                    set({ loading: false })
                }
            },

            initSession: async () => {
                set({ loading: true, phase: 'loading' })
                // Safety valve: always land on login if something hangs
                const safetyTimer = setTimeout(() => {
                    localStorage.removeItem('user')
                    set({ loading: false, phase: 'login' })
                }, 6000)

                try {
                    await get().loadAccounts()
                    const { accounts } = get()

                    const savedUser = localStorage.getItem('user')
                    if (savedUser) {
                        let u: User
                        try {
                            u = JSON.parse(savedUser)
                        } catch {
                            localStorage.removeItem('user')
                            set({ phase: 'login' })
                            return
                        }

                        try {
                            await dbService.initSchoolSession(u.id)
                        } catch {
                            // School DB unavailable — force fresh login
                            localStorage.removeItem('user')
                            set({ phase: 'login' })
                            return
                        }

                        set({ user: u })
                        await get().checkSubscription()
                        const { licenseStatus } = get()

                        if (licenseStatus === 'expired') {
                            set({ phase: 'blocked' })
                        } else {
                            set({ phase: 'app' })
                            await get().loadDashboardData()
                        }
                        return
                    }

                    // No active session — decide which screen to show
                    if (accounts.length > 1) {
                        set({ phase: 'account-selector' })
                    } else {
                        set({ phase: 'login' })
                    }
                } catch (error) {
                    console.error('[AppStore] initSession failed:', error)
                    localStorage.removeItem('user')
                    set({ phase: 'login' })
                } finally {
                    clearTimeout(safetyTimer)
                    set({ loading: false })
                }
            },
        }),
        {
            name:       'sms-app-store',
            partialize: (state) => ({ activeTab: state.activeTab, staffSubTab: state.staffSubTab }),
        }
    )
)
