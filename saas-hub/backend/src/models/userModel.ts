import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';
import bcrypt from 'bcrypt';

class UserModel extends Model {
    declare id: string;
    declare schoolName: string;
    declare email: string;
    declare password: string;
    declare role: string;
    declare country: string;
    declare city: string;
    declare level: string;
    declare directorName: string;
    declare prefecture: string;
    declare sousPrefecture: string;
    declare rccm: string;
    declare logoUrl: string;
    declare approvalStatus: string; // pending | approved | rejected
    declare subscriptionStatus: string;
    declare subscriptionExpiry: string;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

UserModel.init({
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    schoolName:   { type: DataTypes.STRING, allowNull: false },
    email:        { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password:     { type: DataTypes.STRING, allowNull: false },
    role:         { type: DataTypes.STRING, defaultValue: 'user' },
    country:      { type: DataTypes.STRING, allowNull: true },
    city:         { type: DataTypes.STRING, allowNull: true },
    level:        { type: DataTypes.STRING, allowNull: true },
    directorName: { type: DataTypes.STRING, allowNull: true },
    prefecture:   { type: DataTypes.STRING, allowNull: true },
    sousPrefecture: { type: DataTypes.STRING, allowNull: true },
    rccm:         { type: DataTypes.STRING, allowNull: true },
    logoUrl:      { type: DataTypes.TEXT,   allowNull: true },
    approvalStatus: { type: DataTypes.STRING, defaultValue: 'pending' },
    subscriptionStatus: { type: DataTypes.STRING, defaultValue: 'trial' },
    subscriptionExpiry: {
        type: DataTypes.STRING,
        defaultValue: () => {
            const d = new Date();
            d.setDate(d.getDate() + 14);
            return d.toISOString();
        }
    },
}, {
    sequelize,
    tableName: 'users',
    hooks: {
        beforeCreate: async (user: UserModel) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user: UserModel) => {
            if (user.changed('password')) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

export default UserModel;
