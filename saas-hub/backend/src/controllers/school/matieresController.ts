import { Request, Response } from 'express';
import * as service from '../../services/school/matieresService';
import { handleServiceError } from './errorHandler';

export const getSubjects = async (req: Request, res: Response) => {
    try { res.json(await service.listSubjects(req.user!.id)); }
    catch (err) { handleServiceError(res, err); }
};

export const createSubject = async (req: Request, res: Response) => {
    try { res.json(await service.createSubject(req.user!.id, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const deleteSubject = async (req: Request, res: Response) => {
    try { await service.deleteSubject(req.user!.id, req.params.id as string); res.json({ success: true }); }
    catch (err) { handleServiceError(res, err); }
};

export const getClassSubjects = async (req: Request, res: Response) => {
    try { res.json(await service.listClassSubjects(req.user!.id, req.params.classId as string)); }
    catch (err) { handleServiceError(res, err); }
};

export const createClassSubject = async (req: Request, res: Response) => {
    try { res.json(await service.createClassSubject(req.user!.id, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const deleteClassSubject = async (req: Request, res: Response) => {
    try { await service.deleteClassSubject(req.user!.id, req.params.id as string); res.json({ success: true }); }
    catch (err) { handleServiceError(res, err); }
};
