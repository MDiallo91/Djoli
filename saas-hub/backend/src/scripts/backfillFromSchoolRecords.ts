// Peuple les tables typées (voir sync/entityRegistry.ts) à partir des lignes
// déjà présentes dans `school_records`.
//
// Pourquoi : la réorganisation du backend fait lire l'API web depuis les
// tables typées plutôt que de scanner school_records. Sans ce backfill, une
// école qui utilisait déjà le produit verrait ses listes vides tant qu'elle
// n'a pas fait un nouveau push desktop (qui, lui, alimente déjà le miroir —
// voir syncController.pushChanges). Ce script comble l'écart une bonne fois.
//
// Idempotent — se relance sans risque (upsert par (school_id, entity_type, entity_id)
// via chaque modèle typé). N'affecte jamais `school_records`, qui reste la
// source de vérité du sync desktop.
//
// Usage : npx ts-node src/scripts/backfillFromSchoolRecords.ts
import { DBconnect } from '../config/db';
import sequelize from '../config/db';
import SchoolRecord from '../models/schoolRecordModel';
import { getRegistryEntry } from '../sync/entityRegistry';

async function run(): Promise<void> {
    await DBconnect();

    const rows = await SchoolRecord.findAll({ where: { deleted_at: null } });
    console.log(`[backfill] ${rows.length} enregistrement(s) non supprimé(s) à traiter`);

    let migrated = 0, skippedNoEntry = 0, skippedNoData = 0, failed = 0;

    for (const row of rows) {
        const entry = getRegistryEntry(row.entity_type);
        if (!entry) { skippedNoEntry++; continue; }
        if (!row.data) { skippedNoData++; continue; }

        let payload: any;
        try { payload = JSON.parse(row.data); } catch { failed++; continue; }

        try {
            await entry.model.upsert({
                id: row.entity_id,
                school_id: row.school_id,
                device_id: row.device_id ?? null,
                deleted_at: null,
                ...entry.mapPayload(payload),
            });
            migrated++;
        } catch (err) {
            console.error(`[backfill] échec ${row.entity_type}/${row.entity_id}:`, err);
            failed++;
        }
    }

    console.log(
        `[backfill] terminé — migrés: ${migrated}, sans entrée registre: ${skippedNoEntry}, ` +
        `sans data (soft-delete): ${skippedNoData}, échecs: ${failed}`,
    );
    await sequelize.close();
    // db.ts démarre un setInterval de keepalive (pensé pour le serveur Express
    // long-running) qui garde sinon le process en vie indéfiniment ici.
    process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
    console.error('[backfill] erreur fatale:', err);
    process.exit(1);
});
