import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "class" synchronisée depuis le desktop.
class Classe extends Model {
    declare id:                string;
    declare school_id:         string;
    declare name:               string;
    declare level:               string | null;
    declare tuition_fee:         number;
    declare description:         string | null;
    declare device_id:           string | null;
    declare deleted_at:          Date | null;
    declare client_created_at:   string | null;
    declare client_updated_at:   string | null;
}

Classe.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    name:              { type: DataTypes.STRING(128), allowNull: false },
    level:             { type: DataTypes.STRING(64),  allowNull: true },
    tuition_fee:       { type: DataTypes.FLOAT,        allowNull: false, defaultValue: 0 },
    description:       { type: DataTypes.TEXT,         allowNull: true },
    device_id:         { type: DataTypes.STRING(36),   allowNull: true },
    deleted_at:        { type: DataTypes.DATE,         allowNull: true },
    client_created_at: { type: DataTypes.STRING(30),   allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),   allowNull: true },
}, {
    sequelize,
    tableName: 'school_classes_typed',
    timestamps: true,
    indexes: [
        { fields: ['school_id'] },
    ],
});

export default Classe;
