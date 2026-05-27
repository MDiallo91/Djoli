import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
    dialect: 'postgres',
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
    _ready = true;
    console.log('PostgreSQL connecté et synchronisé');
};

export default sequelize;
