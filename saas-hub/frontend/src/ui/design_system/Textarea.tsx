/**
 * ui/design_system/Textarea.tsx
 * Zone de texte multi-lignes avec label et erreur.
 * Consommé par : ContactSection (adresse), SmsSection (templates), EmailSection
 */

import { type TextareaHTMLAttributes } from 'react';

interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {
  label?:  string;
  error?:  string;
  helper?: string;
  optional?: boolean;
}

export function Textarea({ label, error, helper, optional, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          {label}
          {optional && <span className="ml-1 text-slate-400 font-normal normal-case">(optionnel)</span>}
        </label>
      )}
      <textarea
        {...props}
        className={[
          'w-full border rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none',
          'transition-all bg-white resize-y min-h-[90px] placeholder:text-slate-400',
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/10'
            : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
        ].join(' ')}
      />
      {error  && <p className="text-[11px] text-red-500 font-medium mt-1">{error}</p>}
      {helper && !error && <p className="text-[11px] text-slate-400 mt-1">{helper}</p>}
    </div>
  );
}
