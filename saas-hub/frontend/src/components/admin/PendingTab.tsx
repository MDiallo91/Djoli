/**
 * components/admin/PendingTab.tsx
 * File d'approbation des demandes d'inscription des établissements.
 * Extrait de : AdminDashboard.tsx:695–794
 * Données via : useAdminContext() — aucun prop drilling
 * Consommé par : App.tsx (route /admin/en-attente)
 */

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminContext }      from '../../context/AdminContext';
import type { SubView }         from '../../types/admin';
import { API_ADMIN }            from '../../constants/api';
import { logAudit }             from '../../lib/auditLog';
import { LEVEL_CLS }            from '../../lib/styles';
import { Badge }                from '../../ui/design_system/Badge';
import { Button }               from '../../ui/design_system/Button';
import { EmptyState }           from '../../ui/design_system/EmptyState';
import { SchoolDetailPage }     from './SchoolDetailPage';
import { SchoolFormPage }       from './SchoolFormPage';

export function PendingTab() {
  const { schools, fetchSchools } = useAdminContext();
  const [sub, setSub] = useState<SubView>({ kind: 'list' });
  const [busy, setBusy] = useState('');

  if (sub.kind === 'detail') return (
    <SchoolDetailPage school={sub.school} onBack={() => setSub({ kind: 'list' })} onEdit={() => setSub({ kind: 'form', school: sub.school })} onRefresh={fetchSchools} />
  );
  if (sub.kind === 'form') return (
    <SchoolFormPage school={sub.school} onBack={() => setSub({ kind: 'list' })} onSave={fetchSchools} />
  );

  const pending = schools.filter(s => s.approvalStatus === 'pending');

  const approve = async (id: string) => {
    setBusy(id + 'a');
    try {
      const res = await fetch(`${API_ADMIN}/schools/${id}/approve`, { method: 'PUT' });
      if (!res.ok) { toast.error("Erreur lors de l'approbation"); return; }
      toast.success('École approuvée avec succès');
      logAudit('École approuvée', schools.find(x => x.id === id)?.schoolName);
      fetchSchools();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };

  const reject = async (id: string) => {
    if (!confirm('Rejeter cette demande ?')) return;
    setBusy(id + 'r');
    try {
      const res = await fetch(`${API_ADMIN}/schools/${id}/reject`, { method: 'PUT' });
      if (!res.ok) { toast.error('Erreur lors du rejet'); return; }
      toast.info('Demande rejetée');
      logAudit('École rejetée', schools.find(x => x.id === id)?.schoolName);
      fetchSchools();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-900">Demandes en attente</h1>
        {pending.length > 0 && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{pending.length}</span>
        )}
      </div>

      {pending.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-4">
          <EmptyState icon={<CheckCircle size={20} />} message="Aucune demande en attente" hint="Toutes les demandes ont été traitées." />
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(s => (
            <div key={s.id} className="bg-white border border-amber-200 rounded-xl p-5 flex items-start gap-4">
              <div className="flex-shrink-0">
                {s.logoUrl
                  ? <img src={s.logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain border border-slate-200" />
                  : <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-lg">{s.schoolName[0]}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{s.schoolName}</p>
                    <p className="text-xs text-slate-500">{s.email}</p>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                  {s.country && <span>🌍 {s.country}</span>}
                  {s.city && <span>📍 {s.city}</span>}
                  {(s.levels?.length ?? 0) > 0
                    ? s.levels!.map(lvl => <Badge key={lvl} label={lvl} cls={LEVEL_CLS[lvl] ?? 'bg-slate-100 text-slate-600 border-slate-200'} />)
                    : s.level && <span>🎓 {s.level}</span>
                  }
                  {s.directorName && <span>👤 {s.directorName}</span>}
                  {s.rccm && <span className="font-semibold text-primary-600">RCCM: {s.rccm}</span>}
                </div>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <Button variant="outline" size="sm" onClick={() => setSub({ kind: 'detail', school: s })}>
                    Voir les détails
                  </Button>
                  <Button variant="success" size="sm" loading={busy === s.id + 'a'} disabled={busy.startsWith(s.id)} onClick={() => approve(s.id)}>
                    ✓ Approuver
                  </Button>
                  <Button variant="danger" size="sm" loading={busy === s.id + 'r'} disabled={busy.startsWith(s.id)} onClick={() => reject(s.id)}>
                    ✗ Rejeter
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
