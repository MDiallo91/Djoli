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
