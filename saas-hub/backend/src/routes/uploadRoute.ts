import { Router } from 'express';
import { getUploadSignature } from '../controllers/uploadController';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();

// Pas de requireAuth : la signature est utilisée dès l'inscription (utilisateur non connecté).
// Protection : dossiers autorisés verrouillés côté backend + timestamp Cloudinary limité +
// rate limit par IP (20/min) pour freiner l'abus en boucle sans casser le flux d'inscription.
router.get('/signature', rateLimit({ windowMs: 60_000, max: 20 }), getUploadSignature);

export default router;
