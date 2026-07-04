/**
 * components/settings/AccueilSection.tsx
 * Page d'accueil : image hero, aperçus fonctionnalités, écoles de confiance.
 * Extrait de : AdminDashboard.tsx SettingsTab section === 'accueil' (~lignes 1272-1366)
 * Données : fetchSetting / saveSetting → clé 'accueil'
 * Consommé par : page/admin/SettingsPage.tsx
 * Dépend de : useAdminContext() pour la liste des écoles approuvées
 */

import { useState, useEffect } from 'react';
import { Upload, X, CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSetting, saveSetting } from '../../services/settingsApi';
import { useAdminContext }           from '../../context/AdminContext';
import { StatutToggle }              from '../../ui/component/StatutToggle';
import { Spinner }                   from '../../ui/design_system/Spinner';

const DEFAULT = { heroBgUrl: '', featureImages: ['','',''] as string[], clientSchoolIds: [] as string[] };
type AccueilData = typeof DEFAULT;

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white placeholder:text-slate-400';

export function AccueilSection() {
  const { schools } = useAdminContext();
  const [statut,  setStatut]  = useState<0|1>(1);
  const [data,    setData]    = useState<AccueilData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    fetchSetting<AccueilData>('accueil').then(res => {
      if (res) {
        setStatut(res.statut ?? 1);
        setData(p => ({ ...p, ...res.data }));
      }
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof AccueilData>(k: K, v: AccueilData[K]) => setData(p => ({ ...p, [k]: v }));

  const setFeatureImg = (idx: number, val: string) => {
    const next = [...(data.featureImages ?? ['','',''])];
    next[idx] = val;
    set('featureImages', next);
  };

  const toggleSchool = (id: string) => {
    const ids = data.clientSchoolIds ?? [];
    set('clientSchoolIds', ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveSetting('accueil', { statut, data });
      toast.success('Page d\'accueil sauvegardée');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12"><Spinner size="md" /></div>
  );

  const approvedSchools = schools.filter(s => s.approvalStatus === 'approved');
  const imgs = Array.isArray(data.featureImages) ? data.featureImages : ['','',''];

  return (
    <div className="space-y-4">
      <StatutToggle value={statut} onChange={setStatut} />

      <div className="grid grid-cols-2 gap-4">
        {/* Hero */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs text-black">Image de fond (Hero)</p>
          <div className="flex items-center gap-2">
            <input type="url" placeholder="URL de l'image…" value={data.heroBgUrl || ''}
              onChange={e => set('heroBgUrl', e.target.value)}
              className={inputCls + ' text-xs'} />
            <label title="Uploader" className="flex-shrink-0 cursor-pointer w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 transition-all">
              <Upload size={15} />
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const f = e.target.files?.[0]; if (!f) return;
                const r = new FileReader(); r.onloadend = () => set('heroBgUrl', r.result as string); r.readAsDataURL(f);
              }} />
            </label>
            {data.heroBgUrl && (
              <button type="button" onClick={() => set('heroBgUrl', '')}
                className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-red-200 rounded-xl text-red-400 hover:bg-red-50 transition-all">
                <X size={14} />
              </button>
            )}
          </div>
          {data.heroBgUrl && (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 h-40">
              <img src={data.heroBgUrl} alt="Hero bg" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="text-white text-xs opacity-70">Aperçu avec overlay</span>
              </div>
            </div>
          )}
        </div>

        {/* Fonctionnalités */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs text-black">Aperçus des fonctionnalités</p>
          {(['Inscriptions & Élèves','Finance & Caisse','Notes & Bulletins'] as const).map((label, i) => (
            <div key={i} className="space-y-1.5">
              <label className="block text-xs text-black">{label}</label>
              <div className="flex items-center gap-2">
                <input type="url" placeholder="Lien image…" value={imgs[i] && !imgs[i].startsWith('data:') ? imgs[i] : ''}
                  onChange={e => setFeatureImg(i, e.target.value)}
                  className={inputCls + ' text-xs'} />
                <label title="Uploader" className="flex-shrink-0 cursor-pointer w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                  <Upload size={15} />
                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const r = new FileReader(); r.onloadend = () => setFeatureImg(i, r.result as string); r.readAsDataURL(f);
                  }} />
                </label>
                {imgs[i] && (
                  <button type="button" onClick={() => setFeatureImg(i, '')}
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-red-200 rounded-xl text-red-400 hover:bg-red-50 transition-all">
                    <X size={14} />
                  </button>
                )}
              </div>
              {imgs[i] && (
                <div className="rounded-xl overflow-hidden border border-slate-200 h-28">
                  <img src={imgs[i]} alt="" className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Écoles de confiance */}
        <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs text-black">Section « Ils nous font confiance »</p>
          {approvedSchools.length === 0 ? (
            <p className="text-sm text-black text-center py-6">Aucun établissement approuvé pour l'instant</p>
          ) : (
            <div className="grid grid-cols-2 gap-1 max-h-80 overflow-y-auto">
              {approvedSchools.map(s => {
                const selected = (data.clientSchoolIds ?? []).includes(s.id);
                return (
                  <label key={s.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selected ? 'bg-indigo-50 border border-indigo-200' : 'border border-transparent hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={selected} onChange={() => toggleSchool(s.id)} className="w-4 h-4 accent-indigo-600 flex-shrink-0" />
                    {s.logoUrl
                      ? <img src={s.logoUrl} alt="" className="w-8 h-8 rounded object-contain border border-slate-200 flex-shrink-0" />
                      : <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs flex-shrink-0">{s.schoolName[0]}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-black truncate">{s.schoolName}</p>
                      <p className="text-xs text-black">{[s.city, s.country].filter(Boolean).join(', ') || s.email}</p>
                    </div>
                    {selected && <CheckCircle size={14} className="text-indigo-600 flex-shrink-0" />}
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-xs text-black">
            {(data.clientSchoolIds ?? []).length} école{(data.clientSchoolIds ?? []).length !== 1 ? 's' : ''} sélectionnée{(data.clientSchoolIds ?? []).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-700 transition-all disabled:opacity-50">
          <ShieldCheck size={13} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
}
