import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "student" synchronisée depuis le desktop.
class Eleve extends Model {
    declare id:                string;
    declare school_id:         string;
    declare first_name:         string;
    declare last_name:           string;
    declare gender:               string | null;
    declare birth_date:           string | null;
    declare phone:                 string | null;
    declare address:               string | null;
    declare matricule:             string | null;
    declare pere:                  string | null;
    declare mere:                  string | null;
    declare birth_place:           string | null;
    declare tutor_name:            string | null;
    declare tutor_phone:           string | null;
    declare photo_url:             string | null;
    declare device_id:             string | null;
    declare deleted_at:            Date | null;
    declare client_created_at:     string | null;
    declare client_updated_at:     string | null;
}

Eleve.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    first_name:        { type: DataTypes.STRING(128), allowNull: false },
    last_name:         { type: DataTypes.STRING(128), allowNull: false },
    gender:            { type: DataTypes.STRING(8),   allowNull: true },
    birth_date:        { type: DataTypes.STRING(30),  allowNull: true },
    phone:             { type: DataTypes.STRING(32),  allowNull: true },
    address:           { type: DataTypes.TEXT,        allowNull: true },
    matricule:         { type: DataTypes.STRING(64),  allowNull: true },
    // Filiation / tuteur / lieu de naissance — utilisés par les cartes scolaires.
    // Colonnes ajoutées après coup : migration + rattrapage dans config/db.ts.
    pere:              { type: DataTypes.STRING(128), allowNull: true },
    mere:              { type: DataTypes.STRING(128), allowNull: true },
    birth_place:       { type: DataTypes.STRING(128), allowNull: true },
    tutor_name:        { type: DataTypes.STRING(128), allowNull: true },
    tutor_phone:       { type: DataTypes.STRING(32),  allowNull: true },
    photo_url:         { type: DataTypes.TEXT,        allowNull: true }, // /api/media/<id> (image stockée en base)
    device_id:         { type: DataTypes.STRING(36),  allowNull: true },
    deleted_at:        { type: DataTypes.DATE,        allowNull: true },
    client_created_at: { type: DataTypes.STRING(30),  allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),  allowNull: true },
}, {
    sequelize,
    tableName: 'students_typed',
    timestamps: true,
    indexes: [
        { fields: ['school_id'] },
        { fields: ['school_id', 'last_name'] },
    ],
});

export default Eleve;
