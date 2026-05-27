import { Router } from 'express';
import { requireLicenseBearer } from '../middleware/licenseBearerAuth';
import { pushAuditLogs } from '../controllers/auditController';

const router = Router();
router.use(requireLicenseBearer);
router.post('/push', pushAuditLogs);

export default router;
