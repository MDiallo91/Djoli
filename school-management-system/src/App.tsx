import { useEffect, useState } from 'react'
import {
    Users, UserRound, GraduationCap, Calendar, Wallet, BarChart3,
    Settings as SettingsIcon, Bell, Search, Award, Layers,
    ArrowUpRight, TrendingUp, UserCircle, ChevronRight,
    Activity, BookOpen, LogOut
} from 'lucide-react'
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useAppStore } from './stores/useAppStore'
import { useSyncStore } from './stores/useSyncStore'
import { useSchoolStore } from './stores/useSchoolStore'
import { dbService } from './services/db'
import { AccountSelector } from './components/AccountSelector'
import { BlockedScreen } from './components/BlockedScreen'
import { SyncStatus } from './components/SyncStatus'
import { ConflictModal } from './components/ConflictModal'
import { StudentList } from './components/StudentList'
import { StudentForm } from './components/StudentForm'
import { FinanceManagement } from './components/FinanceManagement'
import { GradeManagement } from './components/GradeManagement'
import { StaffManagement } from './components/StaffManagement'
import { TeacherAttendance } from './components/TeacherAttendance'
import { PayrollDashboard } from './components/PayrollDashboard'
import { StudentAttendance } from './components/StudentAttendance'
import { Timetable } from './components/Timetable'
import { Settings } from './components/Settings'
import { SchoolStructure } from './components/SchoolStructure'
import { Login } from './components/Login'
import { Profile } from './components/Profile'
import { ChangePasswordScreen } from './components/ChangePasswordScreen'
import { hasPermission, TAB_PERMISSIONS } from './constants/permissions'
import { ToastContainer, toast } from './components/Toast'

// ── Color helpers ──────────────────────────────────────────────────────────
function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r},${g},${b},${alpha})`
}
function adjustColor(hex: string, amount: number): string {
    const clamp = (n: number) => Math.max(0, Math.min(255, n))
    const r = clamp(parseInt(hex.slice(1, 3), 16) + amount)
    const g = clamp(parseInt(hex.slice(3, 5), 16) + amount)
    const b = clamp(parseInt(hex.slice(5, 7), 16) + amount)
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`
}

const ALL_MENU_ITEMS = [
    { id: 'dashboard', icon: BarChart3,      label: 'Tableau de bord',    color: 'text-indigo-500' },
    { id: 'students',  icon: GraduationCap,  label: 'Élèves',              color: 'text-blue-500' },
    { id: 'teachers',  icon: Users,           label: 'Enseignants',         color: 'text-emerald-500' },
    { id: 'finance',   icon: Wallet,          label: 'Finance / Caisse',    color: 'text-amber-500' },
    { id: 'grades',    icon: Award,           label: 'Notes & Bulletins',   color: 'text-purple-500' },
    { id: 'schedule',  icon: Calendar,        label: 'Emploi du temps',     color: 'text-sky-500' },
    { id: 'structure', icon: Layers,          label: 'Structure École',     color: 'text-rose-500' },
    { id: 'profile',   icon: UserCircle,      label: 'Mon Profil',          color: 'text-teal-500' },
    { id: 'settings',  icon: SettingsIcon,    label: 'Paramètres',          color: 'text-gray-400' },
]

