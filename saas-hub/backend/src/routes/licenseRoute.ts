import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireLicenseBearer } from '../middleware/licenseBearerAuth';
import { generateLicenseKey } from '../services/licenseService';
import UserModel from '../models/userModel';

const router = Router();

// Refresh license key — called by the web frontend (cookie session)
router.post('/refresh', requireAuth, (req, res) => {
    try {
        const user = req.user;
        const license_key = generateLicenseKey(user);
        let levels: string[] = [];
        try { levels = JSON.parse(user.levels || '[]'); } catch {}
        res.status(200).json({
            license_key,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionExpiry: user.subscriptionExpiry,
            levels,
        });
    } catch (error) {
        console.error('[licenseRoute /refresh]', error);
        res.status(500).json({ message: 'Impossible de rafraîchir la licence' });
    }
});

// Refresh license key — called by the desktop app using Bearer license key
router.post('/refresh-by-key', requireLicenseBearer, async (req, res) => {
    try {
        const schoolId = req.licenseData!.school_id;
        const user = await UserModel.findByPk(schoolId);
        if (!user) { res.status(404).json({ message: 'École introuvable' }); return; }
        const license_key = generateLicenseKey(user);
        let levels: string[] = [];
        try { levels = JSON.parse(user.levels || '[]'); } catch {}
        res.status(200).json({
            license_key,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionExpiry: user.subscriptionExpiry,
            levels,
        });
    } catch (error) {
        console.error('[licenseRoute /refresh-by-key]', error);
        res.status(500).json({ message: 'Impossible de rafraîchir la licence' });
    }
});

export default router;
