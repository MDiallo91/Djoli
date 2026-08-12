import Classe from '../../models/classeModel';
import { createTypedCrud, httpError } from './typedCrud';

export interface ClassJson {
    id: string; name: string; level: string | null; tuition_fee: number;
    description: string; created_at: string | null;
}

const toJson = (row: any): ClassJson => ({
    id: row.id, name: row.name, level: row.level, tuition_fee: row.tuition_fee,
    description: row.description || '', created_at: row.client_created_at,
});

const crud = createTypedCrud<ClassJson>({ entityType: 'class', model: Classe, toJson });

export async function listClasses(schoolId: string): Promise<ClassJson[]> {
    const classes = await crud.list(schoolId);
    return classes.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

export async function createClass(schoolId: string, body: any): Promise<ClassJson> {
    const { name, level, tuition_fee, description } = body;
    if (!name || !level) throw httpError(400, 'Nom et niveau requis');
    return crud.create(schoolId, { name, level, tuition_fee: tuition_fee || 0, description: description || '' });
}

export async function updateClass(schoolId: string, id: string, body: any): Promise<ClassJson> {
    const cls = await crud.find(schoolId, id);
    if (!cls) throw httpError(404, 'Classe introuvable');
    return (await crud.update(schoolId, id, body))!;
}

export async function deleteClass(schoolId: string, id: string): Promise<void> {
    await crud.softDelete(schoolId, id);
}
