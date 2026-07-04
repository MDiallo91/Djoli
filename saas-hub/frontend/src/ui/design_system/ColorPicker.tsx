/**
 * ui/design_system/ColorPicker.tsx
 * Sélecteur de couleur hex avec aperçu visuel et swatches prédéfinis.
 * Extrait de : AdminDashboard.tsx:892
 * Consommé par : SiteSection (couleur primaire, secondaire)
 */

import { labelCls } from '../../lib/styles';

const PRESETS = [
  '#4f46e5', '#2563eb', '#7c3aed', '#dc2626',
  '#ea580c', '#16a34a', '#0891b2', '#be185d', '#1e293b',
];

interface ColorPickerProps {
  label?:    string;
  value:     string;
  onChange:  (v: string) => void;
  hint?:     string;
}

export function ColorPicker({ label, value, onChange, hint }: ColorPickerProps) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#4f46e5';

  return (
    <div>
      {label && <label className={labelCls}>{label}</label>}
      <div className="flex items-center gap-3">
        {/* Aperçu couleur + native color input */}
        <div className="relative flex-shrink-0">
          <input
            type="color"
            value={safe}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div
            className="w-11 h-11 rounded-xl border-2 border-slate-200 shadow-sm cursor-pointer transition-all hover:border-slate-400"
            style={{ backgroundColor: safe }}
          />
        </div>

        {/* Champ hex manuel */}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={7}
          placeholder="#4f46e5"
          className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 uppercase bg-white"
        />

        {/* Swatches + hint */}
        <div className="flex-1">
          {hint && <p className="text-[11px] text-slate-400 mb-1">{hint}</p>}
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(c)}
                className="w-5 h-5 rounded-md border border-white/50 shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
