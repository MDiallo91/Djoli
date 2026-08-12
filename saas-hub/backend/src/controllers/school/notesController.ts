import { Request, Response } from 'express';
import * as service from '../../services/school/notesService';
import { handleServiceError } from './errorHandler';

export const getGrades = async (req: Request, res: Response) => {
    try {
        const { classId, subjectId, term, yearId, studentId } = req.query as Record<string, string>;
        res.json(await service.listGrades(req.user!.id, { classId, subjectId, term, yearId, studentId }));
    } catch (err) { handleServiceError(res, err); }
};

export const saveGradesBulk = async (req: Request, res: Response) => {
    try {
        const saved = await service.saveGradesBulk(req.user!.id, req.body.grades);
        res.json({ saved });
    } catch (err) { handleServiceError(res, err); }
};

export const deleteGrade = async (req: Request, res: Response) => {
    try { await service.deleteGrade(req.user!.id, req.params.id as string); res.json({ success: true }); }
    catch (err) { handleServiceError(res, err); }
};
