import UtilisateurEcole from '../../models/utilisateurEcoleModel';
import { createTypedCrud, httpError } from './typedCrud';

export interface SchoolUserJson {
    id: string; name: string; email: string; username: string; phone: string;
    role: string; permissions: string[]; scope_levels: string[]; is_active: boolean;
}

const toJson = (row: any): SchoolUserJson => ({
    id: row.id, name: row.name, email: row.email || '', username: row.username || '', phone: row.phone || '',
    role: row.role || 'staff',
    permissions: JSON.parse(row.permissions || '[]'),
    scope_levels: JSON.parse(row.scope_levels || '[]'),
    is_active: !!row.is_active,
});

const crud = createTypedCrud<SchoolUserJson>({ entityType: 'school_user', model: UtilisateurEcole, toJson });

export async function listSchoolUsers(schoolId: string): Promise<SchoolUserJson[]> {
    const users = await crud.list(schoolId);
    return users.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

// Le portail web ne peut éditer que les permissions d'un compte déjà créé/synchronisé
// depuis le desktop — la création de comptes (mot de passe) reste desktop-only.
export async function updateSchoolUserPermissions(
    schoolId: string, id: string,
    body: { role?: string; permissions?: string[]; scope_levels?: string[]; is_active?: boolean },
): Promise<SchoolUserJson> {
    const current = await crud.find(schoolId, id);
    if (!current) throw httpError(404, 'Utilisateur introuvable');

    // `current.permissions`/`scope_levels` sont déjà désérialisés en tableaux (toJson) —
    // on doit toujours les re-sérialiser ici, sinon crud.update() renverrait un tableau
    // brut à writeEntity()/mapPayload() qui attendent une chaîne JSON pour la colonne TEXT.
    const patch: Record<string, any> = {
        role:         body.role ?? current.role,
        permissions:  JSON.stringify(body.permissions ?? current.permissions),
        scope_levels: JSON.stringify(body.scope_levels ?? current.scope_levels),
        is_active:    body.is_active ?? current.is_active,
    };

    return (await crud.update(schoolId, id, patch))!;
}
