import { Request, Response } from 'express';
import * as service from '../../services/school/eleveService';
import * as bulletinService from '../../services/school/bulletinService';
import { handleServiceError } from './errorHandler';

export const getStudents = async (req: Request, res: Response) => {
    try { res.json(await service.listStudentsSummary(req.user!.id)); }
    catch (err) { handleServiceError(res, err); }
};

export const getStudentsDetailed = async (req: Request, res: Response) => {
    try {
        const { yearId } = req.query as Record<string, string>;
        res.json(await service.listStudentsDetailed(req.user!.id, yearId));
    } catch (err) { handleServiceError(res, err); }
};

export const createStudent = async (req: Request, res: Response) => {
    try { res.json(await service.createStudent(req.user!.id, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const updateStudent = async (req: Request, res: Response) => {
    try { res.json(await service.updateStudent(req.user!.id, req.params.id as string, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const deleteStudent = async (req: Request, res: Response) => {
    try { await service.deleteStudent(req.user!.id, req.params.id as string); res.json({ success: true }); }
    catch (err) { handleServiceError(res, err); }
};

export const getStudentBulletin = async (req: Request, res: Response) => {
    try {
        const { yearId } = req.query as Record<string, string>;
        res.json(await bulletinService.getStudentBulletin(req.user!.id, req.params.studentId as string, yearId));
    } catch (err) { handleServiceError(res, err); }
};
