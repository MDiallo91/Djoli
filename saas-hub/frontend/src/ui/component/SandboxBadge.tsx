/**
 * ui/component/SandboxBadge.tsx
 * Badge visuel Sandbox / Live pour les gateways de paiement.
 * Inspiré de : BELTAM (chaque gateway a un select environment sandbox/live)
 * Consommé par : PaymentSection (dans chaque ProviderCard)
 */

import type { PaymentEnvironment } from '../../types/integrations';

interface SandboxBadgeProps {
  env:      PaymentEnvironment;
  onChange?: (env: PaymentEnvironment) => void;
  readonly?: boolean;
}

export function SandboxBadge({ env, onChange, readonly = false }: SandboxBadgeProps) {
  if (readonly || !onChange) {
    return (
      <span className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border',
        env === 'live'
          ? 'bg-secondary-50 text-secondary-700 border-secondary-200'
          : 'bg-amber-50 text-amber-700 border-amber-200',
      ].join(' ')}>
        {env === 'live' ? '● LIVE' : '◌ SANDBOX'}
      </span>
    );
  }

  return (
    <select
      value={env}
      onChange={e => onChange(e.target.value as PaymentEnvironment)}
      className={[
        'text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer outline-none appearance-none',
        env === 'live'
          ? 'bg-secondary-50 text-secondary-700 border-secondary-200'
          : 'bg-amber-50 text-amber-700 border-amber-200',
      ].join(' ')}
    >
      <option value="sandbox">◌ SANDBOX</option>
      <option value="live">● LIVE</option>
    </select>
  );
}
