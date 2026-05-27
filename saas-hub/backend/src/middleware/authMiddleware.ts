import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import UserModel from '../models/userModel';

// Interface extension pour ajouter req.user si nécessaire
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const checkUser = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.jwt;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET as string, async (err: any, decodedToken: any) => {
            if (err) {
                res.locals.user = null;
                req.user = null;
                res.cookie('jwt', '', { maxAge: 1 });
                next();
            } else {
                try {
                    const user = await UserModel.findByPk(decodedToken.id);
                    res.locals.user = user;
                    req.user = user;
                    next();
                } catch (error: any) {
                    console.log("Erreur de récupération de l'utilisateur :", error.message);
                    res.locals.user = null;
                    req.user = null;
                    next();
                }
            }
        });
    } else {
        res.locals.user = null;
        req.user = null;
        next();
    }
};

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
    // Accept token from cookie OR Authorization: Bearer <token> header
    const token = req.cookies.jwt
        || (req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : null);

    if (token) {
        jwt.verify(token, process.env.JWT_SECRET as string, async (err: any, decodedToken: any) => {
            if (err) {
                console.log("Token invalide", err);
                res.status(401).json({ message: "Token invalide" });
            } else {
                try {
                    const user = await UserModel.findByPk(decodedToken.id);
                    if (!user) {
                        res.status(401).json({ message: "Utilisateur non trouvé" });
                        return;
                    }
                    req.user = user;
                    next();
                } catch (error) {
                    res.status(500).json({ message: "Erreur serveur" });
                }
            }
        });
    } else {
        console.log("No token");
        res.status(401).json({ message: "Token manquant" });
    }
};
