import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "school_user" synchronisée depuis le desktop —
// comptes/permissions du personnel d'école (voir school-management-system/src/constants/permissions.ts).
// Ne contient jamais password_hash/must_change_pwd : ces champs ne quittent
// jamais l'appareil desktop, seuls role/permissions/scope_levels sont autoritaires ici.
class UtilisateurEcole extends Model {
    declare id:                string;
    declare school_id:         string;
    declare name:               string;
    declare email:              string | null;
    declare username:           string | null;
    declare role:               string | null;
    declare permissions:        string;
    declare scope_levels:       string;
    declare phone:              string | null;
    declare photo_url:          string | null;
    declare is_active:          boolean;
    declare device_id:          string | null;
    declare deleted_at:         Date | null;
    declare client_created_at:  string | null;
    declare client_updated_at:  string | null;
}

UtilisateurEcole.init({
    id:                { type: DataTypes.STRING(36),  primaryKey: true },
    school_id:         { type: DataTypes.STRING(36),  allowNull: false },
    name:              { type: DataTypes.STRING(128), allowNull: false },
    email:             { type: DataTypes.STRING(255), allowNull: true },
    username:          { type: DataTypes.STRING(128), allowNull: true },
    role:              { type: DataTypes.STRING(64),  allowNull: true },
    permissions:       { type: DataTypes.TEXT,         allowNull: false, defaultValue: '[]' },
    scope_levels:      { type: DataTypes.TEXT,         allowNull: false, defaultValue: '[]' },
    phone:             { type: DataTypes.STRING(32),  allowNull: true },
    photo_url:         { type: DataTypes.STRING(500), allowNull: true },
    is_active:         { type: DataTypes.BOOLEAN,      allowNull: false, defaultValue: true },
    device_id:         { type: DataTypes.STRING(36),  allowNull: true },
    deleted_at:        { type: DataTypes.DATE,         allowNull: true },
    client_created_at: { type: DataTypes.STRING(30),  allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),  allowNull: true },
}, {
    sequelize,
    tableName: 'school_users_typed',
    timestamps: true,
    indexes: [
        { fields: ['school_id'] },
    ],
});

export default UtilisateurEcole;
