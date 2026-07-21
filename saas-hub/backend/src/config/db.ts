import { Sequelize } from 'sequelize';
import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Pas de DATABASE_URL → SQLite local (aucune installation requise, fonctionne hors-ligne).
// DATABASE_URL renseigné → PostgreSQL (Neon en prod, ou toute instance Postgres).
const isPostgres = !!process.env.DATABASE_URL;

const sequelize = isPostgres
    ? new Sequelize(process.env.DATABASE_URL!, {
        dialect: 'postgres',
        dialectModule: pg,
        dialectOptions: {
            ssl: { require: true, rejectUnauthorized: false },
        },
        logging: false,
        pool: { max: 5, min: 1, acquire: 30_000, idle: 45_000 },
    })
    : new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '../../local.db'),
        logging: false,
    });

let _schemaReady = false;

/** Probe raw pg.Client — réveille Neon sans bloquer le pool Sequelize */
async function probeNeon(): Promise<void> {
    const MAX_ATTEMPTS = 12;
    const DELAY_MS     = 5_000;
    let lastErr: any;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const client = new pg.Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 20_000,
        } as any);
        try {
            await client.connect();
            await client.query('SELECT 1');
            await client.end();
            return;
        } catch (err: any) {
            lastErr = err;
            try { await client.end(); } catch {}
            if (attempt < MAX_ATTEMPTS) {
                console.log(`DB non disponible (tentative ${attempt}/${MAX_ATTEMPTS}), réessai dans ${DELAY_MS / 1000}s…`);
                await new Promise(r => setTimeout(r, DELAY_MS));
            }
        }
    }
    throw lastErr;
}

/**
 * Appelé UNE FOIS au démarrage (dans index.ts).
 * Les requêtes HTTP n'appellent PAS DBconnect() — le pool min:1 maintient
 * la connexion, le keepalive empêche Neon d'entrer en veille.
 */
export const DBconnect = async (): Promise<void> => {
    if (_schemaReady) return;

    if (isPostgres) {
        // Probe + auth avec retry pour couvrir le cold start Neon (~15-30s)
        await probeNeon();

        for (let i = 1; i <= 5; i++) {
            try { await sequelize.authenticate(); break; }
            catch (e: any) {
                if (i === 5) throw e;
                console.log(`Sequelize auth échec (tentative ${i}/5), réessai dans 4s…`);
                await new Promise(r => setTimeout(r, 4_000));
            }
        }
    } else {
        await sequelize.authenticate();
    }

    await sequelize.sync();

    // Migrations legacy propres au schéma Postgres existant (Neon prod) — le
    // schéma SQLite local est toujours créé à jour par sync(), donc inutile ici.
    if (isPostgres) {
        await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS levels TEXT DEFAULT '[]'`).catch(() => {});
        await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "rccmUrl" TEXT`).catch(() => {});
        await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS "logoUrl" TEXT`).catch(() => {});
        await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(8)`).catch(() => {});
        await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TEXT`).catch(() => {});
        await sequelize.query(`ALTER TABLE school_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`).catch(() => {});
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS payments (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "schoolId" UUID NOT NULL,
                plan INTEGER NOT NULL,
                amount FLOAT NOT NULL,
                currency VARCHAR(10) NOT NULL DEFAULT 'GNF',
                gateway VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                reference VARCHAR(128),
                metadata TEXT,
                "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `).catch(() => {});
    }

    _schemaReady = true;
    console.log(isPostgres ? 'PostgreSQL connecté et synchronisé' : `SQLite local connecté (${path.join(__dirname, '../../local.db')})`);
};

// Keepalive — ping via le pool Sequelize toutes les 45s.
// Empêche Neon d'auto-suspendre (free tier: 1 min d'inactivité) et garde min:1 vivant.
// Non pertinent en SQLite (pas de serveur distant à réveiller).
if (isPostgres && !process.env.VERCEL) {
    setInterval(() => {
        const t = new Date().toISOString().slice(11, 19);
        sequelize.query('SELECT 1').then(() => {
            console.log(`[keepalive ${t}] pool OK`);
        }).catch((err: any) => {
            console.log(`[keepalive ${t}] pool mort (${err.message}), probe...`);
            probeNeon().catch(() => {});
        });
    }, 45_000);
}

export default sequelize;
