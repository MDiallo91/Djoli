import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "class_subject" (association classe ↔ matière) synchronisée depuis le desktop.
class ClasseMatiere extends Model {
    declare id:                string;
    declare school_id:         string;
    declare class_id:           string;
    declare subject_id:         string;
    declare coefficient:         number;
    declare device_id:           string | null;
    declare deleted_at:          Date | null;
    declare client_created_at:   string | null;
    declare client_updated_at:   string | null;
}

ClasseMatiere.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    class_id:          { type: DataTypes.STRING(36), allowNull: false },
    subject_id:        { type: DataTypes.STRING(36), allowNull: false },
    coefficient:       { type: DataTypes.FLOAT,       allowNull: false, defaultValue: 1 },
    device_id:         { type: DataTypes.STRING(36),  allowNull: true },
    deleted_at:        { type: DataTypes.DATE,        allowNull: true },
    client_created_at: { type: DataTypes.STRING(30),  allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),  allowNull: true },
}, {
    sequelize,
    tableName: 'class_subjects_typed',
    timestamps: true,
    indexes: [
        { fields: ['school_id', 'class_id'] },
    ],
});

export default ClasseMatiere;
