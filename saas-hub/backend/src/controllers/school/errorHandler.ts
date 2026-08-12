import { Response } from 'express';

// Les services school/*.ts lèvent httpError({status, message}) pour les
// erreurs métier (validation, 404...) — ce helper les traduit en réponse
// HTTP, sinon retombe sur un 500 générique (comportement identique à
// l'ancien schoolController.ts, qui répondait déjà `{ error: '...' }` partout).
export function handleServiceError(res: Response, err: any): void {
    if (err && typeof err.status === 'number' && typeof err.message === 'string') {
        res.status(err.status).json({ error: err.message });
        return;
    }
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
}
