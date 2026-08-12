import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "subject" synchronisée depuis le desktop.
class Matiere extends Model {
    declare id:                string;
    declare school_id:         string;
    declare name:               string;
    declare coefficient:         number;
    declare level:                string | null;
    declare device_id:            string | null;
    declare deleted_at:           Date | null;
    declare client_created_at:    string | null;
    declare client_updated_at:    string | null;
}

Matiere.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    name:              { type: DataTypes.STRING(128), allowNull: false },
    coefficient:       { type: DataTypes.INTEGER,     allowNull: false, defaultValue: 1 },
    level:             { type: DataTypes.STRING(64),  allowNull: true },
    device_id:         { type: DataTypes.STRING(36),  allowNull: true },
    deleted_at:        { type: DataTypes.DATE,        allowNull: true },
    client_created_at: { type: DataTypes.STRING(30),  allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),  allowNull: true },
}, {
    sequelize,
    tableName: 'subjects_typed',
    timestamps: true,
    indexes: [
        { fields: ['school_id'] },
    ],
});

export default Matiere;
