import { ipcMain, dialog, app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { switchSchoolDatabase, getCurrentSchoolId } from '../db'

export function registerBackupHandlers() {
    // Export (backup) current school DB to a user-chosen location
    ipcMain.handle('export-school-db', async () => {
        const schoolId = getCurrentSchoolId()
        if (!schoolId) return { success: false, error: 'Aucune école active' }

        const userDataPath = app.getPath('userData')
        const schoolDbPath = path.join(userDataPath, `school_${schoolId}.db`)

        if (!fs.existsSync(schoolDbPath)) {
            return { success: false, error: 'Base de données introuvable' }
        }

        const date = new Date().toISOString().slice(0, 10)
        const { filePath, canceled } = await dialog.showSaveDialog({
            title:       'Exporter la base de données',
            defaultPath: `sauvegarde_${date}.db`,
            filters:     [{ name: 'Base de données SQLite', extensions: ['db'] }],
        })

        if (canceled || !filePath) return { success: false, canceled: true }

        fs.copyFileSync(schoolDbPath, filePath)
        return { success: true, filePath }
    })

    // Import (restore) a DB file into the current school slot
    ipcMain.handle('import-school-db', async () => {
        const schoolId = getCurrentSchoolId()
        if (!schoolId) return { success: false, error: 'Aucune école active' }

        const { filePaths, canceled } = await dialog.showOpenDialog({
            title:      'Importer une sauvegarde',
            filters:    [{ name: 'Base de données SQLite', extensions: ['db'] }],
            properties: ['openFile'],
        })

        if (canceled || !filePaths.length) return { success: false, canceled: true }

        const filePath = filePaths[0]

        // Validate it's a SQLite file (magic bytes "SQLite format 3")
        const header = Buffer.alloc(16)
        const fd = fs.openSync(filePath, 'r')
        fs.readSync(fd, header, 0, 16, 0)
        fs.closeSync(fd)

        if (header.slice(0, 6).toString('ascii') !== 'SQLite') {
            return { success: false, error: 'Fichier invalide — ce n\'est pas une base SQLite.' }
        }

        const userDataPath = app.getPath('userData')
        const schoolDbPath = path.join(userDataPath, `school_${schoolId}.db`)

        // Backup current DB before replacing
        if (fs.existsSync(schoolDbPath)) {
            fs.copyFileSync(schoolDbPath, schoolDbPath + '.bak.' + Date.now())
        }

        fs.copyFileSync(filePath, schoolDbPath)

        // Reload the school DB in memory
        try { await switchSchoolDatabase(schoolId) } catch {}

        return { success: true }
    })
}
