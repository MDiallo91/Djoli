// Interface d'adaptateur de persistance pour la base SQLite (sql.js) — un
// exemplaire "global" (users, licence, sync_queue, ...) et un exemplaire par
// école. Le cœur de la base (shared/db/core.ts) est agnostique de la
// plateforme ; seule l'implémentation de cette interface diverge :
// - electron/db/nodeAdapter.ts : lecture/écriture de fichiers via fs
// - src/worker/db/*Adapter.ts  : IndexedDB (navigateur)
export interface DbPersistenceAdapter {
  loadGlobal(): Promise<Uint8Array | null> | Uint8Array | null
  saveGlobal(bytes: Uint8Array): Promise<void> | void
  backupCorruptedGlobal?(bytes: Uint8Array): Promise<void> | void

  loadSchool(schoolId: string): Promise<Uint8Array | null> | Uint8Array | null
  saveSchool(schoolId: string, bytes: Uint8Array): Promise<void> | void
  backupCorruptedSchool?(schoolId: string, bytes: Uint8Array): Promise<void> | void

  // Résout l'emplacement du binaire WASM de sql.js (chemin fichier côté
  // Electron, URL d'asset côté navigateur).
  locateSqlWasmFile(file: string): string
}
