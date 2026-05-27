import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Universal sync table: every entity from every school desktop is stored here.
// One row per (school_id, entity_type, entity_id).
class SchoolRecord extends Model {
    declare id:          string;
    declare school_id:   string;
    declare entity_type: string;
    declare entity_id:   string;
    declare data:        string | null; // JSON; null = soft-deleted
    declare device_id:   string;
    declare operation:   string;        // INSERT | UPDATE | DELETE
    declare deleted_at:  Date | null;
    declare readonly updatedAt: Date;   // Sequelize auto-managed — used as "server received at"
}

SchoolRecord.init({
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    school_id:   { type: DataTypes.STRING(36), allowNull: false },
    entity_type: { type: DataTypes.STRING(64), allowNull: false },
    entity_id:   { type: DataTypes.STRING(36), allowNull: false },
    data:        { type: DataTypes.TEXT, allowNull: true },
    device_id:   { type: DataTypes.STRING(36), allowNull: true },
    operation:   { type: DataTypes.STRING(16), allowNull: false },
    deleted_at:  { type: DataTypes.DATE, allowNull: true },
}, {
    sequelize,
    tableName: 'school_records',
    timestamps: true,
    indexes: [
        { unique: true, fields: ['school_id', 'entity_type', 'entity_id'] },
        { fields: ['school_id', 'updatedAt'] },
    ],
});

export default SchoolRecord;
