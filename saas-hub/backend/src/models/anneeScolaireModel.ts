import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "school_year" synchronisée depuis le desktop.
// Remplace le scan de `school_records` utilisé jusqu'ici par le web
// (voir saas-hub/backend/src/services/school/anneesScolairesService.ts).
class AnneeScolaire extends Model {
    declare id:                string; // entity_id venant du desktop
    declare school_id:         string;
    declare name:               string;
    declare start_date:         string | null;
    declare end_date:           string | null;
    declare is_active:          boolean;
    declare device_id:          string | null;
    declare deleted_at:         Date | null;
    declare client_created_at:  string | null;
    declare client_updated_at:  string | null;
}

AnneeScolaire.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    name:              { type: DataTypes.STRING(128), allowNull: false },
    start_date:        { type: DataTypes.STRING(30),  allowNull: true },
    end_date:          { type: DataTypes.STRING(30),  allowNull: true },
    is_active:         { type: DataTypes.BOOLEAN,     allowNull: false, defaultValue: false },
    device_id:         { type: DataTypes.STRING(36),  allowNull: true },
    deleted_at:        { type: DataTypes.DATE,        allowNull: true },
    client_created_at: { type: DataTypes.STRING(30),  allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),  allowNull: true },
}, {
    sequelize,
    tableName: 'school_years_typed',
    timestamps: true,
    indexes: [
        { fields: ['school_id'] },
        { fields: ['school_id', 'is_active'] },
    ],
});

export default AnneeScolaire;
