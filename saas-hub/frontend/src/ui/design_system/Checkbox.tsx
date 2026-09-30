/**
 * ui/design_system/Checkbox.tsx
 * Case à cocher — variante native (case visible + label) ou chip (pilule
 * sélectionnable, la case elle-même reste invisible/sr-only).
 * Consommé par : StructureSection (année active), FinanceSection (mois sélectionnés)
 */

import { type ReactNode } from 'react';

export type CheckboxVariant = 'native' | 'chip';
export type CheckboxColor   = 'primary' | 'blue' | 'secondary';

interface CheckboxProps {
  checked:    boolean;
  onChange:   (checked: boolean) => void;
  label?:     ReactNode;
  variant?:   CheckboxVariant;
  color?:     CheckboxColor;
  disabled?:  boolean;
  name?:      string;
  className?: string;
}

const NATIVE_ACCENT: Record<CheckboxColor, string> = {
  primary:   'accent-primary-600',
  blue:      'accent-blue-600',
  secondary: 'accent-secondary-600',
};

const CHIP_CHECKED: Record<CheckboxColor, string> = {
  primary:   'border-primary-500 bg-primary-50 text-primary-700',
  blue:      'border-blue-500 bg-blue-50 text-blue-700',
  secondary: 'border-secondary-500 bg-secondary-50 text-secondary-700',
};

const CHIP_UNCHECKED = 'border-gray-100 hover:border-gray-200 text-gray-600';

export function Checkbox({
  checked, onChange, label, variant = 'native', color = 'primary',
  disabled = false, name, className = '',
}: CheckboxProps) {
  if (variant === 'chip') {
    return (
      <label
        className={[
          'flex items-center gap-2 p-2 rounded-xl border-2 cursor-pointer transition-all text-xs font-semibold',
          checked ? CHIP_CHECKED[color] : CHIP_UNCHECKED,
          disabled ? 'opacity-40 cursor-not-allowed' : '',
          className,
        ].join(' ')}
      >
        <input
          type="checkbox"
          name={name}
          className="sr-only"
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
        />
        {label}
      </label>
    );
  }

  return (
    <label className={`flex items-center gap-2.5 cursor-pointer select-none ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}>
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        className={`w-4 h-4 rounded flex-shrink-0 ${NATIVE_ACCENT[color]}`}
      />
      {label}
    </label>
  );
}
