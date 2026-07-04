/**
 * context/AdminContext.tsx
 * Contexte global du panneau admin — évite le prop drilling entre layout et onglets.
 * Consommé par : layout/AdminLayout (provider),
 *                DashboardTab, SchoolsTab, PendingTab, SubscriptionsTab (consumers)
 *
 * Fournit :
 *   schools, loading, fetchSchools → liste des établissements
 *   pendingCount                   → badge "En attente" dans le sidebar
 *   siteCfg                        → nom + logo pour le sidebar (localStorage-backed)
 */

import { createContext, useContext, type ReactNode } from 'react';
import { useSchools } from '../hooks/useSchools';
import { useSiteConfigLive } from '../hooks/useSiteConfig';
import type { School, SiteConfig } from '../types/admin';

interface AdminContextValue {
  schools:      School[];
  loading:      boolean;
  fetchSchools: () => Promise<void>;
  pendingCount: number;
  siteCfg:      SiteConfig;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { schools, loading, fetchSchools, pendingCount } = useSchools();
  const siteCfg = useSiteConfigLive();

  return (
    <AdminContext.Provider value={{ schools, loading, fetchSchools, pendingCount, siteCfg }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdminContext(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdminContext doit être utilisé dans <AdminProvider>');
  return ctx;
}
