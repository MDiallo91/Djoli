import { ipcMain } from 'electron'

// Enregistre une map de handlers partagés (shared/services/*.ts) comme
// canaux IPC classiques.
export function registerHandlers(handlers: Record<string, (...args: any[]) => any>): void {
    for (const [channel, fn] of Object.entries(handlers)) {
        ipcMain.removeHandler(channel)
        ipcMain.handle(channel, (_event, ...args: any[]) => fn(...args))
    }
}
