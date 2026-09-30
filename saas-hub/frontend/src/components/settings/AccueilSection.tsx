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
import { fetchSetting, saveSetting, uploadMedia } from '../../services/settingsApi';
import { useAdminContext }           from '../../context/AdminContext';
import { StatutToggle }              from '../../ui/component/StatutToggle';
import { Spinner }                   from '../../ui/design_system/Spinner';
import { MODULES }                   from '../landing/landingData';

// Un emplacement d'image par carte « module » de la page d'accueil — même liste,
// même ordre (landingData.MODULES) : ajouter une carte là-bas ajoute son image ici.
const EMPTY_IMAGES = () => MODULES.map(() => '');
const DEFAULT = { heroBgUrl: '', featureImages: EMPTY_IMAGES(), clientSchoolIds: [] as string[] };
type AccueilData = typeof DEFAULT;

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all bg-white placeholder:text-slate-400';

export function AccueilSection() {
  const { schools } = useAdminContext();
  const [statut,  setStatut]  = useState<0|1>(1);
  const [data,    setData]    = useState<AccueilData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [uploading, setUploading] = useState<string | null>(null); // 'hero' | 'f0' | 'f1'…

  // Image → stockée en base via /api/media ; on ne garde que son URL dans les paramètres.
  const upload = async (slot: string, file: File | undefined, apply: (url: string) => void) => {
    if (!file) return;
    setUploading(slot);
    try { apply(await uploadMedia(file)); }
    catch (e: any) { toast.error(e.response?.data?.message || e.message || "Échec de l'upload"); }
    finally { setUploading(null); }
  };

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
    const next = MODULES.map((_, i) => data.featureImages?.[i] ?? '');
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
  const imgs = MODULES.map((_, i) => (Array.isArray(data.featureImages) ? data.featureImages[i] : '') || '');

  return (
    <div className="space-y-4">
      <StatutToggle value={statut} onChange={setStatut} />

      <div className="grid grid-cols-2 gap-4">
        {/* Hero */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs text-black">Image de fond (Hero)</p>
          <p className="text-[11px] text-slate-500 -mt-2">PNG, JPG, WEBP ou GIF — 3 Mo maximum. Pensez à sauvegarder après l'upload.</p>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="URL de l'image…" value={data.heroBgUrl || ''}
              onChange={e => set('heroBgUrl', e.target.value)}
              className={inputCls + ' text-xs'} />
            <label title="Uploader" className="flex-shrink-0 cursor-pointer w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-primary-50 hover:border-primary-400 hover:text-primary-600 transition-all">
              {uploading === 'hero' ? <Spinner size="sm" /> : <Upload size={15} />}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={!!uploading} onChange={e => {
                const f = e.target.files?.[0]; e.target.value = '';
                upload('hero', f, url => set('heroBgUrl', url));
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
        <div className="col-span-2 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <p className="text-xs text-black">Images des cartes « Fonctionnalités » ({MODULES.length})</p>
          <div className="grid grid-cols-3 gap-5">
          {MODULES.map(({ title }, i) => (
            <div key={title} className="space-y-1.5">
              <label className="block text-xs text-black">{title}</label>
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Lien image…" value={imgs[i] && !imgs[i].startsWith('data:') ? imgs[i] : ''}
                  onChange={e => setFeatureImg(i, e.target.value)}
                  className={inputCls + ' text-xs'} />
                <label title="Uploader" className="flex-shrink-0 cursor-pointer w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-primary-50 hover:border-primary-400 hover:text-primary-600 transition-all">
                  {uploading === `f${i}` ? <Spinner size="sm" /> : <Upload size={15} />}
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" disabled={!!uploading} onChange={e => {
                    const f = e.target.files?.[0]; e.target.value = '';
                    upload(`f${i}`, f, url => setFeatureImg(i, url));
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
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selected ? 'bg-primary-50 border border-primary-200' : 'border border-transparent hover:bg-slate-50'}`}>
                    <input type="checkbox" checked={selected} onChange={() => toggleSchool(s.id)} className="w-4 h-4 accent-primary-600 flex-shrink-0" />
                    {s.logoUrl
                      ? <img src={s.logoUrl} alt="" className="w-8 h-8 rounded object-contain border border-slate-200 flex-shrink-0" />
                      : <div className="w-8 h-8 rounded bg-primary-50 flex items-center justify-center text-primary-600 text-xs flex-shrink-0">{s.schoolName[0]}</div>}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-black truncate">{s.schoolName}</p>
                      <p className="text-xs text-black">{[s.city, s.country].filter(Boolean).join(', ') || s.email}</p>
                    </div>
                    {selected && <CheckCircle size={14} className="text-primary-600 flex-shrink-0" />}
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
