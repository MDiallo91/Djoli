/**
 * ui/design_system/Input.tsx
 * Champ de saisie avec label, helper et message d'erreur intégrés.
 * Consommé par : tous les formulaires settings, SchoolFormPage, Auth
 */

import { type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?:     string;
  error?:     string;
  helper?:    string;
  leftIcon?:  ReactNode;
  rightIcon?: ReactNode;
  optional?:  boolean;
}

const baseCls =
  'w-full border rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none ' +
  'transition-all bg-white placeholder:text-slate-400';

const normalCls = `${baseCls} border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10`;
const errorCls  = `${baseCls} border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10`;

export function Input({ label, error, helper, leftIcon, rightIcon, optional, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          {label}
          {optional && <span className="ml-1 text-slate-400 font-normal normal-case">(optionnel)</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3 text-slate-400 pointer-events-none">{leftIcon}</span>
        )}
        <input
          {...props}
          className={[
            error ? errorCls : normalCls,
            leftIcon  ? 'pl-9'  : '',
            rightIcon ? 'pr-9'  : '',
          ].join(' ')}
        />
        {rightIcon && (
          <span className="absolute right-3 text-slate-400">{rightIcon}</span>
        )}
      </div>
      {error  && <p className="text-[11px] text-red-500 font-medium mt-1">{error}</p>}
      {helper && !error && <p className="text-[11px] text-slate-400 mt-1">{helper}</p>}
    </div>
  );
}
