/**
 * components/settings/TarificationSection.tsx
 * Tarification par niveau scolaire + durée d'abonnement + réductions multi-niveaux.
 *
 * Modèle de prix :
 *   prix_final = Σ(prix par niveau) × mois × (1 - remise_durée%) × (1 - remise_multi_niveaux%)
 *
 * Données : fetchSetting / saveSetting → clé 'tarification'
 * Consommé par : page/admin/SettingsPage.tsx
 */

import { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSetting, saveSetting }    from '../../services/settingsApi';
import { StatutToggle }                  from '../../ui/component/StatutToggle';
import { Spinner }                        from '../../ui/design_system/Spinner';
import type {
  PricingConfig, SchoolLevel, DurationPlan, MultiLevelDiscount,
} from '../../types/admin';
import { DEFAULT_PRICING } from '../../types/admin';

// ─── Helpers ──────────────────────────────────────────────────

const LEVELS: SchoolLevel[] = ['Maternelle', 'Primaire', 'Collège', 'Lycée'];
const LEVEL_COLORS: Record<SchoolLevel, string> = {
  Maternelle: 'bg-pink-50 border-pink-200 text-pink-700',
  Primaire:   'bg-green-50 border-green-200 text-green-700',
  Collège:    'bg-blue-50 border-blue-200 text-blue-700',
  Lycée:      'bg-purple-50 border-purple-200 text-purple-700',
};

function formatAmt(n: number, currency: PricingConfig['currency']): string {
  if (currency === 'GNF') return `${Math.round(n).toLocaleString('fr')} GNF`;
  if (currency === 'EUR') return `${n.toFixed(2)} €`;
  return `$${n.toFixed(2)}`;
}

