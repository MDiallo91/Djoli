import { Request, Response, NextFunction } from 'express';
import { verifyLicenseKey, LicensePayload } from '../services/licenseService';

declare global {
    namespace Express {
        interface Request { licenseData?: LicensePayload; }
    }
}

export const requireLicenseBearer = (req: Request, res: Response, next: NextFunction): void => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Token de licence manquant (Bearer)' });
        return;
    }
    try {
        req.licenseData = verifyLicenseKey(auth.slice(7));
        next();
    } catch (err: any) {
        console.warn('[LicenseAuth] Token rejeté:', err?.message ?? err);
        res.status(401).json({ message: 'Token de licence invalide ou expiré' });
    }
};
