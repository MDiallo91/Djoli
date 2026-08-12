import AnneeScolaire from '../../models/anneeScolaireModel';
import { createTypedCrud, httpError } from './typedCrud';

export interface SchoolYearJson {
    id: string; name: string; start_date: string | null; end_date: string | null;
    is_active: number; created_at: string | null;
}

const toJson = (row: any): SchoolYearJson => ({
    id: row.id, name: row.name, start_date: row.start_date, end_date: row.end_date,
    is_active: row.is_active ? 1 : 0, created_at: row.client_created_at,
});

const crud = createTypedCrud<SchoolYearJson>({ entityType: 'school_year', model: AnneeScolaire, toJson });

export async function listSchoolYears(schoolId: string): Promise<SchoolYearJson[]> {
    const years = await crud.list(schoolId);
    return years.sort((a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime());
}

// Résout l'année à utiliser : celle demandée par id si fournie et existante,
// sinon l'année active, sinon la plus récente. Partagé par les services qui
// filtrent par année (élèves, paiements, transactions, bulletin, dashboard).
export async function resolveYear(schoolId: string, yearId?: string): Promise<SchoolYearJson | null> {
    const years = await listSchoolYears(schoolId); // déjà triées par start_date décroissant
    if (yearId) return years.find(y => y.id === yearId) || null;
    return years.find(y => y.is_active === 1) || years[0] || null;
}

async function deactivateOthers(schoolId: string, exceptId?: string): Promise<void> {
    const years = await crud.list(schoolId);
    for (const y of years) {
        if (y.is_active && y.id !== exceptId) await crud.update(schoolId, y.id, { is_active: 0 });
    }
}

export async function createSchoolYear(schoolId: string, body: any): Promise<SchoolYearJson> {
    const { name, start_date, end_date, is_active } = body;
    if (!name) throw httpError(400, 'Nom requis');
    if (is_active) await deactivateOthers(schoolId);
    return crud.create(schoolId, {
        name, start_date: start_date || null, end_date: end_date || null, is_active: is_active ? 1 : 0,
    });
}

export async function updateSchoolYear(schoolId: string, id: string, body: any): Promise<SchoolYearJson> {
    const year = await crud.find(schoolId, id);
    if (!year) throw httpError(404, 'Année introuvable');
    if (body.is_active) await deactivateOthers(schoolId, id);
    return (await crud.update(schoolId, id, body))!;
}

export async function deleteSchoolYear(schoolId: string, id: string): Promise<void> {
    await crud.softDelete(schoolId, id);
}
