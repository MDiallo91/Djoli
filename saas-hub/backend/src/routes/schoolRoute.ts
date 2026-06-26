import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import {
    getProfile, updateProfile, changePassword, getSchoolStats, getDashboardStats,
    getStudents, createStudent, updateStudent, deleteStudent, getStudentsDetailed,
    getSchoolYears, createSchoolYear, updateSchoolYear, deleteSchoolYear,
    getClasses, createClass, updateClass, deleteClass,
    getSubjects, createSubject, deleteSubject,
    getClassSubjects, createClassSubject, deleteClassSubject,
    getStaff, createStaff, updateStaff, deleteStaff,
    getEnrollments, createEnrollment, deleteEnrollment,
    getGrades, saveGradesBulk, deleteGrade,
    getPayments, createPayment, deletePayment,
    getTransactions, createTransaction, deleteTransaction,
    getStudentBulletin,
} from '../controllers/schoolController';

const router = Router();

// Profil & stats
router.get('/me',        requireAuth, getProfile);
router.get('/stats',     requireAuth, getSchoolStats);
router.get('/dashboard', requireAuth, getDashboardStats);
router.put('/profile',   requireAuth, updateProfile);
router.put('/password',  requireAuth, changePassword);

// Années scolaires
router.get('/school-years',      requireAuth, getSchoolYears);
router.post('/school-years',     requireAuth, createSchoolYear);
router.put('/school-years/:id',  requireAuth, updateSchoolYear);
router.delete('/school-years/:id', requireAuth, deleteSchoolYear);

// Classes
router.get('/classes',       requireAuth, getClasses);
router.post('/classes',      requireAuth, createClass);
router.put('/classes/:id',   requireAuth, updateClass);
router.delete('/classes/:id', requireAuth, deleteClass);

// Matières
router.get('/subjects',        requireAuth, getSubjects);
router.post('/subjects',       requireAuth, createSubject);
router.delete('/subjects/:id', requireAuth, deleteSubject);

// Associations classe-matière
router.get('/class-subjects/:classId',  requireAuth, getClassSubjects);
router.post('/class-subjects',           requireAuth, createClassSubject);
router.delete('/class-subjects/:id',     requireAuth, deleteClassSubject);

// Personnel
router.get('/staff',        requireAuth, getStaff);
router.post('/staff',       requireAuth, createStaff);
router.put('/staff/:id',    requireAuth, updateStaff);
router.delete('/staff/:id', requireAuth, deleteStaff);

// Élèves
router.get('/students',            requireAuth, getStudents);
router.get('/students/detailed',   requireAuth, getStudentsDetailed);
router.post('/students',           requireAuth, createStudent);
router.put('/students/:id',        requireAuth, updateStudent);
router.delete('/students/:id',     requireAuth, deleteStudent);

// Bulletin
router.get('/bulletin/:studentId', requireAuth, getStudentBulletin);

// Inscriptions
router.get('/enrollments',        requireAuth, getEnrollments);
router.post('/enrollments',       requireAuth, createEnrollment);
router.delete('/enrollments/:id', requireAuth, deleteEnrollment);

// Notes
router.get('/grades',       requireAuth, getGrades);
router.post('/grades/bulk', requireAuth, saveGradesBulk);
router.delete('/grades/:id', requireAuth, deleteGrade);

// Paiements
router.get('/payments',        requireAuth, getPayments);
router.post('/payments',       requireAuth, createPayment);
router.delete('/payments/:id', requireAuth, deletePayment);

// Transactions de caisse
router.get('/transactions',        requireAuth, getTransactions);
router.post('/transactions',       requireAuth, createTransaction);
router.delete('/transactions/:id', requireAuth, deleteTransaction);

export default router;
