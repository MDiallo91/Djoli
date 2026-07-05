/**
 * ui/component/ProviderCard.tsx
 * Carte générique pour un provider d'intégration (SMS, push, paiement).
 * Inspiré de : BELTAM payment-method/index.blade.php (card col-md-6 + toggle)
 * Consommé par : SmsSection, PushSection, PaymentSection
 *
 * Pattern : toggle en haut à droite de la card,
 *            champs de credentials cachés si désactivé,
 *            slot "badge" pour sandbox/live,
 *            slot "footer" pour actions (ex: tester l'envoi).
 */

import { type ReactNode } from 'react';
import { SwitchToggle } from '../design_system/Toggle';

interface ProviderCardProps {
  name:      string;
  /** URL logo ou initiales à afficher */
  logo?:     string;
  initials?: string;
  enabled:   boolean;
  onToggle:  (v: boolean) => void;
  /** Badge optionnel (ex: SandboxBadge) */
  badge?:    ReactNode;
  /** Champs credentials — masqués quand provider désactivé */
  children?: ReactNode;
  /** Boutons d'action en bas de card (test d'envoi, sauvegarder...) */
  footer?:   ReactNode;
}

export function ProviderCard({
  name, logo, initials, enabled, onToggle, badge, children, footer,
}: ProviderCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        {logo ? (
          <img src={logo} alt={name} className="w-8 h-8 object-contain rounded-lg flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 text-xs font-bold flex-shrink-0">
            {initials ?? name[0]}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{name}</p>
          {badge && <div className="mt-0.5">{badge}</div>}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-medium ${enabled ? 'text-secondary-600' : 'text-rose-400'}`}>
            {enabled ? 'Actif' : 'Inactif'}
          </span>
          <SwitchToggle checked={enabled} onChange={onToggle} />
        </div>
      </div>

      {/* Credentials — toujours visibles */}
      {children && (
        <div className="px-4 py-4 space-y-3">
          {children}
        </div>
      )}

      {/* Footer actions */}
      {enabled && footer && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-end gap-2">
          {footer}
        </div>
      )}
    </div>
  );
}
