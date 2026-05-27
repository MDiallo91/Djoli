import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

class Setting extends Model {
    declare id:     string;
    declare key:    string;
    declare statut: number; // 1=active, 0=inactive
    declare data:   string | null; // JSON stringified
}

Setting.init({
    id:     { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    key:    { type: DataTypes.STRING(64), allowNull: false, unique: true },
    statut: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    data:   { type: DataTypes.TEXT, allowNull: true },
}, {
    sequelize,
    tableName: 'settings',
    timestamps: true,
});

export default Setting;
