import { Router, Request, Response } from 'express';
import UserModel from '../models/userModel';
import Administrateur from '../models/administrateurModel';

const router = Router();

// POST /api/seed/super-admin?secret=SEED_SECRET
// Crée le compte super admin (table `admins`) s'il n'existe pas encore.
// Migre aussi, en best-effort, un éventuel ancien super admin créé avant la
// séparation admin/école (ligne `users` avec role='super_admin') — ces
// installations avaient leur super admin dans la table `users`.
// Désactiver en retirant la variable d'env SEED_SECRET après le premier usage.
router.post('/super-admin', async (req: Request, res: Response): Promise<void> => {
    const secret = process.env.SEED_SECRET;
    if (!secret || req.query.secret !== secret) {
        res.status(403).json({ message: 'Forbidden' });
        return;
    }

    try {
        const existingAdmin = await Administrateur.findOne();
        if (existingAdmin) {
            res.status(409).json({ message: 'Un super admin existe déjà', email: existingAdmin.email });
            return;
        }

        // Migration best-effort d'un ancien super admin (pré-séparation des tables).
        const legacy = await UserModel.findOne({ where: { role: 'super_admin' } });
        if (legacy) {
            const migrated = await Administrateur.create({
                name: legacy.schoolName || 'Super Admin', email: legacy.email, password: legacy.password,
            }, { hooks: false }); // le mot de passe est déjà hashé (bcrypt) côté UserModel — pas de re-hash
            res.status(201).json({ message: 'Super admin migré depuis users', id: migrated.id, email: migrated.email });
            return;
        }

        const { email, password, name } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'email et password requis' });
            return;
        }

        const admin = await Administrateur.create({ name: name || 'Super Admin', email, password });
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
