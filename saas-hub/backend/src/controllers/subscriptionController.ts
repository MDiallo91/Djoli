import { Request, Response } from 'express';
import UserModel from '../models/userModel';
import Payment   from '../models/paymentModel';
import Setting   from '../models/settingModel';

// ─── Helpers ──────────────────────────────────────────────────

function daysRemaining(expiry: string): number {
    const diff = new Date(expiry).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/** Retourne les providers de paiement actifs depuis la table settings */
async function getActiveGateways(): Promise<{ id: string; name: string; environment: string }[]> {
    const row = await Setting.findOne({ where: { key: 'payment' } });
    if (!row || !row.data) return [];
    try {
        const cfg = JSON.parse(row.data) as { providers?: any[] };
        return (cfg.providers ?? [])
            .filter((p: any) => p.enabled === true)
            .map((p: any) => ({ id: p.id, name: p.name, environment: p.environment ?? 'live' }));
    } catch { return []; }
}

/** Retourne la config de tarification */
async function getPricingConfig(): Promise<any | null> {
    const row = await Setting.findOne({ where: { key: 'tarification' } });
    if (!row || !row.data) return null;
    try { return JSON.parse(row.data); } catch { return null; }
}

/** Calcule le montant d'un plan pour une école (selon ses niveaux) */
function calcAmount(
    pricing: any,
    schoolLevels: string[],
    planDays: number,
): { amount: number; currency: string; breakdown: string } {
    if (!pricing?.levelPrices || !pricing?.durations) {
        // Fallback : tarif fixe si pas de config
        const flat: Record<number, number> = { 30: 150000, 90: 400000, 365: 1400000 };
        return { amount: flat[planDays] ?? 150000, currency: 'GNF', breakdown: 'Tarif standard' };
    }

    const dur = pricing.durations.find((d: any) => d.months === planDays / 30)
        ?? pricing.durations[0];
    const months   = dur?.months ?? 1;
    const discount = dur?.discountPct ?? 0;

    const baseMonthly = schoolLevels.reduce((s: number, l: string) =>
        s + (pricing.levelPrices[l] ?? 0), 0);
    const raw  = baseMonthly * months;
    const total = raw * (1 - discount / 100);

    const ml = (pricing.multiLevelDiscounts ?? []).find(
        (m: any) => m.count === schoolLevels.length
    );
    const final = ml ? total * (1 - ml.discountPct / 100) : total;

    return {
        amount: Math.round(final),
        currency: pricing.currency ?? 'GNF',
        breakdown: `${schoolLevels.join(', ')} × ${months} mois${discount ? ` (−${discount}%)` : ''}`,
    };
}

// ─── Endpoints ───────────────────────────────────────────────

/** GET /api/school/subscription — infos complètes pour la page Abonnement */
export const getSubscriptionInfo = async (req: Request, res: Response): Promise<void> => {
    try {
        const school   = req.user as UserModel;
        const [gateways, pricing] = await Promise.all([getActiveGateways(), getPricingConfig()]);

        const levels = (() => {
            try { return JSON.parse(school.levels || '[]'); } catch { return []; }
        })();

        // Calcul du prix pour chaque durée
        const plans = [
            { days: 30,  label: '1 mois',   badge: null },
            { days: 90,  label: '3 mois',   badge: 'Populaire' },
            { days: 365, label: '1 an',     badge: 'Meilleure valeur' },
        ].map(p => ({
            ...p,
            ...calcAmount(pricing, levels, p.days),
        }));

        // Contact admin depuis settings
        const siteRow = await Setting.findOne({ where: { key: 'contact' } });
        const contact = siteRow?.data ? JSON.parse(siteRow.data) : {};

        res.json({
            subscription: {
                status:       school.subscriptionStatus,
                expiry:       school.subscriptionExpiry,
                daysRemaining: daysRemaining(school.subscriptionExpiry),
                isExpired:    new Date(school.subscriptionExpiry) < new Date(),
            },
            gateways,
            plans,
            contact: {
                whatsapp: contact.whatsappPhone || contact.phone || null,
                email:    contact.email || null,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

/** POST /api/school/payment/initiate — crée une transaction pending */
export const initiatePayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const school = req.user as UserModel;
        const { planDays, gatewayId } = req.body;

        if (![30, 90, 365].includes(Number(planDays))) {
            res.status(400).json({ error: 'Durée invalide (30, 90 ou 365 jours)' });
            return;
        }

        const [gateways, pricing] = await Promise.all([getActiveGateways(), getPricingConfig()]);
        const gateway = gateways.find(g => g.id === gatewayId);
        if (!gateway) {
            res.status(400).json({ error: 'Gateway introuvable ou inactif' });
            return;
        }

        const levels = (() => {
            try { return JSON.parse(school.levels || '[]'); } catch { return []; }
        })();
        const { amount, currency, breakdown } = calcAmount(pricing, levels, Number(planDays));

        const payment = await Payment.create({
            schoolId:  school.id,
            plan:      Number(planDays),
            amount,
            currency,
            gateway:   gatewayId,
            status:    'pending',
            metadata:  JSON.stringify({ schoolName: school.schoolName, breakdown }),
        });

        // Instructions spécifiques par gateway
        const instructions = buildInstructions(gateway, amount, currency, payment.id);

        res.json({
            paymentId: payment.id,
            amount,
            currency,
            breakdown,
            gateway: { id: gateway.id, name: gateway.name },
            instructions,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur lors de la création du paiement' });
    }
};

/** Construit les instructions de paiement selon le gateway */
function buildInstructions(
    gateway: { id: string; name: string; environment: string },
    amount: number,
    currency: string,
    paymentId: string,
): any {
    const amountStr = `${amount.toLocaleString('fr')} ${currency}`;

    switch (gateway.id) {
        case 'bank_transfer':
            return {
                type: 'bank_transfer',
                steps: [
                    `Effectuez un virement de ${amountStr}`,
                    `Référence obligatoire : PAY-${paymentId.slice(0, 8).toUpperCase()}`,
                    "Envoyez le reçu à l'administrateur pour validation",
                ],
            };
        case 'orange_money':
            return {
                type: 'ussd',
                steps: [
                    'Composez *144# sur votre téléphone Orange',
                    'Sélectionnez "Paiement marchand"',
                    `Montant : ${amountStr}`,
                    `Code marchand : DJOLI-${paymentId.slice(0, 6).toUpperCase()}`,
                ],
            };
        case 'wave':
            return {
                type: 'mobile',
                steps: [
                    'Ouvrez l\'application Wave',
                    'Sélectionnez "Envoyer de l\'argent"',
                    `Montant : ${amountStr}`,
                    `Référence : PAY-${paymentId.slice(0, 8).toUpperCase()}`,
                ],
            };
        default:
            return {
                type: 'generic',
                steps: [
                    `Montant à payer : ${amountStr} via ${gateway.name}`,
                    `Référence : PAY-${paymentId.slice(0, 8).toUpperCase()}`,
                    "L'administrateur confirmera votre paiement.",
                ],
            };
    }
}

/** POST /api/school/payment/webhook/:gateway — confirmation externe (ou admin) */
export const webhookPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        const { paymentId, reference, status } = req.body;
        const payment = await Payment.findByPk(paymentId);
        if (!payment) { res.status(404).json({ error: 'Paiement introuvable' }); return; }

        payment.reference = reference ?? payment.reference;
        payment.status    = status === 'confirmed' ? 'confirmed' : 'failed';
        await payment.save();

        if (payment.status === 'confirmed') {
            const school = await UserModel.findByPk(payment.schoolId);
            if (school) {
                const base = school.subscriptionStatus === 'active' && new Date(school.subscriptionExpiry) > new Date()
                    ? new Date(school.subscriptionExpiry)
                    : new Date();
                base.setDate(base.getDate() + payment.plan);
                school.subscriptionStatus = 'active';
                school.subscriptionExpiry = base.toISOString();
                await school.save();
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erreur webhook' });
    }
};

/** GET /api/school/payment/history — historique des paiements de l'école */
export const getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const school = req.user as UserModel;
        const payments = await Payment.findAll({
            where: { schoolId: school.id },
            order: [['createdAt', 'DESC']],
        });
        res.json(payments.map(p => ({
            id:        p.id,
            plan:      p.plan,
            amount:    p.amount,
            currency:  p.currency,
            gateway:   p.gateway,
            status:    p.status,
            reference: p.reference,
            createdAt: p.createdAt,
        })));
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// ─── Anciens endpoints conservés (utilisés par admin) ─────────

export const activateSubscription = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body;
    try {
        const user = await UserModel.findByPk(userId);
        if (!user) { res.status(404).json({ success: false, message: 'Utilisateur non trouvé' }); return; }

        const days = typeof req.body.days === 'number' && req.body.days > 0 ? req.body.days : 30;
        const base = user.subscriptionStatus === 'active' && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date()
            ? new Date(user.subscriptionExpiry)
            : new Date();
        base.setDate(base.getDate() + days);

        user.subscriptionStatus = 'active';
        user.subscriptionExpiry = base.toISOString();
        await user.save();

        res.json({ success: true, message: `Abonnement activé pour ${days} jours !`, newExpiry: user.subscriptionExpiry });
    } catch {
        res.status(500).json({ success: false, error: "Erreur lors de l'activation" });
    }
};

export const checkSubscription = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.query;
    try {
        const user = await UserModel.findOne({ where: { email } });
        if (!user) { res.status(404).json({ error: 'Compte non trouvé' }); return; }
        res.json({
            schoolName: user.schoolName,
            status:     user.subscriptionStatus,
            expiry:     user.subscriptionExpiry,
            isExpired:  new Date(user.subscriptionExpiry) < new Date(),
        });
    } catch {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};
