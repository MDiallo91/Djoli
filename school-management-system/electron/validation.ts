import { z } from 'zod'

export const studentSchema = z.object({
    student: z.object({
        id:         z.string().nullable().optional(),
        first_name: z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
        last_name:  z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
        gender:     z.enum(['M', 'F'], { errorMap: () => ({ message: 'Le sexe doit être M (Masculin) ou F (Féminin)' }) }),
        birth_date: z.string().optional(),
        matricule:  z.string().optional(),
        address:    z.string().optional(),
        pere:       z.string().optional(),
        mere:       z.string().optional(),
        phone:      z.string().optional(),
    }),
    parent: z.object({
        id:         z.string().nullable().optional(),
        first_name: z.string().optional(),
        last_name:  z.string().optional(),
        phone:      z.string().optional(),
        address:    z.string().optional(),
        profession: z.string().optional(),
    }),
    enrollment: z.object({
        class_id:       z.string().min(1, 'Veuillez sélectionner une classe'),
        school_year_id: z.string().min(1, "Veuillez sélectionner une année scolaire"),
    }),
})

export const paymentSchema = z.object({
    studentId:   z.string().min(1, "L'élève est requis"),
    amount:      z.number({ invalid_type_error: 'Le montant doit être un nombre' }).positive('Le montant doit être supérieur à 0'),
    yearId:      z.string().min(1, "L'année scolaire est requise"),
    method:      z.enum(['Espèces', 'Chèque', 'Virement', 'Mobile Money'], {
        errorMap: () => ({ message: 'Mode de paiement invalide (Espèces, Chèque, Virement ou Mobile Money)' }),
    }),
    description: z.string(),
    months:      z.array(z.string()).optional(),
})

export const cashTransactionSchema = z.object({
    type:   z.enum(['IN', 'OUT'], { errorMap: () => ({ message: 'Le type doit être IN (entrée) ou OUT (sortie)' }) }),
    amount: z.number({ invalid_type_error: 'Le montant doit être un nombre' }).positive('Le montant doit être supérieur à 0'),
    reason: z.string().min(3, 'Le motif doit contenir au moins 3 caractères'),
})

export const staffSchema = z.object({
    first_name:  z.string().min(2, 'Le prénom doit contenir au moins 2 caractères'),
    last_name:   z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    role:        z.string().min(1, 'Le poste / rôle est requis'),
    phone:       z.string().optional().nullable(),
    email:       z.union([
        z.string().email("L'adresse email est invalide"),
        z.literal(''),
        z.null(),
    ]).optional(),
    address:     z.string().optional().nullable(),
    salary_base: z.number({ invalid_type_error: 'Le salaire de base doit être un nombre' }).nonnegative('Le salaire de base ne peut pas être négatif'),
    hire_date:   z.string().optional().nullable(),
})

export const gradeSchema = z.object({
    student_id: z.string().min(1, "L'élève est requis"),
    subject_id: z.string().min(1, 'La matière est requise'),
    score:      z.number({ invalid_type_error: 'La note doit être un nombre' })
                 .min(0, 'La note ne peut pas être négative')
                 .max(20, 'La note ne peut pas dépasser 20'),
    exam_type:  z.enum(['Devoir', 'Composition', 'Moyenne'], {
        errorMap: () => ({ message: "Le type d'évaluation doit être : Devoir, Composition ou Moyenne" }),
    }),
    term:       z.string().min(1, 'Le trimestre est requis'),
})
