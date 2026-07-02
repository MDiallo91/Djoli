import { Router } from 'express';
import { getUploadSignature } from '../controllers/uploadController';

const router = Router();

// Pas de requireAuth : la signature est utilisée dès l'inscription (utilisateur non connecté).
// Protection : dossiers autorisés verrouillés côté backend + timestamp Cloudinary limité.
router.get('/signature', getUploadSignature);

export default router;
