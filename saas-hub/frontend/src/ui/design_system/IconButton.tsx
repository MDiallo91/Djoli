/**
 * ui/design_system/IconButton.tsx
 * Bouton icône seule (carré) — remplace les "×" texte réinventés partout
 * pour fermer une modale/carte. Style aligné sur le bouton de fermeture de Modal.
 * Consommé par : StudentModal, FinanceSection, GradesSection, StaffSection,
 *                StructureSection, StudentsSection (tiroir)
 */

import { type ReactNode } from 'react';
import { X } from 'lucide-react';

export type IconButtonSize    = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'default' | 'danger';

interface IconButtonProps {
  icon?:      ReactNode;
  onClick:    (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Obligatoire — utilisé comme aria-label/title (accessibilité) */
  label:      string;
  size?:      IconButtonSize;
  variant?:   IconButtonVariant;
  disabled?:  boolean;
  className?: string;
}

const SIZE_CLS: Record<IconButtonSize, { pad: string; icon: number }> = {
  sm: { pad: 'p-1',   icon: 14 },
  md: { pad: 'p-1.5', icon: 16 },
  lg: { pad: 'p-2',   icon: 18 },
};

const VARIANT_CLS: Record<IconButtonVariant, string> = {
  default: 'text-slate-400 hover:text-slate-700 hover:bg-slate-100',
  danger:  'text-slate-400 hover:text-red-600 hover:bg-red-50',
};

export function IconButton({
  icon, onClick, label, size = 'md', variant = 'default',
  disabled = false, className = '',
}: IconButtonProps) {
  const { pad, icon: iconSize } = SIZE_CLS[size];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={[
        pad, 'rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANT_CLS[variant],
        className,
      ].join(' ')}
    >
      {icon ?? <X size={iconSize} />}
    </button>
  );
}
