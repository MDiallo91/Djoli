/**
 * ui/component/EventTemplateForm.tsx
 * Formulaire de template de message par événement (SMS ou push notification).
 * Inspiré de : BELTAM sms-index.blade.php (section "SMS par statut commande")
 *              et fcm-index.blade.php (templates titre + corps par événement)
 * Consommé par : SmsSection, PushSection
 *
 * Affiche : toggle actif/inactif + champ texte + liste des placeholders cliquables.
 */

import { SwitchToggle } from '../design_system/Toggle';

interface EventTemplateFormProps {
  label:        string;
  enabled:      boolean;
  onToggle:     (v: boolean) => void;
  value:        string;
  onChange:     (v: string) => void;
  placeholders: string[];
  /** Pour push : champ titre séparé du corps */
  title?:       string;
  onTitleChange?: (v: string) => void;
  rows?:        number;
}

export function EventTemplateForm({
  label, enabled, onToggle, value, onChange,
  placeholders, title, onTitleChange, rows = 2,
}: EventTemplateFormProps) {
  const insertPlaceholder = (field: 'body' | 'title', ph: string) => {
    if (field === 'title' && onTitleChange) {
      onTitleChange((title ?? '') + ph);
    } else {
      onChange(value + ph);
    }
  };

  return (
    <div className={[
      'border rounded-xl p-4 transition-all',
      enabled ? 'border-primary-100 bg-primary-50/30' : 'border-slate-100 bg-slate-50/50',
    ].join(' ')}>
      {/* Header : label + toggle */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-700">{label}</p>
        <SwitchToggle checked={enabled} onChange={onToggle} />
      </div>

      {enabled && (
        <div className="space-y-2">
          {/* Champ titre (push seulement) */}
          {onTitleChange !== undefined && (
            <input
              type="text"
              value={title ?? ''}
              onChange={e => onTitleChange(e.target.value)}
              placeholder="Titre de la notification…"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-400 bg-white"
            />
          )}

          {/* Corps du message */}
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            rows={rows}
            placeholder="Corps du message…"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-400 bg-white resize-none"
          />

          {/* Placeholders cliquables */}
          {placeholders.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-400 self-center">Variables :</span>
              {placeholders.map(ph => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => insertPlaceholder(onTitleChange ? 'body' : 'body', ph)}
                  className="text-[10px] font-mono px-2 py-0.5 bg-white border border-slate-200 rounded-md text-primary-600 hover:border-primary-300 hover:bg-primary-50 transition-all"
                >
                  {ph}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
