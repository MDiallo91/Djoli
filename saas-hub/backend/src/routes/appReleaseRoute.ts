import express, { Router, Request, Response } from 'express';
import { createHash } from 'crypto';
import { Op } from 'sequelize';
import { z } from 'zod';
import VersionApplication, { FragmentVersion, APP_CHUNK_BYTES, APP_MAX_BYTES } from '../models/versionApplicationModel';
import { requireAdminAuth } from '../middleware/adminAuth';
import { validate } from '../middleware/validate';

// Installateur desktop stocké en base, par morceaux (voir versionApplicationModel.ts).
//
// Publication (admin), en 3 temps pour supporter ~100 Mo avec des requêtes courtes :
//   POST   /api/app-releases                    { version, filename, size, sha256, notes? } → { id, chunkSize, chunkCount }
//   PUT    /api/app-releases/:id/chunks/:idx    corps binaire (application/octet-stream), idempotent → réessayable
//   POST   /api/app-releases/:id/complete       vérifie morceaux + SHA-256, publie, supprime l'ancienne version
//   DELETE /api/app-releases/:id                annule un upload / retire la version publiée
// Public :
//   GET    /api/app-releases/latest             métadonnées de la version publiée (404 si aucune)
//   GET    /api/app-releases/latest/download    fichier .exe, envoyé morceau par morceau (pas tout en mémoire)

const router = Router();

const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000; // upload abandonné → nettoyé au bout de 24 h

const publicMeta = (r: VersionApplication) => ({
    id: r.id, version: r.version, filename: r.filename, size: Number(r.size), sha256: r.sha256,
    notes: r.notes, publishedAt: r.updatedAt, url: '/api/app-releases/latest/download',
});

async function deleteReleases(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await FragmentVersion.destroy({ where: { release_id: ids } });
    await VersionApplication.destroy({ where: { id: ids } });
}

const latestReady = () => VersionApplication.findOne({ where: { status: 'ready' }, order: [['updatedAt', 'DESC']] });

