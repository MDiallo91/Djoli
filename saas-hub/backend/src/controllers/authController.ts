import { Request, Response } from 'express';
import { Op } from 'sequelize';
import UserModel from '../models/userModel';
import Administrateur from '../models/administrateurModel';
import Role from '../models/roleModel';
import DocumentEcole from '../models/documentEcoleModel';
import MediaSite from '../models/mediaSiteModel';
import sequelize from '../config/db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { generateLicenseKey } from '../services/licenseService';
import { sendOTPEmail } from '../services/emailService';

const TOKEN_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;

// `type` distingue un token admin (table `admins`) d'un token école (table
// `users`) — les deux partagent le même cookie `jwt` et le même endpoint de
// login (voir signIn ci-dessous), donc requireAdminAuth s'appuie sur ce
// claim pour savoir dans quelle table recharger l'utilisateur.
export const createToken = (id: string, type: 'school' | 'admin' = 'school'): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET non configuré');
    return jwt.sign({ id, type }, secret, { expiresIn: TOKEN_MAX_AGE_MS / 1000 });
};

export const signUp = async (req: Request, res: Response): Promise<void> => {
    const { schoolName, email, phone, password, country, city, levels, directorName,
            prefecture, sousPrefecture, rccm, rccmFile, logoUrl } = req.body;
    let user: UserModel | null = null;
    try {
        const code    = String(Math.floor(100000 + Math.random() * 900000));
        const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        // École + document RCCM (stocké en base, pas sur Cloudinary) dans une même
        // transaction : pas d'école créée si l'enregistrement du document échoue.
        user = await sequelize.transaction(async transaction => {
            // Logo envoyé en data URL (validé dans registerSchema) → image stockée en base,
            // l'école ne garde que son URL (plus de base64 dans `users`).
            let storedLogoUrl: string | undefined;
            const logo = typeof logoUrl === 'string' ? logoUrl.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/) : null;
            if (logo) {
                const content = Buffer.from(logo[2], 'base64');
                const media = await MediaSite.create({ filename: `logo-${Date.now()}`, mime_type: logo[1], size: content.length, content }, { transaction });
                storedLogoUrl = `/api/media/${media.id}`;
            }
            const created = await UserModel.create({
                schoolName, email, phone, password, country, city,
                levels: JSON.stringify(levels ?? []),
                directorName, prefecture, sousPrefecture, rccm, logoUrl: storedLogoUrl,
                approvalStatus: 'email_verification',
                otp_code: code, otp_expires_at: expires,
            }, { transaction });
            if (rccmFile) {
                const content = Buffer.from(rccmFile.data, 'base64');
                await DocumentEcole.create({
                    school_id: created.id, type: 'rccm', filename: rccmFile.name,
                    mime_type: rccmFile.type, size: content.length, content,
                }, { transaction });
            }
            return created;
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

    // Envoi OTP — séparé du bloc DB pour ne pas annuler la création si l'email échoue
    try {
        await sendOTPEmail(email, user!.otp_code!, user!.schoolName);
    } catch (emailErr) {
        console.error('[signUp] Échec envoi OTP:', emailErr);
        res.status(201).json({
            step: 'otp', email: user!.email, schoolName: user!.schoolName,
            warning: 'Compte créé mais email OTP non envoyé. Vérifiez la config RESEND_API_KEY ou cliquez "Renvoyer le code".',
        });
        return;
    }

    res.status(201).json({
        step: 'otp', email: user!.email, schoolName: user!.schoolName,
        message: 'Un code de confirmation a été envoyé sur votre email.',
    });
};

function buildUserResponse(user: UserModel, token: string) {
    let levelsArr: string[] = [];
    let pendingLevelsArr: string[] = [];
    try { levelsArr = JSON.parse(user.levels || '[]'); } catch {}
    try { pendingLevelsArr = JSON.parse(user.pendingLevels || '[]'); } catch {}
    const license_key = generateLicenseKey(user);
    return {
        id: user.id, schoolName: user.schoolName, email: user.email,
        role: user.role, country: user.country, levels: levelsArr, pendingLevels: pendingLevelsArr,
        // Profil complet : le portail initialise son formulaire « Informations de l'école » et les
        // cartes scolaires avec ces champs — absents, ils étaient enregistrés vides (données effacées).
        phone: user.phone, directorName: user.directorName, city: user.city, prefecture: user.prefecture,
        sousPrefecture: user.sousPrefecture, rccm: user.rccm, logoUrl: user.logoUrl,
        subscriptionStatus: user.subscriptionStatus, subscriptionExpiry: user.subscriptionExpiry,
        createdAt: user.createdAt, license_key, access_token: token,
    };
}

function checkAccountStatus(user: UserModel): string | null {
    if (user.approvalStatus === 'email_verification') return 'Veuillez confirmer votre email avant de vous connecter.';
    if (user.approvalStatus === 'pending')            return 'Votre compte est en attente d\'approbation par l\'administrateur.';
    if (user.approvalStatus === 'rejected')           return 'Votre demande d\'inscription a été refusée. Contactez le support.';
    if (user.subscriptionStatus === 'suspended')      return 'Votre accès a été suspendu. Contactez le support.';
    return null;
}

// `role: 'super_admin'` est un champ de compatibilité — le frontend ne fait
// aujourd'hui qu'un contrôle binaire (`data.role === 'super_admin'` → accès
// à /admin). Tout administrateur authentifié l'obtient ; la distinction fine
// par Role/permissions est disponible côté backend pour un contrôle plus
// granulaire plus tard, sans changement frontend nécessaire d'ici là.
async function buildAdminResponse(admin: Administrateur, token: string) {
    const role = admin.role_id ? await Role.findByPk(admin.role_id) : null;
    return {
        id: admin.id, schoolName: admin.name, email: admin.email,
        role: 'super_admin', adminRole: role?.name ?? 'Super Admin',
        permissions: role ? JSON.parse(role.permissions || '[]') : null,
        createdAt: admin.createdAt, access_token: token,
    };
}

// Connexion simple identifiant + mot de passe — sert à la fois les comptes école
// (table `users`) et les comptes admin plateforme (table `admins`), pour
// garder un seul endpoint/formulaire de connexion côté frontend. Le champ
// `email` du body accepte aussi un numéro de téléphone (recherché sur la
// colonne `phone` de `users` — les admins plateforme restent email uniquement).
export const signIn = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    try {
        const admin = await Administrateur.findOne({ where: { email } });
        if (admin && await bcrypt.compare(password, admin.password)) {
            const token = createToken(admin.id, 'admin');
            res.cookie('jwt', token, { httpOnly: true, maxAge: TOKEN_MAX_AGE_MS });
            res.status(200).json(await buildAdminResponse(admin, token));
            return;
        }

        const user = await UserModel.findOne({ where: { [Op.or]: [{ email }, { phone: email }] } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({ message: 'Email ou mot de passe incorrect' });
            return;
        }
        const statusError = checkAccountStatus(user);
        if (statusError) { res.status(403).json({ message: statusError }); return; }

        const token = createToken(user.id, 'school');
        res.cookie('jwt', token, { httpOnly: true, maxAge: TOKEN_MAX_AGE_MS });
        res.status(200).json(buildUserResponse(user, token));
    } catch {
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};

// Vérification OTP d'inscription → passe le compte en "pending"
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
            res.status(400).json({ message: 'Code expiré. Cliquez sur "Renvoyer" pour obtenir un nouveau code.' });
            return;
        }
        await user.update({ otp_code: null, otp_expires_at: null, approvalStatus: 'pending' });
        res.status(200).json({ message: 'Email confirmé. Votre dossier est en attente d\'approbation.' });
    } catch {
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};

// Renvoi OTP (si code expiré)
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    try {
        const user = await UserModel.findOne({ where: { email, approvalStatus: 'email_verification' } });
        if (!user) { res.status(404).json({ message: 'Compte introuvable ou déjà vérifié.' }); return; }
        const code    = String(Math.floor(100000 + Math.random() * 900000));
        const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        await user.update({ otp_code: code, otp_expires_at: expires });
        sendOTPEmail(email, code, user.schoolName).catch(console.error);
        res.status(200).json({ message: 'Nouveau code envoyé.' });
    } catch {
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
};

export const logout = (_req: Request, res: Response): void => {
    res.cookie('jwt', '', { maxAge: 1 });
    res.status(200).json({ message: 'Déconnexion réussie' });
};
