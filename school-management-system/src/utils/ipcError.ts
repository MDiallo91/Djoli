// Electron préfixe toute erreur IPC par "Error invoking remote method 'x': Error: ..." —
// on ne garde que le message métier, lisible par l'utilisateur.
export function ipcErrorMessage(err: any, fallback = 'Une erreur est survenue'): string {
    const cleaned = String(err?.message || '')
        .replace(/^Error invoking remote method '[^']+':\s*/i, '')
        .replace(/^Error:\s*/i, '')
        .trim()
    return cleaned || fallback
}
