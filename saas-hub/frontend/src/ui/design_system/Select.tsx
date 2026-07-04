/**
 * ui/design_system/Select.tsx
 * Liste déroulante typée avec label et message d'erreur.
 * Consommé par : SettingsTab (devise, niveau), filtres des onglets admin
 */

import { type SelectHTMLAttributes } from 'react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?:   string;
  error?:   string;
  helper?:  string;
  options:  SelectOption[];
  optional?: boolean;
}

export function Select({ label, error, helper, options, optional, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          {label}
          {optional && <span className="ml-1 text-slate-400 font-normal normal-case">(optionnel)</span>}
        </label>
      )}
      <select
        {...props}
        className={[
          'w-full border rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none',
          'transition-all bg-white appearance-none cursor-pointer',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10'
            : 'border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10',
        ].join(' ')}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error  && <p className="text-[11px] text-red-500 font-medium mt-1">{error}</p>}
      {helper && !error && <p className="text-[11px] text-slate-400 mt-1">{helper}</p>}
    </div>
  );
}
