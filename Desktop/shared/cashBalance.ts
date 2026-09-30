import db from './db/core'

// Règle de caisse : une sortie (dépense, salaire) ne peut pas dépasser l'argent
// réellement en caisse pour l'année scolaire concernée (entrées − sorties).
// Pour une dépense payée hors caisse, enregistrer d'abord l'apport (entrée).

/** Année scolaire active (null si aucune). */
export function activeSchoolYearId(): string | null {
    const row = db.prepare('SELECT id FROM school_years WHERE is_active = 1 AND deleted_at IS NULL LIMIT 1').get() as any
    return row?.id ?? null
}

/** Solde de caisse (entrées − sorties) d'une année ; toutes années si yearId est null. */
export function cashBalance(yearId: string | null): number {
    const row = (yearId
        ? db.prepare(`SELECT
              COALESCE(SUM(CASE WHEN type = 'IN'  THEN amount ELSE 0 END), 0) AS total_in,
              COALESCE(SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END), 0) AS total_out
            FROM cash_transactions WHERE deleted_at IS NULL AND school_year_id = ?`).get(yearId)
        : db.prepare(`SELECT
              COALESCE(SUM(CASE WHEN type = 'IN'  THEN amount ELSE 0 END), 0) AS total_in,
              COALESCE(SUM(CASE WHEN type = 'OUT' THEN amount ELSE 0 END), 0) AS total_out
            FROM cash_transactions WHERE deleted_at IS NULL`).get()) as any
    return Number(row?.total_in || 0) - Number(row?.total_out || 0)
}

/** Lève une erreur lisible si la sortie `amount` rendrait la caisse négative. */
export function assertCashAvailable(amount: number, yearId: string | null): void {
    const balance = cashBalance(yearId)
    if (amount > balance) {
        const fmt = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} GNF`
        throw new Error(`Solde de caisse insuffisant : ${fmt(balance)} disponibles pour une sortie de ${fmt(amount)}. Enregistrez d'abord l'entrée d'argent correspondante.`)
    }
}
