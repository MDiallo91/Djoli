import { Request, Response, NextFunction } from 'express'
import { z, ZodSchema } from 'zod'
import { DOCUMENT_MIME_TYPES, DOCUMENT_MAX_BYTES } from '../models/documentEcoleModel'

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

const SCHOOL_LEVELS = ['Maternelle', 'Primaire', 'Collège', 'Lycée'] as const

// Taille décodée d'une chaîne base64 (sans préfixe data:), sans la décoder.
const base64Bytes = (b64: string) => Math.floor(b64.length * 3 / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0)

// Pièce jointe envoyée en base64 dans le JSON (stockée en base, voir DocumentEcole).
export const documentFileSchema = z.object({
    name: z.string().min(1).max(255),
    type: z.enum(DOCUMENT_MIME_TYPES, { message: 'Le document doit être un PDF, JPG ou PNG' }),
    data: z.string().regex(/^[A-Za-z0-9+/]+={0,2}$/, 'Document invalide'),
}).refine(f => base64Bytes(f.data) <= DOCUMENT_MAX_BYTES, { message: 'Document trop volumineux (2,5 Mo maximum)' })

export const registerSchema = z.object({
    schoolName:     z.string().min(2, 'Nom de l\'école requis'),
    email:          z.string().email('Email invalide'),
    password:       z.string().min(8, 'Mot de passe trop court (min 8 caractères)'),
    country:        z.string().optional(),
    city:           z.string().optional(),
    levels:         z.array(z.enum(SCHOOL_LEVELS)).min(1, 'Sélectionnez au moins un cycle scolaire').optional(),
    directorName:   z.string().optional(),
    prefecture:     z.string().optional(),
    sousPrefecture: z.string().optional(),
    district:       z.string().optional(),
    rccm:           z.string().optional(),
    rccmFile:       documentFileSchema.optional(),
    // Logo en data URL base64 (PNG/JPEG/WEBP/GIF, 500 Ko max ≈ 683 000 caractères),
    // converti en image stockée en base par authController.signUp. SVG refusé (script possible).
    logoUrl:        z.string().max(700_000, 'Logo trop volumineux (500 Ko maximum)')
                        .regex(/^data:image\/(png|jpeg|webp|gif);base64,/, 'Logo : image PNG, JPG, WEBP ou GIF requise')
                        .optional().or(z.literal('')),
})

// Le champ `email` sert d'identifiant générique — accepte aussi un numéro de
// téléphone (voir authController.signIn, qui cherche email OU phone). Pas de
// validation de format ici : une adresse/numéro invalide ne matchera de toute
// façon rien en base et renverra "Email ou mot de passe incorrect".
export const loginSchema = z.object({
    email: z.string().min(1, 'Identifiant requis'),
    password: z.string().min(1, 'Mot de passe requis'),
})
