import { randomUUID } from 'crypto';
import { Model, ModelStatic } from 'sequelize';
import { writeEntity, softDeleteEntity } from '../../sync/entityRegistry';

// Fabrique CRUD générique pour les entités "simples" du domaine école
// (années, classes, matières...) : liste/crée/modifie/supprime via la table
// typée, en passant par `writeEntity`/`softDeleteEntity` pour que le desktop
// reçoive toujours le même flux qu'avant (school_records + device_id 'web').
// Les entités avec une logique métier propre (élèves+inscription, paiement+
// caisse, années exclusives...) l'utilisent comme brique de base puis
// ajoutent leurs règles par-dessus (voir eleveService.ts, financeService.ts...).
export interface HttpError { status: number; message: string; }
export const httpError = (status: number, message: string): HttpError => ({ status, message });

interface CrudOptions<T extends { id: string }> {
    entityType: string;
    model:      ModelStatic<Model>;
    toJson:     (row: any) => T;
}

export function createTypedCrud<T extends { id: string }>({ entityType, model, toJson }: CrudOptions<T>) {
    async function list(schoolId: string): Promise<T[]> {
        const rows = await model.findAll({ where: { school_id: schoolId, deleted_at: null }, raw: true });
        return (rows as any[]).map(toJson);
    }

    async function find(schoolId: string, id: string): Promise<T | null> {
        const row = await model.findOne({ where: { id, school_id: schoolId, deleted_at: null }, raw: true });
        return row ? toJson(row) : null;
    }

    async function create(schoolId: string, data: Record<string, any>, id: string = randomUUID()): Promise<T> {
        const payload = { id, ...data, created_at: new Date().toISOString() };
        await writeEntity(schoolId, entityType, id, payload);
        return payload as unknown as T;
    }

    async function update(schoolId: string, id: string, patch: Record<string, any>): Promise<T | null> {
        const current = await find(schoolId, id);
        if (!current) return null;
        const data = { ...current, ...patch, id };
        await writeEntity(schoolId, entityType, id, data);
        return data as T;
    }

    async function softDelete(schoolId: string, id: string): Promise<void> {
        await softDeleteEntity(schoolId, entityType, id);
    }

    return { list, find, create, update, softDelete };
}
