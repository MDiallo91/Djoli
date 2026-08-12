import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Administrateur from '../models/administrateurModel';
import Role from '../models/roleModel';

declare global {
    namespace Express {
        interface Request { admin?: Administrateur; }
    }
}

// Équivalent de `requireAuth` (authMiddleware.ts) mais pour la table `admins`.
// Le JWT est le même cookie/format que l'auth école (voir authController.createToken),
// distingué par le claim `type: 'admin'` posé au login — un token école valide
// ne passe donc jamais ce middleware.
export const requireAdminAuth = (req: Request, res: Response, next: NextFunction): void => {
    const token = req.cookies.jwt
        || (req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : null);

    if (!token) {
        res.status(401).json({ message: 'Token manquant' });
        return;
    }

    jwt.verify(token, process.env.JWT_SECRET as string, async (err: any, decoded: any) => {
        if (err || decoded?.type !== 'admin') {
            res.status(401).json({ message: 'Accès administrateur requis' });
            return;
        }
        try {
            const admin = await Administrateur.findByPk(decoded.id);
            if (!admin) { res.status(401).json({ message: 'Administrateur introuvable' }); return; }
            req.admin = admin;
            next();
        } catch {
            res.status(500).json({ message: 'Erreur serveur' });
        }
    });
};

// Vérifie une permission précise (voir Role.permissions). role_id null = accès
// complet, même convention que school_users côté desktop.
export const requireAdminPermission = (key: string) =>
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const admin = req.admin!;
        if (!admin.role_id) { next(); return; }
        const role = await Role.findByPk(admin.role_id);
        const perms: string[] = role?.permissions ? JSON.parse(role.permissions) : [];
        if (perms.includes(key)) { next(); return; }
        res.status(403).json({ message: 'Permission refusée' });
    };
