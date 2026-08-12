import Matiere from '../../models/matiereModel';
import ClasseMatiere from '../../models/classeMatiereModel';
import { createTypedCrud, httpError } from './typedCrud';

export interface SubjectJson {
    id: string; name: string; coefficient: number; level: string | null; created_at: string | null;
}
export interface ClassSubjectJson {
    id: string; class_id: string; subject_id: string; coefficient: number; created_at: string | null;
}

const subjectToJson = (row: any): SubjectJson => ({
    id: row.id, name: row.name, coefficient: row.coefficient, level: row.level, created_at: row.client_created_at,
});
const classSubjectToJson = (row: any): ClassSubjectJson => ({
    id: row.id, class_id: row.class_id, subject_id: row.subject_id, coefficient: row.coefficient, created_at: row.client_created_at,
});

const subjectsCrud      = createTypedCrud<SubjectJson>({ entityType: 'subject', model: Matiere, toJson: subjectToJson });
const classSubjectsCrud = createTypedCrud<ClassSubjectJson>({ entityType: 'class_subject', model: ClasseMatiere, toJson: classSubjectToJson });

// ── Matières ─────────────────────────────────────────────────────────────
export async function listSubjects(schoolId: string): Promise<SubjectJson[]> {
    const subjects = await subjectsCrud.list(schoolId);
    return subjects.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function createSubject(schoolId: string, body: any): Promise<SubjectJson> {
    const { name, coefficient, level } = body;
    if (!name) throw httpError(400, 'Nom requis');
    return subjectsCrud.create(schoolId, { name, coefficient: coefficient || 1, level: level || null });
}

export async function deleteSubject(schoolId: string, id: string): Promise<void> {
    await subjectsCrud.softDelete(schoolId, id);
}

// ── Associations classe ↔ matière ────────────────────────────────────────
export async function listClassSubjects(schoolId: string, classId?: string): Promise<ClassSubjectJson[]> {
    const all = await classSubjectsCrud.list(schoolId);
    return classId ? all.filter(cs => cs.class_id === classId) : all;
}

export async function createClassSubject(schoolId: string, body: any): Promise<ClassSubjectJson> {
    const { class_id, subject_id, coefficient } = body;
    if (!class_id || !subject_id) throw httpError(400, 'Champs requis manquants');
    return classSubjectsCrud.create(schoolId, { class_id, subject_id, coefficient: coefficient || 1 });
}

export async function deleteClassSubject(schoolId: string, id: string): Promise<void> {
    await classSubjectsCrud.softDelete(schoolId, id);
}
