/**
 * ui/design_system/Button.tsx
 * Bouton universel typé — variant, taille, loading, icônes.
 * Consommé par : tous les composants admin, settings, formulaires
 */

import { type ReactNode } from 'react';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'outline' | 'success';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  variant?:   ButtonVariant;
  size?:      ButtonSize;
  loading?:   boolean;
  disabled?:  boolean;
  fullWidth?: boolean;
  leftIcon?:  ReactNode;
  rightIcon?: ReactNode;
  type?:      'button' | 'submit' | 'reset';
  onClick?:   () => void;
  className?: string;
  title?:     string;
}

const VARIANT_CLS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 hover:border-indigo-700',
  ghost:   'bg-transparent text-slate-600 border-transparent hover:bg-slate-100',
  danger:  'bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600',
  outline: 'bg-white text-slate-700 border-slate-200 hover:border-slate-400',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600',
};

const SIZE_CLS: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2.5 text-sm gap-2',
  lg: 'px-5 py-3 text-sm gap-2',
};

export function Button({
  children, variant = 'primary', size = 'md', loading = false,
  disabled = false, fullWidth = false, leftIcon, rightIcon,
  type = 'button', onClick, className = '', title,
}: ButtonProps) {
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center rounded-xl font-semibold border transition-all',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        VARIANT_CLS[variant],
        SIZE_CLS[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
    >
      {loading ? <Spinner size="sm" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
}
