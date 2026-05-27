import { Request, Response } from 'express';
import UserModel from '../models/userModel';

export const activateSubscription = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.body;
    try {
        const user = await UserModel.findByPk(userId);
        if (!user) {
            res.status(404).json({ success: false, message: "Utilisateur non trouvé" });
            return;
        }

        const days = typeof req.body.days === 'number' && req.body.days > 0 ? req.body.days : 30;
        const base = user.subscriptionStatus === 'active' && user.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date()
            ? new Date(user.subscriptionExpiry)
            : new Date();
        base.setDate(base.getDate() + days);

        user.subscriptionStatus = 'active';
        user.subscriptionExpiry = base.toISOString();
        await user.save();

        res.status(200).json({
            success: true,
            message: `Abonnement activé pour ${days} jours !`,
            newExpiry: user.subscriptionExpiry
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Erreur lors de l'activation" });
    }
};

export const checkSubscription = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.query;
    try {
        const user = await UserModel.findOne({ where: { email } });
        if (!user) {
            res.status(404).json({ error: "Compte non trouvé" });
            return;
        }
        
        const isExpired = new Date(user.subscriptionExpiry) < new Date();
        res.status(200).json({
            schoolName: user.schoolName,
            status: user.subscriptionStatus,
            expiry: user.subscriptionExpiry,
            isExpired: isExpired
        });
    } catch (error) {
        res.status(500).json({ error: "Erreur serveur" });
    }
};
