/**
 * ui/component/PageShell.tsx
 * Wrapper de page avec breadcrumb "Retour" + titre + actions.
 * Extrait de : AdminDashboard.tsx:162
 * Consommé par : SchoolFormPage, SchoolDetailPage
 */

import { type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface PageShellProps {
  title:     string;
  subtitle?: string;
  onBack:    () => void;
  actions?:  ReactNode;
  children:  ReactNode;
}

export function PageShell({ title, subtitle, onBack, actions, children }: PageShellProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 py-4 border-b border-slate-200 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors"
        >
          <ArrowLeft size={16} />
          Retour
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex-1">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
