import { Router } from 'express';
import { getAllSchools, getPendingSchools, createSchool, updateSchool, updateSubscription, approveSchool, rejectSchool, deleteSchool } from '../controllers/adminController';

const router = Router();

router.get('/schools',             getAllSchools);
router.get('/schools/pending',     getPendingSchools);
router.post('/schools',            createSchool);
router.put('/schools/:id',         updateSchool);
router.put('/subscription/:id',    updateSubscription);
router.put('/schools/:id/approve', approveSchool);
router.put('/schools/:id/reject',  rejectSchool);
router.delete('/school/:id',       deleteSchool);

export default router;
