import { Request, Response } from 'express';
import * as service from '../../services/school/personnelService';
import { handleServiceError } from './errorHandler';

export const getStaff = async (req: Request, res: Response) => {
    try { res.json(await service.listStaff(req.user!.id)); }
    catch (err) { handleServiceError(res, err); }
};

export const createStaff = async (req: Request, res: Response) => {
    try { res.json(await service.createStaff(req.user!.id, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const updateStaff = async (req: Request, res: Response) => {
    try { res.json(await service.updateStaff(req.user!.id, req.params.id as string, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const deleteStaff = async (req: Request, res: Response) => {
    try { await service.deleteStaff(req.user!.id, req.params.id as string); res.json({ success: true }); }
    catch (err) { handleServiceError(res, err); }
};
