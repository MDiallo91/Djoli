// Câblage Electron du moteur de sync partagé (shared/services/syncServiceCore.ts).
// L'émission d'événements UI se fait via webContents.send — le pendant
// navigateur (src/worker/services/syncAdapter.ts) utilise postMessage.
import { ipcMain, BrowserWindow } from 'electron'
import {
    setNotify,
    syncCycle,
    triggerSyncNow as coreTriggerSyncNow,
    checkThresholdSync as coreCheckThresholdSync,
    startupSync as coreStartupSync,
    syncOnQuit as coreSyncOnQuit,
    getSyncStatus,
    resolveConflict,
    forceFullSync,
} from '../../shared/services/syncServiceCore'

let win: BrowserWindow | null = null

setNotify((channel, payload) => {
    win?.webContents.send(channel, payload)
})

export function triggerSyncNow(): void {
    coreTriggerSyncNow()
}

export function checkThresholdSync(): void {
    coreCheckThresholdSync()
}

/** Sync de démarrage : pull immédiat au lancement de l'app. */
export function startupSync(mainWin: BrowserWindow): void {
    win = mainWin
    coreStartupSync()
}

/** Sync bloquant à la fermeture, avec timeout de 8s pour ne pas bloquer le quit. */
export async function syncOnQuit(): Promise<void> {
    await coreSyncOnQuit()
}

export function registerSyncHandlers(mainWin: BrowserWindow): void {
    win = mainWin

    ipcMain.removeHandler('sync-now')
    ipcMain.handle('sync-now', async () => {
        await syncCycle()
        return { success: true }
    })

    ipcMain.removeHandler('get-sync-status')
    ipcMain.handle('get-sync-status', () => getSyncStatus())

    ipcMain.removeHandler('resolve-conflict')
    ipcMain.handle('resolve-conflict', (_event, data: {
        conflict_id: string
        choice:      'local' | 'remote'
        entity_type?: string
        entity_id?:   string
        remote_data?: any
    }) => resolveConflict(data))

    ipcMain.removeHandler('force-full-sync')
    ipcMain.handle('force-full-sync', async () => forceFullSync())
}
