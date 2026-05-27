import { Request, Response } from 'express';
import AuditLog from '../models/auditLogModel';

// POST /api/audit/push
// Receives a batch of audit log entries from the desktop, upserts them (read-only from cloud's perspective).
export const pushAuditLogs = async (req: Request, res: Response): Promise<void> => {
    const schoolId = req.licenseData!.school_id;
    const logs: any[] = req.body.logs ?? [];

    if (!Array.isArray(logs) || logs.length === 0) {
        res.status(200).json({ received: 0 });
        return;
    }

    let received = 0;
    for (const log of logs) {
        if (!log.id || !log.action) continue;
        try {
            await AuditLog.upsert({ ...log, school_id: schoolId });
            received++;
        } catch {
            // Skip duplicates or malformed entries silently
        }
    }

    res.status(200).json({ received });
};
