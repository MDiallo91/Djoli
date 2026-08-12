import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Rôle d'administrateur DJOLI (équipe plateforme — pas à confondre avec les
// rôles/permissions des utilisateurs d'une école, gérés côté desktop dans
// `school_users.permissions`, voir school-management-system/src/constants/permissions.ts).
// Même convention : `permissions` null/vide = accès complet (super admin).
class Role extends Model {
    declare id:           string;
    declare name:          string;
    declare permissions:   string | null; // JSON string[] de clés de permission ; null = tout autorisé
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Role.init({
    id:          { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name:        { type: DataTypes.STRING(64), allowNull: false, unique: true },
    permissions: { type: DataTypes.TEXT, allowNull: true },
}, {
    sequelize,
    tableName: 'roles',
    timestamps: true,
});

export default Role;
