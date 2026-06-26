import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { fn, col } from 'sequelize';
import UserModel from '../models/userModel';
import SchoolRecord from '../models/schoolRecordModel';

export const getProfile = async (req: Request, res: Response) => {
    try {
        const user = await UserModel.findByPk(req.user!.id, {
            attributes: { exclude: ['password'] },
        });
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
        res.json(user);
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
    try {
        const user = await UserModel.findByPk(req.user!.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

        const allowed = ['schoolName', 'directorName', 'country', 'city', 'prefecture', 'sousPrefecture', 'rccm', 'logoUrl'];
        for (const field of allowed) {
            if (req.body[field] !== undefined) (user as any)[field] = req.body[field];
        }
        if (req.body.levels !== undefined) {
            user.levels = JSON.stringify(req.body.levels);
        }

        await user.save();
        const { password: _pw, levels: levelsRaw, ...rest } = user.toJSON() as any;
        let levelsArr: string[] = [];
        try { levelsArr = JSON.parse(levelsRaw || '[]'); } catch {}
        res.json({ ...rest, levels: levelsArr });
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

export const getSchoolStats = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;

        const rows = await SchoolRecord.findAll({
            where: { school_id: schoolId, deleted_at: null },
            attributes: ['entity_type', [fn('COUNT', col('id')), 'count']],
            group: ['entity_type'],
            raw: true,
        });

        const lastRecord = await SchoolRecord.findOne({
            where: { school_id: schoolId },
            order: [['updatedAt', 'DESC']],
            attributes: ['updatedAt'],
        });

        const counts: Record<string, number> = {};
        for (const row of rows as any[]) {
            counts[row.entity_type] = parseInt(row.count, 10);
        }

        res.json({ counts, lastSyncAt: lastRecord?.updatedAt ?? null });
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;

        const records = await SchoolRecord.findAll({
            where: { school_id: schoolId, deleted_at: null },
            attributes: ['entity_type', 'entity_id', 'data'],
            raw: true,
        });

        const cashTransactions: any[] = [];
        const payments: any[] = [];
        const students = new Map<string, any>();
        const enrollments: any[] = [];

        for (const rec of records as any[]) {
            if (!rec.data) continue;
            let data: any;
            try { data = JSON.parse(rec.data); } catch { continue; }
            switch (rec.entity_type) {
                case 'cash_transaction': cashTransactions.push(data); break;
                case 'payment':          payments.push(data); break;
                case 'student':          students.set(rec.entity_id, data); break;
                case 'enrollment':       enrollments.push(data); break;
            }
        }

        // Infer the active school year from payments (the year with the most payment records)
        // This ensures the financial summary reflects the current operational year, not orphaned
        // transactions created outside any school year context.
        const yearCount = new Map<string, number>();
        for (const p of payments) {
            if (p.school_year_id) yearCount.set(p.school_year_id, (yearCount.get(p.school_year_id) ?? 0) + 1);
        }
        const activeYearId = yearCount.size > 0
            ? [...yearCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
            : null;

        // Filter cash transactions: prefer active school year; fall back to all if no year data
        const activeCash = activeYearId
            ? cashTransactions.filter(t => t.school_year_id === activeYearId)
            : cashTransactions;

        // Totaux financiers — scoped to the active school year
        const totalIn  = activeCash.filter(t => t.type === 'IN').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const totalOut = activeCash.filter(t => t.type === 'OUT').reduce((s, t) => s + (Number(t.amount) || 0), 0);

        // Flux mensuel — 6 derniers mois
        const now = new Date();
        const monthlyData = [];
        for (let i = 5; i >= 0; i--) {
            const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const to   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
            const key  = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`;
            const inMonth  = (type: 'IN' | 'OUT') => activeCash
                .filter(t => {
                    if (t.type !== type) return false;
                    const d = new Date(t.date || t.created_at || t.updated_at || 0);
                    return d >= from && d < to;
                })
                .reduce((s, t) => s + (Number(t.amount) || 0), 0);
            monthlyData.push({ month: key, total_in: inMonth('IN'), total_out: inMonth('OUT') });
        }

        // Recouvrement filtré sur le mois en cours
        const now2 = new Date();
        const startOfMonth = new Date(now2.getFullYear(), now2.getMonth(), 1);
        const endOfMonth   = new Date(now2.getFullYear(), now2.getMonth() + 1, 1);
        const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                         'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        const currentMonthName = MOIS_FR[now2.getMonth()];

        const enrolledIds = new Set(enrollments.map((e: any) => e.student_id));

        // Un élève est "payé ce mois" si un paiement couvre le mois courant
        // Priorité : champ months[] (noms FR) ; fallback : payment_date dans le mois
        const currentMonthPaidIds = new Set(
            payments
                .filter((p: any) => {
                    if (p.months) {
                        try {
                            const m = typeof p.months === 'string' ? JSON.parse(p.months) : p.months;
                            if (Array.isArray(m) && m.includes(currentMonthName)) return true;
                        } catch {}
                    }
                    const d = new Date(p.payment_date || p.created_at || 0);
                    return d >= startOfMonth && d < endOfMonth;
                })
                .map((p: any) => p.student_id)
        );

        const totalStudents = enrolledIds.size;
        const paidStudents  = [...enrolledIds].filter(id => currentMonthPaidIds.has(id)).length;

        // Élèves sans paiement ce mois (max 8)
        const lateIds = [...enrolledIds].filter(id => !currentMonthPaidIds.has(id)).slice(0, 8);
        const latePayers = lateIds.map(id => {
            const s = students.get(id);
            return {
                first_name:   s?.first_name   || '?',
                last_name:    s?.last_name    || '?',
                parent_phone: s?.phone        || null,
            };
        });

        res.json({
            totalIn,
            totalOut,
            balance: totalIn - totalOut,
            monthlyData,
            totalStudents,
            paidStudents,
            recoveryRate: totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 0,
            latePayers,
            currentMonth: currentMonthName,
        });
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

export const getStudents = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;

        const records = await SchoolRecord.findAll({
            where: { school_id: schoolId, deleted_at: null },
            attributes: ['entity_type', 'entity_id', 'data'],
            raw: true,
        });

        const students: any[]            = [];
        const classes   = new Map<string, any>();
        const enrollments: any[]         = [];
        const payments: any[]            = [];
        const schoolYears: any[]         = [];

        for (const rec of records as any[]) {
            if (!rec.data) continue;
            let data: any;
            try { data = JSON.parse(rec.data); } catch { continue; }
            switch (rec.entity_type) {
                case 'student':     students.push(data);              break;
                case 'class':       classes.set(rec.entity_id, data); break;
                case 'enrollment':  enrollments.push(data);           break;
                case 'payment':     payments.push(data);              break;
                case 'school_year': schoolYears.push(data);           break;
            }
        }

        // Paiements du mois en cours uniquement
        const nowS = new Date();
        const startOfMonthS = new Date(nowS.getFullYear(), nowS.getMonth(), 1);
        const endOfMonthS   = new Date(nowS.getFullYear(), nowS.getMonth() + 1, 1);
        const MOIS_FR_S = ['Janvier','Février','Mars','Avril','Mai','Juin',
                           'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        const currentMonthNameS = MOIS_FR_S[nowS.getMonth()];

        const currentMonthPaidIdsS = new Set(
            payments.filter((p: any) => {
                if (p.months) {
                    try {
                        const m = typeof p.months === 'string' ? JSON.parse(p.months) : p.months;
                        if (Array.isArray(m) && m.includes(currentMonthNameS)) return true;
                    } catch {}
                }
                const d = new Date(p.payment_date || p.created_at || 0);
                return d >= startOfMonthS && d < endOfMonthS;
            })
            .map((p: any) => p.student_id)
        );

        const activeYear = schoolYears.find(y => y.is_active == 1 || y.is_active === true)
            || [...schoolYears].sort((a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime())[0]
            || null;

        const enrollmentMap = new Map<string, any>();
        for (const e of enrollments) {
            if (!activeYear || e.school_year_id === activeYear.id) {
                enrollmentMap.set(e.student_id, e);
            }
        }

        const result = students
            .filter(s => s.id)
            .map(s => {
                const enrollment = enrollmentMap.get(s.id);
                const cls = enrollment ? classes.get(enrollment.class_id) : null;
                return {
                    id:         s.id,
                    first_name: s.first_name || '',
                    last_name:  s.last_name  || '',
                    gender:     s.gender     || null,
                    matricule:  s.matricule  || null,
                    phone:      s.phone      || null,
                    class_name: cls?.name    || null,
                    has_paid:   currentMonthPaidIdsS.has(s.id),
                };
            })
            .sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr'));

        res.json({ students: result, total: result.length, year: activeYear ? { id: activeYear.id, name: activeYear.name } : null, currentMonth: currentMonthNameS });
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// ── Helpers ───────────────────────────────────────────────────────────────

async function listRecords(schoolId: any, entityType: string): Promise<any[]> {
    const rows = await SchoolRecord.findAll({
        where: { school_id: schoolId, entity_type: entityType, deleted_at: null },
        attributes: ['entity_id', 'data'],
        raw: true,
    });
    return (rows as any[]).map(r => { try { return JSON.parse(r.data); } catch { return null; } }).filter(Boolean);
}

async function upsertRecord(schoolId: any, entityType: string, entityId: any, data: any, op: 'INSERT' | 'UPDATE') {
    await (SchoolRecord as any).upsert({
        school_id: schoolId, entity_type: entityType, entity_id: entityId,
        data: JSON.stringify(data), operation: op, device_id: 'web', deleted_at: null,
    });
}

async function softDelete(schoolId: any, entityType: string, entityId: any) {
    await SchoolRecord.update(
        { deleted_at: new Date() as any, data: null as any, operation: 'DELETE' } as any,
        { where: { school_id: schoolId, entity_type: entityType, entity_id: entityId } }
    );
}

// ── School Years ──────────────────────────────────────────────────────────

export const getSchoolYears = async (req: Request, res: Response) => {
    try {
        const years = await listRecords(req.user!.id, 'school_year');
        res.json(years.sort((a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime()));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const createSchoolYear = async (req: Request, res: Response) => {
    try {
        const { name, start_date, end_date, is_active } = req.body;
        if (!name) return res.status(400).json({ error: 'Nom requis' });
        const schoolId = req.user!.id;
        if (is_active) {
            const years = await listRecords(schoolId, 'school_year');
            for (const y of years.filter(y => y.is_active)) {
                await upsertRecord(schoolId, 'school_year', y.id, { ...y, is_active: 0 }, 'UPDATE');
            }
        }
        const id = crypto.randomUUID();
        const data = { id, name, start_date: start_date || null, end_date: end_date || null, is_active: is_active ? 1 : 0, created_at: new Date().toISOString() };
        await upsertRecord(schoolId, 'school_year', id, data, 'INSERT');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const updateSchoolYear = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { id } = req.params;
        const years = await listRecords(schoolId, 'school_year');
        const year = years.find(y => y.id === id);
        if (!year) return res.status(404).json({ error: 'Année introuvable' });
        if (req.body.is_active) {
            for (const y of years.filter(y => y.id !== id && y.is_active)) {
                await upsertRecord(schoolId, 'school_year', y.id, { ...y, is_active: 0 }, 'UPDATE');
            }
        }
        const data = { ...year, ...req.body, id };
        await upsertRecord(schoolId, 'school_year', id, data, 'UPDATE');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deleteSchoolYear = async (req: Request, res: Response) => {
    try {
        await softDelete(req.user!.id, 'school_year', req.params.id);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Classes ───────────────────────────────────────────────────────────────

export const getClasses = async (req: Request, res: Response) => {
    try {
        const classes = await listRecords(req.user!.id, 'class');
        res.json(classes.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const createClass = async (req: Request, res: Response) => {
    try {
        const { name, level, tuition_fee, description } = req.body;
        if (!name || !level) return res.status(400).json({ error: 'Nom et niveau requis' });
        const id = crypto.randomUUID();
        const data = { id, name, level, tuition_fee: tuition_fee || 0, description: description || '', created_at: new Date().toISOString() };
        await upsertRecord(req.user!.id, 'class', id, data, 'INSERT');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const updateClass = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { id } = req.params;
        const cls = (await listRecords(schoolId, 'class')).find(c => c.id === id);
        if (!cls) return res.status(404).json({ error: 'Classe introuvable' });
        const data = { ...cls, ...req.body, id };
        await upsertRecord(schoolId, 'class', id, data, 'UPDATE');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deleteClass = async (req: Request, res: Response) => {
    try {
        await softDelete(req.user!.id, 'class', req.params.id);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Subjects ──────────────────────────────────────────────────────────────

export const getSubjects = async (req: Request, res: Response) => {
    try {
        const subjects = await listRecords(req.user!.id, 'subject');
        res.json(subjects.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const createSubject = async (req: Request, res: Response) => {
    try {
        const { name, coefficient, level } = req.body;
        if (!name) return res.status(400).json({ error: 'Nom requis' });
        const id = crypto.randomUUID();
        const data = { id, name, coefficient: coefficient || 1, level: level || null, created_at: new Date().toISOString() };
        await upsertRecord(req.user!.id, 'subject', id, data, 'INSERT');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deleteSubject = async (req: Request, res: Response) => {
    try {
        await softDelete(req.user!.id, 'subject', req.params.id);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Class Subjects ────────────────────────────────────────────────────────

export const getClassSubjects = async (req: Request, res: Response) => {
    try {
        const all = await listRecords(req.user!.id, 'class_subject');
        const { classId } = req.params;
        res.json(classId ? all.filter(cs => cs.class_id === classId) : all);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const createClassSubject = async (req: Request, res: Response) => {
    try {
        const { class_id, subject_id, coefficient } = req.body;
        if (!class_id || !subject_id) return res.status(400).json({ error: 'Champs requis manquants' });
        const id = crypto.randomUUID();
        const data = { id, class_id, subject_id, coefficient: coefficient || 1, created_at: new Date().toISOString() };
        await upsertRecord(req.user!.id, 'class_subject', id, data, 'INSERT');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deleteClassSubject = async (req: Request, res: Response) => {
    try {
        await softDelete(req.user!.id, 'class_subject', req.params.id);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Staff ─────────────────────────────────────────────────────────────────

export const getStaff = async (req: Request, res: Response) => {
    try {
        const staff = await listRecords(req.user!.id, 'staff');
        res.json(staff.sort((a, b) => (a.last_name || '').localeCompare(b.last_name || '', 'fr')));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const createStaff = async (req: Request, res: Response) => {
    try {
        const { first_name, last_name, role, phone, email, salary_base } = req.body;
        if (!first_name || !last_name) return res.status(400).json({ error: 'Nom et prénom requis' });
        const id = crypto.randomUUID();
        const data = { id, first_name, last_name, role: role || 'Enseignant', phone: phone || '', email: email || '', salary_base: salary_base || 0, hire_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString() };
        await upsertRecord(req.user!.id, 'staff', id, data, 'INSERT');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const updateStaff = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { id } = req.params;
        const member = (await listRecords(schoolId, 'staff')).find(s => s.id === id);
        if (!member) return res.status(404).json({ error: 'Personnel introuvable' });
        const data = { ...member, ...req.body, id };
        await upsertRecord(schoolId, 'staff', id, data, 'UPDATE');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deleteStaff = async (req: Request, res: Response) => {
    try {
        await softDelete(req.user!.id, 'staff', req.params.id);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Students CRUD ─────────────────────────────────────────────────────────

export const createStudent = async (req: Request, res: Response) => {
    try {
        const { first_name, last_name, gender, birth_date, phone, address, matricule, class_id, school_year_id } = req.body;
        if (!first_name || !last_name) return res.status(400).json({ error: 'Nom et prénom requis' });
        const schoolId = req.user!.id;
        const id = crypto.randomUUID();
        const studentData = { id, first_name, last_name, gender: gender || 'M', birth_date: birth_date || null, phone: phone || '', address: address || '', matricule: matricule || '', created_at: new Date().toISOString() };
        await upsertRecord(schoolId, 'student', id, studentData, 'INSERT');
        if (class_id && school_year_id) {
            const enrollId = crypto.randomUUID();
            await upsertRecord(schoolId, 'enrollment', enrollId, { id: enrollId, student_id: id, class_id, school_year_id, registration_date: new Date().toISOString() }, 'INSERT');
        }
        res.json(studentData);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const updateStudent = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { id } = req.params;
        const student = (await listRecords(schoolId, 'student')).find(s => s.id === id);
        if (!student) return res.status(404).json({ error: 'Élève introuvable' });
        const data = { ...student, ...req.body, id };
        await upsertRecord(schoolId, 'student', id, data, 'UPDATE');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deleteStudent = async (req: Request, res: Response) => {
    try {
        await softDelete(req.user!.id, 'student', req.params.id);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Enrollments ───────────────────────────────────────────────────────────

export const getEnrollments = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { classId, yearId } = req.query as Record<string, string>;
        const enrollments = await listRecords(schoolId, 'enrollment');
        res.json(enrollments.filter(e => (!classId || e.class_id === classId) && (!yearId || e.school_year_id === yearId)));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const createEnrollment = async (req: Request, res: Response) => {
    try {
        const { student_id, class_id, school_year_id } = req.body;
        if (!student_id || !class_id || !school_year_id) return res.status(400).json({ error: 'Champs requis manquants' });
        const schoolId = req.user!.id;
        const existing = await listRecords(schoolId, 'enrollment');
        if (existing.find(e => e.student_id === student_id && e.school_year_id === school_year_id)) {
            return res.status(400).json({ error: 'Élève déjà inscrit pour cette année scolaire' });
        }
        const id = crypto.randomUUID();
        const data = { id, student_id, class_id, school_year_id, registration_date: new Date().toISOString() };
        await upsertRecord(schoolId, 'enrollment', id, data, 'INSERT');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deleteEnrollment = async (req: Request, res: Response) => {
    try {
        await softDelete(req.user!.id, 'enrollment', req.params.id);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Grades ────────────────────────────────────────────────────────────────

export const getGrades = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { classId, subjectId, term, yearId, studentId } = req.query as Record<string, string>;
        const [grades, enrollments, students] = await Promise.all([
            listRecords(schoolId, 'grade'),
            listRecords(schoolId, 'enrollment'),
            listRecords(schoolId, 'student'),
        ]);
        const studentMap = new Map(students.map((s: any) => [s.id, s]));
        let classStudentIds: Set<string> | null = null;
        if (classId) {
            classStudentIds = new Set(enrollments.filter((e: any) => e.class_id === classId && (!yearId || e.school_year_id === yearId)).map((e: any) => e.student_id));
        }
        const filtered = grades.filter((g: any) =>
            (!subjectId || g.subject_id === subjectId) &&
            (!term || g.term === term) &&
            (!yearId || g.school_year_id === yearId) &&
            (!studentId || g.student_id === studentId) &&
            (!classStudentIds || classStudentIds.has(g.student_id))
        );
        res.json(filtered.map((g: any) => ({ ...g, student: studentMap.get(g.student_id) || null })));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const saveGradesBulk = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { grades } = req.body;
        if (!Array.isArray(grades)) return res.status(400).json({ error: 'Format invalide' });
        for (const g of grades) {
            const id = g.id || crypto.randomUUID();
            await upsertRecord(schoolId, 'grade', id, { ...g, id, updated_at_ms: Date.now() }, g.id ? 'UPDATE' : 'INSERT');
        }
        res.json({ saved: grades.length });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deleteGrade = async (req: Request, res: Response) => {
    try {
        await softDelete(req.user!.id, 'grade', req.params.id);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Payments ──────────────────────────────────────────────────────────────

export const getPayments = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { studentId, yearId } = req.query as Record<string, string>;
        const [payments, students, classes, enrollments, schoolYears] = await Promise.all([
            listRecords(schoolId, 'payment'),
            listRecords(schoolId, 'student'),
            listRecords(schoolId, 'class'),
            listRecords(schoolId, 'enrollment'),
            listRecords(schoolId, 'school_year'),
        ]);
        const studentMap = new Map(students.map((s: any) => [s.id, s]));
        const classMap   = new Map(classes.map((c: any) => [c.id, c]));
        const activeYear = schoolYears.find((y: any) => y.is_active == 1 || y.is_active === true)
            || [...schoolYears].sort((a: any, b: any) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime())[0];
        const resolvedYearId = yearId || activeYear?.id;
        const enrollmentMap = new Map<string, string>();
        for (const e of enrollments as any[]) {
            if (!resolvedYearId || e.school_year_id === resolvedYearId) enrollmentMap.set(e.student_id, e.class_id);
        }
        let filtered = payments as any[];
        if (studentId) filtered = filtered.filter(p => p.student_id === studentId);
        if (resolvedYearId) filtered = filtered.filter(p => p.school_year_id === resolvedYearId);
        const result = filtered.map(p => {
            const s = studentMap.get(p.student_id) as any;
            const cls = classMap.get(enrollmentMap.get(p.student_id) || '') as any;
            return { ...p, student_name: s ? `${s.first_name} ${s.last_name}` : '?', class_name: cls?.name || null };
        }).sort((a, b) => new Date(b.payment_date || b.created_at || 0).getTime() - new Date(a.payment_date || a.created_at || 0).getTime());
        res.json({ payments: result, year: activeYear || null });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const createPayment = async (req: Request, res: Response) => {
    try {
        const { student_id, amount, payment_date, payment_method, description, months, school_year_id } = req.body;
        if (!student_id || !amount) return res.status(400).json({ error: 'Champs requis manquants' });
        const schoolId = req.user!.id;
        const id = crypto.randomUUID();
        const data = { id, student_id, amount: Number(amount), payment_date: payment_date || new Date().toISOString(), payment_method: payment_method || 'Espèces', description: description || '', months: JSON.stringify(months || []), school_year_id: school_year_id || null, created_at: new Date().toISOString() };
        await upsertRecord(schoolId, 'payment', id, data, 'INSERT');
        const cashId = crypto.randomUUID();
        await upsertRecord(schoolId, 'cash_transaction', cashId, { id: cashId, type: 'IN', amount: Number(amount), reason: `Paiement scolarité${description ? ` - ${description}` : ''}`, reference_id: id, school_year_id: school_year_id || null, created_at: new Date().toISOString() }, 'INSERT');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deletePayment = async (req: Request, res: Response) => {
    try {
        await softDelete(req.user!.id, 'payment', req.params.id);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Cash Transactions ─────────────────────────────────────────────────────

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { yearId } = req.query as Record<string, string>;
        const [transactions, schoolYears] = await Promise.all([listRecords(schoolId, 'cash_transaction'), listRecords(schoolId, 'school_year')]);
        const activeYear = schoolYears.find((y: any) => y.is_active == 1 || y.is_active === true)
            || [...schoolYears].sort((a: any, b: any) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime())[0];
        const resolvedYearId = yearId || activeYear?.id;
        const filtered = resolvedYearId ? (transactions as any[]).filter(t => t.school_year_id === resolvedYearId) : transactions;
        res.json((filtered as any[]).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const createTransaction = async (req: Request, res: Response) => {
    try {
        const { type, amount, reason, school_year_id } = req.body;
        if (!type || !amount || !reason) return res.status(400).json({ error: 'Champs requis manquants' });
        const id = crypto.randomUUID();
        const data = { id, type, amount: Number(amount), reason, school_year_id: school_year_id || null, created_at: new Date().toISOString() };
        await upsertRecord(req.user!.id, 'cash_transaction', id, data, 'INSERT');
        res.json(data);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try {
        await softDelete(req.user!.id, 'cash_transaction', req.params.id);
        res.json({ success: true });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Bulletin ──────────────────────────────────────────────────────────────

export const getStudentBulletin = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { studentId } = req.params;
        const { yearId } = req.query as Record<string, string>;

        const [students, classes, enrollments, schoolYears, grades, subjects, classSubjects, schoolInfoRec] = await Promise.all([
            listRecords(schoolId, 'student'),
            listRecords(schoolId, 'class'),
            listRecords(schoolId, 'enrollment'),
            listRecords(schoolId, 'school_year'),
            listRecords(schoolId, 'grade'),
            listRecords(schoolId, 'subject'),
            listRecords(schoolId, 'class_subject'),
            listRecords(schoolId, 'school_info'),
        ]);

        const student = students.find((s: any) => s.id === studentId);
        if (!student) return res.status(404).json({ error: 'Élève introuvable' });

        const activeYear = yearId
            ? schoolYears.find((y: any) => y.id === yearId)
            : schoolYears.find((y: any) => y.is_active == 1 || y.is_active === true)
              || [...schoolYears].sort((a: any, b: any) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime())[0]
              || null;

        const enrollment = enrollments.find((e: any) => e.student_id === studentId && (!activeYear || e.school_year_id === activeYear.id));
        const cls = enrollment ? classes.find((c: any) => c.id === enrollment.class_id) : null;

        const cs = cls ? classSubjects.filter((cs: any) => cs.class_id === cls.id) : [];
        const studentGrades = grades.filter((g: any) => g.student_id === studentId && (!activeYear || g.school_year_id === activeYear?.id));
        const TERMS = ['T1', 'T2', 'T3'];

        const subjectResults = cs.map((c: any) => {
            const sub = subjects.find((s: any) => s.id === c.subject_id);
            if (!sub) return null;
            const result: any = { subject_id: sub.id, name: sub.name, coefficient: c.coefficient || 1, grades: {} };
            for (const term of TERMS) {
                const devoir = studentGrades.find((g: any) => g.subject_id === sub.id && g.term === term && g.exam_type === 'Devoir');
                const compo  = studentGrades.find((g: any) => g.subject_id === sub.id && g.term === term && g.exam_type === 'Composition');
                const moy    = studentGrades.find((g: any) => g.subject_id === sub.id && g.term === term && g.exam_type === 'Moyenne');
                const calcMoy = moy?.score ?? (devoir && compo
                    ? (Number(devoir.score) + Number(compo.score) * 2) / 3
                    : (devoir?.score ?? compo?.score ?? null));
                result.grades[term] = { devoir: devoir?.score ?? null, composition: compo?.score ?? null, moyenne: calcMoy !== null ? Number(Number(calcMoy).toFixed(2)) : null };
            }
            return result;
        }).filter(Boolean);

        const termAverages: Record<string, number | null> = {};
        for (const term of TERMS) {
            let tw = 0, tc = 0;
            for (const sr of subjectResults as any[]) {
                const m = sr.grades[term]?.moyenne;
                if (m !== null && m !== undefined) { tw += m * sr.coefficient; tc += sr.coefficient; }
            }
            termAverages[term] = tc > 0 ? Number((tw / tc).toFixed(2)) : null;
        }

        const rankings: Record<string, number | null> = {};
        const classEnrollmentIds = cls ? enrollments.filter((e: any) => e.class_id === cls.id && (!activeYear || e.school_year_id === activeYear?.id)).map((e: any) => e.student_id) : [];

        for (const term of TERMS) {
            const classAvgs = classEnrollmentIds.map((sid: string) => {
                let tw = 0, tc = 0;
                for (const sr of subjectResults as any[]) {
                    const g = grades.find((g: any) => g.student_id === sid && g.subject_id === sr.subject_id && g.term === term && g.exam_type === 'Moyenne');
                    if (g) { tw += Number(g.score) * sr.coefficient; tc += sr.coefficient; }
                }
                return { student_id: sid, avg: tc > 0 ? tw / tc : null };
            }).filter((x: any) => x.avg !== null).sort((a: any, b: any) => b.avg - a.avg);
            const rank = classAvgs.findIndex((x: any) => x.student_id === studentId);
            rankings[term] = rank >= 0 ? rank + 1 : null;
        }

        // Annual average (weighted mean of term averages)
        const validTermAvgs = TERMS.map(t => termAverages[t]).filter(v => v !== null) as number[];
        const annualAvg = validTermAvgs.length > 0 ? Number((validTermAvgs.reduce((a, b) => a + b, 0) / validTermAvgs.length).toFixed(2)) : null;

        res.json({
            student, class: cls, year: activeYear, enrollment,
            subjectResults, termAverages, annualAvg, rankings,
            classSize: classEnrollmentIds.length,
            schoolInfo: schoolInfoRec[0] || null,
            schoolYears,
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// ── All students with full details (for management) ───────────────────────

export const getStudentsDetailed = async (req: Request, res: Response) => {
    try {
        const schoolId = req.user!.id;
        const { yearId } = req.query as Record<string, string>;

        const [students, classes, enrollments, schoolYears, payments] = await Promise.all([
            listRecords(schoolId, 'student'),
            listRecords(schoolId, 'class'),
            listRecords(schoolId, 'enrollment'),
            listRecords(schoolId, 'school_year'),
            listRecords(schoolId, 'payment'),
        ]);

        const activeYear = yearId
            ? schoolYears.find((y: any) => y.id === yearId)
            : schoolYears.find((y: any) => y.is_active == 1 || y.is_active === true)
              || [...schoolYears].sort((a: any, b: any) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime())[0]
              || null;

        const classMap = new Map(classes.map((c: any) => [c.id, c]));
        const enrollmentMap = new Map<string, any>();
        for (const e of enrollments as any[]) {
            if (!activeYear || e.school_year_id === activeYear.id) enrollmentMap.set(e.student_id, e);
        }

        const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        const currentMonthName = MOIS_FR[new Date().getMonth()];
        const paidIds = new Set((payments as any[]).filter(p => {
            if (!activeYear || p.school_year_id === activeYear.id) {
                try { const m = typeof p.months === 'string' ? JSON.parse(p.months) : (p.months || []); return Array.isArray(m) && m.includes(currentMonthName); } catch { return false; }
            }
            return false;
        }).map((p: any) => p.student_id));

        const result = (students as any[]).map(s => {
            const enr = enrollmentMap.get(s.id);
            const cls = enr ? classMap.get(enr.class_id) : null;
            return { ...s, class_id: enr?.class_id || null, class_name: cls?.name || null, enrollment_id: enr?.id || null, has_paid: paidIds.has(s.id) };
        }).sort((a, b) => (a.last_name || '').localeCompare(b.last_name || '', 'fr'));

        res.json({ students: result, year: activeYear, currentMonth: currentMonthName });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Change Password ───────────────────────────────────────────────────────

export const changePassword = async (req: Request, res: Response) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword) return res.status(400).json({ error: 'Champs requis manquants' });
        if (newPassword.length < 6) return res.status(400).json({ error: 'Le mot de passe doit faire au moins 6 caractères' });

        const user = await UserModel.findByPk(req.user!.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

        const valid = await bcrypt.compare(oldPassword, user.password);
        if (!valid) return res.status(400).json({ error: 'Mot de passe actuel incorrect' });

        user.password = newPassword;
        await user.save();
        res.json({ success: true });
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};
