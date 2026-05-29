import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

dotenv.config();

import { DBconnect } from './config/db';
import { checkUser, requireAuth } from './middleware/authMiddleware';
import authRoute from './routes/authRoute';
import subscriptionRoute from './routes/subscriptionRoute';
import adminRoutes from './routes/adminRoutes';
import licenseRoute from './routes/licenseRoute';
import syncRoute from './routes/syncRoute';
import auditRoute from './routes/auditRoute';
import settingsRoute from './routes/settingsRoute';
import schoolRoute from './routes/schoolRoute';
import seedRoute from './routes/seedRoute';

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares globaux
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Garantit la connexion DB avant chaque requête (cold start serverless)
app.use(async (_req: Request, res: Response, next: NextFunction) => {
    try {
        await DBconnect();
        next();
    } catch (err) {
        console.error('[DB] Connexion impossible:', err);
        res.status(503).json({ error: 'Service temporairement indisponible' });
    }
});

app.use(checkUser);

app.get('/', (_req, res) => {
    res.json({ status: 'ok', message: 'Djoli API is running' });
});

app.get('/jwtid', requireAuth, (req, res) => {
    res.status(200).json({ id: req.user?.id });
});

app.use('/api/user', authRoute);
app.use('/api/subscription', subscriptionRoute);
app.use('/api/admin', adminRoutes);
app.use('/api/license', licenseRoute);
app.use('/api/sync',    syncRoute);
app.use('/api/audit',    auditRoute);
app.use('/api/settings', settingsRoute);
app.use('/api/school',   schoolRoute);
app.use('/api/seed',     seedRoute);

// Export pour Vercel (serverless)
export default app;

// Démarrage local uniquement
if (!process.env.VERCEL) {
    DBconnect()
        .then(() => app.listen(PORT, () => console.log(`Serveur SaaS Backend sur le port ${PORT}`)))
        .catch(err => { console.error('Fatal DB error:', err); process.exit(1); });
}

