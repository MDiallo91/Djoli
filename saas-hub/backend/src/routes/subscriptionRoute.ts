import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
    activateSubscription,
    checkSubscription,
    getSubscriptionInfo,
    initiatePayment,
    webhookPayment,
    getPaymentHistory,
} from '../controllers/subscriptionController';

const router = Router();

// ── Routes admin (existantes) ──────────────────────────────
router.post('/activate', activateSubscription);
router.get('/check',     checkSubscription);

// ── Routes école (authentifiées) ──────────────────────────
router.get('/info',             requireAuth, getSubscriptionInfo);
router.post('/payment/initiate', requireAuth, initiatePayment);
router.get('/payment/history',   requireAuth, getPaymentHistory);

// ── Webhook gateway (non authentifié — appelé par le gateway externe) ──
router.post('/payment/webhook/:gateway', webhookPayment);

export default router;
