import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "grade" synchronisée depuis le desktop.
// Même logique que PaiementEleve : `school_records` reste la source de
// vérité pour la sync, cette table sert au reporting cloud (SQL direct).
class NoteEleve extends Model {
    declare id:                string; // entity_id envoyé par le desktop (id local de la note)
    declare school_id:         string;
    declare student_id:        string | null;
    declare subject_id:        string | null;
    declare score:              number | null;
    declare exam_type:          string | null;
    declare term:                string | null;
    declare school_year_id:     string | null;
    declare device_id:           string | null;
    declare deleted_at:          Date | null;
    declare client_created_at:   string | null;
    declare client_updated_at:   string | null;
    declare readonly updatedAt:  Date;
}

NoteEleve.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    student_id:        { type: DataTypes.STRING(36), allowNull: true },
    subject_id:        { type: DataTypes.STRING(36), allowNull: true },
    score:             { type: DataTypes.FLOAT,       allowNull: true },
    exam_type:         { type: DataTypes.STRING(64),  allowNull: true },
    term:              { type: DataTypes.STRING(64),  allowNull: true },
    school_year_id:    { type: DataTypes.STRING(36),  allowNull: true },
    device_id:         { type: DataTypes.STRING(36),  allowNull: true },
    deleted_at:        { type: DataTypes.DATE,        allowNull: true },
    client_created_at: { type: DataTypes.STRING(30),  allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),  allowNull: true },
}, {
    sequelize,
    tableName: 'student_grades',
    timestamps: true,
    indexes: [
        { fields: ['school_id', 'student_id'] },
        { fields: ['school_id', 'subject_id'] },
    ],
});

export default NoteEleve;
