// Handlers d'authentification partagés. Le login local (sans réseau) et la
// gestion des comptes/licences en base sont 100% portables — seule la partie
// cloud (login réseau, vérification JWT, ouverture d'URL externe) diverge
// par plateforme et est injectée via `deps`.
import bcrypt from 'bcryptjs'
import db, { switchSchoolDatabase } from '../db/core'
import { setCurrentUser } from '../state/currentSession'
import { setSyncSession } from '../state/syncState'
import { triggerSyncNow } from './syncServiceCore'
import { logAction } from '../auditLogger'
import { computeLicenseStatus, getDaysRemaining } from '../licenseVerifier'
import type { LicenseData } from '../licenseVerifier'

export interface CloudLoginResult {
    id: string
    schoolName: string
    country?: string | null
    levels?: string[]
    subscriptionStatus: string
    subscriptionExpiry: string
    license_key: string | null
}

export interface RefreshedLicense {
    license_key: string
    subscriptionStatus: string
    levels?: string[]
}

export interface AuthServiceDeps {
    // POST identifiants → session cloud. Diffère par plateforme : endpoint
    // appelé, et forme du token retourné (license_key longue durée sur
    // Electron, access_token court sur navigateur — normalisé ici en
    // `license_key` par l'implémentation injectée).
    cloudLogin: (username: string, password: string) => Promise<CloudLoginResult>
    // Vérifie/décode le JWT de licence (jsonwebtoken sync sur Electron, jose
    // async/WebCrypto sur navigateur).
    verifyLicense: (token: string) => Promise<LicenseData>
    // Rafraîchit le statut d'abonnement + obtient un nouveau token. Sur
    // Electron : /api/license/refresh-by-key (Bearer longue durée). Sur
    // navigateur : /api/auth/browser/refresh (cookie httpOnly) — ne repasse
    // jamais par un token longue durée.
    refreshLicense: (schoolId: string, storedToken: string) => Promise<RefreshedLicense | null>
    openExternal: (url: string) => void
}

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24h

function cachedUntil(): string {
    return new Date(Date.now() + CACHE_DURATION_MS).toISOString()
}

