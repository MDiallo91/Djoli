/**
 * ui/design_system/EmptyState.tsx
 * Placeholder affiché quand une liste est vide.
 * Consommé par : SchoolsTab, PendingTab, AuditSection, SmsSection (providers)
 */

import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?:    ReactNode;
  message:  string;
  hint?:    string;
  action?:  ReactNode;
}

export function EmptyState({ icon, message, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-400">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-slate-600">{message}</p>
      {hint && <p className="text-xs text-slate-400 mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
