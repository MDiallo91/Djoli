import { shell } from 'electron'
import { createAuthHandlers } from '../../shared/services/authService'
import { registerHandlers } from '../ipcAdapter'
import { verifyLicense } from '../licenseVerifier'

function apiUrl(): string {
    return process.env.SAAS_API_URL || 'https://djoli.vercel.app'
}

const authHandlers = createAuthHandlers({
    cloudLogin: async (username, password) => {
        const response = await fetch(`${apiUrl()}/api/user/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email: username, password }),
        })
        const data: any = await response.json()
        if (!response.ok) throw new Error(data.message || 'Identifiants cloud incorrects')
        return {
            id:                 data.id,
            schoolName:         data.schoolName,
            country:            data.country ?? null,
            levels:             data.levels,
            subscriptionStatus: data.subscriptionStatus,
            subscriptionExpiry: data.subscriptionExpiry,
            license_key:        data.license_key ?? null,
        }
    },

    verifyLicense: async (token) => verifyLicense(token),

    refreshLicense: async (_schoolId, storedToken) => {
        const response = await fetch(`${apiUrl()}/api/license/refresh-by-key`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${storedToken}` },
        })
        if (!response.ok) return null
        return await response.json()
    },

    openExternal: (url) => {
        shell.openExternal(url)
    },
})

export function registerAuthHandlers(): void {
    registerHandlers(authHandlers)
}
