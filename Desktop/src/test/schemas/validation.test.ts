import { describe, it, expect } from 'vitest'
import { studentSchema, paymentSchema, staffSchema, gradeSchema, loginSchema } from '../../schemas/validation'

describe('Validation Schemas (Zod)', () => {

    describe('loginSchema', () => {
        it('accepts valid credentials', () => {
            const result = loginSchema.safeParse({ username: 'admin', password: 'password123' })
            expect(result.success).toBe(true)
        })

        it('rejects username shorter than 3 chars', () => {
            const result = loginSchema.safeParse({ username: 'ab', password: 'password' })
            expect(result.success).toBe(false)
        })

        it('rejects empty password', () => {
            const result = loginSchema.safeParse({ username: 'admin', password: '' })
            expect(result.success).toBe(false)
        })
    })

    describe('studentSchema', () => {
        const validStudent = {
            student: { first_name: 'Mamadou', last_name: 'Diallo', gender: 'M' as const },
            parent: { phone: '620000000' },
            enrollment: { class_id: 'cls-123', school_year_id: 'year-456' }
        }

        it('accepts valid student data', () => {
            expect(studentSchema.safeParse(validStudent).success).toBe(true)
        })

        it('rejects first_name shorter than 2 chars', () => {
            const data = { ...validStudent, student: { ...validStudent.student, first_name: 'A' } }
            expect(studentSchema.safeParse(data).success).toBe(false)
        })

        it('rejects invalid gender', () => {
            const data = { ...validStudent, student: { ...validStudent.student, gender: 'X' as any } }
            expect(studentSchema.safeParse(data).success).toBe(false)
        })

        it('rejects empty class_id', () => {
            const data = { ...validStudent, enrollment: { class_id: '', school_year_id: 'year-1' } }
            expect(studentSchema.safeParse(data).success).toBe(false)
        })
    })

    describe('paymentSchema', () => {
        const validPayment = {
            studentId: 'student-1',
            amount: 50000,
            yearId: 'year-1',
            method: 'Espèces' as const,
            description: 'Paiement Octobre',
        }

        it('accepts valid payment', () => {
            expect(paymentSchema.safeParse(validPayment).success).toBe(true)
        })

        it('rejects negative amount', () => {
            expect(paymentSchema.safeParse({ ...validPayment, amount: -100 }).success).toBe(false)
        })

        it('rejects zero amount', () => {
            expect(paymentSchema.safeParse({ ...validPayment, amount: 0 }).success).toBe(false)
        })

        it('rejects invalid payment method', () => {
            expect(paymentSchema.safeParse({ ...validPayment, method: 'BitCoin' as any }).success).toBe(false)
        })

        it('accepts optional months array', () => {
            const data = { ...validPayment, months: ['Octobre', 'Novembre'] }
            expect(paymentSchema.safeParse(data).success).toBe(true)
        })
    })

    describe('gradeSchema', () => {
        const validGrade = {
            student_id: 's1', subject_id: 'sub1',
            score: 15, exam_type: 'Moyenne' as const, term: '1er Trimestre'
        }

        it('accepts valid grade', () => {
            expect(gradeSchema.safeParse(validGrade).success).toBe(true)
        })

        it('rejects score above 20', () => {
            expect(gradeSchema.safeParse({ ...validGrade, score: 21 }).success).toBe(false)
        })

        it('rejects score below 0', () => {
            expect(gradeSchema.safeParse({ ...validGrade, score: -1 }).success).toBe(false)
        })

        it('accepts boundary score values (0 and 20)', () => {
            expect(gradeSchema.safeParse({ ...validGrade, score: 0 }).success).toBe(true)
            expect(gradeSchema.safeParse({ ...validGrade, score: 20 }).success).toBe(true)
        })
    })

    describe('staffSchema', () => {
        const validStaff = {
            first_name: 'Alpha', last_name: 'Barry', role: 'Enseignant',
            salary_base: 800000
        }

        it('accepts valid staff', () => {
            expect(staffSchema.safeParse(validStaff).success).toBe(true)
        })

        it('rejects negative salary', () => {
            expect(staffSchema.safeParse({ ...validStaff, salary_base: -100 }).success).toBe(false)
        })

        it('accepts zero salary', () => {
            expect(staffSchema.safeParse({ ...validStaff, salary_base: 0 }).success).toBe(true)
        })

        it('rejects invalid email', () => {
            expect(staffSchema.safeParse({ ...validStaff, email: 'not-an-email' }).success).toBe(false)
        })

        it('accepts valid email', () => {
            expect(staffSchema.safeParse({ ...validStaff, email: 'alpha@school.edu' }).success).toBe(true)
        })
    })
})
