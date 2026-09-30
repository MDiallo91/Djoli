/**
 * ui/design_system/ConfirmModal.tsx
 * Remplace window.confirm() par une modale stylée, avec une API impérative
 * (même esprit que sonner's toast()/<Toaster/>, déjà utilisé dans App.tsx).
 *
 * Usage :
 *   1. Monter <ConfirmModalHost /> une seule fois (App.tsx, à côté de <Toaster/>)
 *   2. Où besoin : if (!(await confirmDialog({ message: '...', variant: 'danger' }))) return;
 *
 * Consommé par : FinanceSection, StaffSection, StructureSection, StudentsSection
 */

import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmOptions {
  title?:        string;
  message:       string;
  confirmLabel?: string;
  cancelLabel?:  string;
  variant?:      'default' | 'danger';
}

interface ConfirmState {
  options: ConfirmOptions;
  resolve: (v: boolean) => void;
}

let currentState: ConfirmState | null = null;
const listeners = new Set<(s: ConfirmState | null) => void>();

function setState(s: ConfirmState | null) {
  currentState = s;
  listeners.forEach(l => l(s));
}

/** Ouvre la modale de confirmation, résout true/false selon le choix de l'utilisateur. */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    setState({ options, resolve });
  });
}

/** À monter une seule fois dans l'app (voir App.tsx, à côté de <Toaster/>). */
export function ConfirmModalHost() {
  const [state, setLocalState] = useState<ConfirmState | null>(currentState);

  useEffect(() => {
    listeners.add(setLocalState);
    return () => { listeners.delete(setLocalState); };
  }, []);

  if (!state) return null;
  const { options, resolve } = state;

  const close = (result: boolean) => {
    setState(null);
    resolve(result);
  };

  return (
    <Modal
      open
      onClose={() => close(false)}
      title={options.title ?? 'Confirmation'}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => close(false)}>
            {options.cancelLabel ?? 'Annuler'}
          </Button>
          <Button variant={options.variant === 'danger' ? 'danger' : 'primary'} onClick={() => close(true)}>
            {options.confirmLabel ?? 'Confirmer'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{options.message}</p>
    </Modal>
  );
}
