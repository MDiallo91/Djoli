import PaiementEleve from '../../models/paiementEleveModel';
import TransactionCaisse from '../../models/transactionCaisseModel';
import Eleve from '../../models/eleveModel';
import Classe from '../../models/classeModel';
import Inscription from '../../models/inscriptionModel';
import { createTypedCrud, httpError } from './typedCrud';
import { resolveYear } from './anneesScolairesService';

export interface PaymentJson {
    id: string; student_id: string; amount: number; payment_date: string | null;
    payment_method: string; description: string; months: string; school_year_id: string | null;
    created_at: string | null;
}
export interface CashTransactionJson {
    id: string; type: 'IN' | 'OUT'; amount: number; reason: string;
    reference_id: string | null; school_year_id: string | null; created_at: string | null;
}

const paymentToJson = (row: any): PaymentJson => ({
    id: row.id, student_id: row.student_id, amount: row.amount, payment_date: row.payment_date,
    payment_method: row.payment_method, description: row.description || '', months: row.months || '[]',
    school_year_id: row.school_year_id, created_at: row.client_created_at,
});
const transactionToJson = (row: any): CashTransactionJson => ({
    id: row.id, type: row.type, amount: row.amount, reason: row.reason || '',
    reference_id: row.reference_id, school_year_id: row.school_year_id, created_at: row.client_created_at,
});

const paymentsCrud     = createTypedCrud<PaymentJson>({ entityType: 'payment', model: PaiementEleve, toJson: paymentToJson });
const transactionsCrud = createTypedCrud<CashTransactionJson>({ entityType: 'cash_transaction', model: TransactionCaisse, toJson: transactionToJson });

// ── Paiements ────────────────────────────────────────────────────────────
export async function listPayments(schoolId: string, studentId?: string, yearId?: string) {
    const [payments, students, classes, enrollments, activeYear] = await Promise.all([
        paymentsCrud.list(schoolId),
        Eleve.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        Classe.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        Inscription.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true }),
        resolveYear(schoolId), // toujours l'année active/la plus récente pour le champ "year" de la réponse
    ]);

    const studentMap = new Map((students as any[]).map(s => [s.id, s]));
    const classMap   = new Map((classes as any[]).map(c => [c.id, c]));
    const resolvedYearId = yearId || activeYear?.id;

    const enrollmentMap = new Map<string, string>();
    for (const e of enrollments as any[]) {
        if (!resolvedYearId || e.school_year_id === resolvedYearId) enrollmentMap.set(e.student_id, e.class_id);
    }

    let filtered = payments;
    if (studentId) filtered = filtered.filter(p => p.student_id === studentId);
    if (resolvedYearId) filtered = filtered.filter(p => p.school_year_id === resolvedYearId);

    const result = filtered
        .map(p => {
            const s = studentMap.get(p.student_id) as any;
            const cls = classMap.get(enrollmentMap.get(p.student_id) || '') as any;
            return { ...p, student_name: s ? `${s.first_name} ${s.last_name}` : '?', class_name: cls?.name || null };
        })
        .sort((a, b) => new Date(b.payment_date || b.created_at || 0).getTime() - new Date(a.payment_date || a.created_at || 0).getTime());

    return { payments: result, year: activeYear || null };
}

export async function createPayment(schoolId: string, body: any): Promise<PaymentJson> {
    const { student_id, amount, payment_date, payment_method, description, months, school_year_id } = body;
    if (!student_id || !amount) throw httpError(400, 'Champs requis manquants');

    const payment = await paymentsCrud.create(schoolId, {
        student_id, amount: Number(amount), payment_date: payment_date || new Date().toISOString(),
        payment_method: payment_method || 'Espèces', description: description || '',
        months: JSON.stringify(months || []), school_year_id: school_year_id || null,
    });
    await transactionsCrud.create(schoolId, {
        type: 'IN', amount: Number(amount), reason: `Paiement scolarité${description ? ` - ${description}` : ''}`,
        reference_id: payment.id, school_year_id: school_year_id || null,
    });
    return payment;
}

export async function deletePayment(schoolId: string, id: string): Promise<void> {
    await paymentsCrud.softDelete(schoolId, id);
}

// ── Transactions de caisse ───────────────────────────────────────────────
export async function listTransactions(schoolId: string, yearId?: string) {
    const [transactions, activeYear] = await Promise.all([transactionsCrud.list(schoolId), resolveYear(schoolId)]);
    const resolvedYearId = yearId || activeYear?.id;
    const filtered = resolvedYearId ? transactions.filter(t => t.school_year_id === resolvedYearId) : transactions;
    return filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
}

/** Solde de caisse (entrées − sorties) d'une année scolaire. */
async function cashBalance(schoolId: string, yearId: string | null): Promise<number> {
    const rows = await TransactionCaisse.findAll({
        where: { school_id: schoolId, deleted_at: null, school_year_id: yearId },
        attributes: ['type', 'amount'], raw: true,
    }) as { type: string; amount: number }[];
    return rows.reduce((s, t) => s + (t.type === 'IN' ? 1 : t.type === 'OUT' ? -1 : 0) * (Number(t.amount) || 0), 0);
}

export async function createTransaction(schoolId: string, body: any): Promise<CashTransactionJson> {
    const { type, amount, reason, school_year_id } = body;
    if (!type || !amount || !reason) throw httpError(400, 'Champs requis manquants');
    if (!['IN', 'OUT'].includes(type)) throw httpError(400, 'Type invalide (IN ou OUT)');
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) throw httpError(400, 'Le montant doit être supérieur à 0');
    // Sans année précisée : année active (comme le desktop) — sinon la sortie n'est comptée nulle part.
    const yearId = school_year_id || (await resolveYear(schoolId))?.id || null;
    // Règle de caisse : pas de sortie supérieure à l'argent disponible pour l'année.
    if (type === 'OUT') {
        const balance = await cashBalance(schoolId, yearId);
        if (value > balance) {
            const fmt = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} GNF`;
            throw httpError(400, `Solde de caisse insuffisant : ${fmt(balance)} disponibles pour une sortie de ${fmt(value)}. Enregistrez d'abord l'entrée d'argent correspondante.`);
        }
    }
    return transactionsCrud.create(schoolId, { type, amount: value, reason, school_year_id: yearId });
}

export async function deleteTransaction(schoolId: string, id: string): Promise<void> {
    await transactionsCrud.softDelete(schoolId, id);
}
