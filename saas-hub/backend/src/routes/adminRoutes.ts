import { Router } from 'express';
import { getAllSchools, getPendingSchools, createSchool, updateSchool, updateSubscription, approveSchool, rejectSchool, approveLevels, rejectLevels, deleteSchool, getArchivedSchools, restoreSchool, listSchoolDocuments, getDocument } from '../controllers/adminController';
import { requireAdminAuth } from '../middleware/adminAuth';

const router = Router();

// Ces routes n'avaient auparavant AUCUNE authentification — n'importe qui
// pouvait lister/approuver/supprimer des écoles sans être connecté.
router.use(requireAdminAuth);

router.get('/schools',             getAllSchools);
router.get('/schools/pending',     getPendingSchools);
router.get('/schools/archived',    getArchivedSchools);
router.put('/schools/:id/restore', restoreSchool);
router.post('/schools',            createSchool);
router.put('/schools/:id',         updateSchool);
router.put('/subscription/:id',    updateSubscription);
router.put('/schools/:id/approve', approveSchool);
router.put('/schools/:id/reject',  rejectSchool);
router.put('/schools/:id/levels/approve', approveLevels);
router.put('/schools/:id/levels/reject',  rejectLevels);
router.delete('/school/:id',       deleteSchool);
router.get('/schools/:id/documents', listSchoolDocuments);
router.get('/documents/:docId',     getDocument);

export default router;
