import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { DbPersistenceAdapter } from '../../shared/db/types'

const userDataPath = app.getPath('userData')
const globalDbPath = path.join(userDataPath, 'global.db')
const schoolDbPath = (schoolId: string) => path.join(userDataPath, `school_${schoolId}.db`)

export const nodeAdapter: DbPersistenceAdapter = {
  loadGlobal() {
    if (!fs.existsSync(globalDbPath)) return null
    return new Uint8Array(fs.readFileSync(globalDbPath))
  },
  saveGlobal(bytes) {
    fs.writeFileSync(globalDbPath, Buffer.from(bytes))
  },
  backupCorruptedGlobal(bytes) {
    fs.writeFileSync(globalDbPath + '.corrupted.' + Date.now(), Buffer.from(bytes))
  },

  loadSchool(schoolId) {
    const p = schoolDbPath(schoolId)
    if (!fs.existsSync(p)) return null
    return new Uint8Array(fs.readFileSync(p))
  },
  saveSchool(schoolId, bytes) {
    fs.writeFileSync(schoolDbPath(schoolId), Buffer.from(bytes))
  },
  backupCorruptedSchool(schoolId, bytes) {
    fs.writeFileSync(schoolDbPath(schoolId) + '.corrupted.' + Date.now(), Buffer.from(bytes))
  },

  locateSqlWasmFile(file) {
    // app.getAppPath() est le dossier du projet (package.json) en dev comme en asar
    // packagé — plus fiable qu'un chemin relatif à import.meta.url, qui dépend de la
    // profondeur du bundle produit par vite-plugin-electron (dist-electron/main.js
    // est un fichier unique, pas un miroir de l'arborescence electron/db/).
    return path.join(app.getAppPath(), 'node_modules', 'sql.js', 'dist', file)
  },
}
