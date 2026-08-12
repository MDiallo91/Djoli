import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/db';

// Miroir typé de l'entité "payment" synchronisée depuis le desktop (frais de
// scolarité élève → école) — à ne pas confondre avec `Payment` (abonnement
// SaaS école → DJOLI, table `payments`).
//
// `school_records` reste la source de vérité pour la mécanique de sync
// (push/pull/conflits) ; cette table est alimentée en best-effort par
// syncController.pushChanges et sert au reporting cloud — pouvoir faire une
// requête SQL directe ("retards de paiement toutes écoles") sans charger et
// parser du JSON.
class PaiementEleve extends Model {
    declare id:                string; // entity_id envoyé par le desktop (id local du paiement)
    declare school_id:         string;
    declare student_id:        string | null;
    declare amount:             number | null;
    declare payment_method:     string | null;
    declare description:        string | null;
    declare school_year_id:     string | null;
    declare months:              string | null;
    declare payment_date:        string | null;
    declare device_id:           string | null;
    declare deleted_at:          Date | null;
    declare client_created_at:   string | null;
    declare client_updated_at:   string | null; // updated_at tel qu'envoyé par le desktop
    declare readonly updatedAt:  Date;           // "reçu par le cloud à" (auto Sequelize)
}

PaiementEleve.init({
    id:                { type: DataTypes.STRING(36), primaryKey: true },
    school_id:         { type: DataTypes.STRING(36), allowNull: false },
    student_id:        { type: DataTypes.STRING(36), allowNull: true },
    amount:            { type: DataTypes.FLOAT,       allowNull: true },
    payment_method:    { type: DataTypes.STRING(64),  allowNull: true },
    description:       { type: DataTypes.TEXT,        allowNull: true },
    school_year_id:    { type: DataTypes.STRING(36),  allowNull: true },
    months:            { type: DataTypes.TEXT,        allowNull: true },
    payment_date:      { type: DataTypes.STRING(30),  allowNull: true },
    device_id:         { type: DataTypes.STRING(36),  allowNull: true },
    deleted_at:        { type: DataTypes.DATE,        allowNull: true },
    client_created_at: { type: DataTypes.STRING(30),  allowNull: true },
    client_updated_at: { type: DataTypes.STRING(30),  allowNull: true },
}, {
    sequelize,
    tableName: 'student_payments',
    timestamps: true,
    indexes: [
        { fields: ['school_id', 'student_id'] },
        { fields: ['school_id', 'school_year_id'] },
    ],
});

export default PaiementEleve;
