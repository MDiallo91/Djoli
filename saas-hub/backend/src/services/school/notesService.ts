import { randomUUID } from 'crypto';
import NoteEleve from '../../models/noteEleveModel';
import Inscription from '../../models/inscriptionModel';
import Eleve from '../../models/eleveModel';
import { writeEntity, softDeleteEntity } from '../../sync/entityRegistry';
import { httpError } from './typedCrud';

export interface GradeJson {
    id: string; student_id: string; subject_id: string; score: number | null;
    exam_type: string; term: string; school_year_id: string | null;
    created_at: string | null; updated_at: string | null;
}

const toJson = (row: any): GradeJson => ({
    id: row.id, student_id: row.student_id, subject_id: row.subject_id, score: row.score,
    exam_type: row.exam_type, term: row.term, school_year_id: row.school_year_id,
    created_at: row.client_created_at, updated_at: row.client_updated_at,
});

export interface GradeFilters { classId?: string; subjectId?: string; term?: string; yearId?: string; studentId?: string; }

export async function listGrades(schoolId: string, filters: GradeFilters) {
    const { classId, subjectId, term, yearId, studentId } = filters;
    const [grades, enrollments, students] = await Promise.all([
        NoteEleve.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        Inscription.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        Eleve.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
    ]);

    const studentMap = new Map((students as any[]).map(s => [s.id, s]));
    let classStudentIds: Set<string> | null = null;
    if (classId) {
        classStudentIds = new Set(
            (enrollments as any[])
                .filter(e => e.class_id === classId && (!yearId || e.school_year_id === yearId))
                .map(e => e.student_id),
        );
    }

    const filtered = (grades as any[]).filter(g =>
        (!subjectId || g.subject_id === subjectId) &&
        (!term || g.term === term) &&
        (!yearId || g.school_year_id === yearId) &&
        (!studentId || g.student_id === studentId) &&
        (!classStudentIds || classStudentIds.has(g.student_id)),
    );

    return filtered.map(g => ({ ...toJson(g), student: studentMap.get(g.student_id) || null }));
}

export async function saveGradesBulk(schoolId: string, grades: any[]): Promise<number> {
    if (!Array.isArray(grades)) throw httpError(400, 'Format invalide');
    for (const g of grades) {
        const id = g.id || randomUUID();
        await writeEntity(schoolId, 'grade', id, { ...g, id, updated_at_ms: Date.now() });
    }
    return grades.length;
}

export async function deleteGrade(schoolId: string, id: string): Promise<void> {
    await softDeleteEntity(schoolId, 'grade', id);
}