function App() {
    const {
        user, phase, licenseStatus, daysLeft, accounts, loading,
        activeTab, staffSubTab, activeStudentSubTab,
        stats, genderData, enrollmentData, refreshKey,
        dashboardYearId, setDashboardYear,
        setActiveTab, setStaffSubTab, setActiveStudentSubTab,
        logout, triggerRefresh, initSession,
        handleLogin, selectAccount, dismissWarning, renewSubscription,
    } = useAppStore()

    const { setStatus: setSyncStatus, addConflicts } = useSyncStore()
    const { activeYear, schoolYears, fetchAll: fetchSchoolData, fetchSchoolInfo } = useSchoolStore()
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingStudent, setEditingStudent] = useState<any>(null)
    const [schoolLogo, setSchoolLogo] = useState<string | null>(null)

    // Sidebar items filtered by the current user's permissions
    const MENU_ITEMS = ALL_MENU_ITEMS.filter(item => {
        const required = TAB_PERMISSIONS[item.id]
        if (!required) return true   // no permission required
        return hasPermission(user?.permissions ?? null, required)
    })

    useEffect(() => {
        initSession()
        const interval = setInterval(() => useAppStore.getState().checkSubscription(), 3_600_000)
        return () => clearInterval(interval)
    }, [])

    // Charge les données école dès que l'utilisateur est connecté
    useEffect(() => {
        if (user) { fetchSchoolData(); fetchSchoolInfo() }
    }, [user?.id])

    // Quand les années sont chargées, initialise dashboardYearId sur l'année active
    useEffect(() => {
        if (schoolYears.length > 0 && !dashboardYearId) {
            const active = schoolYears.find((y: any) => y.is_active)
            if (active) setDashboardYear(active.id)
        }
    }, [schoolYears])

    // Listen to sync events from the main process (Electron only)
    useEffect(() => {
        if (!window.ipcRenderer) return

        let prevStatus = 'idle'

        const onSyncStatus = (_: any, data: any) => {
            setSyncStatus(data.status, { pendingCount: data.pendingCount, lastSyncAt: data.lastSyncAt })

            if (data.status === 'synced' && prevStatus === 'syncing') {
                const pushed = data.pushed ?? 0
                const pulled = data.pulled ?? 0
                if (pushed > 0 || pulled > 0) {
                    toast.sync(
                        'Données synchronisées',
                        `${pushed > 0 ? `${pushed} envoyé${pushed > 1 ? 's' : ''}` : ''}${pushed > 0 && pulled > 0 ? ' · ' : ''}${pulled > 0 ? `${pulled} reçu${pulled > 1 ? 's' : ''}` : ''}`
                    )
                } else {
                    toast.success('Synchronisé', 'Toutes les données sont à jour.')
                }
                // Recharge l'UI si des données ont été reçues du cloud
                if (pulled > 0) {
                    triggerRefresh()
                    fetchSchoolData()
                }
            }

            if (data.status === 'offline' && prevStatus === 'syncing') {
                toast.error('Hors ligne', 'Connexion au serveur impossible. Les données seront synchronisées dès le retour en ligne.')
            }

            prevStatus = data.status
        }

        const onSyncConflicts = (_: any, conflicts: any[]) => {
            if (conflicts?.length > 0) {
                addConflicts(conflicts)
                toast.warning(
                    `Conflit détecté (${conflicts.length})`,
                    'Des données modifiées sur plusieurs appareils nécessitent votre arbitrage.'
                )
            }
        }

        window.ipcRenderer.on('sync-status',    onSyncStatus)
        window.ipcRenderer.on('sync-conflicts', onSyncConflicts)
        return () => {
            window.ipcRenderer.off('sync-status',    onSyncStatus)
            window.ipcRenderer.off('sync-conflicts', onSyncConflicts)
        }
    }, [])

    useEffect(() => {
        if (user && !loading) useAppStore.getState().loadDashboardData()
    }, [refreshKey])

    // Apply school colors to CSS variables whenever user session starts
    useEffect(() => {
        if (!user) return
        dbService.getSchoolInfo().then((info: any) => {
            if (!info) return
            const root = document.documentElement
            if (info.color_sidebar) root.style.setProperty('--sidebar-bg', info.color_sidebar)
            if (info.color_accent)  root.style.setProperty('--accent',     info.color_accent)
            if (info.color_accent)  root.style.setProperty('--accent-dark', adjustColor(info.color_accent, -20))
            if (info.color_accent)  root.style.setProperty('--accent-glow', hexToRgba(info.color_accent, 0.25))
            if (info.color_accent)  root.style.setProperty('--accent-light', hexToRgba(info.color_accent, 0.10))
            setSchoolLogo(info.logo_url || null)
        }).catch(() => {})
    }, [user?.id])

    const handleSaveStudent = async (studentData: any) => {
        try {
            await dbService.addStudent(studentData)
            setIsFormOpen(false)
            setEditingStudent(null)
            triggerRefresh()
        } catch (error: any) {
            alert(`Échec de l'inscription : ${error.message || 'Erreur inconnue'}`)
        }
    }

    const closeStudentForm = () => {
        setIsFormOpen(false)
        setEditingStudent(null)
    }

    // ── Phase: loading ─────────────────────────────────────────────────────
    if (phase === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-white">
                <div className="text-center space-y-4">
                    <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mx-auto" />
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Chargement...</p>
                </div>
            </div>
        )
    }

    // ── Phase: account selector ────────────────────────────────────────────
    if (phase === 'account-selector') {
        return (
            <AccountSelector
                accounts={accounts}
                onSelect={selectAccount}
                onAddAccount={() => useAppStore.getState().setPhase('login')}
                loading={loading}
            />
        )
    }

    // ── Phase: login ───────────────────────────────────────────────────────
    if (phase === 'login' || !user) return <Login onLogin={handleLogin} />

    // ── Phase: change-password (premier login sous-utilisateur) ──────────
    if (phase === 'change-password') return <ChangePasswordScreen />

    // ── Phase: blocked (abonnement expiré) ────────────────────────────────
    if (phase === 'blocked') {
        return (
            <BlockedScreen
                status="expired"
                daysLeft={daysLeft}
                schoolName={user.name}
                onRenew={renewSubscription}
                onLogout={logout}
            />
        )
    }

    // ── Warning banner (J-7, J-3, J-1) intégré dans l'app (phase: app) ───
    // Rendered inline at the top of main content below

    const activeMenuItem = MENU_ITEMS.find(i => i.id === activeTab)

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">

            {/* ─── SIDEBAR ─────────────────────────────────────── */}
            <aside className="school-sidebar w-64 flex flex-col no-print shadow-lg">
                {/* Logo */}
                <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 14px var(--accent-glow)' }}>
                        <img
                            src={schoolLogo || '/logo.png'}
                            alt="DJOLI"
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/logo.png' }}
                        />
                    </div>
                    <div>
                        <span className="font-black text-lg leading-none block text-white">DJOLI</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--sidebar-muted)' }}>Gestion Scolaire</span>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                    {MENU_ITEMS.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`nav-item w-full flex items-center gap-3 px-4 py-2.5 ${isActive ? 'active' : ''}`}
                            >
                                <item.icon size={18} style={{ color: isActive ? '#fff' : 'var(--sidebar-muted)' }} />
                                <span className="font-semibold text-sm" style={{ color: isActive ? '#fff' : 'var(--sidebar-text)' }}>
                                    {item.label}
                                </span>
                                {isActive && <ChevronRight size={14} className="ml-auto" style={{ color: 'rgba(255,255,255,0.5)' }} />}
                            </button>
                        )
                    })}
                </nav>

                {/* Bottom user section */}
                <div className="p-4 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                        <p className="text-[10px] font-black uppercase tracking-wider leading-none" style={{ color: 'var(--sidebar-muted)' }}>Session Active</p>
                        <p className="text-sm font-bold mt-1 text-white">{activeYear?.name || '—'}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-400">En ligne</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 px-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs text-white" style={{ backgroundColor: 'var(--accent)' }}>
                            {user?.username?.slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{user?.name || 'Utilisateur'}</p>
                            <p className="text-[10px]" style={{ color: 'var(--sidebar-muted)' }}>{user?.role}</p>
                        </div>
                        <button onClick={logout} className="p-1.5 rounded-lg transition-all hover:bg-red-500/20" style={{ color: 'var(--sidebar-muted)' }} title="Déconnexion">
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* ─── MAIN CONTENT ─────────────────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">

                {/* Header */}
                <header className="h-14 flex items-center justify-between px-6 no-print" style={{ backgroundColor: 'var(--bg-card)', borderBottom: '1px solid var(--border-light)' }}>
                    <div>
                        <h1 className="text-sm font-semibold" style={{ color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeMenuItem?.label}</h1>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Gestion scolaire</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
                            <Search size={15} className="text-gray-400" />
                            <input type="text" placeholder="Recherche rapide..." className="bg-transparent border-none outline-none text-sm text-gray-700 w-44 placeholder:text-gray-300" />
                        </div>

                        <SyncStatus />

                        <button className="relative p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-400 hover:text-gray-600 transition-all">
                            <Bell size={18} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
                        </button>

                        {activeTab === 'dashboard' && (
                            <button
                                onClick={() => { setActiveTab('students'); setActiveStudentSubTab('list'); setIsFormOpen(true) }}
                                className="btn-primary flex items-center gap-2"
                            >
                                <GraduationCap size={16} />
                                Inscrire un Élève
                            </button>
                        )}
                    </div>
                </header>

                {/* Warning banner J-7/J-3/J-1 */}
                {(licenseStatus === 'warning' || licenseStatus === 'trial') && daysLeft <= 7 && (
                    <div className={`px-8 py-3 flex items-center justify-between text-sm font-semibold no-print
                        ${daysLeft <= 1 ? 'bg-red-500 text-white' : daysLeft <= 3 ? 'bg-orange-500 text-white' : 'bg-amber-400 text-amber-900'}`}>
                        <span>
                            {licenseStatus === 'trial'
                                ? `Période d'essai : ${daysLeft} jour${daysLeft > 1 ? 's' : ''} restant${daysLeft > 1 ? 's' : ''}`
                                : `Abonnement : expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`
                            }
                        </span>
                        <button
                            onClick={renewSubscription}
                            className="ml-4 px-4 py-1 bg-white/20 hover:bg-white/30 rounded-lg font-bold transition-all"
                        >
                            Renouveler →
                        </button>
                    </div>
                )}

                {/* Page Content */}
                <section className="flex-1 overflow-y-auto p-6 pb-2" style={{ backgroundColor: 'var(--bg-page)' }}>

                    {/* ── DASHBOARD ────────── */}
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            {/* Stat Cards */}
                            <div className="grid grid-cols-4 gap-5">
                                {[
                                    { label: 'Total Élèves',     value: stats.studentCount, accent: '#2563eb', icon: GraduationCap, trend: '+8%' },
                                    { label: 'Enseignants',      value: stats.staffCount,   accent: '#10b981', icon: Users,         trend: '+2%' },
                                    { label: 'Classes Actives',  value: stats.classCount,   accent: '#7c3aed', icon: BookOpen,      trend: 'Stable' },
                                    { label: 'Taux de Présence', value: '98%',              accent: '#d97706', icon: Activity,      trend: '+1%' },
                                ].map((stat, i) => (
                                    <div key={i} className="rounded-xl p-5 transition-all duration-200 hover:shadow-md"
                                        style={{ backgroundColor: 'var(--bg-card)', border: `1px solid var(--border-light)`, borderLeft: `4px solid ${stat.accent}` }}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.accent}15`, color: stat.accent }}>
                                                <stat.icon size={18} />
                                            </div>
                                            <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: `${stat.accent}12`, color: stat.accent }}>
                                                {stat.trend}
                                            </span>
                                        </div>
                                        <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                                        <p className="text-2xl font-semibold" style={{ color: 'var(--text-main)' }}>{stat.value.toString()}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-3 gap-6">
                                {/* Area Chart */}
                                <div className="col-span-2 bg-white rounded-2xl border border-gray-100 p-7 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                                <TrendingUp size={18} className="accent-text" />
                                                Historique des Effectifs
                                            </h3>
                                            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mt-1">Évolution par année scolaire</p>
                                        </div>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={enrollmentData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} dy={8} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '12px 16px' }} labelStyle={{ fontWeight: 700 }} itemStyle={{ fontWeight: 700, color: '#2563eb' }} />
                                                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2.5} fill="url(#grad)" dot={{ fill: '#2563eb', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Pie Chart */}
                                <div className="bg-white rounded-2xl border border-gray-100 p-7 shadow-sm flex flex-col">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-black text-gray-900">Répartition G/F</h3>
                                        <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mt-1">Genre des élèves</p>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie data={genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={6} dataKey="value" strokeWidth={0}>
                                                    <Cell fill="#2563eb" />
                                                    <Cell fill="#ec4899" />
                                                </Pie>
                                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                                                <Legend verticalAlign="bottom" height={30} formatter={(v) => <span className="text-xs font-bold text-gray-500">{v}</span>} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex justify-around pt-3 border-t border-gray-50">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase">Garçons</p>
                                            <p className="text-xl font-black text-blue-600">{genderData.find(d => d.name === 'Garçons')?.value || 0}</p>
                                        </div>
                                        <div className="w-px bg-gray-100" />
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase">Filles</p>
                                            <p className="text-xl font-black text-pink-500">{genderData.find(d => d.name === 'Filles')?.value || 0}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick actions */}
                            <div className="grid grid-cols-4 gap-4">
                                {[
                                    { label: 'Inscrire un Élève',  icon: GraduationCap, color: 'bg-indigo-600', action: () => { setActiveTab('students'); setActiveStudentSubTab('list'); setIsFormOpen(true) } },
                                    { label: 'Encaisser Scolarité', icon: Wallet,        color: 'bg-emerald-600', action: () => setActiveTab('finance') },
                                    { label: 'Saisir les Notes',    icon: Award,         color: 'bg-purple-600', action: () => setActiveTab('grades') },
                                    { label: 'Voir Emploi du Temps',icon: Calendar,      color: 'bg-sky-600',    action: () => setActiveTab('schedule') },
                                ].map((q, i) => (
                                    <button key={i} onClick={q.action}
                                        className="btn-primary p-5 rounded-2xl font-bold text-sm flex items-center gap-3 hover:-translate-y-1 transition-all"
                                    >
                                        <q.icon size={20} />
                                        {q.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── STUDENTS ────────── */}
                    {activeTab === 'students' && (
                        <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-5">
                            <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl w-fit shadow-sm">
                                {[
                                    { id: 'list',       label: 'Annuaire des Élèves' },
                                    { id: 'attendance', label: 'Présences (Appel)' }
                                ].map(tab => (
                                    <button key={tab.id} onClick={() => setActiveStudentSubTab(tab.id)}
                                        style={activeStudentSubTab === tab.id ? { backgroundColor: 'var(--accent)', color: '#fff', boxShadow: '0 2px 8px var(--accent-glow)' } : {}}
                                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeStudentSubTab === tab.id ? '' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            {activeStudentSubTab === 'list' ? (
                                isFormOpen ? (
                                    <StudentForm
                                        key={editingStudent?.id ?? 'new'}
                                        initialData={editingStudent}
                                        onClose={closeStudentForm}
                                        onSave={handleSaveStudent}
                                    />
                                ) : (
                                    <StudentList
                                        key={refreshKey}
                                        onAddStudent={() => setIsFormOpen(true)}
                                        onEditStudent={s => { setEditingStudent(s); setIsFormOpen(true) }}
                                    />
                                )
                            ) : <StudentAttendance />}
                        </div>
                    )}

                    {activeTab === 'finance'   && <FinanceManagement />}
                    {activeTab === 'grades'    && <GradeManagement />}

                    {activeTab === 'teachers' && (
                        <div className="animate-in slide-in-from-bottom-4 duration-300 space-y-5">
                                <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-xl w-fit shadow-sm">
                                {[
                                    { id: 'staff',      label: 'Annuaire' },
                                    { id: 'attendance', label: 'Pointage' },
                                    { id: 'payroll',    label: 'Salaires' }
                                ].map(tab => (
                                    <button key={tab.id} onClick={() => setStaffSubTab(tab.id)}
                                        style={staffSubTab === tab.id ? { backgroundColor: 'var(--accent)', color: '#fff', boxShadow: '0 2px 8px var(--accent-glow)' } : {}}
                                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${staffSubTab === tab.id ? '' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            {staffSubTab === 'staff'      && <StaffManagement />}
                            {staffSubTab === 'attendance' && <TeacherAttendance />}
                            {staffSubTab === 'payroll'    && <PayrollDashboard />}
                        </div>
                    )}

                    {activeTab === 'schedule'  && <div className="animate-in slide-in-from-bottom-4 duration-300"><Timetable /></div>}
                    {activeTab === 'structure' && <div className="animate-in slide-in-from-bottom-4 duration-300"><SchoolStructure /></div>}
                    {activeTab === 'profile'   && <div className="animate-in slide-in-from-bottom-4 duration-300"><Profile user={user} /></div>}
                    {activeTab === 'settings'  && <div className="animate-in slide-in-from-bottom-4 duration-300"><Settings /></div>}

                </section>

                {/* Copyright footer */}
                <footer className="no-print h-8 flex items-center justify-center px-6 shrink-0" style={{ borderTop: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)' }}>
                    <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                        © {new Date().getFullYear()} DJOLI — Tous droits réservés. Logiciel propriétaire. Toute reproduction ou distribution non autorisée est interdite.
                    </p>
                </footer>
            </main>

            {/* Conflict resolution modal */}
            <ConflictModal />
            {/* Toast notifications */}
            <ToastContainer />
        </div>
    )
}

export default App
