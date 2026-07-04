/**
 * constants/routes.ts
 * Chemins de navigation admin centralisés.
 * Consommé par : layout/AdminLayout, page/admin/AdminDashboard, page/admin/SettingsPage
 * → Évite les strings magiques éparpillées dans le code
 */

import type { MainView, SettingsSection } from '../types/admin';

// ─── Routes admin principales ─────────────────────────────────
export const ADMIN_ROUTES: Record<MainView, string> = {
  dashboard:     '/admin',
  schools:       '/admin/etablissements',
  subscriptions: '/admin/abonnements',
  pending:       '/admin/en-attente',
  settings:      '/admin/parametres',
};

// ─── Routes sections paramètres ───────────────────────────────
export const SETTINGS_ROUTES: Record<SettingsSection, string> = {
  site:         '/admin/parametres/site',
  contact:      '/admin/parametres/contact',
  tarification: '/admin/parametres/tarification',
  application:  '/admin/parametres/application',
  accueil:      '/admin/parametres/accueil',
  email:        '/admin/parametres/email',
  sms:          '/admin/parametres/sms',
  push:         '/admin/parametres/push',
  paiement:     '/admin/parametres/paiement',
  legal:        '/admin/parametres/legal',
  audit:        '/admin/parametres/audit',
};

// ─── Helpers de dérivation depuis pathname ────────────────────
const VALID_SECTIONS = Object.keys(SETTINGS_ROUTES) as SettingsSection[];

export function pathToTab(pathname: string): MainView {
  if (pathname.startsWith('/admin/etablissements')) return 'schools';
  if (pathname.startsWith('/admin/abonnements'))    return 'subscriptions';
  if (pathname.startsWith('/admin/en-attente'))     return 'pending';
  if (pathname.startsWith('/admin/parametres'))     return 'settings';
  return 'dashboard';
}

export function pathToSection(pathname: string): SettingsSection {
  const seg = pathname.split('/').pop() as SettingsSection;
  return VALID_SECTIONS.includes(seg) ? seg : 'site';
}
