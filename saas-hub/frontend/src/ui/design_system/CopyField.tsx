/**
 * ui/design_system/CopyField.tsx
 * Champ lecture seule avec bouton "Copier" — pour URLs de callback/webhook.
 * Inspiré de : BELTAM payment-method/index.blade.php (Copy URI button)
 * Consommé par : PaymentSection (callback URIs des gateways)
 */

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../../lib/utils';

interface CopyFieldProps {
  label?: string;
  value:  string;
  hint?:  string;
}

export function CopyField({ label, value, hint }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-500 bg-slate-50 outline-none font-mono"
        />
        <button
          type="button"
          onClick={handleCopy}
          title="Copier"
          className={[
            'flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl border transition-all',
            copied
              ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
              : 'border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50',
          ].join(' ')}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      {hint && <p className="text-[11px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}
