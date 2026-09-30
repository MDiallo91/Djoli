import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getProfile, updateProfile, changePassword, getSchoolStats, requestLevels } from '../controllers/school/schoolProfileController';
import { getDashboardStats } from '../controllers/school/dashboardController';
import { getStudents, createStudent, updateStudent, deleteStudent, getStudentsDetailed, getStudentBulletin } from '../controllers/school/elevesController';
import { getSchoolYears, createSchoolYear, updateSchoolYear, deleteSchoolYear } from '../controllers/school/anneesScolairesController';
import { getClasses, createClass, updateClass, deleteClass } from '../controllers/school/classesController';
import { getSubjects, createSubject, deleteSubject, getClassSubjects, createClassSubject, deleteClassSubject } from '../controllers/school/matieresController';
import { getStaff, createStaff, updateStaff, deleteStaff } from '../controllers/school/personnelController';
import { getSchoolUsers, updateSchoolUserPermissions } from '../controllers/school/schoolUsersController';
import { getEnrollments, createEnrollment, deleteEnrollment } from '../controllers/school/inscriptionsController';
import { getGrades, saveGradesBulk, deleteGrade } from '../controllers/school/notesController';
import { getPayments, createPayment, deletePayment, getTransactions, createTransaction, deleteTransaction } from '../controllers/school/financeController';

const router = Router();

// Profil & stats
router.get('/me',        requireAuth, getProfile);
router.get('/stats',     requireAuth, getSchoolStats);
router.get('/dashboard', requireAuth, getDashboardStats);
router.put('/profile',   requireAuth, updateProfile);
router.put('/password',  requireAuth, changePassword);
router.put('/levels',    requireAuth, requestLevels);

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

// Comptes/permissions du personnel d'école (pas de création depuis le web — cf. schoolUsersService.ts)
router.get('/users',                requireAuth, getSchoolUsers);
router.put('/users/:id/permissions', requireAuth, updateSchoolUserPermissions);

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
