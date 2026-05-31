import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { getProfile, updateProfile, changePassword, getSchoolStats, getDashboardStats, getStudents } from '../controllers/schoolController';

const router = Router();

router.get('/me',        requireAuth, getProfile);
router.get('/stats',     requireAuth, getSchoolStats);
router.get('/dashboard', requireAuth, getDashboardStats);
router.get('/students',  requireAuth, getStudents);
router.put('/profile',   requireAuth, updateProfile);
router.put('/password',  requireAuth, changePassword);

export default router;
