import { Request, Response, NextFunction } from 'express';

// Limiteur simple en mémoire, par IP — sans dépendance ajoutée. Pensé pour
// les endpoints qui doivent rester accessibles sans authentification (ex:
// signature d'upload utilisée avant la création du compte) mais où un abus
// en boucle doit être freiné.
// Limite : sur un déploiement serverless (Vercel), la mémoire ne survit pas
// forcément entre invocations à froid — c'est une protection en profondeur,
// pas une garantie dure. Si le trafic le justifie, passer à un store partagé
// (Redis) plus tard.
interface Bucket { count: number; resetAt: number; }
const buckets = new Map<string, Bucket>();

export function rateLimit(opts: { windowMs: number; max: number }) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const key = req.ip || 'unknown';
        const now = Date.now();
        const bucket = buckets.get(key);

        if (!bucket || bucket.resetAt < now) {
            buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
            next();
            return;
        }
        if (bucket.count >= opts.max) {
            res.status(429).json({ message: 'Trop de requêtes, réessayez plus tard.' });
            return;
        }
        bucket.count++;
        next();
    };
}
