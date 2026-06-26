import { useState, useEffect, useCallback } from 'react';
import {
  LogOut, Wallet, Download, CheckCircle, AlertCircle,
  Zap, Settings, Bell, BookOpen, Users, Award,
  RefreshCw, Shield, Globe, Save, Lock,
  Building2, Key, Package, Menu, X, Briefcase, GraduationCap, DollarSign,
} from 'lucide-react';
import StructureSection from './school/StructureSection';
import StaffSection from './school/StaffSection';
import GradesSection from './school/GradesSection';
import FinanceSection from './school/FinanceSection';
import StudentsSection from './school/StudentsSection';
import BulletinSection from './school/BulletinSection';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  RiUserLine, RiTeamLine, RiBankLine, RiMoneyDollarCircleLine,
  RiPhoneLine, RiArrowUpLine, RiArrowDownLine, RiExchangeDollarLine,
  RiBarChartGroupedLine,
} from 'react-icons/ri';
import { toast } from 'sonner';
import apiClient from '../lib/apiClient';
import { fetchLatestRelease } from '../lib/githubRelease';
import type { GithubRelease } from '../lib/githubRelease';

const API = '/api';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const NAV_SCHOOL = [
  { icon: Zap,           label: "Vue d'ensemble", id: 'overview'   },
  { icon: Users,         label: 'Élèves',          id: 'students'   },
  { icon: GraduationCap, label: 'Notes',            id: 'grades'     },
  { icon: DollarSign,    label: 'Finance',          id: 'finance'    },
  { icon: Briefcase,     label: 'Personnel',        id: 'staff'      },
  { icon: BookOpen,      label: 'Structure',        id: 'structure'  },
];
const NAV_ACCOUNT = [
  { icon: Wallet,        label: 'Facturation',      id: 'billing'    },
  { icon: Download,      label: 'Téléchargements',  id: 'downloads'  },
  { icon: Settings,      label: 'Paramètres',       id: 'settings'   },
];
const NAV = [...NAV_SCHOOL, ...NAV_ACCOUNT];

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [activeNav, setActiveNav] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bulletinStudent, setBulletinStudent] = useState<any>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(user.subscriptionStatus);
  const [subscriptionExpiry, setSubscriptionExpiry] = useState(user.subscriptionExpiry);
  const [profile, setProfile] = useState({
    schoolName:     user.schoolName     || '',
    directorName:   user.directorName   || '',
    country:        user.country        || '',
    city:           user.city           || '',
    levels:         (Array.isArray(user.levels) ? user.levels : []) as string[],
    prefecture:     user.prefecture     || '',
    sousPrefecture: user.sousPrefecture || '',
    rccm:           user.rccm           || '',
    logoUrl:        user.logoUrl        || '',
  });
  const [saving, setSaving] = useState(false);
  const [pwd, setPwd] = useState({ oldPassword: '', newPassword: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [syncStats, setSyncStats] = useState<{ counts: Record<string, number>; lastSyncAt: string | null } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);


  type LatePayer = { first_name: string; last_name: string; parent_phone: string | null };
  type DashStats = {
    totalIn: number; totalOut: number; balance: number;
    monthlyData: { month: string; total_in: number; total_out: number }[];
    totalStudents: number; paidStudents: number; recoveryRate: number;
    latePayers: LatePayer[];
    currentMonth?: string;
  };
  const [dashStats, setDashStats] = useState<DashStats | null>(null);

  const fetchStats = useCallback(() => {
    setLoadingStats(true);
    apiClient.get('/school/stats')
      .then(r => { if (r.data) setSyncStats(r.data); })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  const fetchDashboard = useCallback(() => {
    apiClient.get('/school/dashboard')
      .then(r => { if (r.data) setDashStats(r.data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
    fetchDashboard();
    const t = setInterval(() => { fetchStats(); fetchDashboard(); }, 30_000);
    return () => clearInterval(t);
  }, [fetchStats, fetchDashboard]);

  useEffect(() => {
    if (activeNav === 'downloads' && !release) {
      fetch(`${API}/settings/application`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          const repo = d?.data?.githubRepo;
          if (repo) fetchLatestRelease(repo).then(r => { if (r) setRelease(r); });
        })
        .catch(() => {});
    }
  }, [activeNav]);

  // Fermer sidebar mobile quand on change d'onglet
  const navigate = (id: string) => {
    setActiveNav(id);
    setSidebarOpen(false);
    setBulletinStudent(null);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/school/profile`, profile);
      toast.success('Profil mis à jour avec succès');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (pwd.newPassword !== pwd.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (pwd.newPassword.length < 6) { toast.error('Mot de passe trop court (minimum 6 caractères)'); return; }
    setSavingPwd(true);
    try {
      await apiClient.put(`/school/password`, { oldPassword: pwd.oldPassword, newPassword: pwd.newPassword });
      toast.success('Mot de passe modifié avec succès');
      setPwd({ oldPassword: '', newPassword: '', confirm: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors du changement de mot de passe');
    } finally {
      setSavingPwd(false);
    }
  };

  function relativeTime(dateStr: string | null): string {
    if (!dateStr) return 'Jamais';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'À l\'instant';
    if (mins < 60) return `Il y a ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    return `Il y a ${Math.floor(hrs / 24)} j`;
  }

  const MONTHS_FR = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const formatAmt = (n: number) => n >= 1_000_000_000 ? `${(n/1_000_000_000).toFixed(1)}Md` : n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n/1_000).toFixed(0)}K` : `${n}`;
  const formatAmtFull = (n: number) => n.toLocaleString('fr-FR') + ' GNF';
  const nowDate = new Date();
  const currentMonthKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
  const MOIS_FR_LONG = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const currentMonthName = MOIS_FR_LONG[nowDate.getMonth()];
  const months6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTHS_FR[d.getMonth()] };
  });
  const chartData = months6.map(({ key, label }) => {
    const f = dashStats?.monthlyData.find(m => m.month === key);
    return { label, totalIn: f?.total_in || 0, totalOut: f?.total_out || 0 };
  });
  const recoveryRate = dashStats?.recoveryRate ?? 0;

  const isExpired = new Date(subscriptionExpiry) < new Date();
  const isActive = subscriptionStatus === 'active' || (subscriptionStatus === 'trial' && !isExpired);
  const daysLeft = Math.ceil((new Date(subscriptionExpiry).getTime() - Date.now()) / 86400000);
  const initials = (user.schoolName || 'U').slice(0, 2).toUpperCase();
  const setField = (f: string, v: string) => setProfile(p => ({ ...p, [f]: v }));

  const NavItem = ({ item }: { item: typeof NAV[0] }) => {
    const active = activeNav === item.id;
    return (
      <button
        key={item.id}
        onClick={() => navigate(item.id)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 text-left ${
          active
            ? 'bg-white/15 text-white shadow-sm'
            : 'text-slate-400 hover:text-white hover:bg-white/8'
        }`}
      >
        <item.icon size={16} className={active ? 'text-white' : 'text-slate-500'} strokeWidth={active ? 2.5 : 2} />
        <span className={active ? 'text-white' : ''}>{item.label}</span>
        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />}
      </button>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #0f1f3d 100%)' }}>
      {/* Brand */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
            <BookOpen size={17} className="text-white" />
          </div>
          <div>
            <p className="font-black text-white text-[17px] leading-none tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>DJOLI</p>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">Cloud Portal</p>
          </div>
        </div>
        {/* School chip */}
        <div className="mt-4 px-3 py-2.5 rounded-xl bg-white/6 border border-white/8 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 text-blue-200"
            style={{ background: 'rgba(37,99,235,0.3)' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-white truncate leading-tight">{user.schoolName}</p>
            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pb-3 overflow-y-auto space-y-0.5">
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-600 px-3 pt-1 pb-2">Gestion scolaire</p>
        {NAV_SCHOOL.map(item => <NavItem key={item.id} item={item} />)}

        <div className="mx-3 my-3 border-t border-white/8" />
        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-600 px-3 pb-2">Mon compte</p>
        {NAV_ACCOUNT.map(item => <NavItem key={item.id} item={item} />)}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/8">
        {/* Subscription status */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-2 ${isActive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse-soft`} />
          <p className={`text-[11px] font-semibold ${isActive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isActive ? `Actif · ${daysLeft > 0 ? `${daysLeft}j restants` : 'À renouveler'}` : 'Abonnement expiré'}
          </p>
        </div>
        <button onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150">
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ─── SIDEBAR DESKTOP (lg+) ─── */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 left-0 z-30 overflow-hidden"
        style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.15)' }}>
        <SidebarContent />
      </aside>

      {/* ─── SIDEBAR MOBILE OVERLAY ─── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 flex flex-col shadow-2xl overflow-hidden" style={{ boxShadow: '8px 0 32px rgba(0,0,0,0.3)' }}>
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-5 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all z-10">
              <X size={18} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ─── MAIN ─── */}
      <main className="flex-1 lg:ml-64 pb-20 lg:pb-0">

        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xl border-b border-slate-100 px-4 lg:px-8 h-14 lg:h-16 flex items-center justify-between"
          style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all">
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-[15px] font-bold text-slate-900 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                {activeNav === 'students' && bulletinStudent ? 'Bulletin scolaire' : NAV.find(n => n.id === activeNav)?.label}
              </h1>
              {activeNav === 'students' && bulletinStudent && (
                <button onClick={() => setBulletinStudent(null)} className="text-[11px] text-blue-500 font-semibold hover:text-blue-700 transition-colors">
                  ← Retour aux élèves
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 lg:gap-2">
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all relative">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full ring-2 ring-white" />
            </button>
            <div className="h-5 w-px bg-slate-100 mx-1" />
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-all cursor-default">
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px] text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
                {initials}
              </div>
              <div className="hidden sm:block min-w-0">
                <p className="text-[12px] font-semibold text-slate-800 truncate max-w-[110px]">{user.schoolName}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{user.email}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-8 space-y-5 lg:space-y-8">

          {/* ══════════════════════════════════════════
              OVERVIEW
          ══════════════════════════════════════════ */}
          {activeNav === 'overview' && (
            <>
              {/* Titre + refresh */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg lg:text-2xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                    Bonjour{window.innerWidth >= 640 ? `, ${user.schoolName}` : ''} 👋
                  </h2>
                  <p className="text-slate-500 text-xs lg:text-sm mt-0.5 hidden sm:block">Aperçu de votre compte DJOLI.</p>
                </div>
                <button
                  onClick={() => { fetchStats(); fetchDashboard(); }}
                  disabled={loadingStats}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-xs font-medium border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-all disabled:opacity-50 flex-shrink-0"
                >
                  <RefreshCw size={13} className={loadingStats ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Actualiser</span>
                </button>
              </div>

              {/* Alerte abonnement expiré */}
              {!isActive && (
                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center gap-3">
                  <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-red-800 text-sm">Abonnement expiré</p>
                    <p className="text-red-600 text-xs mt-0.5">Contactez votre administrateur pour renouveler votre abonnement.</p>
                  </div>
                </div>
              )}

              {/* KPI cards — 4 cols */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {[
                  {
                    label: 'Élèves inscrits', sub: 'Inscrits',
                    value: dashStats ? String(dashStats.totalStudents) : '—',
                    icon: <RiUserLine />, iconColor: '#7c3aed', iconBg: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                    subColor: 'text-violet-500', trend: null,
                  },
                  {
                    label: 'Total encaissé', sub: 'Entrées cumulées',
                    value: dashStats ? `${formatAmt(dashStats.totalIn)} GNF` : '—',
                    icon: <RiMoneyDollarCircleLine />, iconColor: '#059669', iconBg: 'linear-gradient(135deg,#059669,#34d399)',
                    subColor: 'text-emerald-500', trend: <RiArrowUpLine />,
                  },
                  {
                    label: 'Personnel', sub: 'Membres actifs',
                    value: syncStats ? String(syncStats.counts['staff'] ?? 0) : '—',
                    icon: <RiTeamLine />, iconColor: '#2563eb', iconBg: 'linear-gradient(135deg,#2563eb,#60a5fa)',
                    subColor: 'text-blue-500', trend: null,
                  },
                  {
                    label: 'Solde caisse', sub: dashStats && dashStats.balance < 0 ? 'Déficit' : 'Positif',
                    value: dashStats ? `${formatAmt(dashStats.balance)} GNF` : '—',
                    icon: <RiBankLine />, iconColor: dashStats && dashStats.balance < 0 ? '#dc2626' : '#7c3aed',
                    iconBg: dashStats && dashStats.balance < 0 ? 'linear-gradient(135deg,#dc2626,#f87171)' : 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                    subColor: dashStats && dashStats.balance < 0 ? 'text-red-500' : 'text-emerald-500',
                    trend: dashStats && dashStats.balance < 0 ? <RiArrowDownLine /> : <RiArrowUpLine />,
                  },
                ].map((card, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0"
                        style={{ background: card.iconBg, boxShadow: `0 4px 12px ${card.iconColor}40` }}>
                        {card.icon}
                      </div>
                      {loadingStats && <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-100 border-t-slate-400 animate-spin mt-1" />}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
                    <p className="text-xl lg:text-2xl font-black text-slate-900 mt-0.5 leading-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {card.value}
                    </p>
                    <p className={`text-[10px] font-semibold mt-1.5 flex items-center gap-0.5 ${card.subColor}`}>
                      {card.trend}{card.sub}
                    </p>
                  </div>
                ))}
              </div>

              {/* Graphiques — bar chart + donut recouvrement */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl lg:rounded-3xl border border-slate-100 p-4 lg:p-7 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 text-base lg:text-lg">
                      <RiBarChartGroupedLine />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm lg:text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Flux de Trésorerie</h3>
                      <p className="text-[10px] lg:text-xs text-slate-400 font-medium">Entrées / Sorties — 6 derniers mois</p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={170} debounce={50}>
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} dy={6} />
                      <YAxis axisLine={false} tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }}
                        tickFormatter={v => formatAmt(Number(v))} />
                      <Tooltip
                        formatter={(v, name) => [formatAmtFull(Number(v)), String(name)]}
                        contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '8px 12px', fontSize: '11px' }}
                        labelStyle={{ fontWeight: 700, marginBottom: 3, color: '#0f172a' }}
                      />
                      <Bar dataKey="totalIn" name="Entrées" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                      <Bar dataKey="totalOut" name="Sorties" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-50">
                    {[
                      { label: 'Total IN',  value: dashStats ? formatAmtFull(dashStats.totalIn)   : '—', color: 'text-emerald-600', icon: <RiArrowUpLine /> },
                      { label: 'Total OUT', value: dashStats ? formatAmtFull(dashStats.totalOut)  : '—', color: 'text-red-500',     icon: <RiArrowDownLine /> },
                      { label: 'Solde net', value: dashStats ? formatAmtFull(dashStats.balance)   : '—', color: dashStats && dashStats.balance < 0 ? 'text-red-600' : 'text-slate-900', icon: <RiExchangeDollarLine /> },
                    ].map((s, i) => (
                      <div key={i} className="text-center">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-center gap-0.5">
                          <span className={s.color}>{s.icon}</span>{s.label}
                        </p>
                        <p className={`text-xs font-bold mt-0.5 ${s.color} truncate`}>{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Donut recouvrement */}
                <div className="hidden lg:flex bg-white rounded-3xl border border-slate-100 p-7 shadow-sm flex-col">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 text-lg">
                      <RiMoneyDollarCircleLine />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Recouvrement</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-full">
                          {dashStats?.currentMonth ?? currentMonthName}
                        </span>
                        <p className="text-[10px] text-slate-400 font-medium">Mois en cours</p>
                      </div>
                    </div>
                  </div>
                  <div className="relative flex-1 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={180} debounce={50}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Ont payé', value: dashStats?.paidStudents ?? 0 },
                            { name: 'Non payé', value: Math.max((dashStats?.totalStudents ?? 0) - (dashStats?.paidStudents ?? 0), 0) },
                          ]}
                          cx="50%" cy="50%" innerRadius={52} outerRadius={72}
                          paddingAngle={3} dataKey="value" strokeWidth={0}
                          startAngle={90} endAngle={-270}
                        >
                          <Cell fill={recoveryRate >= 70 ? '#10b981' : recoveryRate >= 40 ? '#f59e0b' : '#ef4444'} />
                          <Cell fill="#f1f5f9" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{recoveryRate}%</span>
                      <span className="text-[10px] font-semibold text-slate-400 mt-0.5">payé ce mois</span>
                    </div>
                  </div>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 rounded-xl">
                      <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5"><RiUserLine /> Ont payé</span>
                      <span className="text-xs font-bold text-emerald-700">{dashStats?.paidStudents ?? 0} élèves</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-xl">
                      <span className="text-xs font-semibold text-red-600 flex items-center gap-1.5"><RiUserLine /> Non payé</span>
                      <span className="text-xs font-bold text-red-600">{(dashStats?.totalStudents ?? 0) - (dashStats?.paidStudents ?? 0)} élèves</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Abonnement + téléchargement */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
                <div className="lg:col-span-2 bg-white rounded-2xl lg:rounded-3xl border border-slate-100 p-5 lg:p-8 shadow-sm">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="min-w-0">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                        {isActive ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                        {isActive ? 'Abonnement Actif' : 'Expiré'}
                      </div>
                      <h3 className="text-base lg:text-xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Plan Gestion Scolaire</h3>
                      <p className="text-slate-500 text-xs mt-1 leading-relaxed hidden sm:block">Accès complet à DJOLI avec synchronisation cloud.</p>
                    </div>
                    <div className="text-right bg-slate-50 px-3 lg:px-5 py-3 lg:py-4 rounded-xl lg:rounded-2xl flex-shrink-0">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Expire</p>
                      <p className="font-bold text-slate-900 text-xs">{new Date(subscriptionExpiry).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      {isActive && daysLeft > 0 && <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{daysLeft}j restants</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 lg:gap-4 mb-5">
                    {[
                      { icon: Shield, label: '5 postes',   sub: 'max' },
                      { icon: Globe,  label: 'Sync cloud', sub: 'illimitée' },
                      { icon: Award,  label: 'Support',    sub: 'prioritaire' },
                    ].map((f, i) => (
                      <div key={i} className="flex items-center gap-2 bg-slate-50 rounded-xl p-2.5 lg:p-4">
                        <f.icon size={14} className="text-indigo-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{f.label}</p>
                          <p className="text-[10px] text-slate-400 hidden sm:block">{f.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isActive && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-red-400 flex-shrink-0" />
                      Contactez votre administrateur pour renouveler votre abonnement.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl lg:rounded-3xl p-5 lg:p-7 text-white flex flex-col gap-4 lg:gap-6 shadow-xl shadow-slate-900/20" style={{ backgroundColor: '#0f172a' }}>
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Download size={20} /></div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Application Desktop</h3>
                    <p className="text-indigo-200 text-xs leading-relaxed hidden sm:block">Téléchargez la dernière version de DJOLI pour Windows.</p>
                    <div className="mt-3 space-y-1.5">
                      {['Offline-first', 'Sync automatique', 'Bulletins PDF'].map(f => (
                        <div key={f} className="flex items-center gap-2 text-indigo-200 text-xs"><CheckCircle size={11} /> {f}</div>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => navigate('downloads')} className="w-full py-2.5 bg-white text-indigo-600 rounded-xl font-semibold text-xs hover:bg-indigo-50 transition-all flex items-center justify-center gap-1.5">
                    <Download size={14} /> Télécharger (.exe)
                  </button>
                </div>
              </div>

              {/* Activité récente — masquée sur mobile */}
              <div className="hidden sm:block bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Activité récente</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', title: 'Abonnement initialisé',    time: new Date(user.createdAt).toLocaleString('fr-FR'), note: 'Plan PRO' },
                    { icon: RefreshCw,   color: 'bg-indigo-50 text-indigo-600',   title: 'Dernière synchronisation', time: relativeTime(syncStats?.lastSyncAt ?? null), note: syncStats ? `${Object.values(syncStats.counts).reduce((a, b) => a + b, 0)} enregistrements` : '—' },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.color} flex-shrink-0`}><a.icon size={16} /></div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm">{a.title}</p>
                        <p className="text-xs text-slate-400 font-medium">{a.time}</p>
                      </div>
                      <span className="text-xs text-slate-500 font-medium bg-white px-3 py-1 rounded-full border border-slate-100 flex-shrink-0">{a.note}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════
              ÉLÈVES
          ══════════════════════════════════════════ */}
          {activeNav === 'students' && !bulletinStudent && (
            <StudentsSection onOpenBulletin={(s) => setBulletinStudent(s)} />
          )}

          {/* ══════════════════════════════════════════
              BULLETIN
          ══════════════════════════════════════════ */}
          {activeNav === 'students' && bulletinStudent && (
            <BulletinSection student={bulletinStudent} onBack={() => setBulletinStudent(null)} />
          )}

          {/* ══════════════════════════════════════════
              NOTES
          ══════════════════════════════════════════ */}
          {activeNav === 'grades' && <GradesSection />}

          {/* ══════════════════════════════════════════
              FINANCE
          ══════════════════════════════════════════ */}
          {activeNav === 'finance' && <FinanceSection />}

          {/* ══════════════════════════════════════════
              PERSONNEL
          ══════════════════════════════════════════ */}
          {activeNav === 'staff' && <StaffSection />}

          {/* ══════════════════════════════════════════
              STRUCTURE
          ══════════════════════════════════════════ */}
          {activeNav === 'structure' && <StructureSection />}

          {/* ══════════════════════════════════════════
              BILLING
          ══════════════════════════════════════════ */}
          {activeNav === 'billing' && (
            <>
              <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 p-5 lg:p-8 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold mb-3 ${isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                      {isActive ? <CheckCircle size={11} /> : <AlertCircle size={11} />}
                      {isActive ? 'Abonnement Actif' : 'Abonnement Expiré'}
                    </div>
                    <h2 className="text-base lg:text-xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Plan de Gestion Scolaire Pro</h2>
                    <p className="text-slate-500 text-xs mt-1 hidden sm:block">Accès complet · Sync cloud · Support prioritaire · 5 postes max</p>
                  </div>
                  <div className="text-right bg-slate-50 px-4 py-3 rounded-xl flex-shrink-0">
                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Expire le</p>
                    <p className="font-bold text-slate-900 text-xs">{new Date(subscriptionExpiry).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                    {daysLeft > 0 && <p className={`text-[10px] font-semibold mt-0.5 ${daysLeft <= 7 ? 'text-amber-600' : 'text-emerald-600'}`}>{daysLeft}j restants</p>}
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl lg:rounded-3xl p-8 flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <AlertCircle size={26} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Renouvellement géré par l'administrateur</h3>
                  <p className="text-slate-500 text-sm leading-relaxed max-w-sm">
                    Le renouvellement de votre abonnement est effectué par l'administrateur DJOLI.<br />
                    Contactez-le pour prolonger votre accès.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-sm font-medium text-amber-800">
                  <span>support@djoli.app</span>
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════
              DOWNLOADS
          ══════════════════════════════════════════ */}
          {activeNav === 'downloads' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                <div className="rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-white flex flex-col gap-5" style={{ backgroundColor: '#0f172a' }}>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center"><Package size={24} /></div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-1.5" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>DJOLI Desktop</h2>
                    <p className="text-indigo-200 text-sm leading-relaxed">Application de gestion scolaire hors-ligne avec synchronisation automatique.</p>
                    <div className="mt-4 space-y-2">
                      {['Gestion des élèves, classes et notes', 'Paiements & facturation', 'Bulletins & rapports PDF', 'Synchronisation cloud automatique'].map(f => (
                        <div key={f} className="flex items-center gap-2 text-indigo-200 text-xs"><CheckCircle size={13} className="text-emerald-400 flex-shrink-0" />{f}</div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-3 text-xs text-indigo-300">
                      <span className="bg-white/10 px-3 py-1.5 rounded-lg font-mono">
                        {release ? `v${release.version}` : '…'}
                      </span>
                      <span>Windows 10/11</span>
                    </div>
                    <a
                      href={release?.downloadUrl || '#'}
                      target={release ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className={`w-full py-3 bg-white text-indigo-600 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${release ? 'hover:bg-indigo-50' : 'opacity-50 cursor-not-allowed pointer-events-none'}`}
                    >
                      <Download size={16} /> {release ? 'Télécharger (.exe)' : 'Chargement…'}
                    </a>
                  </div>
                </div>

                <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 p-6 lg:p-8 shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-1" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Guide d'installation</h3>
                  <p className="text-slate-500 text-xs mb-5">Suivez ces étapes pour installer DJOLI sur votre poste.</p>
                  <ol className="space-y-4">
                    {[
                      { step: '01', title: 'Télécharger',  desc: "Cliquez sur le bouton et sauvegardez le fichier .exe." },
                      { step: '02', title: 'Installer',    desc: "Exécutez l'installateur en tant qu'administrateur." },
                      { step: '03', title: 'Connecter',    desc: "Saisissez votre email et mot de passe au premier lancement." },
                      { step: '04', title: 'Synchroniser', desc: "DJOLI télécharge automatiquement vos données depuis le cloud." },
                    ].map(s => (
                      <li key={s.step} className="flex gap-3">
                        <span className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0">{s.step}</span>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">{s.title}</p>
                          <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{s.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-5 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs text-amber-700 font-medium">Besoin d'aide ? Contactez notre support via WhatsApp ou par email.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 p-5 lg:p-8 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Configuration minimale requise</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
                  {[
                    { label: 'Système',   value: 'Windows 10 / 11' },
                    { label: 'RAM',       value: '4 Go minimum' },
                    { label: 'Disque',    value: '500 Mo libres' },
                    { label: 'Connexion', value: 'Internet (sync)' },
                  ].map(r => (
                    <div key={r.label} className="bg-slate-50 rounded-xl lg:rounded-2xl p-4">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">{r.label}</p>
                      <p className="font-semibold text-slate-900 text-xs">{r.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ══════════════════════════════════════════
              SETTINGS
          ══════════════════════════════════════════ */}
          {activeNav === 'settings' && (
            <>
              <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 p-5 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Building2 size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Informations de l'école</h3>
                    <p className="text-slate-500 text-xs mt-0.5 hidden sm:block">Ces infos apparaissent dans vos bulletins et reçus.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { label: "Nom de l'école",      field: 'schoolName',     placeholder: 'Ex: École Primaire Lumière' },
                    { label: 'Nom du directeur',     field: 'directorName',   placeholder: 'Ex: M. Diallo Mamadou' },
                    { label: 'Pays',                 field: 'country',        placeholder: 'Ex: Guinée' },
                    { label: 'Ville',                field: 'city',           placeholder: 'Ex: Conakry' },
                    { label: 'Préfecture',           field: 'prefecture',     placeholder: 'Ex: Coyah' },
                    { label: 'Sous-préfecture',      field: 'sousPrefecture', placeholder: 'Ex: Manéah' },
                    { label: 'RCCM / Numéro légal',  field: 'rccm',           placeholder: 'Ex: GN-CNK-...' },
                    { label: 'URL du logo',          field: 'logoUrl',        placeholder: 'https://...' },
                  ] as const).map(({ label, field, placeholder }) => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                      <input
                        type="text"
                        value={profile[field]}
                        onChange={e => setField(field, e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder:text-slate-300 transition-all"
                      />
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cycles scolaires</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Maternelle','Primaire','Collège','Lycée'] as const).map(lvl => {
                        const checked = profile.levels.includes(lvl)
                        return (
                          <label key={lvl}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none ${
                              checked ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                            }`}
                            onClick={() => {
                              const cur = profile.levels
                              setField('levels', checked ? cur.filter((l: string) => l !== lvl) : [...cur, lvl])
                            }}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                            }`}>
                              {checked && <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-white fill-current"><path d="M1 5l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <span className="text-xs font-semibold">{lvl}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    <Save size={14} />
                    {saving ? 'Sauvegarde...' : 'Enregistrer'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl lg:rounded-3xl border border-slate-100 p-5 lg:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center">
                    <Key size={16} className="text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Changer le mot de passe</h3>
                    <p className="text-slate-500 text-xs mt-0.5 hidden sm:block">Utilisez un mot de passe fort d'au moins 6 caractères.</p>
                  </div>
                </div>
                <div className="max-w-md space-y-3">
                  {([
                    { label: 'Mot de passe actuel',               key: 'oldPassword' },
                    { label: 'Nouveau mot de passe',              key: 'newPassword' },
                    { label: 'Confirmer le nouveau mot de passe', key: 'confirm'     },
                  ] as const).map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
                      <input
                        type="password"
                        value={pwd[key]}
                        onChange={e => setPwd(p => ({ ...p, [key]: e.target.value }))}
                        placeholder="••••••••"
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                      />
                    </div>
                  ))}
                  <button
                    onClick={changePassword}
                    disabled={savingPwd}
                    className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    <Lock size={14} />
                    {savingPwd ? 'Modification...' : 'Changer le mot de passe'}
                  </button>
                </div>
              </div>

              {/* Déconnexion mobile */}
              <div className="lg:hidden">
                <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-all">
                  <LogOut size={16} />
                  Déconnexion
                </button>
              </div>
            </>
          )}

        </div>
      </main>

      {/* ─── BOTTOM NAV MOBILE (< lg) ─── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/96 backdrop-blur-xl border-t border-slate-100 safe-area-pb"
        style={{ boxShadow: '0 -1px 0 rgba(0,0,0,0.05), 0 -4px 16px rgba(0,0,0,0.06)' }}>
        <div className="flex items-center justify-around px-1 py-1.5">
          {NAV_SCHOOL.slice(0, 5).map(item => {
            const active = activeNav === item.id;
            return (
              <button key={item.id} onClick={() => navigate(item.id)}
                className={`flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-all min-w-0 flex-1 ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all ${active ? 'bg-blue-50' : ''}`}>
                  <item.icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                </div>
                <span className={`text-[9px] font-bold truncate w-full text-center ${active ? 'text-blue-600' : 'text-slate-400'}`}>{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setSidebarOpen(true)}
            className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl min-w-0 flex-1 text-slate-400">
            <div className="w-8 h-8 flex items-center justify-center rounded-xl">
              <Menu size={18} strokeWidth={1.8} />
            </div>
            <span className="text-[9px] font-bold">Plus</span>
          </button>
        </div>
      </nav>

    </div>
  );
};
