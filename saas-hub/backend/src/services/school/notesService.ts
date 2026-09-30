import { randomUUID } from 'crypto';
import NoteEleve from '../../models/noteEleveModel';
import Inscription from '../../models/inscriptionModel';
import Eleve from '../../models/eleveModel';
import Classe from '../../models/classeModel';
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

// Barème par niveau — mêmes valeurs par défaut que le desktop (schoolService
// DEFAULT_GRADING_CONFIGS / gradeService) : maternelle & primaire sur 10, sinon sur 20.
const scaleForLevel = (level: string | null | undefined) => ['Maternelle', 'Primaire'].includes(level ?? '') ? 10 : 20;

/** Refuse toute note hors barème (négative, ou au-dessus de /10 ou /20 selon la classe de l'élève cette année-là). */
async function assertScoresInScale(schoolId: string, grades: any[]): Promise<void> {
    const toCheck = grades.filter(g => g.score !== null && g.score !== undefined && g.score !== '');
    if (!toCheck.length) return;
    const [enrollments, classes] = await Promise.all([
        Inscription.findAll({ where: { school_id: schoolId, deleted_at: null, student_id: [...new Set(toCheck.map(g => g.student_id))] }, raw: true }) as Promise<any[]>,
        Classe.findAll({ where: { school_id: schoolId, deleted_at: null }, attributes: ['id', 'level'], raw: true }) as Promise<any[]>,
    ]);
    const levelOf = new Map(classes.map(c => [c.id, c.level]));
    for (const g of toCheck) {
        const score = Number(g.score);
        const enr = enrollments.find(e => e.student_id === g.student_id && (!g.school_year_id || e.school_year_id === g.school_year_id))
            ?? enrollments.find(e => e.student_id === g.student_id);
        const max = scaleForLevel(enr ? levelOf.get(enr.class_id) : null);
        if (!Number.isFinite(score) || score < 0 || score > max) {
            throw httpError(400, `Note invalide (${g.score}) : elle doit être comprise entre 0 et ${max} pour cette classe.`);
        }
    }
}

export async function saveGradesBulk(schoolId: string, grades: any[]): Promise<number> {
    if (!Array.isArray(grades)) throw httpError(400, 'Format invalide');
    await assertScoresInScale(schoolId, grades);
    for (const g of grades) {
        const id = g.id || randomUUID();
        await writeEntity(schoolId, 'grade', id, { ...g, id, updated_at_ms: Date.now() });
    }
    return grades.length;
}

export async function deleteGrade(schoolId: string, id: string): Promise<void> {
    await softDeleteEntity(schoolId, 'grade', id);
}
