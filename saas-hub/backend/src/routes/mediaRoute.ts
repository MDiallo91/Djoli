import { Router } from 'express';
import { z } from 'zod';
import MediaSite, { MEDIA_MIME_TYPES, MEDIA_MAX_BYTES } from '../models/mediaSiteModel';
import { requireAdminAuth } from '../middleware/adminAuth';
import { validate } from '../middleware/validate';

const router = Router();

const mediaSchema = z.object({
    name: z.string().min(1).max(255),
    type: z.enum(MEDIA_MIME_TYPES, { message: 'Image PNG, JPG, WEBP ou GIF requise' }),
    data: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Image invalide'),
});

// POST /api/media — upload d'une image du site (admin). Body : { name, type, data (base64) }.
router.post('/', requireAdminAuth, validate(mediaSchema), async (req, res) => {
    try {
        const { name, type, data } = req.body;
        const content = Buffer.from(data, 'base64');
        if (content.length > MEDIA_MAX_BYTES) {
            res.status(413).json({ message: 'Image trop volumineuse (3 Mo maximum)' });
            return;
        }
        const media = await MediaSite.create({ filename: name, mime_type: type, size: content.length, content });
        res.status(201).json({ id: media.id, url: `/api/media/${media.id}` });
    } catch (err) {
        console.error('[media] upload error:', err);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/media/:id — public (images de la page d'accueil). Contenu immuable
// pour un id donné → cache navigateur/CDN longue durée.
router.get('/:id', async (req, res) => {
    try {
        const media = await MediaSite.findByPk(req.params.id);
        if (!media) { res.status(404).json({ message: 'Image introuvable' }); return; }
        res.set({
            'Content-Type':           media.mime_type,
            'Content-Length':         String(media.size),
            'Cache-Control':          'public, max-age=31536000, immutable',
            'X-Content-Type-Options': 'nosniff',
        });
        res.send(media.content);
    } catch {
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

export default router;
