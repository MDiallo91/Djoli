import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { LandingPage } from './components/LandingPage'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { AdminDashboard } from './components/AdminDashboard'
import { LegalPage } from './components/LegalPage'

export { toast }

function getUser() {
  try { const s = localStorage.getItem('hub_user'); return s ? JSON.parse(s) : null; } catch { return null; }
}

// ─── Route wrappers (inject navigate-based callbacks) ─────────

function LandingRoute() {
  return <LandingPage />
}

function AuthRoute() {
  const navigate = useNavigate()
  const user = getUser()
  if (user) return <Navigate to={user.role === 'super_admin' ? '/admin' : '/dashboard'} replace />

  const handleSuccess = (data: any) => {
    localStorage.setItem('hub_user', JSON.stringify(data))
    const isAdmin = data.role === 'super_admin'
    toast.success(isAdmin ? 'Espace Admin' : 'Connexion réussie', {
      description: isAdmin
        ? "Bienvenue sur le panneau d'administration."
        : `Bienvenue, ${data.schoolName || data.email}`,
    })
    navigate(isAdmin ? '/admin' : '/dashboard')
  }

  return <Auth onBack={() => navigate('/')} onSuccess={handleSuccess} />
}

function DashboardRoute() {
  const navigate = useNavigate()
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />

  const handleLogout = () => {
    localStorage.removeItem('hub_user')
    toast.info('Déconnecté', { description: 'À bientôt !' })
    navigate('/')
  }

  return <Dashboard user={user} onLogout={handleLogout} />
}

function AdminRoute() {
  const navigate = useNavigate()
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />

  const handleLogout = () => {
    localStorage.removeItem('hub_user')
    toast.info('Déconnecté', { description: 'À bientôt !' })
    navigate('/')
  }

  return <AdminDashboard onLogout={handleLogout} />
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
        <Route path="/"               element={<LandingRoute />} />
        <Route path="/login"          element={<AuthRoute />} />
        <Route path="/dashboard"      element={<DashboardRoute />} />
        <Route path="/admin"          element={<AdminRoute />} />
        <Route path="/legal/terms"    element={<LegalPage type="terms" />} />
        <Route path="/legal/privacy"  element={<LegalPage type="privacy" />} />
        <Route path="/legal/mentions" element={<LegalPage type="mentions" />} />
        <Route path="*"               element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
