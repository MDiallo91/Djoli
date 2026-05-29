import { Router, Request, Response } from 'express';
import UserModel from '../models/userModel';

const router = Router();

// POST /api/seed/super-admin?secret=SEED_SECRET
// Creates the super admin account if it doesn't exist.
// Disable by removing the SEED_SECRET environment variable after first use.
router.post('/super-admin', async (req: Request, res: Response): Promise<void> => {
    const secret = process.env.SEED_SECRET;
    if (!secret || req.query.secret !== secret) {
        res.status(403).json({ message: 'Forbidden' });
        return;
    }

    const { email, password, name } = req.body;
    if (!email || !password) {
        res.status(400).json({ message: 'email et password requis' });
        return;
    }

    try {
        const existing = await UserModel.findOne({ where: { role: 'super_admin' } });
        if (existing) {
            res.status(409).json({ message: 'Un super admin existe déjà', email: existing.email });
            return;
        }

        const admin = await UserModel.create({
            schoolName: name || 'Super Admin',
            email,
            password,
            role: 'super_admin',
            approvalStatus: 'approved',
            subscriptionStatus: 'active',
            subscriptionExpiry: '2099-12-31T00:00:00.000Z',
        });

        res.status(201).json({ message: 'Super admin créé', id: admin.id, email: admin.email });
    } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(409).json({ message: 'Cet email est déjà utilisé' });
        } else {
            console.error('[seed] Error:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }
});

export default router;
