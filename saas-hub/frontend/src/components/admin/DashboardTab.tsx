/**
 * components/admin/DashboardTab.tsx
 * Vue statistiques du tableau de bord administrateur.
 * Extrait de : AdminDashboard.tsx:502–592
 * Données via : useAdminContext() — aucun prop drilling
 * Consommé par : App.tsx (route /admin index)
 */

import { School as SchoolIcon, CheckCircle, AlertCircle, Clock, Activity } from 'lucide-react';
import { useAdminContext }    from '../../context/AdminContext';
import { Badge }              from '../../ui/design_system/Badge';
import { SUB_LABEL, SUB_CLS } from '../../lib/styles';
import { daysLeft }           from '../../lib/utils';

export function DashboardTab() {
  const { schools } = useAdminContext();

  const approved = schools.filter(s => s.approvalStatus === 'approved');
  const stats = {
    total:   approved.length,
    active:  approved.filter(x => x.subscriptionStatus === 'active').length,
    trial:   approved.filter(x => x.subscriptionStatus === 'trial').length,
    expired: approved.filter(x => x.subscriptionStatus === 'expired').length,
    pending: schools.filter(x => x.approvalStatus === 'pending').length,
  };

  const expiring = approved.filter(x => {
    const d = daysLeft(x.subscriptionExpiry);
    return d !== null && d >= 0 && d <= 7;
  });

  const recent = [...approved]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const CARDS = [
    { label: 'Total',      value: stats.total,   icon: SchoolIcon,  cls: 'text-indigo-600 bg-indigo-50' },
    { label: 'Actifs',     value: stats.active,  icon: CheckCircle, cls: 'text-emerald-600 bg-emerald-50' },
    { label: 'Essai',      value: stats.trial,   icon: Clock,       cls: 'text-blue-600 bg-blue-50' },
    { label: 'Expirés',    value: stats.expired, icon: AlertCircle, cls: 'text-red-600 bg-red-50' },
    { label: 'En attente', value: stats.pending, icon: Activity,    cls: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-base font-semibold text-slate-900">Tableau de bord</h1>

      {/* Cartes stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {CARDS.map(({ label, value, icon: Icon, cls }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${cls}`}>
              <Icon size={15} />
            </div>
            <p className="text-xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Barre de répartition */}
      {stats.total > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Répartition</p>
          <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
            <div className="bg-emerald-500" style={{ width: `${(stats.active / stats.total) * 100}%` }} />
            <div className="bg-blue-400"    style={{ width: `${(stats.trial  / stats.total) * 100}%` }} />
            <div className="bg-red-400"     style={{ width: `${(stats.expired / stats.total) * 100}%` }} />
          </div>
          <div className="flex gap-5 mt-2 text-xs text-slate-500">
            {[['bg-emerald-500','Actif',stats.active],['bg-blue-400','Essai',stats.trial],['bg-red-400','Expiré',stats.expired]].map(([c,l,v]) => (
              <span key={l as string} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${c}`} />{l as string} ({v as number})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Inscriptions récentes */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-600">Inscriptions récentes</p>
          </div>
          <div className="divide-y divide-slate-50">
            {recent.map(sc => (
              <div key={sc.id} className="flex items-center gap-3 px-5 py-3">
                {sc.logoUrl
                  ? <img src={sc.logoUrl} alt="" className="w-7 h-7 rounded object-contain border border-slate-200 flex-shrink-0" />
                  : <div className="w-7 h-7 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">{sc.schoolName[0]}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{sc.schoolName}</p>
                  <p className="text-xs text-slate-400">{new Date(sc.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <Badge label={SUB_LABEL[sc.subscriptionStatus] ?? sc.subscriptionStatus} cls={SUB_CLS[sc.subscriptionStatus] ?? SUB_CLS.suspended} />
              </div>
            ))}
          </div>
        </div>

        {/* Expirent bientôt */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <AlertCircle size={13} className="text-amber-500" />
            <p className="text-xs font-semibold text-slate-600">Expirent dans 7 jours ({expiring.length})</p>
          </div>
          {expiring.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Aucun abonnement critique</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {expiring.map(sc => (
                <div key={sc.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-7 h-7 rounded bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-xs flex-shrink-0">
                    {sc.schoolName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{sc.schoolName}</p>
                    <p className="text-xs text-slate-400">{sc.city}</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-600">J-{daysLeft(sc.subscriptionExpiry)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
