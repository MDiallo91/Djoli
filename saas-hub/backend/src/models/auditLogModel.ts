import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class AuditLog extends Model {
    declare id:           string;
    declare school_id:    string;
    declare user_id:      string | null;
    declare user_name:    string | null;
    declare action:       string;
    declare entity_type:  string | null;
    declare entity_id:    string | null;
    declare entity_label: string | null;
    declare old_value:    string | null;
    declare new_value:    string | null;
    declare device_id:    string | null;
    declare synced:       number;
    declare created_at:   string;
}

AuditLog.init({
    id:           { type: DataTypes.STRING(36), primaryKey: true },
    school_id:    { type: DataTypes.STRING(36), allowNull: true },
    user_id:      { type: DataTypes.STRING(36), allowNull: true },
    user_name:    { type: DataTypes.STRING(255), allowNull: true },
    action:       { type: DataTypes.STRING(64),  allowNull: false },
    entity_type:  { type: DataTypes.STRING(64),  allowNull: true },
    entity_id:    { type: DataTypes.STRING(36),  allowNull: true },
    entity_label: { type: DataTypes.STRING(255), allowNull: true },
    old_value:    { type: DataTypes.TEXT,        allowNull: true },
    new_value:    { type: DataTypes.TEXT,        allowNull: true },
    device_id:    { type: DataTypes.STRING(36),  allowNull: true },
    synced:       { type: DataTypes.INTEGER,     defaultValue: 0 },
    created_at:   { type: DataTypes.STRING(30),  allowNull: false },
}, {
    sequelize,
    tableName: 'audit_logs',
    timestamps: false,
    indexes: [
        { fields: ['school_id', 'created_at'] },
        { fields: ['school_id', 'action'] },
    ],
});

export default AuditLog;
