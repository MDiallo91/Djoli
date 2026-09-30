import { Request, Response } from 'express';
import * as service from '../../services/school/schoolUsersService';
import { handleServiceError } from './errorHandler';

export const getSchoolUsers = async (req: Request, res: Response) => {
    try { res.json(await service.listSchoolUsers(req.user!.id)); }
    catch (err) { handleServiceError(res, err); }
};

export const updateSchoolUserPermissions = async (req: Request, res: Response) => {
    try { res.json(await service.updateSchoolUserPermissions(req.user!.id, req.params.id as string, req.body)); }
    catch (err) { handleServiceError(res, err); }
};
