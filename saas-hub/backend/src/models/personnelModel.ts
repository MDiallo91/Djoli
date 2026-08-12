import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "staff" synchronisée depuis le desktop.
class Personnel extends Model {
    declare id:                string;
    declare school_id:         string;
    declare first_name:         string;
    declare last_name:           string;
    declare role:                 string | null;
    declare phone:                string | null;
    declare email:                string | null;
    declare salary_base:          number | null;
    declare hire_date:            string | null;
    declare device_id:            string | null;
    declare deleted_at:           Date | null;
    declare client_created_at:    string | null;
    declare client_updated_at:    string | null;
}

Personnel.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    first_name:        { type: DataTypes.STRING(128), allowNull: false },
    last_name:         { type: DataTypes.STRING(128), allowNull: false },
    role:              { type: DataTypes.STRING(64),  allowNull: true },
    phone:             { type: DataTypes.STRING(32),  allowNull: true },
    email:             { type: DataTypes.STRING(255), allowNull: true },
    salary_base:       { type: DataTypes.FLOAT,        allowNull: true },
    hire_date:         { type: DataTypes.STRING(30),   allowNull: true },
    device_id:         { type: DataTypes.STRING(36),   allowNull: true },
    deleted_at:        { type: DataTypes.DATE,         allowNull: true },
    client_created_at: { type: DataTypes.STRING(30),   allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),   allowNull: true },
}, {
    sequelize,
    tableName: 'staff_typed',
    timestamps: true,
    indexes: [
        { fields: ['school_id'] },
    ],
});

export default Personnel;
