// Câblage Electron : le schéma/la logique SQL vivent dans shared/db/core.ts
// (réutilisé tel quel par la cible navigateur, cf. src/worker/db.ts), seule
// la persistance disque (fs) diverge — voir electron/db/nodeAdapter.ts.
import {
  initDatabase as coreInitDatabase,
  switchSchoolDatabase,
  getCurrentSchoolId,
  default as db,
} from '../shared/db/core'
import { nodeAdapter } from './db/nodeAdapter'

export async function initDatabase() {
  return coreInitDatabase(nodeAdapter)
}

export { switchSchoolDatabase, getCurrentSchoolId }
export default db
