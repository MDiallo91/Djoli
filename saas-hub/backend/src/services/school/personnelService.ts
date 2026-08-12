import Personnel from '../../models/personnelModel';
import { createTypedCrud, httpError } from './typedCrud';

export interface StaffJson {
    id: string; first_name: string; last_name: string; role: string; phone: string;
    email: string; salary_base: number; hire_date: string | null; created_at: string | null;
}

const toJson = (row: any): StaffJson => ({
    id: row.id, first_name: row.first_name, last_name: row.last_name, role: row.role || 'Enseignant',
    phone: row.phone || '', email: row.email || '', salary_base: row.salary_base || 0,
    hire_date: row.hire_date, created_at: row.client_created_at,
});

const crud = createTypedCrud<StaffJson>({ entityType: 'staff', model: Personnel, toJson });

export async function listStaff(schoolId: string): Promise<StaffJson[]> {
    const staff = await crud.list(schoolId);
    return staff.sort((a, b) => a.last_name.localeCompare(b.last_name, 'fr'));
}

export async function createStaff(schoolId: string, body: any): Promise<StaffJson> {
    const { first_name, last_name, role, phone, email, salary_base } = body;
    if (!first_name || !last_name) throw httpError(400, 'Nom et prénom requis');
    return crud.create(schoolId, {
        first_name, last_name, role: role || 'Enseignant', phone: phone || '', email: email || '',
        salary_base: salary_base || 0, hire_date: new Date().toISOString().split('T')[0],
    });
}

export async function updateStaff(schoolId: string, id: string, body: any): Promise<StaffJson> {
    const member = await crud.find(schoolId, id);
    if (!member) throw httpError(404, 'Personnel introuvable');
    return (await crud.update(schoolId, id, body))!;
}

export async function deleteStaff(schoolId: string, id: string): Promise<void> {
    await crud.softDelete(schoolId, id);
}
