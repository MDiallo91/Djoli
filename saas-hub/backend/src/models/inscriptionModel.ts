import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "enrollment" (inscription élève ↔ classe ↔ année) synchronisée depuis le desktop.
class Inscription extends Model {
    declare id:                string;
    declare school_id:         string;
    declare student_id:         string;
    declare class_id:            string;
    declare school_year_id:      string;
    declare registration_date:   string | null;
    declare device_id:           string | null;
    declare deleted_at:          Date | null;
    declare client_created_at:   string | null;
    declare client_updated_at:   string | null;
}

Inscription.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    student_id:        { type: DataTypes.STRING(36), allowNull: false },
    class_id:          { type: DataTypes.STRING(36), allowNull: false },
    school_year_id:    { type: DataTypes.STRING(36), allowNull: false },
    registration_date: { type: DataTypes.STRING(30), allowNull: true },
    device_id:         { type: DataTypes.STRING(36), allowNull: true },
    deleted_at:        { type: DataTypes.DATE,       allowNull: true },
    client_created_at: { type: DataTypes.STRING(30), allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30), allowNull: true },
}, {
    sequelize,
    tableName: 'enrollments_typed',
    timestamps: true,
    indexes: [
        { fields: ['school_id', 'student_id'] },
        { fields: ['school_id', 'class_id'] },
        { fields: ['school_id', 'school_year_id'] },
    ],
});

export default Inscription;
