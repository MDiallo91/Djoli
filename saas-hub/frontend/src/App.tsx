/**
 * App.tsx — Routeur principal React Router v6.
 *
 * Structure des routes admin (nested layout) :
 *   /admin/*  → AdminGuard (auth) → AdminProvider (context) → AdminLayout (sidebar+outlet)
 *               ├─ index          → DashboardTab
 *               ├─ etablissements → SchoolsTab
 *               ├─ abonnements   → SubscriptionsTab
 *               ├─ en-attente    → PendingTab
 *               └─ parametres/*  → SettingsPage (Sprint 5)
 */

import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { LandingPage }      from './components/LandingPage';
import { Auth }             from './components/Auth';
import { Dashboard }        from './components/Dashboard';
import { LegalPage }        from './components/LegalPage';
import { AdminProvider }    from './context/AdminContext';
import { AdminLayout }      from './layout/AdminLayout';
import { DashboardTab }     from './components/admin/DashboardTab';
import { SchoolsTab }       from './components/admin/SchoolsTab';
import { PendingTab }       from './components/admin/PendingTab';
import { SubscriptionsTab } from './components/admin/SubscriptionsTab';
import { SettingsPage }     from './page/admin/SettingsPage';

export { toast };

function getUser() {
  try { const s = localStorage.getItem('hub_user'); return s ? JSON.parse(s) : null; } catch { return null; }
}


// ─── Wrappers de routes ────────────────────────────────────────

function LandingRoute() { return <LandingPage />; }

function AuthRoute() {
  const navigate = useNavigate();
  const user = getUser();
  if (user) return <Navigate to={user.role === 'super_admin' ? '/admin' : '/dashboard'} replace />;

  return (
    <Auth
      onBack={() => navigate('/')}
      onSuccess={(data: any) => {
        localStorage.setItem('hub_user', JSON.stringify(data));
        const isAdmin = data.role === 'super_admin';
        toast.success(isAdmin ? 'Espace Admin' : 'Connexion réussie', {
          description: isAdmin ? "Bienvenue sur le panneau d'administration." : `Bienvenue, ${data.schoolName || data.email}`,
        });
        navigate(isAdmin ? '/admin' : '/dashboard');
      }}
    />
  );
}

function DashboardRoute() {
  const navigate = useNavigate();
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Dashboard
      user={user}
      onLogout={() => {
        localStorage.removeItem('hub_user');
        toast.info('Déconnecté', { description: 'À bientôt !' });
        navigate('/');
      }}
    />
  );
}

/** Guard d'authentification + provider + layout admin */
function AdminGuard() {
  const navigate = useNavigate();
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  const handleLogout = () => {
    localStorage.removeItem('hub_user');
    toast.info('Déconnecté', { description: 'À bientôt !' });
    navigate('/');
  };

  return (
    <AdminProvider>
      <AdminLayout onLogout={handleLogout} />
    </AdminProvider>
  );
}

// ─── App ──────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          style: { fontFamily: 'Inter, system-ui, sans-serif', fontSize: '13px' },
          duration: 4000,
        }}
      />
      <Routes>
        <Route path="/"          element={<LandingRoute />} />
        <Route path="/login"     element={<AuthRoute />} />
        <Route path="/dashboard"      element={<DashboardRoute />} />
        <Route path="/dashboard/:tab" element={<DashboardRoute />} />

        {/* Routes admin imbriquées — AdminGuard contient AdminLayout + Outlet */}
        <Route path="/admin" element={<AdminGuard />}>
          <Route index                element={<DashboardTab />} />
          <Route path="etablissements" element={<SchoolsTab />} />
          <Route path="abonnements"    element={<SubscriptionsTab />} />
          <Route path="en-attente"     element={<PendingTab />} />
          <Route path="parametres/*"   element={<SettingsPage />} />
        </Route>

        <Route path="/legal/terms"    element={<LegalPage type="terms" />} />
        <Route path="/legal/privacy"  element={<LegalPage type="privacy" />} />
        <Route path="/legal/mentions" element={<LegalPage type="mentions" />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
