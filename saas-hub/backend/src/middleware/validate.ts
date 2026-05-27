import { Request, Response, NextFunction } from 'express'
import { z, ZodSchema } from 'zod'

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
        const issues = result.error.issues ?? []
        res.status(400).json({
            message: issues.map((e: { message: string }) => e.message).join(', '),
            errors: issues,
        })
        return
    }
    req.body = result.data
    next()
}

export const registerSchema = z.object({
    schoolName:     z.string().min(2, 'Nom de l\'école requis'),
    email:          z.string().email('Email invalide'),
    password:       z.string().min(8, 'Mot de passe trop court (min 8 caractères)'),
    country:        z.string().optional(),
    city:           z.string().optional(),
    level:          z.string().optional(),
    directorName:   z.string().optional(),
    prefecture:     z.string().optional(),
    sousPrefecture: z.string().optional(),
    district:       z.string().optional(),
    rccm:           z.string().optional(),
    logoUrl:        z.string().optional(),
})

export const loginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
})
