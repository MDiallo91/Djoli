import { Request, Response } from 'express';
import UserModel from '../models/userModel';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { generateLicenseKey } from '../services/licenseService';
import { sendOTPEmail } from '../services/emailService';

const TOKEN_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

const createToken = (id: string): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET non configuré');
    return jwt.sign({ id }, secret, { expiresIn: TOKEN_MAX_AGE_MS / 1000 });
};

export const signUp = async (req: Request, res: Response): Promise<void> => {
    const { schoolName, email, password, country, city, levels, directorName,
            prefecture, sousPrefecture, district, rccm, logoUrl } = req.body;
    let user: UserModel | null = null;
    try {
        user = await UserModel.create({
            schoolName, email, password, country, city,
            levels: JSON.stringify(levels ?? []),
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

function buildUserResponse(user: UserModel, token: string) {
    let levelsArr: string[] = [];
    try { levelsArr = JSON.parse(user.levels || '[]'); } catch {}
    const license_key = generateLicenseKey(user);
    return {
        id: user.id, schoolName: user.schoolName, email: user.email,
        role: user.role, country: user.country, levels: levelsArr,
        subscriptionStatus: user.subscriptionStatus, subscriptionExpiry: user.subscriptionExpiry,
        createdAt: user.createdAt, license_key, access_token: token,
    };
}

function checkAccountStatus(user: UserModel): string | null {
    if (user.role === 'super_admin') return null;
    if (user.approvalStatus === 'pending')  return 'Votre compte est en attente d\'approbation par l\'administrateur.';
    if (user.approvalStatus === 'rejected') return 'Votre demande d\'inscription a été refusée. Contactez le support.';
    if (user.subscriptionStatus === 'suspended') return 'Votre accès a été suspendu. Contactez le support.';
    return null;
}

// Étape 1 : vérifier email+mdp → envoyer OTP
export const signIn = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    try {
        const user = await UserModel.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({ message: 'Email ou mot de passe incorrect' });
            return;
        }
        const statusError = checkAccountStatus(user);
        if (statusError) { res.status(403).json({ message: statusError }); return; }

        // super_admin : connexion directe sans OTP
        if (user.role === 'super_admin') {
            const token = createToken(user.id);
            res.cookie('jwt', token, { httpOnly: true, maxAge: TOKEN_MAX_AGE_MS });
            res.status(200).json(buildUserResponse(user, token));
            return;
        }

        // Générer OTP 6 chiffres
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await user.update({ otp_code: code, otp_expires_at: expires });
        sendOTPEmail(user.email, code, user.schoolName).catch(console.error);

        res.status(200).json({ step: 'otp', email: user.email });
    } catch {
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};

// Étape 2 : vérifier OTP → émettre JWT
export const verifyOTP = async (req: Request, res: Response): Promise<void> => {
    const { email, code } = req.body;
    try {
        const user = await UserModel.findOne({ where: { email } });
        if (!user || !user.otp_code || !user.otp_expires_at) {
            res.status(400).json({ message: 'Code invalide ou expiré.' });
            return;
        }
        if (user.otp_code !== String(code).trim()) {
            res.status(400).json({ message: 'Code incorrect.' });
            return;
        }
        if (new Date(user.otp_expires_at) < new Date()) {
            res.status(400).json({ message: 'Code expiré. Reconnectez-vous pour en recevoir un nouveau.' });
            return;
        }
        await user.update({ otp_code: null, otp_expires_at: null });
        const token = createToken(user.id);
        res.cookie('jwt', token, { httpOnly: true, maxAge: TOKEN_MAX_AGE_MS });
        res.status(200).json(buildUserResponse(user, token));
    } catch {
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};

export const logout = (_req: Request, res: Response): void => {
    res.cookie('jwt', '', { maxAge: 1 });
    res.status(200).json({ message: 'Déconnexion réussie' });
};
