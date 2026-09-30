import { z } from 'zod'

export const loginSchema = z.object({
    username: z.string().min(3, 'Identifiant trop court'),
    password: z.string().min(1, 'Mot de passe requis'),
})

export const studentSchema = z.object({
    student: z.object({
        id: z.string().optional(),
        first_name: z.string().min(2, 'Prénom requis (min 2 caractères)'),
        last_name: z.string().min(2, 'Nom requis (min 2 caractères)'),
        gender: z.enum(['M', 'F'], { error: 'Genre invalide (M ou F)' }),
        birth_date: z.string().optional(),
        matricule: z.string().optional(),
        address: z.string().optional(),
        pere: z.string().optional(),
        mere: z.string().optional(),
        phone: z.string().optional(),
    }),
    parent: z.object({
        id: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        profession: z.string().optional(),
    }),
    enrollment: z.object({
        class_id: z.string().min(1, 'Classe requise'),
        school_year_id: z.string().min(1, 'Année scolaire requise'),
    }),
})

export const paymentSchema = z.object({
    studentId: z.string().min(1),
    amount: z.number().positive('Le montant doit être positif'),
    yearId: z.string().min(1),
    method: z.enum(['Espèces', 'Chèque', 'Virement', 'Mobile Money']),
    description: z.string(),
    months: z.array(z.string()).optional(),
})

export const cashTransactionSchema = z.object({
    type: z.enum(['IN', 'OUT']),
    amount: z.number().positive('Montant invalide'),
    reason: z.string().min(3, 'Motif requis (min 3 caractères)'),
})

export const staffSchema = z.object({
    first_name: z.string().min(2, 'Prénom requis'),
    last_name: z.string().min(2, 'Nom requis'),
    role: z.string().min(1, 'Rôle requis'),
    phone: z.string().optional().nullable(),
    email: z.union([z.string().email('Email invalide'), z.literal(''), z.null()]).optional(),
    address: z.string().optional().nullable(),
    salary_base: z.number().nonnegative('Le salaire doit être positif ou nul'),
    hire_date: z.string().optional().nullable(),
})

export const gradeSchema = z.object({
    student_id: z.string().min(1),
    subject_id: z.string().min(1),
    score: z.number().min(0, 'Note min 0').max(20, 'Note max 20'),
    exam_type: z.enum(['Devoir', 'Composition', 'Moyenne']),
    term: z.string().min(1),
})

export const schoolYearSchema = z.object({
    name: z.string().min(4, 'Nom de l\'année requis (ex: 2025-2026)'),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    is_active: z.boolean().optional(),
})

export const schoolInfoSchema = z.object({
    name: z.string().min(2, 'Nom de l\'école requis'),
    address: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.union([z.string().email(), z.literal(''), z.null()]).optional(),
    logo_url: z.string().optional().nullable(),
    motto: z.string().optional().nullable(),
})

export type LoginInput = z.infer<typeof loginSchema>
export type StudentInput = z.infer<typeof studentSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type StaffInput = z.infer<typeof staffSchema>
export type GradeInput = z.infer<typeof gradeSchema>
