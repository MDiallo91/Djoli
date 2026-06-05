import React, { useState, useEffect } from 'react'
import {
    Users, UserPlus, Pencil, Trash2, KeyRound, X, Save,
    CheckSquare, Square, ShieldCheck, Eye, EyeOff,
    User as UserIcon, Mail, AtSign, Copy, CheckCircle, AlertCircle,
    Layers,
} from 'lucide-react'
import { dbService } from '../services/db'
import { PERMISSION_MODULES, PERMISSION_PRESETS, ALL_PERMISSIONS } from '../constants/permissions'
import { useSchoolStore } from '../stores/useSchoolStore'

const ALL_LEVELS = ['Maternelle', 'Primaire', 'Collège', 'Lycée'] as const

// ── Types ─────────────────────────────────────────────────────────────────────

interface SchoolUser {
    id:             string
    name:           string
    email:          string
    username:       string
    role:           string
    permissions:    string   // JSON string from DB
    scope_levels:   string   // JSON string from DB
    photo_url:      string | null
    must_change_pwd: number
    is_active:      number
}

// ── Scope level picker ────────────────────────────────────────────────────────

function ScopeLevelPicker({ selected, onChange, availableLevels }: {
    selected:        string[]
    onChange:        (l: string[]) => void
    availableLevels: string[]
}) {
    if (availableLevels.length === 0) return null
    const toggle = (lvl: string) =>
        onChange(selected.includes(lvl) ? selected.filter(l => l !== lvl) : [...selected, lvl])
    return (
        <div className="space-y-2">
            <p className="text-[10px] text-gray-400 font-semibold">
                Vide = accès à tous les niveaux de l'école
            </p>
            <div className="flex flex-wrap gap-2">
                {availableLevels.map(lvl => {
                    const checked = selected.includes(lvl)
                    return (
                        <button key={lvl} type="button" onClick={() => toggle(lvl)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition-all ${
                                checked
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                            }`}>
                            {checked
                                ? <CheckSquare size={12} className="text-indigo-600" />
                                : <Square size={12} className="text-gray-300" />
                            }
                            {lvl}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ── Permission grid ───────────────────────────────────────────────────────────

function PermissionGrid({ selected, onChange }: { selected: string[]; onChange: (p: string[]) => void }) {
    const toggle = (key: string) =>
        onChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key])

    return (
        <div className="space-y-4">
            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-2">
                <span className="text-xs font-bold text-gray-400 self-center">Profils rapides :</span>
                {Object.entries(PERMISSION_PRESETS).map(([name, cfg]) => (
                    <button key={name} type="button" onClick={() => onChange(cfg.perms)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all hover:scale-105 ${cfg.color}`}>
                        {cfg.label}
                    </button>
                ))}
                <button type="button" onClick={() => onChange(ALL_PERMISSIONS)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 transition-all">
                    Tout sélectionner
                </button>
                <button type="button" onClick={() => onChange([])}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-white text-gray-400 border-gray-200 hover:bg-gray-50 transition-all">
                    Réinitialiser
                </button>
            </div>

            {/* Module checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PERMISSION_MODULES.map(mod => {
                    const ModIcon = mod.Icon
                    const allChecked = mod.perms.every(p => selected.includes(p.key))
                    const someChecked = mod.perms.some(p => selected.includes(p.key))
                    return (
                        <div key={mod.id} className={`rounded-2xl border p-4 space-y-2 ${mod.border} ${mod.bg}`}>
                            <div className="flex items-center justify-between">
                                <span className={`flex items-center gap-1.5 text-xs font-black uppercase tracking-wider ${mod.text}`}>
                                    <ModIcon size={13} />
                                    {mod.label}
                                </span>
                                <button type="button"
                                    onClick={() => onChange(allChecked
                                        ? selected.filter(k => !mod.perms.map(p => p.key).includes(k))
                                        : [...new Set([...selected, ...mod.perms.map(p => p.key)])]
                                    )}
                                    className={`text-[10px] font-bold ${mod.text} opacity-60 hover:opacity-100 transition-opacity`}
                                >
                                    {allChecked ? 'Tout décocher' : 'Tout cocher'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {mod.perms.map(perm => {
                                    const checked = selected.includes(perm.key)
                                    return (
                                        <label key={perm.key}
                                            className="flex items-center gap-2 cursor-pointer group">
                                            <button type="button" onClick={() => toggle(perm.key)}
                                                className={`flex-shrink-0 w-4 h-4 rounded transition-colors ${
                                                    checked ? `${mod.text.replace('text-', 'text-')} opacity-100` : 'text-gray-300'
                                                }`}>
                                                {checked
                                                    ? <CheckSquare size={16} className={mod.text} />
                                                    : <Square size={16} className="text-gray-300 group-hover:text-gray-400" />
                                                }
                                            </button>
                                            <span className={`text-xs font-semibold ${checked ? 'text-gray-800' : 'text-gray-400'}`}>
                                                {perm.label}
                                            </span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── User form panel ───────────────────────────────────────────────────────────

function UserPanel({
    user, onClose, onSaved,
}: {
    user: SchoolUser | null   // null = création
    onClose: () => void
    onSaved: () => void
}) {
    const isEdit = !!user
    const { schoolLevels } = useSchoolStore()
    const [name, setName]         = useState(user?.name ?? '')
    const [email, setEmail]       = useState(user?.email ?? '')
    const [username, setUsername] = useState(user?.username ?? '')
    const [password, setPassword] = useState('')
    const [showPwd, setShowPwd]   = useState(false)
    const [role, setRole]         = useState(user?.role ?? 'staff')
    const [perms, setPerms]       = useState<string[]>(
        user ? JSON.parse(user.permissions) : []
    )
    const [scopeLevels, setScopeLevels] = useState<string[]>(
        user ? (() => { try { return JSON.parse(user.scope_levels || '[]') } catch { return [] } })() : []
    )
    const [error, setError]   = useState('')
    const [loading, setLoading] = useState(false)
    const [created, setCreated] = useState<{ username: string; password: string } | null>(null)

    const availableLevels = schoolLevels.length > 0 ? schoolLevels : ALL_LEVELS

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true); setError('')
        try {
            if (isEdit) {
                await dbService.updateSchoolUser({ id: user!.id, name, role, permissions: perms, scope_levels: scopeLevels })
            } else {
                if (!password) { setError('Mot de passe requis'); setLoading(false); return }
                const result = await dbService.createSchoolUser({ name, email, username, password, role, permissions: perms, scope_levels: scopeLevels })
                setCreated({ username: result.username, password: result.password_plain })
                onSaved()
                return
            }
            onSaved(); onClose()
        } catch (err: any) {
            setError(err.message || 'Erreur')
        } finally {
            setLoading(false)
        }
    }

    const inputCls = 'w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300'

    if (created) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-1">Utilisateur créé !</h3>
                <p className="text-sm text-gray-500 mb-6">Transmettez ces identifiants à l'utilisateur.</p>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 w-full text-left space-y-2 mb-6">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold">Identifiant</span>
                        <span className="font-black text-gray-900 font-mono">{created.username}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 font-bold">Mot de passe temporaire</span>
                        <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 font-mono">{created.password}</span>
                            <button type="button"
                                onClick={() => navigator.clipboard.writeText(`${created.username} / ${created.password}`)}
                                className="p-1 text-gray-400 hover:text-indigo-600">
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mb-6">L'utilisateur devra changer ce mot de passe à la première connexion.</p>
                <button onClick={onClose}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all">
                    Fermer
                </button>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h3 className="font-black text-gray-900">
                    {isEdit ? `Modifier — ${user!.name}` : 'Nouvel utilisateur'}
                </h3>
                <button type="button" onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl font-semibold">
                        <AlertCircle size={15} />
                        {error}
                    </div>
                )}

                {/* Info fields */}
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-1.5">
                            <UserIcon size={12} className="text-indigo-500" /> Nom complet
                        </label>
                        <input type="text" required value={name} onChange={e => setName(e.target.value)}
                            placeholder="Jean Dupont" className={inputCls} />
                    </div>
                    {!isEdit && (
                        <>
                            <div>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-1.5">
                                    <Mail size={12} className="text-blue-500" /> Email
                                </label>
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="jean@ecole.com" className={inputCls} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-1.5">
                                        <AtSign size={12} className="text-emerald-500" /> Identifiant
                                    </label>
                                    <input type="text" required value={username} onChange={e => setUsername(e.target.value)}
                                        placeholder="jean.dupont" className={inputCls} />
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-1.5">
                                        <KeyRound size={12} className="text-amber-500" /> Mot de passe temporaire
                                    </label>
                                    <div className="relative">
                                        <input type={showPwd ? 'text' : 'password'} required value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••" className={inputCls + ' pr-10'} />
                                        <button type="button" onClick={() => setShowPwd(!showPwd)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                            {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div>
                        <label className="text-xs font-bold text-gray-500 mb-1.5 block">Rôle</label>
                        <select value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
                            <option value="staff">Personnel</option>
                            <option value="admin">Administrateur</option>
                        </select>
                    </div>
                </div>

                {/* Niveaux d'action */}
                <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Layers size={13} className="text-sky-500" />
                        Niveaux d'action
                    </p>
                    <ScopeLevelPicker
                        selected={scopeLevels}
                        onChange={setScopeLevels}
                        availableLevels={availableLevels}
                    />
                </div>

                {/* Permissions */}
                <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <ShieldCheck size={13} className="text-purple-500" />
                        Permissions
                    </p>
                    <PermissionGrid selected={perms} onChange={setPerms} />
                </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100">
                <button type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all hover:shadow-lg disabled:opacity-50">
                    <Save size={16} />
                    {loading ? 'Enregistrement…' : isEdit ? 'Sauvegarder les modifications' : 'Créer l\'utilisateur'}
                </button>
            </div>
        </form>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UserManagement() {
    const [users, setUsers]         = useState<SchoolUser[]>([])
    const [selected, setSelected]   = useState<SchoolUser | null>(null)
    const [panelOpen, setPanelOpen] = useState(false)
    const [loading, setLoading]     = useState(true)
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

    const load = async () => {
        setLoading(true)
        const list = await dbService.getSchoolUsers()
        setUsers(list)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const openCreate = () => { setSelected(null); setPanelOpen(true) }
    const openEdit   = (u: SchoolUser) => { setSelected(u); setPanelOpen(true) }
    const closePanel = () => { setPanelOpen(false); setSelected(null) }

    const handleDelete = async (id: string) => {
        await dbService.deleteSchoolUser(id)
        setConfirmDelete(null)
        load()
    }

    const handleResetPwd = async (u: SchoolUser) => {
        const newPwd = Math.random().toString(36).slice(-8)
        await dbService.resetUserPassword({ id: u.id, newPassword: newPwd })
        alert(`Nouveau mot de passe temporaire pour ${u.name} : ${newPwd}`)
    }

    const permCount = (p: string) => {
        try { return JSON.parse(p).length } catch { return 0 }
    }

    return (
        <div className="flex gap-6 h-full">
            {/* ── User list ────────────────────────────────── */}
            <div className={`${panelOpen ? 'flex-1' : 'w-full'} space-y-4 transition-all`}>
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-black text-gray-900">Utilisateurs de l'école</h3>
                        <p className="text-sm text-gray-400 mt-0.5">{users.length} utilisateur{users.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={openCreate}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all hover:shadow-md hover:shadow-indigo-200">
                        <UserPlus size={16} />
                        Ajouter
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="w-8 h-8 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-2" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Users size={40} className="mx-auto mb-3 text-gray-200" />
                        <p className="font-semibold">Aucun utilisateur créé</p>
                        <p className="text-sm mt-1">Ajoutez des enseignants, comptables ou secrétaires</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {users.map(u => {
                            const initials = u.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                            const roleLabel = u.role === 'admin' ? 'Admin' : 'Personnel'
                            const roleColor = u.role === 'admin'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-600'
                            return (
                                <div key={u.id}
                                    className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-indigo-100 hover:shadow-sm transition-all group">
                                    {/* Avatar */}
                                    <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center font-black text-indigo-600 text-sm flex-shrink-0">
                                        {initials}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-gray-900 text-sm truncate">{u.name}</p>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${roleColor}`}>
                                                {roleLabel}
                                            </span>
                                            {!u.is_active && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-600">
                                                    Inactif
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{u.email} · @{u.username}</p>
                                        <p className="text-[10px] text-gray-300 mt-0.5">
                                            {permCount(u.permissions)} permission{permCount(u.permissions) !== 1 ? 's' : ''}
                                            {(() => { try { const l = JSON.parse(u.scope_levels || '[]'); return l.length > 0 ? ` · ${l.join(', ')}` : '' } catch { return '' } })()}
                                            {u.must_change_pwd ? ' · Doit changer le mdp' : ''}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleResetPwd(u)} title="Réinitialiser le mot de passe"
                                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all">
                                            <KeyRound size={15} />
                                        </button>
                                        <button onClick={() => openEdit(u)} title="Modifier"
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                                            <Pencil size={15} />
                                        </button>
                                        <button onClick={() => setConfirmDelete(u.id)} title="Supprimer"
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── Slide-in panel ───────────────────────────── */}
            {panelOpen && (
                <div className="w-[480px] bg-white rounded-3xl border border-gray-100 shadow-xl flex flex-col overflow-hidden flex-shrink-0">
                    <UserPanel user={selected} onClose={closePanel} onSaved={load} />
                </div>
            )}

            {/* ── Delete confirm modal ──────────────────────── */}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl">
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={22} className="text-red-600" />
                        </div>
                        <h3 className="font-black text-gray-900 mb-2">Supprimer l'utilisateur ?</h3>
                        <p className="text-sm text-gray-500 mb-6">Cette action est irréversible.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDelete(null)}
                                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all">
                                Annuler
                            </button>
                            <button onClick={() => handleDelete(confirmDelete)}
                                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all">
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
