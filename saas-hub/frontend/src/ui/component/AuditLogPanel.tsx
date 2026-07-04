/**
 * ui/component/AuditLogPanel.tsx
 * Affiche le journal d'audit administrateur.
 * Extrait de : AdminDashboard.tsx (AuditLogPanel, ~lignes 1580-1634)
 * Consommé par : AuditSection (components/settings/AuditSection.tsx)
 */

import { useState } from 'react';
import { Activity, Trash2, RefreshCw } from 'lucide-react';
import { getAuditLog, clearAuditLog } from '../../lib/auditLog';
import type { AuditEntry } from '../../types/admin';
import { Button } from '../design_system/Button';
import { EmptyState } from '../design_system/EmptyState';

export function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>(getAuditLog);

  const refresh = () => setEntries(getAuditLog());

  const clear = () => {
    if (!confirm('Vider le journal d\'audit ?')) return;
    clearAuditLog();
    setEntries([]);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{entries.length} entrée{entries.length !== 1 ? 's' : ''}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<RefreshCw size={13} />} onClick={refresh}>
            Actualiser
          </Button>
          <Button variant="danger" size="sm" leftIcon={<Trash2 size={13} />} onClick={clear}>
            Vider
          </Button>
        </div>
      </div>

      {/* Liste */}
      {entries.length === 0 ? (
        <EmptyState
          icon={<Activity size={20} />}
          message="Journal vide"
          hint="Les actions administrateur apparaîtront ici."
        />
      ) : (
        <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
          {entries.map(e => (
            <div key={e.id} className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-slate-800">{e.action}</p>
                  <span className="text-[10px] text-slate-400 font-mono">{e.user}</span>
                </div>
                {e.detail && <p className="text-[11px] text-slate-500 mt-0.5">{e.detail}</p>}
              </div>
              <p className="text-[10px] text-slate-400 flex-shrink-0 font-mono">
                {new Date(e.ts).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
