import type { ReactNode } from 'react';
import { BookOpen } from 'lucide-react';

interface Props {
  sub: string;
  children: ReactNode; // titre — entourer le mot mis en valeur de <span>
  center?: boolean;
  light?: boolean;
  className?: string;
}

// En-tête de section façon Eduka : sur-titre accent + titre + double trait.
export function SectionTitle({ sub, children, center, light, className = '' }: Props) {
  return (
    <div className={`${center ? 'lp-center max-w-2xl mx-auto' : ''} ${className}`}>
      <span className="lp-sub"><BookOpen size={18} /> {sub}</span>
      <h2 className={`lp-title ${light ? 'lp-title-light' : ''}`}>{children}</h2>
      <div className="lp-divider" />
    </div>
  );
}