/** Calcule le prix final pour une combinaison de niveaux + durée */
function calcPrice(
  cfg: PricingConfig,
  selectedLevels: SchoolLevel[],
  durationId: DurationPlan['id'],
): { baseMonthly: number; subtotal: number; durationDiscount: number; multiDiscount: number; total: number } {
  const dur = cfg.durations.find(d => d.id === durationId) ?? cfg.durations[0];
  const ml  = cfg.multiLevelDiscounts.find(m => m.count === selectedLevels.length);

  const baseMonthly    = selectedLevels.reduce((s, l) => s + (cfg.levelPrices[l] ?? 0), 0);
  const raw            = baseMonthly * dur.months;
  const durationDiscount = raw * dur.discountPct / 100;
  const subtotal       = raw - durationDiscount;
  const multiDiscount  = ml ? subtotal * ml.discountPct / 100 : 0;
  const total          = subtotal - multiDiscount;

  return { baseMonthly, subtotal, durationDiscount, multiDiscount, total };
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all bg-white';

// ─── Composant ────────────────────────────────────────────────

export function TarificationSection() {
  const [statut,  setStatut]  = useState<0|1>(1);
  const [data,    setData]    = useState<PricingConfig>(DEFAULT_PRICING);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  // Simulateur
  const [simLevels,   setSimLevels]   = useState<SchoolLevel[]>(['Primaire']);
  const [simDuration, setSimDuration] = useState<DurationPlan['id']>('mensuel');

  useEffect(() => {
    fetchSetting<PricingConfig>('tarification').then(res => {
      if (res?.data && 'levelPrices' in res.data) {
        setStatut(res.statut ?? 1);
        setData(p => ({ ...DEFAULT_PRICING, ...res.data }));
      }
      setLoading(false);
    });
  }, []);

  const setLevel = (l: SchoolLevel, v: number) =>
    setData(p => ({ ...p, levelPrices: { ...p.levelPrices, [l]: v } }));

  const setDuration = (id: DurationPlan['id'], patch: Partial<DurationPlan>) =>
    setData(p => ({ ...p, durations: p.durations.map(d => d.id === id ? { ...d, ...patch } : d) }));

  const setMLDiscount = (count: number, discountPct: number) =>
    setData(p => ({
      ...p,
      multiLevelDiscounts: p.multiLevelDiscounts.map(m => m.count === count ? { ...m, discountPct } : m),
    }));

  const toggleSimLevel = (l: SchoolLevel) =>
    setSimLevels(prev =>
      prev.includes(l) ? (prev.length > 1 ? prev.filter(x => x !== l) : prev) : [...prev, l]
    );

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

  const sim = simLevels.length > 0 ? calcPrice(data, simLevels, simDuration) : null;
  const fA  = (n: number) => formatAmt(n, data.currency);

  return (
    <div className="space-y-5">
      <StatutToggle value={statut} onChange={setStatut} />

      {/* ── Devise ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Devise</p>
        <div className="flex gap-2">
          {(['EUR','USD','GNF'] as const).map(c => (
            <button key={c} type="button" onClick={() => setData(p => ({ ...p, currency: c }))}
              className={`px-4 py-2 rounded-lg text-sm border transition-all ${data.currency === c ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-black hover:border-slate-400'}`}>
              {c === 'EUR' ? '€ Euro' : c === 'USD' ? '$ Dollar' : 'GNF Franc'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Prix par niveau (mensuel) ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Prix par niveau scolaire</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Prix de base mensuel par niveau. Les réductions durée et multi-niveaux s'appliquent ensuite.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LEVELS.map(l => (
            <div key={l}>
              <label className={`block text-[11px] font-semibold px-2 py-0.5 rounded-full border w-fit mb-2 ${LEVEL_COLORS[l]}`}>{l}</label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={data.levelPrices[l]}
                  onChange={e => setLevel(l, parseFloat(e.target.value) || 0)}
                  className={inputCls + ' pr-14'}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                  {data.currency === 'EUR' ? '€/mois' : data.currency === 'USD' ? '$/mois' : 'GNF'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Plans de durée ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Plans de durée</p>
          <p className="text-[11px] text-slate-400 mt-0.5">La réduction s'applique par rapport au tarif mensuel × durée (ex : 10% → client économise 10%).</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-2 pr-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Plan</th>
                <th className="text-left py-2 pr-4 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Durée (mois)</th>
                <th className="text-left py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Réduction (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.durations.map(d => (
                <tr key={d.id}>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                      d.id === 'mensuel' ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : d.id === 'trimestriel' ? 'bg-primary-50 text-primary-700 border-primary-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>{d.label}</span>
                  </td>
                  <td className="py-3 pr-4">
                    <input type="number" min={1} value={d.months}
                      onChange={e => setDuration(d.id, { months: parseInt(e.target.value) || 1 })}
                      className="w-20 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-400 bg-white text-center"
                    />
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} max={100} value={d.discountPct}
                        onChange={e => setDuration(d.id, { discountPct: parseFloat(e.target.value) || 0 })}
                        className="w-20 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-400 bg-white text-center"
                      />
                      <span className="text-xs text-slate-400">%</span>
                      {d.discountPct > 0 && (
                        <span className="text-[10px] text-emerald-600 font-semibold">−{d.discountPct}%</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Réductions multi-niveaux ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Réductions multi-niveaux</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Appliquée quand une école combine plusieurs niveaux (Primaire + Collège, etc.).</p>
        </div>
        <div className="space-y-2">
          {data.multiLevelDiscounts.map(m => (
            <div key={m.count} className="flex items-center gap-4 py-2.5 border-b border-slate-50 last:border-0">
              <div className="flex-1">
                <p className="text-sm text-slate-800 font-medium">{m.count} niveaux combinés</p>
                <p className="text-[11px] text-slate-400">Ex : {LEVELS.slice(0, m.count).join(' + ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={0} max={100} value={m.discountPct}
                  onChange={e => setMLDiscount(m.count, parseFloat(e.target.value) || 0)}
                  className="w-20 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-400 bg-white text-center"
                />
                <span className="text-xs text-slate-400">% de réduction</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Simulateur ── */}
      <div className="bg-primary-50 border border-primary-100 rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-primary-700 uppercase tracking-wider">Simulateur de prix</p>

        {/* Sélection niveaux */}
        <div>
          <p className="text-[11px] text-primary-600 mb-2">Niveaux de l'école (cliquez pour sélectionner) :</p>
          <div className="flex flex-wrap gap-2">
            {LEVELS.map(l => (
              <button key={l} type="button" onClick={() => toggleSimLevel(l)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  simLevels.includes(l)
                    ? LEVEL_COLORS[l] + ' shadow-sm'
                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                }`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Sélection durée */}
        <div>
          <p className="text-[11px] text-primary-600 mb-2">Durée :</p>
          <div className="flex gap-2 flex-wrap">
            {data.durations.map(d => (
              <button key={d.id} type="button" onClick={() => setSimDuration(d.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  simDuration === d.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                }`}>
                {d.label} {d.discountPct > 0 && <span className="ml-1 opacity-70">−{d.discountPct}%</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Résultat */}
        {sim && (
          <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
            <div className="px-4 py-3 bg-primary-600 text-white">
              <p className="text-xs opacity-80">Prix pour : <span className="font-semibold">{simLevels.join(' + ')}</span> — <span className="font-semibold">{data.durations.find(d => d.id === simDuration)?.label}</span></p>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Base mensuelle</span>
                <span>{fA(sim.baseMonthly)} / mois</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Sous-total ({data.durations.find(d => d.id === simDuration)?.months} mois)</span>
                <span>{fA(sim.baseMonthly * (data.durations.find(d => d.id === simDuration)?.months ?? 1))}</span>
              </div>
              {sim.durationDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Remise durée (−{data.durations.find(d => d.id === simDuration)?.discountPct}%)</span>
                  <span>−{fA(sim.durationDiscount)}</span>
                </div>
              )}
              {sim.multiDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Remise multi-niveaux (−{data.multiLevelDiscounts.find(m => m.count === simLevels.length)?.discountPct}%)</span>
                  <span>−{fA(sim.multiDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-100">
                <span>Total à payer</span>
                <span className="text-primary-600">{fA(sim.total)}</span>
              </div>
              {sim.durationDiscount + sim.multiDiscount > 0 && (
                <p className="text-[11px] text-emerald-600 text-right">
                  Économie totale : {fA(sim.durationDiscount + sim.multiDiscount)} ({Math.round((sim.durationDiscount + sim.multiDiscount) / (sim.baseMonthly * (data.durations.find(d => d.id === simDuration)?.months ?? 1)) * 100)}%)
                </p>
              )}
            </div>
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
