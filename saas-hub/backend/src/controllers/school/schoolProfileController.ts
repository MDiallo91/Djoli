import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { fn, col } from 'sequelize';
import UserModel from '../../models/userModel';
import SchoolRecord from '../../models/schoolRecordModel';

// Profil, stats globales, mot de passe — logique inchangée par rapport à
// l'ancien schoolController.ts (rien ici ne scannait school_records
// entièrement, pas de migration nécessaire).

export const getProfile = async (req: Request, res: Response) => {
    try {
        const user = await UserModel.findByPk(req.user!.id, { attributes: { exclude: ['password'] } });
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

        // `levels` n'est PAS dans cette liste : les cycles passent par requestLevels
        // (ajout = validation admin requise, retrait = immédiat — voir plus bas),
        // jamais par une écriture directe ici.
        const allowed = ['schoolName', 'directorName', 'country', 'city', 'prefecture', 'sousPrefecture', 'rccm', 'logoUrl'];
        for (const field of allowed) {
            if (req.body[field] !== undefined) (user as any)[field] = req.body[field];
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

// Demande de changement de cycles — un ajout reste en attente d'approbation admin
// (`pendingLevels`), un retrait s'applique immédiatement (aucune validation requise).
export const requestLevels = async (req: Request, res: Response) => {
    try {
        const user = await UserModel.findByPk(req.user!.id);
        if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

        const requested: string[] = Array.isArray(req.body.levels) ? req.body.levels : [];
        let current: string[] = [];
        let pending: string[] = [];
        try { current = JSON.parse(user.levels || '[]'); } catch {}
        try { pending = JSON.parse(user.pendingLevels || '[]'); } catch {}

        const additions = requested.filter(l => !current.includes(l));
        const kept      = current.filter(l => requested.includes(l));
        const newPending = [...new Set([...pending, ...additions])];

        await user.update({ levels: JSON.stringify(kept), pendingLevels: JSON.stringify(newPending) });
        res.json({ levels: kept, pendingLevels: newPending });
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
