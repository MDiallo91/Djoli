import { Router } from 'express';
import Setting from '../models/settingModel';

const router = Router();

// GET toutes les settings → { site: { statut, data }, legal: { statut, data } }
router.get('/', async (_req, res) => {
    try {
        const rows = await Setting.findAll();
        const result: Record<string, any> = {};
        for (const row of rows) {
            result[row.key] = {
                id:     row.id,
                statut: row.statut,
                data:   row.data ? JSON.parse(row.data) : null,
            };
        }
        res.json(result);
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// GET une setting par clé
router.get('/:key', async (req, res) => {
    try {
        const row = await Setting.findOne({ where: { key: req.params.key } });
        if (!row) return res.status(404).json({ error: 'Not found' });
        res.json({
            id:     row.id,
            statut: row.statut,
            data:   row.data ? JSON.parse(row.data) : null,
        });
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// PUT (upsert) une setting
router.put('/:key', async (req, res) => {
    try {
        const { statut, data } = req.body;
        const [row, created] = await Setting.findOrCreate({
            where: { key: req.params.key },
            defaults: {
                statut: statut ?? 1,
                data:   JSON.stringify(data ?? {}),
            },
        });
        if (!created) {
            if (statut !== undefined) row.statut = Number(statut);
            if (data   !== undefined) row.data   = JSON.stringify(data);
            await row.save();
        }
        res.json({
            id:     row.id,
            key:    req.params.key,
            statut: row.statut,
            data:   row.data ? JSON.parse(row.data) : null,
        });
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

export default router;
