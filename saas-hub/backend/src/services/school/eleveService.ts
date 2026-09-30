import Eleve from '../../models/eleveModel';
import Classe from '../../models/classeModel';
import Inscription from '../../models/inscriptionModel';
import PaiementEleve from '../../models/paiementEleveModel';
import { createTypedCrud, httpError } from './typedCrud';
import { listSchoolYears, resolveYear } from './anneesScolairesService';
import { createEnrollment } from './inscriptionsService';
import { cleanupUnusedMedia } from '../mediaService';

export interface StudentJson {
    id: string; first_name: string; last_name: string; gender: string; birth_date: string | null;
    phone: string; address: string; matricule: string; created_at: string | null;
    pere: string; mere: string; birth_place: string; tutor_name: string; tutor_phone: string; photo_url: string;
}

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

const toJson = (row: any): StudentJson => ({
    id: row.id, first_name: row.first_name, last_name: row.last_name, gender: row.gender || 'M',
    birth_date: row.birth_date, phone: row.phone || '', address: row.address || '',
    matricule: row.matricule || '', created_at: row.client_created_at,
    pere: row.pere || '', mere: row.mere || '', birth_place: row.birth_place || '',
    tutor_name: row.tutor_name || '', tutor_phone: row.tutor_phone || '', photo_url: row.photo_url || '',
});

const crud = createTypedCrud<StudentJson>({ entityType: 'student', model: Eleve, toJson });

/** Élèves ayant un paiement couvrant `monthName`, parmi la liste de paiements donnée. */
function paidStudentIds(payments: any[], monthName: string): Set<string> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return new Set(
        payments.filter(p => {
            if (p.months) {
                try {
                    const m = typeof p.months === 'string' ? JSON.parse(p.months) : p.months;
                    if (Array.isArray(m) && m.includes(monthName)) return true;
                } catch {}
            }
            const d = new Date(p.payment_date || p.created_at || 0);
            return d >= startOfMonth && d < endOfMonth;
        }).map(p => p.student_id),
    );
}

// GET /students — vue liste, toujours sur l'année active (comportement d'origine).
export async function listStudentsSummary(schoolId: string) {
    const [students, classes, enrollments, payments, schoolYears] = await Promise.all([
        Eleve.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        Classe.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        Inscription.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        PaiementEleve.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        listSchoolYears(schoolId),
    ]);

    const classMap = new Map((classes as any[]).map(c => [c.id, c]));
    const activeYear = schoolYears.find(y => y.is_active === 1) || schoolYears[0] || null;
    const currentMonthName = MOIS_FR[new Date().getMonth()];
    const paidIds = paidStudentIds(payments as any[], currentMonthName);

    const enrollmentMap = new Map<string, any>();
    for (const e of enrollments as any[]) {
        if (!activeYear || e.school_year_id === activeYear.id) enrollmentMap.set(e.student_id, e);
    }

    const result = (students as any[])
        .map(toJson)
        .map(s => {
            const enrollment = enrollmentMap.get(s.id);
            const cls = enrollment ? classMap.get(enrollment.class_id) : null;
            return {
                id: s.id, first_name: s.first_name, last_name: s.last_name, gender: s.gender,
                matricule: s.matricule, phone: s.phone, class_name: cls?.name || null,
                has_paid: paidIds.has(s.id),
            };
        })
        .sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr'));

    return { students: result, total: result.length, year: activeYear ? { id: activeYear.id, name: activeYear.name } : null, currentMonth: currentMonthName };
}

// GET /students/detailed?yearId= — vue gestion, année demandée ou active.
export async function listStudentsDetailed(schoolId: string, yearId?: string) {
    const [students, classes, enrollments, payments, activeYear] = await Promise.all([
        Eleve.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        Classe.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        Inscription.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        PaiementEleve.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        resolveYear(schoolId, yearId),
    ]);

    const classMap = new Map((classes as any[]).map(c => [c.id, c]));
    const enrollmentMap = new Map<string, any>();
    for (const e of enrollments as any[]) {
        if (!activeYear || e.school_year_id === activeYear.id) enrollmentMap.set(e.student_id, e);
    }

    const currentMonthName = MOIS_FR[new Date().getMonth()];
    const paidIds = new Set(
        (payments as any[]).filter(p => (!activeYear || p.school_year_id === activeYear.id))
            .filter(p => {
                try {
                    const m = typeof p.months === 'string' ? JSON.parse(p.months) : (p.months || []);
                    return Array.isArray(m) && m.includes(currentMonthName);
                } catch { return false; }
            }).map(p => p.student_id),
    );

    const result = (students as any[]).map(toJson).map(s => {
        const enr = enrollmentMap.get(s.id);
        const cls = enr ? classMap.get(enr.class_id) : null;
        return { ...s, class_id: enr?.class_id || null, class_name: cls?.name || null, enrollment_id: enr?.id || null, has_paid: paidIds.has(s.id) };
    }).sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr'));

    return { students: result, year: activeYear, currentMonth: currentMonthName };
}

export async function createStudent(schoolId: string, body: any): Promise<StudentJson> {
    const { first_name, last_name, gender, birth_date, phone, address, matricule, class_id, school_year_id,
            pere, mere, birth_place, tutor_name, tutor_phone, photo_url } = body;
    if (!first_name || !last_name) throw httpError(400, 'Nom et prénom requis');

    const student = await crud.create(schoolId, {
        first_name, last_name, gender: gender || 'M', birth_date: birth_date || null,
        phone: phone || '', address: address || '', matricule: matricule || '',
        pere: pere || '', mere: mere || '', birth_place: birth_place || '',
        tutor_name: tutor_name || '', tutor_phone: tutor_phone || '', photo_url: photo_url || '',
    });
    if (class_id && school_year_id) {
        await createEnrollment(schoolId, { student_id: student.id, class_id, school_year_id });
    }
    return student;
}

export async function updateStudent(schoolId: string, id: string, body: any): Promise<StudentJson> {
    const student = await crud.find(schoolId, id);
    if (!student) throw httpError(404, 'Élève introuvable');
    const updated = (await crud.update(schoolId, id, body))!;
    // Photo remplacée ou retirée → l'ancienne image est supprimée si plus utilisée
    if (body.photo_url !== undefined && body.photo_url !== student.photo_url) await cleanupUnusedMedia(student.photo_url);
    return updated;
}

export async function deleteStudent(schoolId: string, id: string): Promise<void> {
    await crud.softDelete(schoolId, id);
}

export async function findStudent(schoolId: string, id: string): Promise<StudentJson | null> {
    return crud.find(schoolId, id);
}
