import { Request, Response } from 'express';
import { Op } from 'sequelize';
import UserModel from '../models/userModel';
import DocumentEcole from '../models/documentEcoleModel';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { sendApprovalEmail, sendRejectionEmail } from '../services/emailService';

const safe = (u: UserModel) => {
    const p = u.get({ plain: true }) as any;
    delete p.password;
    return p;
};

export const getAllSchools = async (_req: Request, res: Response) => {
    try {
        const schools = await UserModel.findAll({ where: { role: 'user' }, attributes: { exclude: ['password'] } });
        res.json(schools);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const getPendingSchools = async (_req: Request, res: Response) => {
    try {
        const schools = await UserModel.findAll({ where: { role: 'user', approvalStatus: 'pending' }, attributes: { exclude: ['password'] } });
        res.json(schools);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const createSchool = async (req: Request, res: Response) => {
    try {
        const { schoolName, email, phone, password, country, city, level, directorName, prefecture, sousPrefecture, rccm, logoUrl } = req.body;
        const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
        const school = await UserModel.create({
            schoolName, email, phone, password: password || 'changeme123',
            country, city, level, directorName, prefecture, sousPrefecture, rccm, logoUrl,
            approvalStatus: 'approved', subscriptionStatus: 'trial',
            subscriptionExpiry: expiry.toISOString(),
        });
        res.status(201).json(safe(school));
    } catch (e: any) {
        if (e.name === 'SequelizeUniqueConstraintError') res.status(409).json({ error: 'Email déjà utilisé' });
        else res.status(500).json({ error: 'Erreur serveur' });
    }
};

export const updateSchool = async (req: Request, res: Response) => {
    try {
        const school = await UserModel.findByPk(req.params.id as string);
        if (!school) return res.status(404).json({ error: 'École non trouvée' });
        const { schoolName, email, phone, country, city, level, directorName, prefecture, sousPrefecture, rccm, logoUrl } = req.body;
        await school.update({ schoolName, email, phone, country, city, level, directorName, prefecture, sousPrefecture, rccm, logoUrl });
        res.json(safe(school));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const updateSubscription = async (req: Request, res: Response) => {
    try {
        const school = await UserModel.findByPk(req.params.id as string);
        if (!school) return res.status(404).json({ error: 'École non trouvée' });
        const { status, expiry } = req.body;
        await school.update({
            subscriptionStatus: status,
            ...(expiry ? { subscriptionExpiry: new Date(expiry).toISOString() } : {}),
        });
        res.json(safe(school));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const approveSchool = async (req: Request, res: Response) => {
    try {
        const school = await UserModel.findByPk(req.params.id as string);
        if (!school) return res.status(404).json({ error: 'École non trouvée' });
        const expiry = new Date(); expiry.setDate(expiry.getDate() + 14);
        await school.update({ approvalStatus: 'approved', subscriptionStatus: 'trial', subscriptionExpiry: expiry.toISOString() });
        sendApprovalEmail({ email: school.email, schoolName: school.schoolName }).catch(console.error);
        res.json(safe(school));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const rejectSchool = async (req: Request, res: Response) => {
    try {
        const school = await UserModel.findByPk(req.params.id as string);
        if (!school) return res.status(404).json({ error: 'École non trouvée' });
        await school.update({ approvalStatus: 'rejected' });
        sendRejectionEmail({ email: school.email, schoolName: school.schoolName }).catch(console.error);
        res.json(safe(school));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// Approuve tout ou partie des cycles en attente d'une école — les ajoute à
// `levels` et les retire de `pendingLevels`. Body optionnel `{ levels?: string[] }`
// pour n'approuver qu'un sous-ensemble ; par défaut, approuve tout ce qui est en attente.
export const approveLevels = async (req: Request, res: Response) => {
    try {
        const school = await UserModel.findByPk(req.params.id as string);
        if (!school) return res.status(404).json({ error: 'École non trouvée' });

        let current: string[] = []; let pending: string[] = [];
        try { current = JSON.parse(school.levels || '[]'); } catch {}
        try { pending = JSON.parse(school.pendingLevels || '[]'); } catch {}

        const toApprove: string[] = Array.isArray(req.body.levels) ? req.body.levels : pending;
        const newLevels  = [...new Set([...current, ...toApprove])];
        const newPending = pending.filter(l => !toApprove.includes(l));

        await school.update({ levels: JSON.stringify(newLevels), pendingLevels: JSON.stringify(newPending) });
        res.json(safe(school));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// Rejette tout ou partie des cycles en attente — les retire simplement de
// `pendingLevels`, sans toucher aux cycles déjà actifs.
export const rejectLevels = async (req: Request, res: Response) => {
    try {
        const school = await UserModel.findByPk(req.params.id as string);
        if (!school) return res.status(404).json({ error: 'École non trouvée' });

        let pending: string[] = [];
        try { pending = JSON.parse(school.pendingLevels || '[]'); } catch {}

        const toReject: string[] = Array.isArray(req.body.levels) ? req.body.levels : pending;
        const newPending = pending.filter(l => !toReject.includes(l));

        await school.update({ pendingLevels: JSON.stringify(newPending) });
        res.json(safe(school));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// Archivage (UserModel est `paranoid`) : l'école disparaît des listes, ne peut plus
// se connecter ni synchroniser, mais TOUTES ses données (school_records, miroirs,
// documents, logo) sont conservées et l'école peut être restaurée.
export const deleteSchool = async (req: Request, res: Response) => {
    try {
        const school = await UserModel.findOne({ where: { id: req.params.id, role: 'user' } });
        if (!school) return res.status(404).json({ error: 'École non trouvée' });
        await school.destroy();
        res.json({ message: 'École archivée' });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const getArchivedSchools = async (_req: Request, res: Response) => {
    try {
        const schools = await UserModel.findAll({
            where: { role: 'user', deletedAt: { [Op.ne]: null } },
            attributes: { exclude: ['password'] },
            paranoid: false,
            order: [['deletedAt', 'DESC']],
        });
        res.json(schools);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const restoreSchool = async (req: Request, res: Response) => {
    try {
        const school = await UserModel.findOne({ where: { id: req.params.id, role: 'user' }, paranoid: false });
        if (!school) return res.status(404).json({ error: 'École non trouvée' });
        if (school.deletedAt) await school.restore();
        res.json(safe(school));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

// ── Documents d'une école (RCCM…) — stockés en base, lecture admin uniquement ──
export const listSchoolDocuments = async (req: Request, res: Response) => {
    try {
        const docs = await DocumentEcole.findAll({
            where: { school_id: req.params.id },
            attributes: { exclude: ['content'] }, // métadonnées seulement
            order: [['createdAt', 'DESC']],
        });
        res.json(docs);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const getDocument = async (req: Request, res: Response) => {
    try {
        const doc = await DocumentEcole.findByPk(req.params.docId as string);
        if (!doc) { res.status(404).json({ error: 'Document introuvable' }); return; }
        res.set({
            'Content-Type':           doc.mime_type,
            'Content-Length':         String(doc.size),
            'Content-Disposition':    `inline; filename="${encodeURIComponent(doc.filename)}"; filename*=UTF-8''${encodeURIComponent(doc.filename)}`,
            'Cache-Control':          'private, no-store',
            'X-Content-Type-Options': 'nosniff',
        });
        res.send(doc.content);
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};
