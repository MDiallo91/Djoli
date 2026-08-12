import Eleve from '../../models/eleveModel';
import Classe from '../../models/classeModel';
import Inscription from '../../models/inscriptionModel';
import NoteEleve from '../../models/noteEleveModel';
import Matiere from '../../models/matiereModel';
import ClasseMatiere from '../../models/classeMatiereModel';
import InfoEcole from '../../models/infoEcoleModel';
import { listSchoolYears, resolveYear } from './anneesScolairesService';
import { httpError } from './typedCrud';

const TERMS = ['T1', 'T2', 'T3'];

// Port fidèle de l'ancien getStudentBulletin (schoolController.ts).
export async function getStudentBulletin(schoolId: string, studentId: string, yearId?: string) {
    const [student, classes, enrollments, schoolYears, grades, subjects, classSubjects, schoolInfoRows, activeYear] = await Promise.all([
        Eleve.findOne({ where: { id: studentId, school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any>,
        Classe.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any[]>,
        Inscription.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any[]>,
        listSchoolYears(schoolId),
        NoteEleve.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any[]>,
        Matiere.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any[]>,
        ClasseMatiere.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any[]>,
        InfoEcole.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any[]>,
        resolveYear(schoolId, yearId),
    ]);

    if (!student) throw httpError(404, 'Élève introuvable');

    const enrollment = enrollments.find(e => e.student_id === studentId && (!activeYear || e.school_year_id === activeYear.id));
    const cls = enrollment ? classes.find(c => c.id === enrollment.class_id) : null;

    const cs = cls ? classSubjects.filter(cs => cs.class_id === cls.id) : [];
    const studentGrades = grades.filter(g => g.student_id === studentId && (!activeYear || g.school_year_id === activeYear?.id));

    const subjectResults = cs.map(c => {
        const sub = subjects.find(s => s.id === c.subject_id);
        if (!sub) return null;
        const result: any = { subject_id: sub.id, name: sub.name, coefficient: c.coefficient || 1, grades: {} as Record<string, any> };
        for (const term of TERMS) {
            const devoir = studentGrades.find(g => g.subject_id === sub.id && g.term === term && g.exam_type === 'Devoir');
            const compo  = studentGrades.find(g => g.subject_id === sub.id && g.term === term && g.exam_type === 'Composition');
            const moy    = studentGrades.find(g => g.subject_id === sub.id && g.term === term && g.exam_type === 'Moyenne');
            const calcMoy = moy?.score ?? (devoir && compo
                ? (Number(devoir.score) + Number(compo.score) * 2) / 3
                : (devoir?.score ?? compo?.score ?? null));
            result.grades[term] = { devoir: devoir?.score ?? null, composition: compo?.score ?? null, moyenne: calcMoy !== null ? Number(Number(calcMoy).toFixed(2)) : null };
        }
        return result;
    }).filter(Boolean) as any[];

    const termAverages: Record<string, number | null> = {};
    for (const term of TERMS) {
        let tw = 0, tc = 0;
        for (const sr of subjectResults) {
            const m = sr.grades[term]?.moyenne;
            if (m !== null && m !== undefined) { tw += m * sr.coefficient; tc += sr.coefficient; }
        }
        termAverages[term] = tc > 0 ? Number((tw / tc).toFixed(2)) : null;
    }

    const rankings: Record<string, number | null> = {};
    const classEnrollmentIds = cls
        ? enrollments.filter(e => e.class_id === cls.id && (!activeYear || e.school_year_id === activeYear?.id)).map(e => e.student_id)
        : [];

    for (const term of TERMS) {
        const classAvgs = classEnrollmentIds.map(sid => {
            let tw = 0, tc = 0;
            for (const sr of subjectResults) {
                const g = grades.find(g => g.student_id === sid && g.subject_id === sr.subject_id && g.term === term && g.exam_type === 'Moyenne');
                if (g) { tw += Number(g.score) * sr.coefficient; tc += sr.coefficient; }
            }
            return { student_id: sid, avg: tc > 0 ? tw / tc : null };
        }).filter(x => x.avg !== null).sort((a, b) => (b.avg as number) - (a.avg as number));
        const rank = classAvgs.findIndex(x => x.student_id === studentId);
        rankings[term] = rank >= 0 ? rank + 1 : null;
    }

    const validTermAvgs = TERMS.map(t => termAverages[t]).filter(v => v !== null) as number[];
    const annualAvg = validTermAvgs.length > 0 ? Number((validTermAvgs.reduce((a, b) => a + b, 0) / validTermAvgs.length).toFixed(2)) : null;

    return {
        student, class: cls || null, year: activeYear, enrollment: enrollment || null,
        subjectResults, termAverages, annualAvg, rankings,
        classSize: classEnrollmentIds.length,
        schoolInfo: schoolInfoRows[0] || null,
        schoolYears,
    };
}
