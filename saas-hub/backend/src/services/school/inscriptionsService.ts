import Inscription from '../../models/inscriptionModel';
import { createTypedCrud, httpError } from './typedCrud';

export interface EnrollmentJson {
    id: string; student_id: string; class_id: string; school_year_id: string;
    registration_date: string | null;
}

const toJson = (row: any): EnrollmentJson => ({
    id: row.id, student_id: row.student_id, class_id: row.class_id,
    school_year_id: row.school_year_id, registration_date: row.registration_date,
});

const crud = createTypedCrud<EnrollmentJson>({ entityType: 'enrollment', model: Inscription, toJson });

export async function listEnrollments(schoolId: string): Promise<EnrollmentJson[]> {
    return crud.list(schoolId);
}

export async function listEnrollmentsFiltered(schoolId: string, classId?: string, yearId?: string): Promise<EnrollmentJson[]> {
    const all = await crud.list(schoolId);
    return all.filter(e => (!classId || e.class_id === classId) && (!yearId || e.school_year_id === yearId));
}

export async function createEnrollment(schoolId: string, body: any): Promise<EnrollmentJson> {
    const { student_id, class_id, school_year_id } = body;
    if (!student_id || !class_id || !school_year_id) throw httpError(400, 'Champs requis manquants');
    const existing = await crud.list(schoolId);
    if (existing.find(e => e.student_id === student_id && e.school_year_id === school_year_id)) {
        throw httpError(400, 'Élève déjà inscrit pour cette année scolaire');
    }
    return crud.create(schoolId, { student_id, class_id, school_year_id, registration_date: new Date().toISOString() });
}

export async function deleteEnrollment(schoolId: string, id: string): Promise<void> {
    await crud.softDelete(schoolId, id);
}
