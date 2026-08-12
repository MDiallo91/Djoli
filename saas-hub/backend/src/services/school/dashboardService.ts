import TransactionCaisse from '../../models/transactionCaisseModel';
import PaiementEleve from '../../models/paiementEleveModel';
import Eleve from '../../models/eleveModel';
import Inscription from '../../models/inscriptionModel';

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

// Port fidèle de l'ancien getDashboardStats (schoolController.ts) — même
// logique métier (année active déduite des paiements, recouvrement toutes
// années confondues...), juste sur des tables typées plutôt qu'un scan JSON.
export async function getDashboardStats(schoolId: string) {
    const [cashTransactions, payments, students, enrollments] = await Promise.all([
        TransactionCaisse.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any[]>,
        PaiementEleve.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any[]>,
        Eleve.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any[]>,
        Inscription.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }) as Promise<any[]>,
    ]);
    const studentMap = new Map(students.map(s => [s.id, s]));

    // L'année active est déduite des paiements (l'année avec le plus de paiements) —
    // pas de la table school_years, pour refléter l'année réellement en cours d'usage.
    const yearCount = new Map<string, number>();
    for (const p of payments) {
        if (p.school_year_id) yearCount.set(p.school_year_id, (yearCount.get(p.school_year_id) ?? 0) + 1);
    }
    const activeYearId = yearCount.size > 0
        ? [...yearCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
        : null;

    const activeCash = activeYearId
        ? cashTransactions.filter(t => t.school_year_id === activeYearId)
        : cashTransactions;

    const totalIn  = activeCash.filter(t => t.type === 'IN').reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalOut = activeCash.filter(t => t.type === 'OUT').reduce((s, t) => s + (Number(t.amount) || 0), 0);

    // Flux mensuel — 6 derniers mois
    const now = new Date();
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
        const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const to   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const key  = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`;
        const inMonth = (type: 'IN' | 'OUT') => activeCash
            .filter(t => {
                if (t.type !== type) return false;
                const d = new Date(t.client_created_at || t.date || 0);
                return d >= from && d < to;
            })
            .reduce((s, t) => s + (Number(t.amount) || 0), 0);
        monthlyData.push({ month: key, total_in: inMonth('IN'), total_out: inMonth('OUT') });
    }

    // Recouvrement — filtré sur le mois en cours, toutes années d'inscription confondues
    // (comportement d'origine : enrolledIds n'est pas filtré par année active)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const currentMonthName = MOIS_FR[now.getMonth()];

    const enrolledIds = new Set(enrollments.map(e => e.student_id));

    const currentMonthPaidIds = new Set(
        payments
            .filter(p => {
                if (p.months) {
                    try {
                        const m = typeof p.months === 'string' ? JSON.parse(p.months) : p.months;
                        if (Array.isArray(m) && m.includes(currentMonthName)) return true;
                    } catch {}
                }
                const d = new Date(p.payment_date || p.client_created_at || 0);
                return d >= startOfMonth && d < endOfMonth;
            })
            .map(p => p.student_id),
    );

    const totalStudents = enrolledIds.size;
    const paidStudents  = [...enrolledIds].filter(id => currentMonthPaidIds.has(id)).length;

    const lateIds = [...enrolledIds].filter(id => !currentMonthPaidIds.has(id)).slice(0, 8);
    const latePayers = lateIds.map(id => {
        const s = studentMap.get(id);
        return { first_name: s?.first_name || '?', last_name: s?.last_name || '?', parent_phone: s?.phone || null };
    });

    return {
        totalIn, totalOut, balance: totalIn - totalOut, monthlyData,
        totalStudents, paidStudents,
        recoveryRate: totalStudents > 0 ? Math.round((paidStudents / totalStudents) * 100) : 0,
        latePayers, currentMonth: currentMonthName,
    };
}
