import { Request, Response } from 'express';
import UserModel from '../models/userModel';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { generateLicenseKey } from '../services/licenseService';

const TOKEN_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

const createToken = (id: string): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET non configuré');
    return jwt.sign({ id }, secret, { expiresIn: TOKEN_MAX_AGE_MS / 1000 });
};

export const signUp = async (req: Request, res: Response): Promise<void> => {
    const { schoolName, email, password, country, city, level, directorName,
            prefecture, sousPrefecture, district, rccm, logoUrl } = req.body;
    let user: UserModel | null = null;
    try {
        user = await UserModel.create({
            schoolName, email, password, country, city, level,
            directorName, prefecture, sousPrefecture, rccm, logoUrl,
            approvalStatus: 'pending',
        });
    } catch (error: any) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            res.status(409).json({ message: 'Cet email est déjà enregistré' });
        } else {
            console.error('[signUp] DB Error:', error);
            res.status(500).json({ message: "Erreur lors de l'enregistrement en base de données", detail: error.message, type: error.name });
        }
        return;
    }

    try {
        const token = createToken(user.id);
        const license_key = generateLicenseKey(user);
        res.cookie('jwt', token, { httpOnly: true, maxAge: TOKEN_MAX_AGE_MS });
        res.status(201).json({
            id: user.id, schoolName: user.schoolName, email: user.email,
            role: user.role, approvalStatus: user.approvalStatus,
            message: 'Compte créé. En attente d\'approbation par l\'administrateur.',
        });
    } catch (error: any) {
        console.error('[signUp] Token Error:', error.message);
        res.status(500).json({ message: error.message });
    }
};

export const signIn = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    try {
        const user = await UserModel.findOne({ where: { email } });
        if (!user) {
            res.status(401).json({ message: 'Email ou mot de passe incorrect' });
            return;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            res.status(401).json({ message: 'Email ou mot de passe incorrect' });
            return;
        }
        if (user.role !== 'super_admin' && user.approvalStatus === 'pending') {
            res.status(403).json({ message: 'Votre compte est en attente d\'approbation par l\'administrateur.' });
            return;
        }
        if (user.role !== 'super_admin' && user.approvalStatus === 'rejected') {
            res.status(403).json({ message: 'Votre demande d\'inscription a été refusée. Contactez le support.' });
            return;
        }

        const token = createToken(user.id);
        const license_key = generateLicenseKey(user);
        res.cookie('jwt', token, { httpOnly: true, maxAge: TOKEN_MAX_AGE_MS });

        res.status(200).json({
            id:                   user.id,
            schoolName:           user.schoolName,
            email:                user.email,
            role:                 user.role,
            country:              user.country,
            level:                user.level,
            subscriptionStatus:   user.subscriptionStatus,
            subscriptionExpiry:   user.subscriptionExpiry,
            createdAt:            user.createdAt,
            license_key,
            access_token:         token,
        });
    } catch (error: any) {
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};

export const logout = (_req: Request, res: Response): void => {
    res.cookie('jwt', '', { maxAge: 1 });
    res.status(200).json({ message: 'Déconnexion réussie' });
};
