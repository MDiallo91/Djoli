import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Ni DATABASE_URL ni DB_HOST/DB_CONNECTION → SQLite local (aucune installation requise, hors-ligne).
// DATABASE_URL renseigné (mysql://user:pass@host:port/db) → prioritaire, sinon
// DB_CONNECTION=mysql + DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD (style Laravel).
const hasDatabaseUrl    = !!process.env.DATABASE_URL;
const hasDiscreteMysql  = !hasDatabaseUrl && (process.env.DB_CONNECTION === 'mysql' || !!process.env.DB_HOST);
const isMySQL           = hasDatabaseUrl || hasDiscreteMysql;

const mysqlDialectOptions = process.env.DB_SSL === 'true'
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {};

const sequelize = hasDatabaseUrl
    ? new Sequelize(process.env.DATABASE_URL!, {
        dialect: 'mysql',
        dialectOptions: mysqlDialectOptions,
        logging: false,
        pool: { max: 5, min: 1, acquire: 30_000, idle: 45_000 },
    })
    : hasDiscreteMysql
    ? new Sequelize(
        process.env.DB_DATABASE || 'djoli',
        process.env.DB_USERNAME || 'root',
        process.env.DB_PASSWORD || '',
        {
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
            dialect: 'mysql',
            dialectOptions: mysqlDialectOptions,
            logging: false,
            pool: { max: 5, min: 1, acquire: 30_000, idle: 45_000 },
        },
    )
    : new Sequelize({
        dialect: 'sqlite',
        storage: path.join(__dirname, '../../local.db'),
        logging: false,
    });

let _schemaReady = false;

/**
 * Appelé UNE FOIS au démarrage (dans index.ts).
 * Les requêtes HTTP n'appellent PAS DBconnect() — le pool min:1 maintient
 * la connexion.
 */
