import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "cash_transaction" synchronisée depuis le desktop.
class TransactionCaisse extends Model {
    declare id:                string;
    declare school_id:         string;
    declare type:                'IN' | 'OUT';
    declare amount:              number;
    declare reason:               string | null;
    declare reference_id:         string | null;
    declare school_year_id:       string | null;
    declare device_id:            string | null;
    declare deleted_at:           Date | null;
    declare client_created_at:    string | null;
    declare client_updated_at:    string | null;
}

TransactionCaisse.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    type:              { type: DataTypes.STRING(8),  allowNull: false },
    amount:            { type: DataTypes.FLOAT,       allowNull: false },
    reason:            { type: DataTypes.TEXT,        allowNull: true },
    reference_id:      { type: DataTypes.STRING(36),  allowNull: true },
    school_year_id:    { type: DataTypes.STRING(36),  allowNull: true },
    device_id:         { type: DataTypes.STRING(36),  allowNull: true },
    deleted_at:        { type: DataTypes.DATE,        allowNull: true },
    client_created_at: { type: DataTypes.STRING(30),  allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),  allowNull: true },
}, {
    sequelize,
    tableName: 'cash_transactions_typed',
    timestamps: true,
    indexes: [
        { fields: ['school_id', 'school_year_id'] },
    ],
});

export default TransactionCaisse;
