import { GraduationCap, Award, FileText, Wallet, Users, Settings } from 'lucide-react'

export interface PermDef {
    key:   string
    label: string
}

export interface ModuleDef {
    id:     string
    label:  string
    Icon:   React.ElementType
    bg:     string
    text:   string
    border: string
    perms:  PermDef[]
}

export const PERMISSION_MODULES: ModuleDef[] = [
    {
        id: 'students', label: 'Élèves', Icon: GraduationCap,
        bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
        perms: [
            { key: 'view_students',  label: 'Voir les élèves' },
            { key: 'add_student',    label: 'Ajouter' },
            { key: 'edit_student',   label: 'Modifier' },
            { key: 'delete_student', label: 'Supprimer' },
        ],
    },
    {
        id: 'grades', label: 'Notes', Icon: Award,
        bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200',
        perms: [
            { key: 'view_grades',     label: 'Voir les notes' },
            { key: 'add_grades',      label: 'Saisir' },
            { key: 'edit_grades',     label: 'Modifier' },
            { key: 'validate_grades', label: 'Valider' },
        ],
    },
    {
        id: 'bulletins', label: 'Bulletins', Icon: FileText,
        bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200',
        perms: [
            { key: 'view_bulletins',     label: 'Voir' },
            { key: 'generate_bulletins', label: 'Générer' },
            { key: 'print_bulletins',    label: 'Imprimer' },
        ],
    },
    {
        id: 'finances', label: 'Finances', Icon: Wallet,
        bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
        perms: [
            { key: 'view_finances', label: 'Voir' },
            { key: 'add_payment',   label: 'Encaisser' },
            { key: 'edit_payment',  label: 'Modifier' },
            { key: 'view_reports',  label: 'Rapports' },
        ],
    },
    {
        id: 'staff', label: 'Personnel', Icon: Users,
        bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
        perms: [
            { key: 'view_staff',     label: 'Voir' },
            { key: 'manage_staff',   label: 'Gérer' },
            { key: 'manage_payroll', label: 'Paie' },
        ],
    },
    {
        id: 'settings', label: 'Paramètres', Icon: Settings,
        bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200',
        perms: [
            { key: 'manage_users',           label: 'Gérer utilisateurs' },
            { key: 'manage_school_settings', label: 'Paramètres école' },
        ],
    },
]

export const ALL_PERMISSIONS = PERMISSION_MODULES.flatMap(m => m.perms.map(p => p.key))

export const PERMISSION_PRESETS: Record<string, { label: string; color: string; perms: string[] }> = {
    Enseignant: {
        label: 'Enseignant',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        perms: [
            'view_students',
            'view_grades', 'add_grades', 'edit_grades',
            'view_bulletins', 'generate_bulletins', 'print_bulletins',
        ],
    },
    Comptable: {
        label: 'Comptable',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        perms: [
            'view_students',
            'view_finances', 'add_payment', 'edit_payment', 'view_reports',
        ],
    },
    Secrétaire: {
        label: 'Secrétaire',
        color: 'bg-teal-100 text-teal-700 border-teal-200',
        perms: [
            'view_students', 'add_student', 'edit_student',
            'view_grades', 'view_bulletins',
            'view_finances', 'view_reports',
        ],
    },
}

/** Returns true if user has the given permission (null perms = admin, all granted). */
export function hasPermission(userPerms: string[] | null | undefined, key: string): boolean {
    if (userPerms === null || userPerms === undefined) return true  // admin
    return userPerms.includes(key)
}

/** Infer a menu permission key from the sidebar tab id. */
export const TAB_PERMISSIONS: Record<string, string | null> = {
    dashboard: null,
    students:  'view_students',
    teachers:  'view_staff',
    finance:   'view_finances',
    grades:    'view_grades',
    schedule:  null,
    structure: 'manage_school_settings',
    profile:   null,
    settings:  'manage_school_settings',
}
