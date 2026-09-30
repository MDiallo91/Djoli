/**
 * ui/design_system/Spinner.tsx
 * Indicateur de chargement circulaire.
 * Consommé par : Button (état loading), composants avec fetch en cours
 */

export type SpinnerSize  = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
export type SpinnerColor = 'current' | 'primary' | 'blue' | 'slate';

const SIZE_CLS: Record<SpinnerSize, string> = {
  sm:  'w-3.5 h-3.5 border-2',
  md:  'w-5 h-5 border-2',
  lg:  'w-7 h-7 border-2',
  xl:  'w-8 h-8 border-4',
  '2xl': 'w-10 h-10 border-[3px]',
  '3xl': 'w-12 h-12 border-4',
};

const COLOR_CLS: Record<SpinnerColor, string> = {
  current: 'border-current/20 border-t-current',
  primary: 'border-primary-200 border-t-primary-600',
  blue:    'border-blue-200 border-t-blue-600',
  slate:   'border-slate-100 border-t-slate-400',
};

interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
}

export function Spinner({ size = 'md', color = 'current', className = '' }: SpinnerProps) {
  return (
    <div
      className={[
        'rounded-full animate-spin',
        SIZE_CLS[size],
        COLOR_CLS[color],
        className,
      ].join(' ')}
    />
  );
}
