/**
 * components/settings/LegalSection.tsx
 * Pages légales : CGU, confidentialité, mentions légales (éditeur WYSIWYG).
 * Extrait de : AdminDashboard.tsx SettingsTab section === 'legal' (~lignes 1558-1574)
 * Données : fetchSetting / saveSetting → clé 'legal'
 * Consommé par : page/admin/SettingsPage.tsx
 */

import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSetting, saveSetting } from '../../services/settingsApi';
import { StatutToggle }  from '../../ui/component/StatutToggle';
import { WysiwygEditor } from '../../ui/design_system/WysiwygEditor';
import { Spinner }       from '../../ui/design_system/Spinner';

type LegalTab  = 'terms' | 'privacy' | 'mentions';
const DEFAULT  = { terms: '', privacy: '', mentions: '' };
type LegalData = typeof DEFAULT;

export function LegalSection() {
  const [statut,   setStatut]   = useState<0|1>(1);
  const [data,     setData]     = useState<LegalData>(DEFAULT);
  const [activeTab, setActiveTab] = useState<LegalTab>('terms');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    fetchSetting<LegalData>('legal').then(res => {
      if (res) {
        setStatut(res.statut ?? 1);
        setData(p => ({ ...p, ...res.data }));
      } else {
        try {
          const s = localStorage.getItem('hub_legal');
          if (s) setData(p => ({ ...p, ...JSON.parse(s) }));
        } catch { /* localStorage indisponible ou JSON invalide */ }
      }
      setLoading(false);
    });
  }, []);

  const setLeg = (k: LegalTab, v: string) => setData(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await saveSetting('legal', { statut, data });
      localStorage.setItem('hub_legal', JSON.stringify(data));
      toast.success('Pages légales sauvegardées');
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

      {/* Onglets */}
      <div className="flex gap-0 border border-slate-200 rounded-xl overflow-hidden">
        {([
          ['terms',    "Conditions d'utilisation"],
          ['privacy',  'Politique de confidentialité'],
          ['mentions', 'Mentions légales'],
        ] as [LegalTab, string][]).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setActiveTab(k)}
            className={`flex-1 py-2.5 text-xs transition-all border-r border-slate-200 last:border-0 ${activeTab === k ? 'bg-slate-900 text-white' : 'bg-white text-black hover:bg-slate-50'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-xs text-black">
          Utilisez la barre d'outils pour mettre en forme le texte.
          Le contenu s'affiche sur <code className="bg-slate-100 px-1 rounded">/legal/{activeTab}</code>.
        </p>
        {/* key force le réaffichage de l'éditeur quand on change d'onglet */}
        <WysiwygEditor key={activeTab} value={data[activeTab]} onChange={v => setLeg(activeTab, v)} />
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
