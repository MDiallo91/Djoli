import { Router } from 'express';
import { requireLicenseBearer } from '../middleware/licenseBearerAuth';
import { pushChanges, pullChanges, syncStatus, resetSchoolRecords } from '../controllers/syncController';

const router = Router();

router.use(requireLicenseBearer);

router.post('/push',   pushChanges);
router.get('/pull',    pullChanges);
router.get('/status',  syncStatus);
router.delete('/reset', resetSchoolRecords);

export default router;
