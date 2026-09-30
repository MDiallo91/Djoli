import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Pièces justificatives d'une école (ex. RCCM), stockées EN BASE — volontairement
// pas sur Cloudinary : ce sont des documents légaux, accessibles uniquement à
// l'admin via GET /api/admin/documents/:id (voir adminController.getDocument).
// Table séparée de `users` pour que la liste des écoles ne charge jamais le binaire.
export const DOCUMENT_TYPES = ['rccm'] as const;
export type DocumentType = typeof DOCUMENT_TYPES[number];

export const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'] as const;
// Limite Vercel : 4,5 Mo par requête. Le RCCM (2,5 Mo) et le logo (500 Ko, voir
// validate.ts) arrivent tous deux en base64 (+33 %) dans le même JSON d'inscription.
export const DOCUMENT_MAX_BYTES = 2.5 * 1024 * 1024;

class DocumentEcole extends Model {
    declare id:        string;
    declare school_id: string;
    declare type:      DocumentType;
    declare filename:  string;
    declare mime_type: string;
    declare size:      number;
    declare content:   Buffer;
    declare createdAt: Date;
}

DocumentEcole.init({
    id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    // Clé étrangère : table purement cloud (hors synchro) — suppression définitive d'une école
    // ({ force: true }) → ses documents partent avec. L'archivage (paranoid) les conserve.
    school_id: { type: DataTypes.UUID, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE', onUpdate: 'CASCADE' },
    type:      { type: DataTypes.STRING(32), allowNull: false },
    filename:  { type: DataTypes.STRING(255), allowNull: false },
    mime_type: { type: DataTypes.STRING(64), allowNull: false },
    size:      { type: DataTypes.INTEGER, allowNull: false },
    content:   { type: DataTypes.BLOB('long'), allowNull: false },
}, {
    sequelize,
    tableName: 'school_documents',
    timestamps: true,
    indexes: [{ fields: ['school_id'] }],
});

export default DocumentEcole;
