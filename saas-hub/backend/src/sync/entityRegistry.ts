import { Model, ModelStatic } from 'sequelize';
import SchoolRecord from '../models/schoolRecordModel';
import AnneeScolaire from '../models/anneeScolaireModel';
import Classe from '../models/classeModel';
import Matiere from '../models/matiereModel';
import ClasseMatiere from '../models/classeMatiereModel';
import Personnel from '../models/personnelModel';
import Eleve from '../models/eleveModel';
import Inscription from '../models/inscriptionModel';
import TransactionCaisse from '../models/transactionCaisseModel';
import InfoEcole from '../models/infoEcoleModel';
import PaiementEleve from '../models/paiementEleveModel';
import NoteEleve from '../models/noteEleveModel';
import UtilisateurEcole from '../models/utilisateurEcoleModel';

// ── Registre déclaratif des entités synchronisées ────────────────────────────
// `school_records` (JSON libre) reste la seule source de vérité pour le
// protocole de sync (push/pull/conflits) — rien ici n'en change le
// comportement. Ce registre pilote juste le *miroir typé* : pour chaque
// entité connue, on recopie le payload dans une vraie table SQL, pour que le
// reste du backend (API web, reporting) puisse faire de vraies requêtes
// plutôt que de scanner/parser du JSON à chaque appel (voir services/school/*.ts).
//
// Ajouter une entité = ajouter une entrée ici + son modèle dans models/ —
// aucune autre partie du sync (push/pull/reset) n'a besoin d'être modifiée.
export interface EntityRegistryEntry {
    entityType: string;
    model:      ModelStatic<Model>;
    /** Entités "critiques" : détection de conflit multi-device dans pushChanges. */
    critical:   boolean;
    /** Construit les colonnes typées à partir du payload JSON envoyé par le desktop/web. */
    mapPayload: (payload: Record<string, any>) => Record<string, any>;
}

const isoOrNull = (v: any): string | null => (v == null ? null : String(v));

