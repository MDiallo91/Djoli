import { Request, Response } from 'express';
import * as service from '../../services/school/inscriptionsService';
import { handleServiceError } from './errorHandler';

export const getEnrollments = async (req: Request, res: Response) => {
    try {
        const { classId, yearId } = req.query as Record<string, string>;
        res.json(await service.listEnrollmentsFiltered(req.user!.id, classId, yearId));
    } catch (err) { handleServiceError(res, err); }
};

export const createEnrollment = async (req: Request, res: Response) => {
    try { res.json(await service.createEnrollment(req.user!.id, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const deleteEnrollment = async (req: Request, res: Response) => {
    try { await service.deleteEnrollment(req.user!.id, req.params.id as string); res.json({ success: true }); }
    catch (err) { handleServiceError(res, err); }
};
