import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { fileURLToPath } from 'node:url'
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
    const currentPath = path.dirname(fileURLToPath(import.meta.url))
    return path.join(currentPath, '..', '..', 'node_modules', 'sql.js', 'dist', file)
  },
}
