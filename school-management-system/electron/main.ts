import { app, BrowserWindow, nativeImage, shell, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDatabase } from './db'
import { registerHandlers } from './ipcAdapter'
import { studentHandlers } from '../shared/services/studentService'
import { financeHandlers } from '../shared/services/financeService'
import { gradeHandlers } from '../shared/services/gradeService'
import { staffHandlers } from '../shared/services/staffService'
import { attendanceHandlers } from '../shared/services/attendanceService'
import { createSchoolHandlers } from '../shared/services/schoolService'
import { userHandlers } from '../shared/services/userService'
import { auditHandlers } from '../shared/services/auditService'
import { setThresholdCallback } from '../shared/syncTracker'
import { registerAuthHandlers, apiUrl, refreshLicenseByKey } from './services/authService'
import { registerSyncHandlers, startupSync, syncOnQuit, checkThresholdSync } from './services/syncService'
import { registerBackupHandlers } from './services/backupService'

setThresholdCallback(checkThresholdSync)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null

process.on('unhandledRejection', (reason) => {
    console.error('[Main] Unhandled rejection:', reason)
})
process.on('uncaughtException', (error) => {
    console.error('[Main] Uncaught exception:', error)
})

function createWindow() {
    win = new BrowserWindow({
        title: 'DJOLI',
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 700,
        icon: nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC || '', 'logo.png')),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
        titleBarStyle: 'hidden',
        titleBarOverlay: {
            color: '#ffffff',
            symbolColor: '#1f2937',
            height: 32
        }
    })

    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', new Date().toLocaleString())
    })

    // Retry loading if the Chromium network service crashes mid-load
    win.webContents.on('did-fail-load', (_event, errorCode) => {
        // -2 (FAILED), -100 (CONNECTION_CLOSED), -106 (INTERNET_DISCONNECTED)
        // -3 (ABORTED) is normal (navigations), skip it
        if (errorCode === -3) return;
        setTimeout(() => {
            if (VITE_DEV_SERVER_URL) {
                win?.loadURL(VITE_DEV_SERVER_URL);
            } else {
                win?.loadFile(path.join(RENDERER_DIST, 'index.html'));
            }
        }, 1500);
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        win.loadFile(path.join(RENDERER_DIST, 'index.html'))
    }
}

let isQuitting = false
app.on('before-quit', (event) => {
    if (isQuitting) return
    event.preventDefault()
    isQuitting = true
    syncOnQuit().finally(() => app.quit())
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.whenReady().then(async () => {
    try {
        await initDatabase()
        console.log('[Main] Database initialized')
    } catch (error) {
        console.error('[Main] FATAL: Database init failed:', error)
        app.quit()
        return
    }

    // Enregistrement de tous les handlers IPC
    registerAuthHandlers()
    registerHandlers(userHandlers)
    registerHandlers(auditHandlers)
    registerHandlers(studentHandlers)
    registerHandlers(financeHandlers)
    registerHandlers(gradeHandlers)
    registerHandlers(staffHandlers)
    registerHandlers(attendanceHandlers)
    registerHandlers(createSchoolHandlers({
        reinitDatabase: initDatabase,
        requestLevels: async (levels, accessToken) => {
            const response = await fetch(`${apiUrl()}/api/school/levels`, {
                method:  'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
                body:    JSON.stringify({ levels }),
            })
            const data: any = await response.json()
            if (!response.ok) throw new Error(data.message || data.error || 'Erreur lors de la demande de changement de cycles')
            return { levels: data.levels ?? [], pendingLevels: data.pendingLevels ?? [] }
        },
        refreshAccessToken: async (licenseKey) => {
            const refreshed = await refreshLicenseByKey(licenseKey)
            return refreshed
                ? { access_token: refreshed.access_token ?? null, levels: refreshed.levels ?? [], pendingLevels: refreshed.pendingLevels ?? [] }
                : null
        },
    }))
    registerBackupHandlers()

    // Ouvre la page de renouvellement d'abonnement dans le navigateur par défaut
    ipcMain.removeHandler('open-payment-page')
    ipcMain.handle('open-payment-page', () => {
        const url = process.env.PORTAL_URL || 'https://djoli-edu.vercel.app'
        shell.openExternal(url)
    })

    createWindow()

    // Register sync handlers and trigger startup pull
    if (win) {
        registerSyncHandlers(win)
        startupSync(win)
    }
})
