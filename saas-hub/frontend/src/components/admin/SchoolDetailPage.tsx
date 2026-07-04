/**
 * components/admin/SchoolDetailPage.tsx
 * Vue détail d'un établissement avec gestion abonnement + zone dangereuse.
 * Extrait de : AdminDashboard.tsx:323–500
 * Consommé par : SchoolsTab, PendingTab, SubscriptionsTab (via sub-view)
 */

import { useState } from 'react';
import { Edit2, Plus, Ban, Trash2, CheckCircle, Mail, User, FileText, Clock, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { School } from '../../types/admin';
import { API_ADMIN }   from '../../constants/api';
import { daysLeft }    from '../../lib/utils';
import { SUB_LABEL, SUB_CLS, APV_CLS, LEVEL_CLS } from '../../lib/styles';
import { Badge }       from '../../ui/design_system/Badge';
import { Button }      from '../../ui/design_system/Button';
import { PageShell }   from '../../ui/component/PageShell';

interface Props {
  school:    School;
  onBack:    () => void;
  onEdit:    () => void;
  onRefresh: () => void;
}

export function SchoolDetailPage({ school, onBack, onEdit, onRefresh }: Props) {
  const [busy, setBusy] = useState('');

  const callApi = async (path: string, body: object, successMsg: string) => {
    const res = await fetch(`${API_ADMIN}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Erreur serveur');
    toast.success(successMsg);
    onRefresh();
  };

  const activate = async (days: number) => {
    setBusy('a' + days);
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + days);
    try {
      await callApi(`/subscription/${school.id}`, { status: 'active', expiry: expiry.toISOString() }, `Abonnement activé — ${days === 365 ? '1 an' : days + ' jours'}`);
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };

  const block = async () => {
    if (!confirm('Bloquer cet établissement ?')) return;
    setBusy('block');
    try {
      await callApi(`/subscription/${school.id}`, { status: 'suspended' }, 'Établissement bloqué');
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };

  const unblock = async () => {
    setBusy('unblock');
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    try {
      await callApi(`/subscription/${school.id}`, { status: 'active', expiry: expiry.toISOString() }, 'Établissement débloqué (30 jours)');
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };

  const remove = async () => {
    if (!confirm('Supprimer définitivement ?')) return;
    setBusy('del');
    try {
      const res = await fetch(`${API_ADMIN}/school/${school.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Établissement supprimé');
      onRefresh();
      onBack();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };

  const dl = daysLeft(school.subscriptionExpiry);

  return (
    <PageShell
      title={school.schoolName}
      subtitle={school.email}
      onBack={onBack}
      actions={
        <Button variant="outline" size="sm" leftIcon={<Edit2 size={14} />} onClick={onEdit}>
          Modifier
        </Button>
      }
    >
      <div className="max-w-2xl space-y-6">
        {/* Header card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5">
          {school.logoUrl
            ? <img src={school.logoUrl} alt="" className="w-16 h-16 rounded-xl object-contain border border-slate-200 flex-shrink-0" />
            : <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-2xl flex-shrink-0">{school.schoolName[0]}</div>
          }
          <div>
            <p className="text-lg font-bold text-slate-900">{school.schoolName}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge label={SUB_LABEL[school.subscriptionStatus] ?? school.subscriptionStatus} cls={SUB_CLS[school.subscriptionStatus] ?? SUB_CLS.suspended} />
              <Badge label={school.approvalStatus === 'approved' ? 'Approuvé' : school.approvalStatus === 'pending' ? 'En attente' : 'Refusé'} cls={APV_CLS[school.approvalStatus]} />
              {(school.levels?.length ?? 0) > 0
                ? school.levels!.map(lvl => <Badge key={lvl} label={lvl} cls={LEVEL_CLS[lvl] ?? 'bg-slate-100 text-slate-600 border-slate-200'} />)
                : school.level && <Badge label={school.level} cls="bg-slate-100 text-slate-600 border-slate-200" />
              }
            </div>
          </div>
        </div>

        {/* Infos générales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Informations générales</p>
          {([
            ['Email',       school.email,         <Mail size={14} />],
            ['Directeur',   school.directorName,  <User size={14} />],
            ['RCCM',        school.rccm,          <FileText size={14} />],
            ['Inscrit le',  school.createdAt ? new Date(school.createdAt).toLocaleDateString('fr-FR') : '—', <Clock size={14} />],
          ] as [string, string, React.ReactNode][]).filter(([, v]) => v).map(([l, v, icon]) => (
            <div key={l} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <span className="text-slate-400 flex-shrink-0">{icon}</span>
              <span className="text-xs text-slate-500 w-28 flex-shrink-0">{l}</span>
              <span className="text-sm font-medium text-slate-900 break-all">{v}</span>
            </div>
          ))}
        </div>

        {/* Niveaux */}
        {(school.levels?.length ?? 0) > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Niveaux actifs</p>
            <div className="flex flex-wrap gap-2">
              {school.levels!.map(lvl => (
                <span key={lvl} className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${LEVEL_CLS[lvl] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {lvl}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Localisation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Localisation</p>
          {([['Pays', school.country], ['Ville', school.city], ['Préfecture', school.prefecture], ['Sous-préfecture', school.sousPrefecture]] as [string,string][]).filter(([,v]) => v).map(([l, v]) => (
            <div key={l} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <MapPin size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500 w-28 flex-shrink-0">{l}</span>
              <span className="text-sm font-medium text-slate-900">{v}</span>
            </div>
          ))}
        </div>

        {/* Abonnement */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Gestion de l'abonnement</p>
          <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-xl">
            <span className="text-sm text-slate-600">Expiration</span>
            <span className={`text-sm font-semibold ${dl !== null && dl <= 7 && dl >= 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {dl === null ? '—' : dl < 0 ? `Expiré (${Math.abs(dl)}j)` : `J-${dl}`}
              {dl !== null && dl >= 0 && !isNaN(new Date(school.subscriptionExpiry).getTime()) && (
                <span className="text-slate-400 font-normal ml-2">({new Date(school.subscriptionExpiry).toLocaleDateString('fr-FR')})</span>
              )}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-2">Activer / Prolonger</p>
          <div className="flex flex-wrap gap-2">
            {[30, 90, 180, 365].map(d => (
              <Button key={d} variant="success" size="sm" leftIcon={<Plus size={11} />} loading={busy === 'a' + d} disabled={!!busy} onClick={() => activate(d)}>
                {d === 365 ? '1 an' : `${d} jours`}
              </Button>
            ))}
          </div>
        </div>

        {/* Zone dangereuse */}
        <div className="bg-white border border-red-100 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-4">Zone dangereuse</p>
          <div className="flex flex-wrap gap-3">
            {school.subscriptionStatus === 'suspended' ? (
              <Button variant="success" leftIcon={<CheckCircle size={14} />} loading={busy === 'unblock'} disabled={!!busy} onClick={unblock}>
                Débloquer l'accès
              </Button>
            ) : (
              <Button variant="outline" leftIcon={<Ban size={14} />} loading={busy === 'block'} disabled={!!busy} onClick={block}>
                Bloquer l'accès
              </Button>
            )}
            <Button variant="danger" leftIcon={<Trash2 size={14} />} loading={busy === 'del'} disabled={!!busy} onClick={remove}>
              Supprimer définitivement
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