export function createAuthHandlers(deps: AuthServiceDeps): Record<string, (...args: any[]) => any> {
    return {

        // ── Local login (admin ou sous-utilisateur école) ────────────────────────
        'login': async (credentials: { username: string, password: string }) => {
            const { username, password } = credentials
            if (!username || !password) throw new Error('Identifiants requis')

            const schoolUser = db.prepare(
                `SELECT * FROM school_users WHERE (email = ? OR username = ? OR phone = ?) AND is_active = 1 AND deleted_at IS NULL`
            ).get(username, username, username) as any

            if (schoolUser) {
                const isValid = await bcrypt.compare(password, schoolUser.password_hash)
                if (!isValid) throw new Error('Identifiants incorrects')
                await switchSchoolDatabase(schoolUser.school_id)
                let scopeLevels: string[] = []
                try { scopeLevels = JSON.parse(schoolUser.scope_levels || '[]') } catch {}
                setCurrentUser({ id: schoolUser.id, name: schoolUser.name, username: schoolUser.username, role: schoolUser.role, scope_levels: scopeLevels })
                logAction({ action: 'login', entityType: 'session', entityLabel: schoolUser.name, schoolId: schoolUser.school_id })
                return {
                    id:           schoolUser.id,
                    schoolId:     schoolUser.school_id,
                    username:     schoolUser.username,
                    role:         schoolUser.role,
                    name:         schoolUser.name,
                    permissions:  JSON.parse(schoolUser.permissions),
                    scopeLevels,
                    mustChangePwd: !!schoolUser.must_change_pwd,
                    isCloud:      false,
                    isSubUser:    true,
                }
            }

            const user = db.prepare(
                'SELECT * FROM users WHERE username = ? OR email = ? OR phone = ?'
            ).get(username, username, username) as any
            if (!user) throw new Error('Identifiants incorrects')

            const isValid = user.password_hash.startsWith('$2')
                ? await bcrypt.compare(password, user.password_hash)
                : user.password_hash === password
            if (!isValid) throw new Error('Identifiants incorrects')

            await switchSchoolDatabase(user.id)
            setCurrentUser({ id: user.id, name: user.name, username: user.username, role: user.role, scope_levels: [] })
            logAction({ action: 'login', entityType: 'session', entityLabel: user.name, schoolId: user.id })
            return { id: user.id, schoolId: user.id, username: user.username, role: user.role, name: user.name, permissions: null, scopeLevels: [], isCloud: false, isSubUser: false }
        },

        // ── Changement de mot de passe (premier login) ───────────────────────────
        'change-password': async (data: { userId: string; newPassword: string }) => {
            const { userId, newPassword } = data
            if (!newPassword || newPassword.length < 6) throw new Error('Mot de passe trop court (min 6 caractères)')
            const hash = await bcrypt.hash(newPassword, 10)
            db.prepare(`UPDATE school_users SET password_hash = ?, must_change_pwd = 0, updated_at = ? WHERE id = ?`)
                .run(hash, new Date().toISOString(), userId)
            return { success: true }
        },

        // ── Cloud activation / login ─────────────────────────────────────────────
        'cloud-activate': async (credentials: { username: string, password: string }) => {
            const { username, password } = credentials
            const data = await deps.cloudLogin(username, password)

            let licenseData: LicenseData | null = null
            if (data.license_key) {
                try {
                    licenseData = await deps.verifyLicense(data.license_key)
                } catch {
                    throw new Error('Licence invalide reçue du serveur')
                }
            }

            const now = new Date().toISOString()
            const levelsFromCloud: string[] = Array.isArray(data.levels) ? data.levels : (licenseData?.levels ?? [])
            const levelsJson = JSON.stringify(levelsFromCloud)

            db.prepare(`INSERT OR REPLACE INTO local_license
                (school_id, email, school_name, country, levels, subscription_status,
                 trial_end_date, subscription_end_date, license_key, last_verified_at, cached_until)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                data.id,
                username,
                data.schoolName,
                data.country ?? null,
                levelsJson,
                data.subscriptionStatus,
                licenseData?.trial_end_date ?? null,
                licenseData?.subscription_end_date ?? null,
                data.license_key ?? null,
                now,
                cachedUntil()
            )

            db.prepare(`INSERT OR REPLACE INTO local_accounts
                (school_id, school_name, email, country, levels, last_login_at, subscription_status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                data.id,
                data.schoolName,
                username,
                data.country ?? null,
                levelsJson,
                now,
                data.subscriptionStatus
            )

            // Conserve la table legacy `subscription` en cohérence (contrôles locaux historiques)
            const passwordHash = await bcrypt.hash(password, 10)
            db.prepare('INSERT OR REPLACE INTO users (id, username, password_hash, role, name) VALUES (?, ?, ?, ?, ?)')
                .run(data.id, username, passwordHash, 'SUPER_ADMIN', data.schoolName)
            db.prepare('DELETE FROM subscription').run()
            db.prepare('INSERT INTO subscription (id, status, expires_at) VALUES (?, ?, ?)')
                .run(crypto.randomUUID(), data.subscriptionStatus.toUpperCase(), data.subscriptionExpiry)

            await switchSchoolDatabase(data.id)

            db.prepare(`UPDATE school_info SET levels = ? WHERE id = 1`).run(levelsJson)

            if (data.license_key) { setSyncSession(data.id, data.license_key); triggerSyncNow() }
            setCurrentUser({ id: data.id, name: data.schoolName, username, role: 'SUPER_ADMIN', scope_levels: [] })
            logAction({ action: 'cloud_login', entityType: 'session', entityLabel: data.schoolName, schoolId: data.id })

            const licenseStatus = licenseData ? computeLicenseStatus(licenseData) : 'invalid'
            const endDate = licenseData?.subscription_end_date ?? licenseData?.trial_end_date ?? null
            const daysLeft = getDaysRemaining(endDate)

            return {
                id:             data.id,
                username,
                role:           'SUPER_ADMIN',
                name:           data.schoolName,
                isCloud:        true,
                licenseStatus,
                daysLeft,
                scopeLevels:    [],
                levels:         levelsFromCloud,
                subscription: {
                    status: data.subscriptionStatus,
                    expiry: data.subscriptionExpiry
                }
            }
        },

        // ── Get license for current school ───────────────────────────────────────
        'get-license': (schoolId: string) => {
            return db.prepare('SELECT * FROM local_license WHERE school_id = ?').get(schoolId) as any ?? null
        },

        // ── Verify license locally (no network) ─────────────────────────────────
        'check-license': async (schoolId: string) => {
            const row = db.prepare('SELECT * FROM local_license WHERE school_id = ?').get(schoolId) as any
            if (!row) {
                const sub = db.prepare('SELECT * FROM subscription ORDER BY created_at DESC LIMIT 1').get() as any
                if (!sub) return { status: 'invalid', daysLeft: -1 }
                const daysLeft = getDaysRemaining(sub.expires_at)
                return {
                    status:  daysLeft < 0 ? 'expired' : 'valid',
                    daysLeft
                }
            }

            let licenseData: LicenseData | null = null
            if (row.license_key) {
                try { licenseData = await deps.verifyLicense(row.license_key) } catch { /* tampered */ }
            }

            if (!licenseData) return { status: 'invalid', daysLeft: -1 }

            const licenseStatus = computeLicenseStatus(licenseData)
            const endDate = licenseData.subscription_end_date ?? licenseData.trial_end_date ?? null
            const daysLeft = getDaysRemaining(endDate)

            const cacheExpired = row.cached_until && new Date(row.cached_until) < new Date()

            return { status: licenseStatus, daysLeft, cacheExpired: !!cacheExpired, row }
        },

        // ── Get all accounts on this PC ──────────────────────────────────────────
        'get-accounts': () => {
            return db.prepare('SELECT * FROM local_accounts ORDER BY last_login_at DESC').all()
        },

        // ── Select/switch to a school account ───────────────────────────────────
        'select-account': async (schoolId: string) => {
            const account = db.prepare('SELECT * FROM local_accounts WHERE school_id = ?').get(schoolId) as any
            if (!account) throw new Error('Compte introuvable')

            const row = db.prepare('SELECT * FROM local_license WHERE school_id = ?').get(schoolId) as any

            let licenseData: LicenseData | null = null
            if (row?.license_key) {
                try { licenseData = await deps.verifyLicense(row.license_key) } catch { /* tampered */ }
            }

            const licenseStatus = licenseData ? computeLicenseStatus(licenseData) : 'invalid'
            const endDate = licenseData?.subscription_end_date ?? licenseData?.trial_end_date ?? null
            const daysLeft = getDaysRemaining(endDate)

            db.prepare('UPDATE local_accounts SET last_login_at = ? WHERE school_id = ?')
                .run(new Date().toISOString(), schoolId)

            await switchSchoolDatabase(schoolId)

            if (row?.license_key) { setSyncSession(schoolId, row.license_key); triggerSyncNow() }

            return {
                id:           account.school_id,
                username:     account.email,
                role:         'SUPER_ADMIN',
                name:         account.school_name,
                isCloud:      true,
                licenseStatus,
                daysLeft,
                subscription: {
                    status: account.subscription_status,
                    expiry: endDate
                }
            }
        },

        // ── Online license refresh (background check) ────────────────────────────
        'cloud-verify-license': async (schoolId: string) => {
            const row = db.prepare('SELECT * FROM local_license WHERE school_id = ?').get(schoolId) as any
            if (!row) return null

            try {
                const refreshed = await deps.refreshLicense(schoolId, row.license_key)
                if (!refreshed?.license_key) return null

                const licenseData = await deps.verifyLicense(refreshed.license_key)
                const now = new Date().toISOString()

                const refreshedLevels: string[] = Array.isArray(refreshed.levels) ? refreshed.levels : (licenseData.levels ?? [])
                const refreshedLevelsJson = JSON.stringify(refreshedLevels)

                db.prepare(`UPDATE local_license SET
                    license_key = ?, subscription_status = ?, subscription_end_date = ?,
                    trial_end_date = ?, last_verified_at = ?, cached_until = ?, levels = ?
                    WHERE school_id = ?
                `).run(
                    refreshed.license_key,
                    refreshed.subscriptionStatus,
                    licenseData.subscription_end_date,
                    licenseData.trial_end_date,
                    now,
                    cachedUntil(),
                    refreshedLevelsJson,
                    schoolId
                )

                db.prepare('UPDATE local_accounts SET subscription_status = ?, levels = ? WHERE school_id = ?')
                    .run(refreshed.subscriptionStatus, refreshedLevelsJson, schoolId)
                db.prepare('UPDATE school_info SET levels = ? WHERE id = 1').run(refreshedLevelsJson)

                return { status: computeLicenseStatus(licenseData), daysLeft: getDaysRemaining(licenseData.subscription_end_date ?? licenseData.trial_end_date) }
            } catch {
                return null // Offline — silently fail
            }
        },

        // ── Open external / payment page ─────────────────────────────────────────
        'open-payment-page': () => {
            const paymentUrl = (typeof process !== 'undefined' && process.env?.PAYMENT_URL) || 'http://localhost:3000/pricing'
            deps.openExternal(paymentUrl)
        },

        // ── Legacy handlers ──────────────────────────────────────────────────────
        'get-subscription': () => {
            return db.prepare('SELECT * FROM subscription ORDER BY created_at DESC LIMIT 1').get()
        },

        'init-school-session': async (userId: string) => {
            await switchSchoolDatabase(userId)
            const row = db.prepare('SELECT license_key FROM local_license WHERE school_id = ?').get(userId) as any
            if (row?.license_key) {
                setSyncSession(userId, row.license_key)
                triggerSyncNow()
            }
            return { success: true }
        },
    }
}
