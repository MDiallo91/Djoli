import { Sequelize } from 'sequelize';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Pass pg directly via dialectModule so Sequelize never does require('pg')
// dynamically — this is required when bundled with ncc (@vercel/node)
const sequelize = new Sequelize(process.env.DATABASE_URL!, {
    dialect: 'postgres',
    dialectModule: pg,
    dialectOptions: {
        ssl: process.env.NODE_ENV === 'production'
            ? { require: true, rejectUnauthorized: false }
            : false,
    },
    logging: false,
    pool: { max: 5, min: 0, acquire: 30_000, idle: 10_000 },
});

let _ready = false;

export const DBconnect = async (): Promise<void> => {
    if (_ready) return;

    const MAX_ATTEMPTS = 8;
    const DELAY_MS     = 3_000;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await sequelize.authenticate();
            break;
        } catch (err: any) {
            const isLastAttempt = attempt === MAX_ATTEMPTS;
            if (isLastAttempt) throw err;
            // Neon se réveille en ~2-5 s — on patiente
            console.log(`DB non disponible (tentative ${attempt}/${MAX_ATTEMPTS}), réessai dans ${DELAY_MS / 1000}s…`);
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
    }

    await sequelize.sync();
    await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS levels TEXT DEFAULT '[]'`).catch(() => {});
    await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS rccmUrl TEXT`).catch(() => {});
    await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(8)`).catch(() => {});
    await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_expires_at TEXT`).catch(() => {});
    _ready = true;
    console.log('PostgreSQL connecté et synchronisé');
};

export default sequelize;
