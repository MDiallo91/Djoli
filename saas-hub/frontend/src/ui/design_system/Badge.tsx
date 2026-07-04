/**
 * ui/design_system/Badge.tsx
 * Étiquette colorée sémantique — statuts abonnement, approbation, niveau.
 * Consommé par : SchoolsTab, PendingTab, SubscriptionsTab, SchoolDetailPage
 */

import { SUB_CLS, SUB_LABEL, APV_CLS, LEVEL_CLS } from '../../lib/styles';

interface BadgeProps {
  label: string;
  cls:   string;
}

/** Badge générique — passez label et classe Tailwind directement. */
export function Badge({ label, cls }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>
      {label}
    </span>
  );
}

/** Badge pré-configuré pour le statut d'abonnement. */
export function SubscriptionBadge({ status }: { status: string }) {
  return (
    <Badge
      label={SUB_LABEL[status] ?? status}
      cls={SUB_CLS[status]   ?? SUB_CLS.suspended}
    />
  );
}

/** Badge pré-configuré pour le statut d'approbation. */
export function ApprovalBadge({ status }: { status: string }) {
  return (
    <Badge
      label={status === 'approved' ? 'Approuvé' : status === 'rejected' ? 'Rejeté' : 'En attente'}
      cls={APV_CLS[status] ?? APV_CLS.pending}
    />
  );
}

/** Badge pré-configuré pour le niveau scolaire. */
export function LevelBadge({ level }: { level: string }) {
  return (
    <Badge label={level} cls={LEVEL_CLS[level] ?? 'bg-slate-100 text-slate-600 border-slate-200'} />
  );
}
