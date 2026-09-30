import { Op } from 'sequelize';
import MediaSite from '../models/mediaSiteModel';
import Setting from '../models/settingModel';
import UserModel from '../models/userModel';

// Les images (MediaSite) sont référencées, sous forme d'URL /api/media/<id>, depuis :
//   - les réglages du site (`settings.data` : hero, cartes, logo du site…)
//   - le logo de chaque école (`users.logoUrl`)
// Une image qui n'est plus référencée nulle part est inutile et peut être supprimée.
// ⚠ Toute nouvelle colonne qui stocke une URL /api/media doit être ajoutée à
// referencedMediaIds(), sinon ses images seraient supprimées au bout d'une heure.
const MEDIA_URL_RE = /\/api\/media\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;

// Délai de grâce pour une image uploadée mais pas encore enregistrée dans un
// réglage (l'admin choisit l'image PUIS clique sur « Sauvegarder »).
const ORPHAN_GRACE_MS = 60 * 60 * 1000;

export function extractMediaIds(raw: string | null | undefined): Set<string> {
    const ids = new Set<string>();
    if (!raw) return ids;
    for (const m of raw.matchAll(MEDIA_URL_RE)) ids.add(m[1].toLowerCase());
    return ids;
}

async function referencedMediaIds(): Promise<Set<string>> {
    const referenced = new Set<string>();
    const settings = await Setting.findAll({ attributes: ['data'], raw: true }) as { data: string | null }[];
    for (const r of settings) for (const id of extractMediaIds(r.data)) referenced.add(id);
    const logos = await UserModel.findAll({
        attributes: ['logoUrl'], where: { logoUrl: { [Op.like]: '%/api/media/%' } }, raw: true,
        paranoid: false, // écoles archivées incluses : restaurables, leur logo doit survivre
    }) as { logoUrl: string | null }[];
    for (const u of logos) for (const id of extractMediaIds(u.logoUrl)) referenced.add(id);
    return referenced;
}

/**
 * À appeler après l'enregistrement d'un réglage ou d'un logo d'école : supprime les images
 * - qui étaient dans l'ancienne valeur (réglage ou logo) et n'y sont plus (remplacées/retirées),
 * - ou uploadées il y a plus d'une heure sans jamais avoir été enregistrées,
 * à condition qu'aucun réglage ne les référence encore.
 * Best-effort : une erreur ici ne doit jamais faire échouer la sauvegarde.
 */
export async function cleanupUnusedMedia(previousRaw: string | null): Promise<number> {
    try {
        const referenced = await referencedMediaIds();

        const replaced = [...extractMediaIds(previousRaw)].filter(id => !referenced.has(id));
        const staleOrphans = await MediaSite.findAll({
            attributes: ['id'],
            where: {
                createdAt: { [Op.lt]: new Date(Date.now() - ORPHAN_GRACE_MS) },
                ...(referenced.size ? { id: { [Op.notIn]: [...referenced] } } : {}),
            },
            raw: true,
        }) as { id: string }[];

        const toDelete = [...new Set([...replaced, ...staleOrphans.map(m => m.id)])];
        if (!toDelete.length) return 0;
        return await MediaSite.destroy({ where: { id: toDelete } });
    } catch (err) {
        console.error('[media] nettoyage des images inutilisées échoué :', err);
        return 0;
    }
}
