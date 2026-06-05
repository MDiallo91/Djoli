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
    await sequelize.authenticate();
    await sequelize.sync();
    // Safe migration: add levels column if it doesn't exist yet
    await sequelize.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS levels TEXT DEFAULT '[]'`).catch(() => {});
    _ready = true;
    console.log('PostgreSQL connecté et synchronisé');
};

export default sequelize;
