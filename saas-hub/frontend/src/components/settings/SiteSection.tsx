/**
 * components/settings/SiteSection.tsx
 * Identité du site : nom, logo, couleurs primaire / secondaire.
 * Extrait de : AdminDashboard.tsx SettingsTab section === 'site' (~lignes 1146-1171)
 * Données : fetchSetting / saveSetting → clé 'site'
 * Consommé par : page/admin/SettingsPage.tsx
 */

import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSetting, saveSetting } from '../../services/settingsApi';
import { StatutToggle }  from '../../ui/component/StatutToggle';
import { ColorPicker }   from '../../ui/design_system/ColorPicker';
import { FileUpload }    from '../../ui/design_system/FileUpload';
import { Spinner }       from '../../ui/design_system/Spinner';

const DEFAULT = { siteName: 'DJOLI', logoUrl: '', primaryColor: '#4f46e5', secondaryColor: '#10b981' };
type SiteData  = typeof DEFAULT;

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all bg-white placeholder:text-slate-400';

export function SiteSection() {
  const [statut,  setStatut]  = useState<0|1>(1);
  const [data,    setData]    = useState<SiteData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    fetchSetting<SiteData>('site').then(res => {
      if (res) {
        setStatut(res.statut ?? 1);
        setData(p => ({ ...p, ...res.data }));
      }
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof SiteData>(k: K, v: SiteData[K]) => setData(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await saveSetting('site', { statut, data });
      localStorage.setItem('hub_site_config', JSON.stringify(data));
      window.dispatchEvent(new Event('site-config-updated'));
      toast.success('Site sauvegardé');
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

      {/* Identité + Couleurs sur la même ligne */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="grid grid-cols-2 gap-6">
          {/* Colonne gauche : nom + logo */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-black mb-1.5">Nom du site</label>
              <input className={inputCls} value={data.siteName} onChange={e => set('siteName', e.target.value)} placeholder="DJOLI" />
            </div>
            <FileUpload
              label="Logo du site"
              value={data.logoUrl}
              onChange={v => set('logoUrl', v)}
              hint="PNG avec fond transparent recommandé"
            />
          </div>

          {/* Colonne droite : couleurs */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Couleurs</p>
            <ColorPicker
              label="Couleur primaire"
              value={data.primaryColor || '#4f46e5'}
              onChange={v => set('primaryColor', v)}
              // hint="Boutons, liens actifs, accents principaux"
            />
            <ColorPicker
              label="Couleur secondaire"
              value={data.secondaryColor || '#10b981'}
              onChange={v => set('secondaryColor', v)}
              // hint="Dégradés, éléments de succès, highlights"
            />
          </div>
        </div>

        {/* Aperçu — pleine largeur sous la grille */}
        {/* <div className="rounded-xl overflow-hidden border border-slate-100 mt-5">
          <div className="p-3 text-xs text-black bg-slate-50 border-b border-slate-100">Aperçu</div>
          <div className="p-4 bg-white flex items-center gap-3 flex-wrap">
            <button className="px-4 py-2 rounded-lg text-white text-sm shadow-sm" style={{ backgroundColor: data.primaryColor || '#4f46e5' }}>Bouton principal</button>
            <button className="px-4 py-2 rounded-lg text-white text-sm shadow-sm" style={{ backgroundColor: data.secondaryColor || '#10b981' }}>Bouton secondaire</button>
            <span className="text-sm" style={{ color: data.primaryColor || '#4f46e5' }}>Lien / Texte actif</span>
            <div className="h-6 w-24 rounded-full" style={{ background: `linear-gradient(135deg, ${data.primaryColor || '#4f46e5'}, ${data.secondaryColor || '#10b981'})` }} />
          </div>
        </div> */}
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
