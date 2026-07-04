/**
 * lib/styles.ts
 * Classes Tailwind partagées et maps de couleurs sémantiques.
 * Consommé par : tous les composants admin et settings
 * → Source unique pour les styles d'inputs, badges, statuts
 */

// ─── Champs de formulaire ─────────────────────────────────────
export const inputCls =
  'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 ' +
  'outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 ' +
  'transition-all bg-white placeholder:text-slate-400';

export const labelCls =
  'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5';

// ─── Statut abonnement ────────────────────────────────────────
export const SUB_LABEL: Record<string, string> = {
  active:    'Actif',
  trial:     'Essai',
  expired:   'Expiré',
  suspended: 'Bloqué',
};

export const SUB_CLS: Record<string, string> = {
  active:    'bg-secondary-50 text-secondary-700 border-secondary-200',
  trial:     'bg-blue-50 text-blue-700 border-blue-200',
  expired:   'bg-red-50 text-red-700 border-red-200',
  suspended: 'bg-slate-100 text-slate-600 border-slate-300',
};

// ─── Statut approbation ───────────────────────────────────────
export const APV_CLS: Record<string, string> = {
  approved: 'bg-secondary-50 text-secondary-700 border-secondary-200',
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

// ─── Niveau scolaire ──────────────────────────────────────────
export const LEVEL_CLS: Record<string, string> = {
  Maternelle: 'bg-pink-50 text-pink-700 border-pink-200',
  Primaire:   'bg-green-50 text-green-700 border-green-200',
  Collège:    'bg-blue-50 text-blue-700 border-blue-200',
  Lycée:      'bg-purple-50 text-purple-700 border-purple-200',
};
