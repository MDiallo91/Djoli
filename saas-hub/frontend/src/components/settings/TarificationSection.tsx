/**
 * components/settings/TarificationSection.tsx
 * Plans & prix : devise + tarifs 30 / 90 / 365 jours.
 * Extrait de : AdminDashboard.tsx SettingsTab section === 'tarification' (~lignes 1199-1232)
 * Données : fetchSetting / saveSetting → clé 'tarification'
 * Consommé par : page/admin/SettingsPage.tsx
 */

import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSetting, saveSetting } from '../../services/settingsApi';
import { StatutToggle } from '../../ui/component/StatutToggle';
import { Spinner }      from '../../ui/design_system/Spinner';

const DEFAULT = { currency: 'EUR' as 'EUR'|'USD'|'GNF', price30: '29', price90: '79', price365: '249' };
type TarifData = typeof DEFAULT;

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white placeholder:text-slate-400';

export function TarificationSection() {
  const [statut,  setStatut]  = useState<0|1>(1);
  const [data,    setData]    = useState<TarifData>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    fetchSetting<TarifData>('tarification').then(res => {
      if (res) {
        setStatut(res.statut ?? 1);
        setData(p => ({ ...p, ...res.data }));
      }
      setLoading(false);
    });
  }, []);

  const set = <K extends keyof TarifData>(k: K, v: TarifData[K]) => setData(p => ({ ...p, [k]: v }));

  const formatPrice = (p: string) => {
    const n = Number(p);
    if (data.currency === 'GNF') return `${n.toLocaleString('fr')} GNF`;
    if (data.currency === 'EUR') return `${p} €`;
    return `$${p}`;
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveSetting('tarification', { statut, data });
      toast.success('Tarification sauvegardée');
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
        {/* Devise */}
        <div>
          <label className="block text-xs text-black mb-1.5">Devise</label>
          <div className="flex gap-2">
            {(['EUR','USD','GNF'] as const).map(c => (
              <button key={c} type="button" onClick={() => set('currency', c)}
                className={`px-4 py-2 rounded-lg text-sm border transition-all ${data.currency === c ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-black hover:border-slate-400'}`}>
                {c === 'EUR' ? '€ Euro' : c === 'USD' ? '$ Dollar' : 'GNF Franc'}
              </button>
            ))}
          </div>
        </div>

        {/* Prix */}
        <div className="grid grid-cols-3 gap-4">
          {([['price30','30 jours'],['price90','90 jours'],['price365','1 an']] as [keyof TarifData, string][]).map(([k, l]) => (
            <div key={k}>
              <label className="block text-xs text-black mb-1.5">{l}</label>
              <input type="number" className={inputCls} value={data[k] as string}
                onChange={e => set(k, e.target.value as any)} placeholder="0" />
            </div>
          ))}
        </div>

        {/* Aperçu */}
        <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 rounded-lg text-xs border border-slate-100">
          <span className="text-black">Aperçu affiché :</span>
          {(['30 jours', '90 jours', '1 an'] as const).map((l, i) => {
            const prices = [data.price30, data.price90, data.price365];
            return (
              <span key={l} className="text-black">{l} → {formatPrice(prices[i])}</span>
            );
          })}
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
