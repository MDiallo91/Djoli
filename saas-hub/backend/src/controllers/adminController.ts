import { Request, Response } from 'express';
import UserModel from '../models/userModel';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

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
        const { schoolName, email, password, country, city, level, directorName, prefecture, sousPrefecture, rccm, logoUrl } = req.body;
        const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
        const school = await UserModel.create({
            schoolName, email, password: password || 'changeme123',
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
        const school = await UserModel.findByPk(req.params.id);
        if (!school) return res.status(404).json({ error: 'École non trouvée' });
        const { schoolName, email, country, city, level, directorName, prefecture, sousPrefecture, rccm, logoUrl } = req.body;
        await school.update({ schoolName, email, country, city, level, directorName, prefecture, sousPrefecture, rccm, logoUrl });
        res.json(safe(school));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const updateSubscription = async (req: Request, res: Response) => {
    try {
        const school = await UserModel.findByPk(req.params.id);
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
        const school = await UserModel.findByPk(req.params.id);
        if (!school) return res.status(404).json({ error: 'École non trouvée' });
        const expiry = new Date(); expiry.setDate(expiry.getDate() + 14);
        await school.update({ approvalStatus: 'approved', subscriptionStatus: 'trial', subscriptionExpiry: expiry.toISOString() });
        res.json(safe(school));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const rejectSchool = async (req: Request, res: Response) => {
    try {
        const school = await UserModel.findByPk(req.params.id);
        if (!school) return res.status(404).json({ error: 'École non trouvée' });
        await school.update({ approvalStatus: 'rejected' });
        res.json(safe(school));
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};

export const deleteSchool = async (req: Request, res: Response) => {
    try {
        await UserModel.destroy({ where: { id: req.params.id } });
        res.json({ message: 'École supprimée' });
    } catch { res.status(500).json({ error: 'Erreur serveur' }); }
};
