/**
 * ui/design_system/Tabs.tsx
 * Onglets segmentés (pilules) — remplace les wrappers "flex bg-gray-100 p-1
 * rounded-xl" dupliqués (filtres de vue, IN/OUT/ALL, classes/matières/années...).
 * Consommé par : FinanceSection, GradesSection, StructureSection
 */

import { type ReactNode } from 'react';

export interface TabOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export type TabsSize = 'sm' | 'md';

interface TabsProps<T extends string = string> {
  options:         readonly TabOption<T>[];
  value:           T;
  onChange:        (v: T) => void;
  size?:           TabsSize;
  /** Chaque bouton prend une largeur égale (flex-1) — utile en empilement mobile */
  fullWidth?:      boolean;
  /** Classe appliquée à l'onglet actif à la place du style par défaut (blanc/ombre) */
  activeClassName?: string;
  className?:      string;
}

const SIZE_CLS: Record<TabsSize, string> = {
  sm: 'px-2.5 py-1 text-xs',
  md: 'px-3.5 py-1.5 text-sm',
};

export function Tabs<T extends string = string>({
  options, value, onChange, size = 'md', fullWidth = false, activeClassName, className = '',
}: TabsProps<T>) {
  return (
    <div className={`flex bg-gray-100 p-1 rounded-xl gap-0.5 ${className}`}>
      {options.map(opt => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={[
              'flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all',
              SIZE_CLS[size],
              fullWidth ? 'flex-1' : '',
              active
                ? (activeClassName ?? 'bg-white text-gray-900 shadow-sm')
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
