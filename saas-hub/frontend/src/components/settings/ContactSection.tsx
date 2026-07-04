/**
 * components/settings/ContactSection.tsx
 * Coordonnées de contact : email, WhatsApp, YouTube.
 * Extrait de : AdminDashboard.tsx SettingsTab section === 'contact' (~lignes 1173-1197)
 * Données : fetchSetting / saveSetting → clé 'contact'
 * Consommé par : page/admin/SettingsPage.tsx
 */

import { useState, useEffect } from 'react';
import { Mail, Phone, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSetting, saveSetting } from '../../services/settingsApi';
import { StatutToggle } from '../../ui/component/StatutToggle';
import { Spinner }      from '../../ui/design_system/Spinner';

const DEFAULT = { email: '', whatsappPhone: '', youtubeUrl: '' };
type ContactData = typeof DEFAULT;

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white placeholder:text-slate-400';

export function ContactSection() {
  const [statut,  setStatut]  = useState<0|1>(1);
  const [data,    setData]    = useState<ContactData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    fetchSetting<ContactData>('contact').then(res => {
      if (res) {
        setStatut(res.statut ?? 1);
        setData(p => ({ ...p, ...res.data }));
      }
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof ContactData>(k: K, v: ContactData[K]) => setData(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await saveSetting('contact', { statut, data });
      toast.success('Contact sauvegardé');
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
        <div>
          <label className="block text-xs text-black mb-1.5">Email de contact</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="email" className={inputCls} style={{ paddingLeft: 36 }}
              value={data.email} onChange={e => set('email', e.target.value)}
              placeholder="contact@djoli.app" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-black mb-1.5">Numéro WhatsApp (avec indicatif pays)</label>
          <div className="relative">
            <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={inputCls} style={{ paddingLeft: 36 }}
              value={data.whatsappPhone} onChange={e => set('whatsappPhone', e.target.value)}
              placeholder="+224 620 000 000" />
          </div>
        </div>

        <div>
          <label className="block text-xs text-black mb-1.5">Lien vidéo YouTube (démo)</label>
          <input className={inputCls} value={data.youtubeUrl} onChange={e => set('youtubeUrl', e.target.value)}
            placeholder="https://youtube.com/watch?v=..." />
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