export const DBconnect = async (): Promise<void> => {
    if (_schemaReady) return;

    // Retry avec backoff pour couvrir un cold start éventuel (hébergeur MySQL managé).
    const MAX_ATTEMPTS = isMySQL ? 8 : 1;
    const DELAY_MS = 5_000;
    let lastErr: any;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            await sequelize.authenticate();
            lastErr = undefined;
            break;
        } catch (err: any) {
            lastErr = err;
            if (attempt < MAX_ATTEMPTS) {
                console.log(`DB non disponible (tentative ${attempt}/${MAX_ATTEMPTS}), réessai dans ${DELAY_MS / 1000}s…`);
                await new Promise(r => setTimeout(r, DELAY_MS));
            }
        }
    }
    if (lastErr) throw lastErr;

    await sequelize.sync();

    // Migration sûre : sync() seul ne modifie pas une table déjà existante,
    // donc on ajoute la colonne explicitement si elle manque encore (no-op sur
    // une table fraîchement créée, où sync() l'a déjà incluse).
    try {
        await sequelize.getQueryInterface().addColumn('users', 'phone', { type: DataTypes.STRING(32), allowNull: true });
    } catch { /* colonne déjà existante */ }
    try {
        await sequelize.getQueryInterface().addColumn('users', 'pendingLevels', { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' });
    } catch { /* colonne déjà existante */ }
    // Élèves (miroir typé) : filiation / tuteur / lieu de naissance / photo, pour les cartes scolaires.
    // Si des colonnes viennent d'être créées, on les remplit depuis school_records (source de
    // vérité), qui contient déjà ces champs pour les élèves poussés par le desktop.
    {
        const qi = sequelize.getQueryInterface();
        let added = false;
        for (const [col, type] of [['pere', DataTypes.STRING(128)], ['mere', DataTypes.STRING(128)], ['birth_place', DataTypes.STRING(128)],
                                   ['tutor_name', DataTypes.STRING(128)], ['tutor_phone', DataTypes.STRING(32)], ['photo_url', DataTypes.TEXT]] as const) {
            try { await qi.addColumn('students_typed', col, { type, allowNull: true }); added = true; }
            catch { /* colonne déjà existante */ }
        }
        if (added) {
            try {
                const [rows] = await sequelize.query(
                    "SELECT entity_id, data FROM school_records WHERE entity_type = 'student' AND deleted_at IS NULL",
                ) as [{ entity_id: string; data: string }[], unknown];
                for (const r of rows) {
                    let p: any; try { p = JSON.parse(r.data); } catch { continue; }
                    if (!p.pere && !p.mere && !p.birth_place && !p.tutor_name && !p.tutor_phone && !p.photo_url) continue;
                    await sequelize.query(
                        'UPDATE students_typed SET pere = ?, mere = ?, birth_place = ?, tutor_name = ?, tutor_phone = ?, photo_url = ? WHERE id = ?',
                        { replacements: [p.pere ?? null, p.mere ?? null, p.birth_place ?? null, p.tutor_name ?? null, p.tutor_phone ?? null, p.photo_url ?? null, r.entity_id] },
                    );
                }
            } catch (err: any) { console.warn('[db] Rattrapage filiation élèves échoué :', err.message); }
        }
    }

    // Archivage des écoles (UserModel paranoid) — doit exister avant toute requête sur `users`.
    try {
        await sequelize.getQueryInterface().addColumn('users', 'deletedAt', { type: DataTypes.DATE, allowNull: true });
    } catch { /* colonne déjà existante */ }

    // Clés étrangères des tables purement cloud (hors synchro desktop, donc sans risque
    // d'arrivée dans le désordre). Les tables miroirs synchronisées n'en ont volontairement
    // pas : le desktop pousse hors ligne, dans n'importe quel ordre.
    // Déjà déclarées dans les modèles pour une base neuve ; ajoutées ici pour une base existante.
    if (isMySQL) {
        const qi = sequelize.getQueryInterface();
        const fks = [
            { table: 'school_documents',   name: 'fk_school_documents_school', field: 'school_id',  refTable: 'users',        onDelete: 'CASCADE' },
            { table: 'app_release_chunks', name: 'fk_app_release_chunks_rel',  field: 'release_id', refTable: 'app_releases', onDelete: 'CASCADE' },
        ];
        // Détection par table + colonne (pas par nom : MySQL nomme lui-même les clés créées par sync(), ex. _ibfk_1).
        const [existing] = await sequelize.query(
            'SELECT TABLE_NAME AS t, COLUMN_NAME AS c FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL',
        ) as [{ t: string; c: string }[], unknown];
        for (const fk of fks) {
            if (existing.some(e => e.t === fk.table && e.c === fk.field)) continue;
            try {
                await qi.addConstraint(fk.table, {
                    type: 'foreign key', name: fk.name, fields: [fk.field],
                    references: { table: fk.refTable, field: 'id' }, onDelete: fk.onDelete, onUpdate: 'CASCADE',
                });
            } catch (err: any) {
                // Ex. lignes orphelines existantes : la contrainte n'est pas posée, le reste fonctionne.
                console.warn(`[db] Clé étrangère ${fk.name} non ajoutée : ${err.message}`);
            }
        }
    }

    _schemaReady = true;
    console.log(isMySQL ? 'MySQL connecté et synchronisé' : `SQLite local connecté (${path.join(__dirname, '../../local.db')})`);
};

// Keepalive — ping via le pool Sequelize toutes les 45s. Garde le pool (min:1) vivant
// et évite qu'un hébergeur MySQL managé ne ferme les connexions inactives.
// Non pertinent en SQLite (pas de serveur distant à réveiller).
if (isMySQL && !process.env.VERCEL) {
    setInterval(() => {
        const t = new Date().toISOString().slice(11, 19);
        sequelize.query('SELECT 1').then(() => {
            console.log(`[keepalive ${t}] pool OK`);
        }).catch((err: any) => {
            console.log(`[keepalive ${t}] pool mort (${err.message})`);
        });
    }, 45_000);
}

export default sequelize;