// ── Public ────────────────────────────────────────────────────────────────
router.get('/latest', async (_req, res) => {
    try {
        const r = await latestReady();
        if (!r) { res.status(404).json({ message: 'Aucune version publiée' }); return; }
        res.json(publicMeta(r));
    } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

router.get('/latest/download', async (req: Request, res: Response) => {
    try {
        const r = await latestReady();
        if (!r) { res.status(404).json({ message: 'Aucune version publiée' }); return; }
        res.set({
            'Content-Type':           'application/octet-stream',
            'Content-Length':         String(r.size),
            'Content-Disposition':    `attachment; filename="${r.filename.replace(/[^\w.\- ]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(r.filename)}`,
            'Cache-Control':          'no-cache',
            'X-Content-Type-Options': 'nosniff',
            'X-Checksum-SHA256':      r.sha256,
        });
        let aborted = false;
        req.on('close', () => { if (!res.writableEnded) aborted = true; });
        // Un morceau à la fois depuis la base, en respectant la contre-pression du client.
        for (let idx = 0; idx < r.chunk_count && !aborted; idx++) {
            const chunk = await FragmentVersion.findOne({ where: { release_id: r.id, idx }, attributes: ['data'] });
            if (!chunk) throw new Error(`Morceau ${idx} manquant pour la version ${r.id}`);
            if (!res.write(chunk.data)) await new Promise(resolve => res.once('drain', resolve));
        }
        res.end();
    } catch (err) {
        console.error('[app-releases] download error:', err);
        if (!res.headersSent) res.status(500).json({ message: 'Erreur serveur' });
        else res.destroy();
    }
});

// ── Admin ─────────────────────────────────────────────────────────────────
router.get('/', requireAdminAuth, async (_req, res) => {
    try {
        const rows = await VersionApplication.findAll({ order: [['createdAt', 'DESC']] });
        res.json(rows.map(r => ({ ...publicMeta(r), status: r.status, chunkCount: r.chunk_count, createdAt: r.createdAt })));
    } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

const initSchema = z.object({
    version:  z.string().trim().min(1, 'Version requise').max(32),
    filename: z.string().trim().min(1).max(255).regex(/\.exe$/i, 'Le fichier doit être un installateur .exe'),
    size:     z.number().int().positive().max(APP_MAX_BYTES, 'Fichier trop volumineux (1 Go maximum)'),
    sha256:   z.string().regex(/^[a-f0-9]{64}$/, 'Empreinte SHA-256 invalide'),
    notes:    z.string().max(2000).optional(),
});

router.post('/', requireAdminAuth, validate(initSchema), async (req, res) => {
    try {
        // Uploads abandonnés depuis plus de 24 h
        const stale = await VersionApplication.findAll({
            where: { status: 'uploading', createdAt: { [Op.lt]: new Date(Date.now() - STALE_UPLOAD_MS) } },
            attributes: ['id'], raw: true,
        }) as { id: string }[];
        await deleteReleases(stale.map(s => s.id));

        const { version, filename, size, sha256, notes } = req.body;
        const release = await VersionApplication.create({
            version, filename, size, sha256, notes: notes || null,
            chunk_count: Math.ceil(size / APP_CHUNK_BYTES), status: 'uploading',
        });
        res.status(201).json({ id: release.id, chunkSize: APP_CHUNK_BYTES, chunkCount: release.chunk_count });
    } catch (err) {
        console.error('[app-releases] init error:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.put('/:id/chunks/:idx', requireAdminAuth,
    express.raw({ type: 'application/octet-stream', limit: APP_CHUNK_BYTES + 1024 }),
    async (req: Request, res: Response) => {
        try {
            const release = await VersionApplication.findByPk(req.params.id as string);
            if (!release || release.status !== 'uploading') { res.status(404).json({ message: 'Upload introuvable ou déjà terminé' }); return; }
            const idx = Number(req.params.idx);
            if (!Number.isInteger(idx) || idx < 0 || idx >= release.chunk_count) { res.status(400).json({ message: 'Numéro de morceau invalide' }); return; }
            const expected = idx === release.chunk_count - 1 ? Number(release.size) - idx * APP_CHUNK_BYTES : APP_CHUNK_BYTES;
            const body = req.body as Buffer;
            if (!Buffer.isBuffer(body) || body.length !== expected) {
                res.status(400).json({ message: `Taille du morceau ${idx} incorrecte (${Buffer.isBuffer(body) ? body.length : 0} au lieu de ${expected})` });
                return;
            }
            await FragmentVersion.upsert({ release_id: release.id, idx, data: body });
            res.status(204).end();
        } catch (err) {
            console.error('[app-releases] chunk error:', err);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    });

router.post('/:id/complete', requireAdminAuth, async (req, res) => {
    try {
        const release = await VersionApplication.findByPk(req.params.id as string);
        if (!release || release.status !== 'uploading') { res.status(404).json({ message: 'Upload introuvable ou déjà terminé' }); return; }

        const received = await FragmentVersion.count({ where: { release_id: release.id } });
        if (received !== release.chunk_count) {
            res.status(400).json({ message: `Upload incomplet : ${received}/${release.chunk_count} morceaux reçus` });
            return;
        }
        // Intégrité : on relit tout depuis la base et on compare l'empreinte calculée par le navigateur.
        const hash = createHash('sha256');
        for (let idx = 0; idx < release.chunk_count; idx++) {
            const chunk = await FragmentVersion.findOne({ where: { release_id: release.id, idx }, attributes: ['data'] });
            if (!chunk) { res.status(400).json({ message: `Morceau ${idx} manquant` }); return; }
            hash.update(chunk.data);
        }
        if (hash.digest('hex') !== release.sha256) {
            await deleteReleases([release.id]);
            res.status(422).json({ message: 'Fichier corrompu pendant l’envoi (empreinte différente) — recommencez l’upload.' });
            return;
        }

        release.status = 'ready';
        await release.save();
        // Une seule version conservée : les autres (anciennes versions, uploads en cours) sont supprimées.
        const others = await VersionApplication.findAll({ where: { id: { [Op.ne]: release.id } }, attributes: ['id'], raw: true }) as { id: string }[];
        await deleteReleases(others.map(o => o.id));

        res.json(publicMeta(release));
    } catch (err) {
        console.error('[app-releases] complete error:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

router.delete('/:id', requireAdminAuth, async (req, res) => {
    try {
        await deleteReleases([req.params.id as string]);
        res.status(204).end();
    } catch { res.status(500).json({ message: 'Erreur serveur' }); }
});

export default router;
