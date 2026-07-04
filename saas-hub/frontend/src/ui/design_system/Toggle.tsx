/**
 * ui/design_system/Toggle.tsx
 * Interrupteur on/off générique.
 * Consommé par : StatutToggle (sections paramètres), ProviderCard (activer/désactiver provider)
 *
 * Remplace l'ancien StatutToggle de AdminDashboard qui était spécifique aux sections.
 * Usage : <Toggle value={1} onChange={v => ...} label="Statut de la page" />
 */

interface ToggleProps {
  value:    0 | 1 | boolean;
  onChange: (v: 0 | 1) => void;
  label?:   string;
  /** Message affiché quand le toggle est désactivé (ex: "non publié") */
  offHint?: string;
  size?:    'sm' | 'md';
}

export function Toggle({ value, onChange, label, offHint, size = 'md' }: ToggleProps) {
  const isOn   = Boolean(value);
  const textSz = size === 'sm' ? 'text-[11px]' : 'text-xs';

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl ${label ? '' : 'w-fit'}`}>
      {label && (
        <span className={`${textSz} font-semibold text-slate-500 uppercase tracking-wide`}>{label} :</span>
      )}

      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="radio"
          checked={isOn}
          onChange={() => onChange(1)}
          className="accent-emerald-500 w-3.5 h-3.5"
        />
        <span className={`${textSz} font-semibold ${isOn ? 'text-emerald-600' : 'text-slate-400'}`}>Actif</span>
      </label>

      <label className="flex items-center gap-1.5 cursor-pointer select-none">
        <input
          type="radio"
          checked={!isOn}
          onChange={() => onChange(0)}
          className="accent-slate-400 w-3.5 h-3.5"
        />
        <span className={`${textSz} font-semibold ${!isOn ? 'text-slate-700' : 'text-slate-400'}`}>Inactif</span>
      </label>

      {!isOn && offHint && (
        <span className={`ml-1 ${textSz} text-amber-600 font-medium italic`}>— {offHint}</span>
      )}
    </div>
  );
}

/**
 * Interrupteur visuel (switch HTML) — alternative compacte pour les ProviderCards.
 * Usage : <SwitchToggle checked={provider.enabled} onChange={v => ...} />
 */
interface SwitchToggleProps {
  checked:  boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function SwitchToggle({ checked, onChange, disabled = false }: SwitchToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus:outline-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-emerald-500' : 'bg-slate-200',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
          'transform transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}
