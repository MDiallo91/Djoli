/**
 * ui/component/StatutToggle.tsx
 * Toggle Actif / Inactif pour les sections de paramètres.
 * Extrait de : AdminDashboard.tsx (StatutToggle, ~ligne 974)
 * Consommé par : SiteSection, ContactSection, TarificationSection,
 *                ApplicationSection, AccueilSection, LegalSection
 */

interface StatutToggleProps {
  value:    0 | 1;
  onChange: (v: 0 | 1) => void;
}

export function StatutToggle({ value, onChange }: StatutToggleProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl mb-5">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut :</span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="radio" checked={value === 1} onChange={() => onChange(1)} className="accent-secondary-500 w-3.5 h-3.5" />
        <span className={`text-xs font-semibold ${value === 1 ? 'text-secondary-600' : 'text-slate-400'}`}>Actif</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="radio" checked={value === 0} onChange={() => onChange(0)} className="accent-slate-400 w-3.5 h-3.5" />
        <span className={`text-xs font-semibold ${value === 0 ? 'text-slate-700' : 'text-slate-400'}`}>Inactif</span>
      </label>
      {value === 0 && (
        <span className="ml-1 text-xs text-amber-600 font-medium italic">— non appliqué à la page d'accueil</span>
      )}
    </div>
  );
}
