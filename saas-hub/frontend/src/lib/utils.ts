/**
 * lib/utils.ts
 * Fonctions utilitaires pures, sans dépendance React.
 * Consommé par : components/admin/*, components/settings/*, hooks/*
 */

/**
 * Calcule le nombre de jours restants avant une date d'expiration.
 * Retourne null si la date est invalide.
 */
export function daysLeft(dateStr: string): number | null {
  const ms = new Date(dateStr).getTime() - Date.now();
  return isNaN(ms) ? null : Math.ceil(ms / 86_400_000);
}

/**
 * Copie un texte dans le presse-papiers.
 * Retourne true si succès.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Formate un montant avec devise.
 * Ex: formatAmount(29, 'EUR') → '29 €'
 */
export function formatAmount(amount: number | string, currency: string): string {
  const symbols: Record<string, string> = {
    EUR: '€', USD: '$', GNF: 'GNF',
  };
  return `${amount} ${symbols[currency] ?? currency}`;
}

/**
 * Retourne les initiales d'un nom (max 2 caractères).
 * Ex: initials('École du Soleil') → 'ES'
 */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

/**
 * Tronque un texte à N caractères avec ellipse.
 */
export function truncate(str: string, max: number): string {
  return str.length <= max ? str : `${str.slice(0, max)}…`;
}
