import { Router } from 'express';
import { activateSubscription, checkSubscription } from '../controllers/subscriptionController';

const router = Router();

router.post('/activate', activateSubscription);
router.get('/check', checkSubscription);

export default router;
