/**
 * ui/design_system/Card.tsx
 * Conteneur carte universel — remplace les wrappers "bg-white rounded-2xl
 * border shadow-sm" dupliqués partout, et les panneaux .card-main (index.css).
 * Consommé par : Dashboard, FinanceSection, GradesSection, SchoolCardsPage,
 *                StaffSection, StructureSection, SubscriptionPage
 */

import { type ReactNode } from 'react';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface CardProps {
  children:   ReactNode;
  padding?:   CardPadding;
  /** Effet de survol (lift + ombre) — pour les cartes cliquables */
  hover?:     boolean;
  className?: string;
}

const PADDING_CLS: Record<CardPadding, string> = {
  none: 'p-0',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
  xl:   'p-7',
};

export function Card({ children, padding = 'md', hover = false, className = '' }: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-2xl border border-slate-100 shadow-sm',
        PADDING_CLS[padding],
        hover ? 'transition-all hover:shadow-md hover:-translate-y-0.5' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}
