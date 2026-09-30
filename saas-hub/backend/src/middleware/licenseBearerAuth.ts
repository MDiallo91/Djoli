import { Request, Response, NextFunction } from 'express';
import { verifyLicenseKey, LicensePayload } from '../services/licenseService';
import UserModel from '../models/userModel';

declare global {
    namespace Express {
        interface Request { licenseData?: LicensePayload; }
    }
}

export const requireLicenseBearer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Token de licence manquant (Bearer)' });
        return;
    }
    let license: LicensePayload;
    try {
        license = verifyLicenseKey(auth.slice(7));
    } catch (err: any) {
        console.warn('[LicenseAuth] Token rejeté:', err?.message ?? err);
        res.status(401).json({ message: 'Token de licence invalide ou expiré' });
        return;
    }
    // La clé est signée et valable jusqu'à son expiration sans consulter la base :
    // on vérifie donc que l'école existe toujours (UserModel est paranoid → une
    // école archivée est introuvable) pour couper la synchro dès l'archivage.
    try {
        const school = await UserModel.findByPk(license.school_id, { attributes: ['id'] });
        if (!school) {
            res.status(403).json({ message: 'Établissement archivé ou introuvable' });
            return;
        }
    } catch {
        res.status(500).json({ message: 'Erreur serveur' });
        return;
    }
    req.licenseData = license;
    next();
};
