/**
 * components/admin/SubscriptionsTab.tsx
 * Gestion des abonnements : filtres, prolongation rapide.
 * Extrait de : AdminDashboard.tsx:796–869
 * Données via : useAdminContext() — aucun prop drilling
 * Consommé par : App.tsx (route /admin/abonnements)
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { useAdminContext }      from '../../context/AdminContext';
import type { SubView, School } from '../../types/admin';
import { API_ADMIN }            from '../../constants/api';
import { daysLeft }             from '../../lib/utils';
import { SUB_LABEL, SUB_CLS }   from '../../lib/styles';
import { Badge }                from '../../ui/design_system/Badge';
import { SchoolDetailPage }     from './SchoolDetailPage';
import { SchoolFormPage }       from './SchoolFormPage';

export function SubscriptionsTab() {
  const { schools, fetchSchools } = useAdminContext();
  const [sub, setSub]   = useState<SubView>({ kind: 'list' });
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');

  if (sub.kind === 'detail') return (
    <SchoolDetailPage school={sub.school} onBack={() => setSub({ kind: 'list' })} onEdit={() => setSub({ kind: 'form', school: sub.school })} onRefresh={fetchSchools} />
  );
  if (sub.kind === 'form') return (
    <SchoolFormPage school={sub.school} onBack={() => setSub({ kind: 'list' })} onSave={fetchSchools} />
  );

  const approved = schools.filter(s => s.approvalStatus === 'approved');
  const filtered = approved
    .filter(s => filter === 'all' || s.subscriptionStatus === filter)
    .sort((a, b) => (daysLeft(a.subscriptionExpiry) ?? 9999) - (daysLeft(b.subscriptionExpiry) ?? 9999));

  const counts = {
    all:       approved.length,
    active:    approved.filter(s => s.subscriptionStatus === 'active').length,
    trial:     approved.filter(s => s.subscriptionStatus === 'trial').length,
    expired:   approved.filter(s => s.subscriptionStatus === 'expired').length,
    suspended: approved.filter(s => s.subscriptionStatus === 'suspended').length,
  };

  const activate = async (id: string, days: number) => {
    setBusy(id + days);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    try {
      const res = await fetch(`${API_ADMIN}/subscription/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active', expiry: expiry.toISOString() }),
      });
      if (!res.ok) { toast.error("Erreur lors de l'activation"); return; }
      toast.success(`Abonnement prolongé de ${days === 365 ? '1 an' : days + ' jours'}`);
      fetchSchools();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-base font-semibold text-slate-900">Abonnements</h1>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {([['all','Tous'],['active','Actifs'],['trial','Essai'],['expired','Expirés'],['suspended','Bloqués']] as [string,string][]).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${filter === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
            {l}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === k ? 'bg-white/20' : 'bg-slate-100'}`}>
              {counts[k as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {filtered.map((s: School) => {
          const dl     = daysLeft(s.subscriptionExpiry);
          const urgent = dl !== null && dl >= 0 && dl <= 7;
          return (
            <div key={s.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${urgent ? 'border-amber-200' : 'border-slate-200'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                s.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-700' :
                s.subscriptionStatus === 'trial'  ? 'bg-blue-50 text-blue-700' :
                'bg-red-50 text-red-600'}`}>
                {s.schoolName[0]}
              </div>

              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSub({ kind: 'detail', school: s })}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors">{s.schoolName}</p>
                  <Badge label={SUB_LABEL[s.subscriptionStatus] ?? s.subscriptionStatus} cls={SUB_CLS[s.subscriptionStatus] ?? SUB_CLS.suspended} />
                  {urgent && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Expire bientôt</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{s.email}</p>
              </div>

              <div className="text-right hidden md:block mr-3">
                <p className={`text-sm font-semibold ${urgent ? 'text-amber-600' : 'text-slate-700'}`}>
                  {dl === null ? '—' : dl < 0 ? 'Expiré' : `J-${dl}`}
                </p>
                {dl !== null && dl >= 0 && !isNaN(new Date(s.subscriptionExpiry).getTime()) && (
                  <p className="text-xs text-slate-400">{new Date(s.subscriptionExpiry).toLocaleDateString('fr-FR')}</p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {[30, 90, 365].map(d => (
                  <button key={d} onClick={() => activate(s.id, d)} disabled={!!busy}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all disabled:opacity-40">
                    {d === 365 ? '1an' : `${d}j`}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
