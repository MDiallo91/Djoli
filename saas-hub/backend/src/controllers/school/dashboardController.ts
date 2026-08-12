import { Request, Response } from 'express';
import { getDashboardStats as getDashboardStatsService } from '../../services/school/dashboardService';
import { handleServiceError } from './errorHandler';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        res.json(await getDashboardStatsService(req.user!.id));
    } catch (err) {
        handleServiceError(res, err);
    }
};
