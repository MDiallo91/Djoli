import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getUploadSignature } from '../controllers/uploadController';

const router = Router();

router.get('/signature', requireAuth, getUploadSignature);

export default router;
