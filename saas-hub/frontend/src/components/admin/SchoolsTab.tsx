/**
 * components/admin/SchoolsTab.tsx
 * Liste + recherche + filtres des établissements approuvés.
 * Extrait de : AdminDashboard.tsx:594–693
 * Données via : useAdminContext() — aucun prop drilling
 * Consommé par : App.tsx (route /admin/etablissements)
 */

import { useState } from 'react';
import { Plus, Search, Eye, Edit2 } from 'lucide-react';
import { useAdminContext }          from '../../context/AdminContext';
import type { SubView, School }     from '../../types/admin';
import { daysLeft }                 from '../../lib/utils';
import { SUB_LABEL, SUB_CLS }       from '../../lib/styles';
import { Badge }                    from '../../ui/design_system/Badge';
import { Button }                   from '../../ui/design_system/Button';
import { SchoolFormPage }           from './SchoolFormPage';
import { SchoolDetailPage }         from './SchoolDetailPage';

export function SchoolsTab() {
  const { schools, fetchSchools } = useAdminContext();
  const [sub, setSub]       = useState<SubView>({ kind: 'list' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  if (sub.kind === 'form') return (
    <SchoolFormPage school={sub.school} onBack={() => setSub({ kind: 'list' })} onSave={fetchSchools} />
  );
  if (sub.kind === 'detail') return (
    <SchoolDetailPage
      school={sub.school}
      onBack={() => setSub({ kind: 'list' })}
      onEdit={() => setSub({ kind: 'form', school: sub.school })}
      onRefresh={fetchSchools}
    />
  );

  const approved = schools.filter(s => s.approvalStatus === 'approved');
  const filtered = approved.filter(s => {
    const matchSearch = s.schoolName.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (filter === 'all' || s.subscriptionStatus === filter);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Établissements</h1>
          <p className="text-xs text-slate-400 mt-0.5">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={() => setSub({ kind: 'form', school: null })}>
          Ajouter
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-900 outline-none flex-1 placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-1">
          {(['all','active','trial','expired','suspended'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === s ? 'bg-primary-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              {s === 'all' ? 'Tous' : SUB_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70">
                {['École','Localisation','Statut','Expiration','Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">Aucun résultat</td></tr>
              )}
              {filtered.map((s: School) => {
                const dl = daysLeft(s.subscriptionExpiry);
                return (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {s.logoUrl
                          ? <img src={s.logoUrl} alt="" className="w-8 h-8 rounded object-contain border border-slate-200 flex-shrink-0" />
                          : <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-xs flex-shrink-0">{s.schoolName[0]}</div>
                        }
                        <div>
                          <p className="text-sm font-medium text-slate-900">{s.schoolName}</p>
                          <p className="text-xs text-slate-400">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-5 py-3"><Badge label={SUB_LABEL[s.subscriptionStatus] ?? s.subscriptionStatus} cls={SUB_CLS[s.subscriptionStatus] ?? SUB_CLS.suspended} /></td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium ${dl !== null && dl <= 7 && dl >= 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                        {dl === null ? '—' : dl < 0 ? 'Expiré' : `J-${dl}`}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSub({ kind: 'detail', school: s })} className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all" title="Voir détails"><Eye size={14} /></button>
                        <button onClick={() => setSub({ kind: 'form', school: s })}   className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all" title="Modifier"><Edit2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
