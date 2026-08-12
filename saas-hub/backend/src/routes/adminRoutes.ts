import { Router } from 'express';
import { getAllSchools, getPendingSchools, createSchool, updateSchool, updateSubscription, approveSchool, rejectSchool, deleteSchool } from '../controllers/adminController';
import { requireAdminAuth } from '../middleware/adminAuth';

const router = Router();

// Ces routes n'avaient auparavant AUCUNE authentification — n'importe qui
// pouvait lister/approuver/supprimer des écoles sans être connecté.
router.use(requireAdminAuth);

router.get('/schools',             getAllSchools);
router.get('/schools/pending',     getPendingSchools);
router.post('/schools',            createSchool);
router.put('/schools/:id',         updateSchool);
router.put('/subscription/:id',    updateSubscription);
router.put('/schools/:id/approve', approveSchool);
router.put('/schools/:id/reject',  rejectSchool);
router.delete('/school/:id',       deleteSchool);

export default router;
