/**
 * lib/auditLog.ts
 * Journal d'audit stocké en localStorage (côté client).
 * Consommé par : components/settings/AuditSection, et tout composant qui logge une action admin
 *
 * Limite : 300 entrées max (les plus anciennes sont supprimées automatiquement).
 */

import type { AuditEntry } from '../types/admin';

const STORAGE_KEY = 'hub_audit_log';
const MAX_ENTRIES = 300;

export function getAuditLog(): AuditEntry[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function logAudit(action: string, detail?: string): void {
  const entries = getAuditLog();

  const user = (() => {
    try {
      const u = localStorage.getItem('hub_user');
      return u ? JSON.parse(u).email : 'admin';
    } catch {
      return 'admin';
    }
  })();

  entries.unshift({
    id:     Date.now().toString(),
    ts:     new Date().toISOString(),
    action,
    detail,
    user,
  });

  if (entries.length > MAX_ENTRIES) entries.splice(MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function clearAuditLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}
