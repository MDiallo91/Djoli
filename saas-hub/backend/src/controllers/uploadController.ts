import { Request, Response } from 'express';
import { generateUploadSignature } from '../services/cloudinaryService';

const ALLOWED_FOLDERS = ['djoli/logos', 'djoli/students', 'djoli/staff'];

export async function getUploadSignature(req: Request, res: Response) {
    const folder = (req.query.folder as string) || 'djoli/misc';
    if (!ALLOWED_FOLDERS.includes(folder)) {
        return res.status(400).json({ error: 'Dossier non autorisé' });
    }
    try {
        const data = generateUploadSignature(folder);
        res.json(data);
    } catch (err) {
        console.error('[Upload] signature error:', err);
        res.status(500).json({ error: 'Impossible de générer la signature' });
    }
}
