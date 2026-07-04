/**
 * components/settings/ApplicationSection.tsx
 * Config de l'application desktop : URL de téléchargement + dépôt GitHub.
 * Extrait de : AdminDashboard.tsx SettingsTab section === 'application' (~lignes 1234-1270)
 * Données : fetchSetting / saveSetting → clé 'application'
 * Consommé par : page/admin/SettingsPage.tsx
 */

import { useState, useEffect } from 'react';
import { CheckCircle, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSetting, saveSetting } from '../../services/settingsApi';
import { StatutToggle } from '../../ui/component/StatutToggle';
import { Spinner }      from '../../ui/design_system/Spinner';

const DEFAULT = { appVersion: '2.0', githubRepo: '', downloadUrl: '' };
type AppData   = typeof DEFAULT;

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all bg-white placeholder:text-slate-400';

export function ApplicationSection() {
  const [statut,  setStatut]  = useState<0|1>(1);
  const [data,    setData]    = useState<AppData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    fetchSetting<AppData>('application').then(res => {
      if (res) {
        setStatut(res.statut ?? 1);
        setData(p => ({ ...p, ...res.data }));
      }
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof AppData>(k: K, v: AppData[K]) => setData(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await saveSetting('application', { statut, data });
      toast.success('Application sauvegardée');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12"><Spinner size="md" /></div>
  );

  return (
    <div className="space-y-4">
      <StatutToggle value={statut} onChange={setStatut} />

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        {/* URL directe */}
        <div>
          <label className="block text-xs text-black mb-1.5">URL de téléchargement direct (.exe)</label>
          <input className={inputCls} value={data.downloadUrl}
            onChange={e => set('downloadUrl', e.target.value)}
            placeholder="https://exemple.com/djoli-setup.exe" />
          <p className="text-xs text-black mt-1">Lien direct vers le fichier .exe (Google Drive, GitHub, serveur…). Prioritaire sur le dépôt GitHub ci-dessous.</p>
        </div>

        {data.downloadUrl && (
          <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-emerald-800">Lien direct configuré</p>
              <p className="text-xs text-emerald-600 truncate">{data.downloadUrl}</p>
            </div>
            <a href={data.downloadUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-emerald-700 hover:underline whitespace-nowrap">Tester →</a>
          </div>
        )}

        {/* Dépôt GitHub */}
        <div>
          <label className="block text-xs text-black mb-1.5">Dépôt GitHub (owner/repo) — optionnel</label>
          <input className={inputCls} value={data.githubRepo}
            onChange={e => set('githubRepo', e.target.value)}
            placeholder="ex : mdoudev/djoli" />
          <p className="text-xs text-black mt-1">Utilisé en secours si l'URL directe n'est pas renseignée. Pointe vers le dernier release GitHub contenant un .exe.</p>
        </div>

        {data.githubRepo && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <CheckCircle size={15} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-black">Dépôt GitHub</p>
              <p className="text-xs text-black truncate">github.com/{data.githubRepo}</p>
            </div>
            <a href={`https://github.com/${data.githubRepo}/releases/latest`} target="_blank" rel="noopener noreferrer"
              className="text-xs text-black hover:underline whitespace-nowrap">Voir →</a>
          </div>
        )}
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
