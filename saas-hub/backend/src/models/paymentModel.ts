import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'cancelled';

class Payment extends Model {
    declare id:         string;
    declare schoolId:   string;
    declare plan:       number;   // durée en jours : 30 | 90 | 365
    declare amount:     number;
    declare currency:   string;
    declare gateway:    string;   // 'orange_money' | 'wave' | 'bank_transfer' | ...
    declare status:     PaymentStatus;
    declare reference:  string | null;  // référence transaction gateway
    declare metadata:   string | null;  // JSON — données spécifiques gateway
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

Payment.init({
    id:        { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    schoolId:  { type: DataTypes.UUID, allowNull: false },
    plan:      { type: DataTypes.INTEGER, allowNull: false },
    amount:    { type: DataTypes.FLOAT, allowNull: false },
    currency:  { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'GNF' },
    gateway:   { type: DataTypes.STRING(50), allowNull: false },
    status:    { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    reference: { type: DataTypes.STRING(128), allowNull: true },
    metadata:  { type: DataTypes.TEXT, allowNull: true },
}, {
    sequelize,
    tableName: 'payments',
});

export default Payment;
