import { shell } from 'electron'
import { createAuthHandlers } from '../../shared/services/authService'
import { registerHandlers } from '../ipcAdapter'
import { verifyLicense } from '../licenseVerifier'
import { CLOUD_UNREACHABLE } from '../../shared/authErrors'

export function apiUrl(): string {
    return process.env.SAAS_API_URL || 'https://djoli.vercel.app'
}

// Extrait pour être réutilisé hors du flux d'auth — ex: schoolService.ts a besoin
// d'un access_token frais à la demande (sans repasser par cloud-activate) quand
// l'utilisateur reste connecté en local et n'a jamais eu l'occasion d'en obtenir un.
export async function refreshLicenseByKey(storedLicenseKey: string): Promise<any | null> {
    const response = await fetch(`${apiUrl()}/api/license/refresh-by-key`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedLicenseKey}` },
    })
    if (!response.ok) return null
    return await response.json()
}

const authHandlers = createAuthHandlers({
    cloudLogin: async (username, password) => {
        // Le serveur fait foi dès qu'il est joignable (Login.tsx) : on distingue donc
        // « injoignable » (réseau, délai dépassé, panne 5xx, réponse illisible → le poste
        // bascule en connexion locale) d'un vrai refus (4xx → identifiants rejetés).
        let response: Response
        try {
            response = await fetch(`${apiUrl()}/api/user/login`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ email: username, password }),
                signal:  AbortSignal.timeout(10_000),
            })
        } catch {
            throw new Error(`${CLOUD_UNREACHABLE} Serveur injoignable`)
        }
        if (response.status >= 500 || response.status === 429) {
            throw new Error(`${CLOUD_UNREACHABLE} Serveur indisponible (${response.status})`)
        }
        let data: any
        try { data = await response.json() }
        catch { throw new Error(`${CLOUD_UNREACHABLE} Réponse du serveur illisible`) }
        if (!response.ok) throw new Error(data.message || 'Identifiants cloud incorrects')
        return {
            id:                 data.id,
            schoolName:         data.schoolName,
            country:            data.country ?? null,
            levels:             data.levels,
            pendingLevels:      data.pendingLevels,
            subscriptionStatus: data.subscriptionStatus,
            subscriptionExpiry: data.subscriptionExpiry,
            license_key:        data.license_key ?? null,
            access_token:       data.access_token ?? null,
        }
    },

    verifyLicense: async (token) => verifyLicense(token),

    refreshLicense: async (_schoolId, storedToken) => refreshLicenseByKey(storedToken),

    openExternal: (url) => {
        shell.openExternal(url)
    },
})

export function registerAuthHandlers(): void {
    registerHandlers(authHandlers)
}
