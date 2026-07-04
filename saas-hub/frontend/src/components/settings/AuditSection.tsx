/**
 * components/settings/AuditSection.tsx
 * Journal d'activité administrateur.
 * Extrait de : AdminDashboard.tsx SettingsTab section === 'audit' (ligne 1576)
 * Délègue entièrement à : ui/component/AuditLogPanel
 * Consommé par : page/admin/SettingsPage.tsx
 */

import { AuditLogPanel } from '../../ui/component/AuditLogPanel';

export function AuditSection() {
  return <AuditLogPanel />;
}
