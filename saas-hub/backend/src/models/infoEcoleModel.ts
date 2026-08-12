import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "school_info" synchronisée depuis le desktop
// (une ligne par école — utilisée pour l'en-tête des bulletins).
class InfoEcole extends Model {
    declare id:                string;
    declare school_id:         string;
    declare name:                string | null;
    declare address:             string | null;
    declare phone:               string | null;
    declare email:                string | null;
    declare logo_url:             string | null;
    declare motto:                string | null;
    declare city:                  string | null;
    declare region:                string | null;
    declare commune:               string | null;
    declare sous_prefecture:       string | null;
    declare device_id:             string | null;
    declare deleted_at:            Date | null;
    declare client_updated_at:     string | null;
}

InfoEcole.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    name:              { type: DataTypes.STRING(255), allowNull: true },
    address:           { type: DataTypes.TEXT,        allowNull: true },
    phone:             { type: DataTypes.STRING(32),  allowNull: true },
    email:             { type: DataTypes.STRING(255), allowNull: true },
    logo_url:          { type: DataTypes.TEXT,         allowNull: true },
    motto:             { type: DataTypes.STRING(255), allowNull: true },
    city:              { type: DataTypes.STRING(128), allowNull: true },
    region:            { type: DataTypes.STRING(128), allowNull: true },
    commune:           { type: DataTypes.STRING(128), allowNull: true },
    sous_prefecture:   { type: DataTypes.STRING(128), allowNull: true },
    device_id:         { type: DataTypes.STRING(36),  allowNull: true },
    deleted_at:        { type: DataTypes.DATE,        allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),  allowNull: true },
}, {
    sequelize,
    tableName: 'school_info_typed',
    timestamps: true,
    indexes: [
        { fields: ['school_id'] },
    ],
});

export default InfoEcole;
