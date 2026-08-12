import { Request, Response } from 'express';
import * as service from '../../services/school/classesService';
import { handleServiceError } from './errorHandler';

export const getClasses = async (req: Request, res: Response) => {
    try { res.json(await service.listClasses(req.user!.id)); }
    catch (err) { handleServiceError(res, err); }
};

export const createClass = async (req: Request, res: Response) => {
    try { res.json(await service.createClass(req.user!.id, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const updateClass = async (req: Request, res: Response) => {
    try { res.json(await service.updateClass(req.user!.id, req.params.id as string, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const deleteClass = async (req: Request, res: Response) => {
    try { await service.deleteClass(req.user!.id, req.params.id as string); res.json({ success: true }); }
    catch (err) { handleServiceError(res, err); }
};
