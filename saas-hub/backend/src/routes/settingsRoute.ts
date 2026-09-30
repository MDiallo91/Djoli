import { Router } from 'express';
import Setting from '../models/settingModel';
import { requireAdminAuth } from '../middleware/adminAuth';
import { cleanupUnusedMedia } from '../services/mediaService';

const router = Router();

// Colonne `settings.data` = TEXT MySQL (65 535 octets) : au-delà, MySQL tronque
// silencieusement et le JSON devient illisible. Les images ne doivent pas y être
// stockées (voir /api/media) — on refuse explicitement plutôt que de corrompre.
const MAX_DATA_BYTES = 60_000;

// Une ligne corrompue ne doit pas faire tomber toutes les autres.
function parseData(key: string, raw: string | null): any {
    if (!raw) return null;
    try { return JSON.parse(raw); }
    catch {
        console.error(`[settings] JSON illisible pour la clé "${key}" (${raw.length} caractères) — ignorée`);
        return null;
    }
}

// GET toutes les settings → { site: { statut, data }, legal: { statut, data } }
router.get('/', async (_req, res) => {
    try {
        const rows = await Setting.findAll();
        const result: Record<string, any> = {};
        for (const row of rows) {
            result[row.key] = {
                id:     row.id,
                statut: row.statut,
                data:   parseData(row.key, row.data),
            };
        }
        res.json(result);
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET une setting par clé — retourne { statut:1, data:null } si absente (jamais 404)
router.get('/:key', async (req, res) => {
    try {
        const row = await Setting.findOne({ where: { key: req.params.key } });
        if (!row) return res.json({ statut: 1, data: null });
        res.json({
            id:     row.id,
            statut: row.statut,
            data:   parseData(row.key, row.data),
        });
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT (upsert) une setting — écriture réservée aux admins (n'importe qui
// pouvait auparavant réécrire tarifs/gateways/contact sans authentification).
router.put('/:key', requireAdminAuth, async (req, res) => {
    try {
        const { statut, data } = req.body;
        if (data !== undefined && Buffer.byteLength(JSON.stringify(data), 'utf8') > MAX_DATA_BYTES) {
            res.status(413).json({ message: 'Paramètres trop volumineux — les images doivent être uploadées (pas collées en base64).' });
            return;
        }
        const [row, created] = await Setting.findOrCreate({
            where: { key: req.params.key },
            defaults: {
                statut: statut ?? 1,
                data:   JSON.stringify(data ?? {}),
            },
        });
        const previousRaw = created ? null : row.data;
        if (!created) {
            if (statut !== undefined) row.statut = Number(statut);
            if (data   !== undefined) row.data   = JSON.stringify(data);
            await row.save();
        }
        // Images remplacées/retirées (ou uploadées puis jamais enregistrées) → supprimées.
        if (data !== undefined) await cleanupUnusedMedia(previousRaw);
        res.json({
            id:     row.id,
            key:    req.params.key,
            statut: row.statut,
            data:   parseData(row.key, row.data),
        });
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
