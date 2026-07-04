/**
 * ui/design_system/Spinner.tsx
 * Indicateur de chargement circulaire.
 * Consommé par : Button (état loading), composants avec fetch en cours
 */

export type SpinnerSize = 'sm' | 'md' | 'lg';

const SIZE_CLS: Record<SpinnerSize, string> = {
  sm: 'w-3.5 h-3.5 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-7 h-7 border-2',
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={[
        'rounded-full border-current/20 border-t-current animate-spin',
        SIZE_CLS[size],
        className,
      ].join(' ')}
    />
  );
}
