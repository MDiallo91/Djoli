import { app, BrowserWindow, nativeImage, shell, ipcMain } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initDatabase } from './db'
import { registerStudentHandlers } from './services/studentService'
import { registerFinanceHandlers } from './services/financeService'
import { registerGradeHandlers } from './services/gradeService'
import { registerStaffHandlers } from './services/staffService'
import { registerAttendanceHandlers } from './services/attendanceService'
import { registerSchoolHandlers } from './services/schoolService'
import { registerAuthHandlers } from './services/authService'
import { registerSyncHandlers, startSyncLoop } from './services/syncService'
import { registerUserHandlers } from './services/userService'
import { registerAuditHandlers } from './services/auditService'
import { registerBackupHandlers } from './services/backupService'

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
    registerUserHandlers()
    registerAuditHandlers()
    registerStudentHandlers()
    registerFinanceHandlers()
    registerGradeHandlers()
    registerStaffHandlers()
    registerAttendanceHandlers()
    registerSchoolHandlers()
    registerBackupHandlers()

    // Ouvre la page de renouvellement d'abonnement dans le navigateur par défaut
    ipcMain.handle('open-payment-page', () => {
        const url = process.env.PORTAL_URL || 'https://djoli-edu-git-main-mamadou-diallos-projects-d590c316.vercel.app'
        shell.openExternal(url)
    })

    createWindow()

    // Register sync handlers and start loop on the window just created
    if (win) {
        registerSyncHandlers(win)
        startSyncLoop(win)
    }
})
