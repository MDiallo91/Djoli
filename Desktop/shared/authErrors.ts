// Préfixe des erreurs « serveur injoignable » de la connexion cloud (réseau coupé, délai
// dépassé, panne 5xx…). Partagé entre electron/services/authService.ts (qui le pose) et
// src/components/Login.tsx (qui bascule alors en connexion locale hors ligne) : seul le
// message traverse l'IPC Electron, d'où ce marqueur textuel plutôt qu'un code d'erreur.
export const CLOUD_UNREACHABLE = '[CLOUD_UNREACHABLE]'

export const isCloudUnreachable = (err: any): boolean => {
    const msg = String(err?.message || '')
    return msg.includes(CLOUD_UNREACHABLE) || /fetch|network|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(msg)
}
