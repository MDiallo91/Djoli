import { ipcMain, shell } from 'electron'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import db, { switchSchoolDatabase } from '../db'
import { verifyLicense, computeLicenseStatus, getDaysRemaining, LicenseData } from '../licenseVerifier'
import { setSyncSession } from '../syncState'
import { triggerSyncNow } from './syncService'
import { setCurrentUser } from '../currentSession'
import { logAction } from '../auditLogger'

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000 // 24h

function cachedUntil(): string {
    return new Date(Date.now() + CACHE_DURATION_MS).toISOString()
}

export function registerAuthHandlers() {

    // ── Local login (admin ou sous-utilisateur école) ────────────────────────
    ipcMain.handle('login', async (_event, credentials: { username: string, password: string }) => {
        const { username, password } = credentials
        if (!username || !password) throw new Error('Identifiants requis')

        // 1. Chercher d'abord dans les sous-utilisateurs école (email, username ou téléphone)
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

        // 2. Fallback : compte admin local (username, email ou téléphone)
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
    })

    // ── Changement de mot de passe (premier login) ───────────────────────────
    ipcMain.handle('change-password', async (_event, data: { userId: string; newPassword: string }) => {
        const { userId, newPassword } = data
        if (!newPassword || newPassword.length < 6) throw new Error('Mot de passe trop court (min 6 caractères)')
        const hash = await bcrypt.hash(newPassword, 10)
        db.prepare(`UPDATE school_users SET password_hash = ?, must_change_pwd = 0, updated_at = ? WHERE id = ?`)
            .run(hash, new Date().toISOString(), userId)
        return { success: true }
    })

    // ── Cloud activation / login ─────────────────────────────────────────────
    ipcMain.handle('cloud-activate', async (_event, credentials: { username: string, password: string }) => {
        const { username, password } = credentials

        const apiUrl = process.env.SAAS_API_URL || 'https://djoli.vercel.app'
        const response = await fetch(`${apiUrl}/api/user/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password })
        })

        const data: any = await response.json()
        if (!response.ok) throw new Error(data.message || 'Identifiants cloud incorrects')

        // Verify the license JWT locally before trusting it
        let licenseData: LicenseData | null = null
        if (data.license_key) {
            try {
                licenseData = verifyLicense(data.license_key)
            } catch {
                throw new Error('Licence invalide reçue du serveur')
            }
        }

        const now = new Date().toISOString()

        const levelsFromCloud: string[] = Array.isArray(data.levels) ? data.levels
            : (licenseData?.levels ?? [])
        const levelsJson = JSON.stringify(levelsFromCloud)

        // Persist licence
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

        // Persist account entry (for account selector screen)
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

        // Keep legacy subscription table in sync (backward compat for local checks)
        const passwordHash = await bcrypt.hash(password, 10)
        db.prepare('INSERT OR REPLACE INTO users (id, username, password_hash, role, name) VALUES (?, ?, ?, ?, ?)')
            .run(data.id, username, passwordHash, 'SUPER_ADMIN', data.schoolName)
        db.prepare('DELETE FROM subscription').run()
        db.prepare('INSERT INTO subscription (id, status, expires_at) VALUES (?, ?, ?)')
            .run(crypto.randomUUID(), data.subscriptionStatus.toUpperCase(), data.subscriptionExpiry)

        await switchSchoolDatabase(data.id)

        // Propagate levels to school_info so desktop can read them without cloud
        db.prepare(`UPDATE school_info SET levels = ? WHERE id = 1`).run(levelsJson)

        // Start background sync for this school
        if (data.license_key) { setSyncSession(data.id, data.license_key); triggerSyncNow(); }
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
    })

    // ── Get license for current school ───────────────────────────────────────
    ipcMain.handle('get-license', (_event, schoolId: string) => {
        return db.prepare('SELECT * FROM local_license WHERE school_id = ?').get(schoolId) as any ?? null
    })

    // ── Verify license locally (no network) ─────────────────────────────────
    ipcMain.handle('check-license', (_event, schoolId: string) => {
        const row = db.prepare('SELECT * FROM local_license WHERE school_id = ?').get(schoolId) as any
        if (!row) {
            // Fall back to legacy subscription table
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
            try { licenseData = verifyLicense(row.license_key) } catch { /* tampered */ }
        }

        if (!licenseData) return { status: 'invalid', daysLeft: -1 }

        const licenseStatus = computeLicenseStatus(licenseData)
        const endDate = licenseData.subscription_end_date ?? licenseData.trial_end_date ?? null
        const daysLeft = getDaysRemaining(endDate)

        // Offline grace: if cache expired but subscription not expired, allow with warning
        const cacheExpired = row.cached_until && new Date(row.cached_until) < new Date()

        return { status: licenseStatus, daysLeft, cacheExpired: !!cacheExpired, row }
    })

    // ── Get all accounts on this PC ──────────────────────────────────────────
    ipcMain.handle('get-accounts', () => {
        return db.prepare('SELECT * FROM local_accounts ORDER BY last_login_at DESC').all()
    })

    // ── Select/switch to a school account ───────────────────────────────────
    ipcMain.handle('select-account', async (_event, schoolId: string) => {
        const account = db.prepare('SELECT * FROM local_accounts WHERE school_id = ?').get(schoolId) as any
        if (!account) throw new Error('Compte introuvable')

        const licenseCheck: any = await ipcMain.emit('check-license', null, schoolId)
        // check-license is synchronous so we call it directly
        const row = db.prepare('SELECT * FROM local_license WHERE school_id = ?').get(schoolId) as any

        let licenseData: LicenseData | null = null
        if (row?.license_key) {
            try { licenseData = verifyLicense(row.license_key) } catch { /* tampered */ }
        }

        const licenseStatus = licenseData ? computeLicenseStatus(licenseData) : 'invalid'
        const endDate = licenseData?.subscription_end_date ?? licenseData?.trial_end_date ?? null
        const daysLeft = getDaysRemaining(endDate)

        // Update last_login_at
        db.prepare('UPDATE local_accounts SET last_login_at = ? WHERE school_id = ?')
            .run(new Date().toISOString(), schoolId)

        await switchSchoolDatabase(schoolId)

        // Resume sync session for this school
        if (row?.license_key) { setSyncSession(schoolId, row.license_key); triggerSyncNow(); }

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
    })

    // ── Online license refresh (background check) ────────────────────────────
    ipcMain.handle('cloud-verify-license', async (_event, schoolId: string) => {
        const row = db.prepare('SELECT * FROM local_license WHERE school_id = ?').get(schoolId) as any
        if (!row) return null

        const apiUrl = process.env.SAAS_API_URL || 'https://djoli.vercel.app'
        try {
            const response = await fetch(`${apiUrl}/api/license/refresh-by-key`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${row.license_key}` },
            })
            if (!response.ok) return null

            const data: any = await response.json()
            if (!data.license_key) return null

            const licenseData = verifyLicense(data.license_key)
            const now = new Date().toISOString()

            const refreshedLevels: string[] = Array.isArray(data.levels) ? data.levels : (licenseData.levels ?? [])
            const refreshedLevelsJson = JSON.stringify(refreshedLevels)

            db.prepare(`UPDATE local_license SET
                license_key = ?, subscription_status = ?, subscription_end_date = ?,
                trial_end_date = ?, last_verified_at = ?, cached_until = ?, levels = ?
                WHERE school_id = ?
            `).run(
                data.license_key,
                data.subscriptionStatus,
                licenseData.subscription_end_date,
                licenseData.trial_end_date,
                now,
                cachedUntil(),
                refreshedLevelsJson,
                schoolId
            )

            db.prepare('UPDATE local_accounts SET subscription_status = ?, levels = ? WHERE school_id = ?')
                .run(data.subscriptionStatus, refreshedLevelsJson, schoolId)
            db.prepare('UPDATE school_info SET levels = ? WHERE id = 1').run(refreshedLevelsJson)

            return { status: computeLicenseStatus(licenseData), daysLeft: getDaysRemaining(licenseData.subscription_end_date ?? licenseData.trial_end_date) }
        } catch {
            return null // Offline — silently fail
        }
    })

    // ── Open payment page in browser ─────────────────────────────────────────
    ipcMain.handle('open-payment-page', () => {
        const paymentUrl = process.env.PAYMENT_URL || 'http://localhost:3000/pricing'
        shell.openExternal(paymentUrl)
    })

    // ── Legacy handlers ──────────────────────────────────────────────────────
    ipcMain.handle('get-subscription', () => {
        return db.prepare('SELECT * FROM subscription ORDER BY created_at DESC LIMIT 1').get()
    })

    ipcMain.handle('init-school-session', async (_event, userId: string) => {
        await switchSchoolDatabase(userId)
        // Reprendre la session sync si une licence cloud existe
        const row = db.prepare('SELECT license_key FROM local_license WHERE school_id = ?').get(userId) as any
        if (row?.license_key) {
            setSyncSession(userId, row.license_key)
            triggerSyncNow()
        }
        return { success: true }
    })
}