export const entityRegistry: EntityRegistryEntry[] = [
    {
        entityType: 'school_year', model: AnneeScolaire, critical: false,
        mapPayload: p => ({
            name: p.name ?? null, start_date: p.start_date ?? null, end_date: p.end_date ?? null,
            is_active: !!p.is_active,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        entityType: 'class', model: Classe, critical: false,
        mapPayload: p => ({
            name: p.name ?? null, level: p.level ?? null, tuition_fee: p.tuition_fee ?? 0, description: p.description ?? null,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        entityType: 'subject', model: Matiere, critical: false,
        mapPayload: p => ({
            name: p.name ?? null, coefficient: p.coefficient ?? 1, level: p.level ?? null,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        entityType: 'class_subject', model: ClasseMatiere, critical: false,
        mapPayload: p => ({
            class_id: p.class_id ?? null, subject_id: p.subject_id ?? null, coefficient: p.coefficient ?? 1,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        entityType: 'staff', model: Personnel, critical: false,
        mapPayload: p => ({
            first_name: p.first_name ?? null, last_name: p.last_name ?? null, role: p.role ?? null,
            phone: p.phone ?? null, email: p.email ?? null, salary_base: p.salary_base ?? null, hire_date: p.hire_date ?? null,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        entityType: 'student', model: Eleve, critical: false,
        mapPayload: p => ({
            first_name: p.first_name ?? null, last_name: p.last_name ?? null, gender: p.gender ?? null,
            birth_date: p.birth_date ?? null, phone: p.phone ?? null, address: p.address ?? null, matricule: p.matricule ?? null,
            pere: p.pere ?? null, mere: p.mere ?? null, birth_place: p.birth_place ?? null,
            tutor_name: p.tutor_name ?? null, tutor_phone: p.tutor_phone ?? null, photo_url: p.photo_url ?? null,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        entityType: 'enrollment', model: Inscription, critical: false,
        mapPayload: p => ({
            student_id: p.student_id ?? null, class_id: p.class_id ?? null, school_year_id: p.school_year_id ?? null,
            registration_date: p.registration_date ?? null,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        entityType: 'cash_transaction', model: TransactionCaisse, critical: false,
        mapPayload: p => ({
            type: p.type ?? null, amount: p.amount ?? null, reason: p.reason ?? null, reference_id: p.reference_id ?? null,
            school_year_id: p.school_year_id ?? null,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        entityType: 'school_info', model: InfoEcole, critical: false,
        mapPayload: p => ({
            name: p.name ?? null, address: p.address ?? null, phone: p.phone ?? null, email: p.email ?? null,
            logo_url: p.logo_url ?? null, motto: p.motto ?? null, city: p.city ?? null, region: p.region ?? null,
            commune: p.commune ?? null, sous_prefecture: p.sous_prefecture ?? null,
            client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        entityType: 'payment', model: PaiementEleve, critical: true,
        mapPayload: p => ({
            student_id: p.student_id ?? null, amount: p.amount ?? null, payment_method: p.payment_method ?? null,
            description: p.description ?? null, school_year_id: p.school_year_id ?? null, months: p.months ?? null,
            payment_date: p.payment_date ?? null,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        entityType: 'grade', model: NoteEleve, critical: true,
        mapPayload: p => ({
            student_id: p.student_id ?? null, subject_id: p.subject_id ?? null, score: p.score ?? null,
            exam_type: p.exam_type ?? null, term: p.term ?? null, school_year_id: p.school_year_id ?? null,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
    {
        // Comptes/permissions du personnel d'école — password_hash/must_change_pwd ne sont
        // jamais envoyés par le desktop et n'apparaissent donc jamais ici (cf. userService.ts).
        entityType: 'school_user', model: UtilisateurEcole, critical: true,
        mapPayload: p => ({
            name: p.name ?? null, email: p.email ?? null, username: p.username ?? null,
            role: p.role ?? null, permissions: p.permissions ?? '[]', scope_levels: p.scope_levels ?? '[]',
            phone: p.phone ?? null, photo_url: p.photo_url ?? null, is_active: p.is_active ?? true,
            client_created_at: isoOrNull(p.created_at), client_updated_at: isoOrNull(p.updated_at),
        }),
    },
];

const byEntityType = new Map(entityRegistry.map(e => [e.entityType, e]));

export function getRegistryEntry(entityType: string): EntityRegistryEntry | undefined {
    return byEntityType.get(entityType);
}

export const CRITICAL_ENTITY_TYPES = new Set(entityRegistry.filter(e => e.critical).map(e => e.entityType));

// ── Écritures depuis le web (API cloud) ──────────────────────────────────────
// Même principe que le miroir de sync (syncController.mirrorTypedEntity) mais
// pour les écritures faites directement par l'API web (services/school/*.ts)
// plutôt que par un push desktop. Écrit dans `school_records` (device_id
// 'web', comme avant la refonte) ET dans la table typée du registre — pour
// qu'un changement fait depuis le web redescende vers le desktop au prochain
// pull, exactement comme avant, sans rien changer côté desktop.
export async function writeEntity(
    schoolId:   string,
    entityType: string,
    entityId:   string,
    data:       Record<string, any>,
    deviceId:   string = 'web',
): Promise<void> {
    await SchoolRecord.upsert({
        school_id: schoolId, entity_type: entityType, entity_id: entityId,
        data: JSON.stringify(data), device_id: deviceId, operation: 'UPDATE', deleted_at: null,
    } as any);

    const entry = getRegistryEntry(entityType);
    if (!entry) return;
    try {
        await entry.model.upsert({
            id: entityId, school_id: schoolId, device_id: deviceId, deleted_at: null,
            ...entry.mapPayload(data),
        });
    } catch (err) {
        console.error(`[entityRegistry writeEntity] Miroir typé échoué pour ${entityType}/${entityId}:`, err);
    }
}

export async function softDeleteEntity(schoolId: string, entityType: string, entityId: string): Promise<void> {
    await SchoolRecord.update(
        { deleted_at: new Date(), data: null, operation: 'DELETE' } as any,
        { where: { school_id: schoolId, entity_type: entityType, entity_id: entityId } },
    );
    const entry = getRegistryEntry(entityType);
    if (!entry) return;
    try {
        await entry.model.update({ deleted_at: new Date() }, { where: { id: entityId, school_id: schoolId } });
    } catch (err) {
        console.error(`[entityRegistry softDeleteEntity] Miroir typé échoué pour ${entityType}/${entityId}:`, err);
    }
}
