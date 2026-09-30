import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import MediaSite, { MEDIA_MIME_TYPES, MEDIA_MAX_BYTES } from '../models/mediaSiteModel';
import jwt from 'jsonwebtoken';
import { requireAdminAuth } from '../middleware/adminAuth';
import { requireAuth } from '../middleware/authMiddleware';
import { validate } from '../middleware/validate';

const router = Router();

// Upload ouvert aux admins (images du site) ET aux comptes école (logo, photos
// élèves/personnel) : on aiguille selon le type du jeton (claim `type` posé au login).
function requireAdminOrSchool(req: Request, res: Response, next: NextFunction): void {
    const token = req.cookies?.jwt
        || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    const decoded = token ? jwt.decode(token) as { type?: string } | null : null;
    if (decoded?.type === 'admin') requireAdminAuth(req, res, next);
    else requireAuth(req, res, next);
}

const mediaSchema = z.object({
    name: z.string().min(1).max(255),
    type: z.enum(MEDIA_MIME_TYPES, { message: 'Image PNG, JPG, WEBP ou GIF requise' }),
    data: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Image invalide'),
});

// POST /api/media — upload d'une image (admin ou école). Body : { name, type, data (base64) }.
router.post('/', requireAdminOrSchool, validate(mediaSchema), async (req, res) => {
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
