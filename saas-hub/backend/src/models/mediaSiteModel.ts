import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// TOUTES les images de la plateforme (pas de Cloudinary) : site vitrine (hero, cartes,
// logo du site), logos d'école, photos d'élèves et du personnel. Stockées en base et
// servies par GET /api/media/:id (voir routes/mediaRoute.ts).
// Les réglages (`settings`) ne gardent que l'URL : avant, l'image y était mise en
// base64 et dépassait la limite de 65 535 caractères de la colonne TEXT MySQL
// (JSON tronqué → /api/settings en erreur 500).
// SVG exclu : servi depuis notre domaine, il pourrait embarquer du script.
export const MEDIA_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
// Limite Vercel : 4,5 Mo par requête, fichier envoyé en base64 (+33 %).
export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;

class MediaSite extends Model {
    declare id:        string;
    declare filename:  string;
    declare mime_type: string;
    declare size:      number;
    declare content:   Buffer;
    declare createdAt: Date;
}

MediaSite.init({
    id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    filename:  { type: DataTypes.STRING(255), allowNull: false },
    mime_type: { type: DataTypes.STRING(64), allowNull: false },
    size:      { type: DataTypes.INTEGER, allowNull: false },
    content:   { type: DataTypes.BLOB('long'), allowNull: false },
}, {
    sequelize,
    tableName: 'site_media',
    timestamps: true,
});

export default MediaSite;
