import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Installateur de l'application desktop (.exe), stocké EN BASE, découpé en
// morceaux (voir FragmentVersion) : un installateur Electron pèse ~100 Mo alors
// que MySQL/MariaDB limite chaque requête (max_allowed_packet, 1 Mo par défaut
// sur MariaDB) — un seul BLOB ne passerait pas. Upload/download : routes/appReleaseRoute.ts.
// Une seule version « ready » est conservée : publier une nouvelle version supprime l'ancienne.

// 512 Ko : reste sous max_allowed_packet (1 Mo) avec la marge du protocole.
export const APP_CHUNK_BYTES = 512 * 1024;
export const APP_MAX_BYTES   = 1024 * 1024 * 1024; // 1 Go

class VersionApplication extends Model {
    declare id:          string;
    declare version:     string;
    declare filename:    string;
    declare size:        number;
    declare sha256:      string;
    declare chunk_count: number;
    declare status:      'uploading' | 'ready';
    declare notes:       string | null;
    declare createdAt:   Date;
    declare updatedAt:   Date;
}

VersionApplication.init({
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    version:     { type: DataTypes.STRING(32),  allowNull: false },
    filename:    { type: DataTypes.STRING(255), allowNull: false },
    size:        { type: DataTypes.BIGINT,      allowNull: false },
    sha256:      { type: DataTypes.STRING(64),  allowNull: false },
    chunk_count: { type: DataTypes.INTEGER,     allowNull: false },
    status:      { type: DataTypes.STRING(16),  allowNull: false, defaultValue: 'uploading' },
    notes:       { type: DataTypes.TEXT,        allowNull: true },
}, {
    sequelize,
    tableName: 'app_releases',
    timestamps: true,
});

export class FragmentVersion extends Model {
    declare release_id: string;
    declare idx:        number;
    declare data:       Buffer;
}

FragmentVersion.init({
    release_id: { type: DataTypes.UUID,    primaryKey: true, references: { model: 'app_releases', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    idx:        { type: DataTypes.INTEGER, primaryKey: true },
    data:       { type: DataTypes.BLOB('medium'), allowNull: false },
}, {
    sequelize,
    tableName: 'app_release_chunks',
    timestamps: false,
});

export default VersionApplication;
