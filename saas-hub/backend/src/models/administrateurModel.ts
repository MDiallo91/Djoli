import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcrypt';
import sequelize from '../config/db';
import Role from './roleModel';

// Compte d'administrateur de la plateforme DJOLI (équipe interne) — séparé de
// `UserModel` (qui ne représente plus que les écoles). Avant cette table,
// le super admin était juste une ligne `users` avec role='super_admin'.
class Administrateur extends Model {
    declare id:        string;
    declare name:       string;
    declare email:       string;
    declare password:    string;
    declare role_id:      string | null; // null = accès complet (super admin), même convention que school_users
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Administrateur.init({
    id:       { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name:     { type: DataTypes.STRING(128), allowNull: false },
    email:    { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false },
    role_id:  { type: DataTypes.UUID, allowNull: true },
}, {
    sequelize,
    tableName: 'admins',
    timestamps: true,
    hooks: {
        beforeCreate: async (admin: Administrateur) => {
            if (admin.password) admin.password = await bcrypt.hash(admin.password, await bcrypt.genSalt(10));
        },
        beforeUpdate: async (admin: Administrateur) => {
            if (admin.changed('password')) admin.password = await bcrypt.hash(admin.password, await bcrypt.genSalt(10));
        },
    },
});

Administrateur.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

export default Administrateur;
