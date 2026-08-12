import { Request, Response } from 'express';
import * as service from '../../services/school/anneesScolairesService';
import { handleServiceError } from './errorHandler';

export const getSchoolYears = async (req: Request, res: Response) => {
    try { res.json(await service.listSchoolYears(req.user!.id)); }
    catch (err) { handleServiceError(res, err); }
};

export const createSchoolYear = async (req: Request, res: Response) => {
    try { res.json(await service.createSchoolYear(req.user!.id, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const updateSchoolYear = async (req: Request, res: Response) => {
    try { res.json(await service.updateSchoolYear(req.user!.id, req.params.id as string, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const deleteSchoolYear = async (req: Request, res: Response) => {
    try { await service.deleteSchoolYear(req.user!.id, req.params.id as string); res.json({ success: true }); }
    catch (err) { handleServiceError(res, err); }
};
