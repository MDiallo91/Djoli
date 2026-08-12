import { Request, Response } from 'express';
import * as service from '../../services/school/financeService';
import { handleServiceError } from './errorHandler';

export const getPayments = async (req: Request, res: Response) => {
    try {
        const { studentId, yearId } = req.query as Record<string, string>;
        res.json(await service.listPayments(req.user!.id, studentId, yearId));
    } catch (err) { handleServiceError(res, err); }
};

export const createPayment = async (req: Request, res: Response) => {
    try { res.json(await service.createPayment(req.user!.id, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const deletePayment = async (req: Request, res: Response) => {
    try { await service.deletePayment(req.user!.id, req.params.id as string); res.json({ success: true }); }
    catch (err) { handleServiceError(res, err); }
};

export const getTransactions = async (req: Request, res: Response) => {
    try {
        const { yearId } = req.query as Record<string, string>;
        res.json(await service.listTransactions(req.user!.id, yearId));
    } catch (err) { handleServiceError(res, err); }
};

export const createTransaction = async (req: Request, res: Response) => {
    try { res.json(await service.createTransaction(req.user!.id, req.body)); }
    catch (err) { handleServiceError(res, err); }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    try { await service.deleteTransaction(req.user!.id, req.params.id as string); res.json({ success: true }); }
    catch (err) { handleServiceError(res, err); }
};
