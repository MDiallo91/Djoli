/**
 * layout/AdminLayout.tsx
 * Shell du panneau administrateur : sidebar fixe + mobile topbar + <Outlet />.
 * Extrait de : AdminDashboard.tsx:1636–1781
 *
 * Responsabilités de ce fichier :
 *   → Sidebar fixe (desktop) / drawer (mobile)
 *   → Toggle collapse sidebar
 *   → Navigation principale (5 onglets)
 *   → Badge "En attente" sur le nav
 *   → Logo + nom du site depuis AdminContext
 *   → Bouton déconnexion
 *
 * N'embarque AUCUNE logique métier (pas de fetch, pas de state écoles).
 * Ces données viennent de AdminContext.
 *
 * Consommé par : App.tsx (wrappé dans AdminRoute, utilisé comme layout React Router)
 * Fournit : <Outlet /> pour que les onglets s'affichent à l'intérieur
 */

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut, Settings, TrendingUp, CreditCard,
  School as SchoolIcon, Clock, ShieldCheck,
  RefreshCw, Menu, ChevronLeft, ChevronRight,
  Sun, Moon,
} from 'lucide-react';
import { useAdminContext } from '../context/AdminContext';
import { pathToTab }       from '../constants/routes';
import { ADMIN_ROUTES }    from '../constants/routes';
import type { MainView }   from '../types/admin';
import { Spinner }         from '../ui/design_system/Spinner';
import { useTheme }        from '../context/ThemeContext';

interface AdminLayoutProps {
  onLogout: () => void;
}

const NAV_ITEMS: { id: MainView; label: string; icon: any }[] = [
  { id: 'dashboard',     label: 'Tableau de bord', icon: TrendingUp  },
  { id: 'schools',       label: 'Établissements',   icon: SchoolIcon  },
  { id: 'subscriptions', label: 'Abonnements',      icon: CreditCard  },
  { id: 'pending',       label: 'En attente',       icon: Clock       },
  { id: 'settings',      label: 'Paramètres',       icon: Settings    },
];

export function AdminLayout({ onLogout }: AdminLayoutProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const activeTab = pathToTab(location.pathname);

  const { schools, loading, fetchSchools, pendingCount, siteCfg } = useAdminContext();
  const { dark, toggleDark } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  const goTo = (tab: MainView) => {
    navigate(ADMIN_ROUTES[tab]);
    setSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Spinner size="lg" className="text-primary-600" />
      </div>
    );
  }

  const sidebarW = collapsed ? 'w-14' : 'w-56';

  return (
    <div className="admin-shell min-h-screen flex bg-bg">
      {/* ── Overlay mobile ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 flex flex-col flex-shrink-0 transition-all duration-200',
          sidebarW,
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ backgroundColor: 'var(--primary-900)' }}
      >
        {/* Logo + bouton collapse */}
        <div
          className={`flex items-center ${collapsed ? 'flex-col gap-2 px-2 py-3' : 'px-4 gap-2.5 py-4'}`}
          style={{ borderBottom: '1px solid rgba(255,255,255,0.10)', minHeight: 56 }}
        >
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {siteCfg.logoUrl
              ? <img src={siteCfg.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              : <ShieldCheck size={14} className="text-white" />}
          </div>

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white leading-none truncate">
                {siteCfg.siteName || 'SaaS Admin'}
              </p>
              <p className="text-[10px] text-white/50 font-medium mt-0.5">Master Panel</p>
            </div>
          )}

          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Agrandir' : 'Réduire'}
            className="hidden md:flex items-center justify-center w-6 h-6 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const badge = id === 'pending' ? pendingCount : 0;
            return (
              <button
                key={id}
                title={collapsed ? label : undefined}
                onClick={() => goTo(id)}
                className={[
                  'relative w-full flex items-center py-2.5 rounded-xl text-sm transition-all',
                  collapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
                  activeTab === id
                    ? 'bg-white/20 text-white font-medium'
                    : 'text-white/55 hover:text-white hover:bg-white/10',
                ].join(' ')}
              >
                <Icon size={15} />
                {!collapsed && <span className="flex-1 text-left">{label}</span>}
                {badge > 0 && !collapsed && (
                  <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                    {badge}
                  </span>
                )}
                {badge > 0 && collapsed && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer sidebar */}
        <div className="px-2 py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
          {!collapsed && (
            <div className="flex items-center justify-between px-3 py-1.5 mb-1">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-secondary-400 rounded-full animate-pulse" />
                <span className="text-[11px] text-white/40">En ligne</span>
              </div>
              <button
                onClick={fetchSchools}
                className="p-1 text-white/40 hover:text-white transition-colors"
                title="Actualiser"
              >
                <RefreshCw size={12} />
              </button>
            </div>
          )}
          <button
            onClick={toggleDark}
            title={dark ? 'Mode clair' : 'Mode sombre'}
            className={[
              'w-full flex items-center py-2 rounded-xl text-sm text-white/40',
              'hover:text-white hover:bg-white/10 transition-all mb-0.5',
              collapsed ? 'justify-center' : 'gap-2.5 px-3',
            ].join(' ')}
          >
            {dark ? <Sun size={14} /> : <Moon size={14} />}
            {!collapsed && (dark ? 'Mode clair' : 'Mode sombre')}
          </button>
          <button
            onClick={onLogout}
            title={collapsed ? 'Déconnexion' : undefined}
            className={[
              'w-full flex items-center py-2 rounded-xl text-sm text-white/40',
              'hover:text-red-300 hover:bg-red-400/15 transition-all',
              collapsed ? 'justify-center' : 'gap-2.5 px-3',
            ].join(' ')}
          >
            <LogOut size={14} />
            {!collapsed && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* ── Contenu principal ── */}
      <div className={[
        'flex-1 flex flex-col min-w-0 transition-all duration-200',
        collapsed ? 'md:ml-14' : 'md:ml-56',
      ].join(' ')}>
        {/* Topbar mobile */}
        <header
          className="md:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-30"
          style={{ backgroundColor: 'var(--primary-700)', borderBottom: '1px solid rgba(255,255,255,0.10)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-white text-sm flex-1">
            {NAV_ITEMS.find(n => n.id === activeTab)?.label}
          </span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
              {pendingCount}
            </span>
          )}
        </header>

        {/* Zone de contenu — Outlet React Router */}
        <main className="flex-1 p-4 md:p-6">
          <Outlet context={{ schools, fetchSchools }} />
        </main>
      </div>
    </div>
  );
}
