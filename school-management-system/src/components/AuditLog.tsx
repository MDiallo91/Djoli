import React, { useState, useEffect, useCallback } from 'react'
import {
    ScrollText, Search, Filter, Download, RefreshCw,
    LogIn, LogOut, UserPlus, UserCog, UserX, KeyRound,
    GraduationCap, Award, Wallet, ChevronDown, ChevronUp,
    CloudUpload, Users, FileText,
} from 'lucide-react'
import { dbService } from '../services/db'

// ── Action config ─────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; Icon: React.ElementType; bg: string; text: string }> = {
    login:          { label: 'Connexion',          Icon: LogIn,        bg: 'bg-emerald-100', text: 'text-emerald-700' },
    cloud_login:    { label: 'Connexion cloud',    Icon: CloudUpload,  bg: 'bg-sky-100',     text: 'text-sky-700' },
    logout:         { label: 'Déconnexion',        Icon: LogOut,       bg: 'bg-gray-100',    text: 'text-gray-600' },
    add_student:    { label: 'Ajout élève',        Icon: GraduationCap,bg: 'bg-blue-100',    text: 'text-blue-700' },
    edit_student:   { label: 'Modif. élève',       Icon: GraduationCap,bg: 'bg-indigo-100',  text: 'text-indigo-700' },
    delete_student: { label: 'Suppression élève',  Icon: GraduationCap,bg: 'bg-red-100',     text: 'text-red-700' },
    add_grade:      { label: 'Saisie note',        Icon: Award,        bg: 'bg-purple-100',  text: 'text-purple-700' },
    bulk_grades:    { label: 'Notes en masse',     Icon: Award,        bg: 'bg-violet-100',  text: 'text-violet-700' },
    add_payment:    { label: 'Paiement',           Icon: Wallet,       bg: 'bg-amber-100',   text: 'text-amber-700' },
    create_user:    { label: 'Création utilisateur',Icon: UserPlus,    bg: 'bg-teal-100',    text: 'text-teal-700' },
    update_user:    { label: 'Modif. utilisateur', Icon: UserCog,      bg: 'bg-cyan-100',    text: 'text-cyan-700' },
    delete_user:    { label: 'Suppression user',   Icon: UserX,        bg: 'bg-red-100',     text: 'text-red-700' },
    reset_password: { label: 'Réinit. mot de passe',Icon: KeyRound,   bg: 'bg-orange-100',  text: 'text-orange-700' },
}

const DEFAULT_ACTION = { label: 'Action', Icon: ScrollText, bg: 'bg-gray-100', text: 'text-gray-600' }

function formatDate(iso: string): { relative: string; full: string } {
    const d = new Date(iso)
    const now = Date.now()
    const diff = now - d.getTime()
    const s = Math.floor(diff / 1000)
    const m = Math.floor(s / 60)
    const h = Math.floor(m / 60)
    const days = Math.floor(h / 24)

    let relative = ''
    if (s < 60)       relative = 'à l\'instant'
    else if (m < 60)  relative = `il y a ${m} min`
    else if (h < 24)  relative = `il y a ${h}h`
    else if (days < 7)relative = `il y a ${days}j`
    else              relative = d.toLocaleDateString('fr-FR')

    const full = d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'medium' })
    return { relative, full }
}

function ActionBadge({ action }: { action: string }) {
    const cfg = ACTION_CONFIG[action] ?? DEFAULT_ACTION
    const { Icon } = cfg
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${cfg.bg} ${cfg.text}`}>
            <Icon size={11} />
            {cfg.label}
        </span>
    )
}

function JsonDiff({ old: oldVal, new: newVal }: { old: string | null; new: string | null }) {
    if (!oldVal && !newVal) return null
    const parse = (v: string | null) => { try { return JSON.parse(v ?? '{}') } catch { return v } }
    return (
        <div className="grid grid-cols-2 gap-3 mt-2">
            {oldVal && (
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Avant</p>
                    <pre className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700 font-mono overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(parse(oldVal), null, 2)}
                    </pre>
                </div>
            )}
            {newVal && (
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Après</p>
                    <pre className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700 font-mono overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(parse(newVal), null, 2)}
                    </pre>
                </div>
            )}
        </div>
    )
}

// ── Main component ────────────────────────────────────────────────────────────

export function AuditLog() {
    const [logs, setLogs]           = useState<any[]>([])
    const [actionTypes, setActionTypes] = useState<string[]>([])
    const [loading, setLoading]     = useState(true)
    const [expanded, setExpanded]   = useState<string | null>(null)
    const [exporting, setExporting] = useState(false)

    // Filters
    const [search,  setSearch]  = useState('')
    const [action,  setAction]  = useState('')
    const [from,    setFrom]    = useState('')
    const [to,      setTo]      = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        const [data, types] = await Promise.all([
            dbService.getAuditLogs({ search: search || undefined, action: action || undefined, from: from || undefined, to: to || undefined }),
            dbService.getAuditActionTypes(),
        ])
        setLogs(data ?? [])
        setActionTypes(types ?? [])
        setLoading(false)
    }, [search, action, from, to])

    useEffect(() => { load() }, [load])

    const handleExport = async () => {
        setExporting(true)
        try {
            const csv = await dbService.exportAuditCsv()
            const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `journal-audit-${new Date().toISOString().slice(0, 10)}.csv`
            a.click()
            URL.revokeObjectURL(url)
        } finally {
            setExporting(false)
        }
    }

    const inputCls = 'bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all'

    return (
        <div className="space-y-5">
            {/* ── Filters bar ─────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Rechercher…" value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={inputCls + ' pl-8 w-full'} />
                </div>

                <select value={action} onChange={e => setAction(e.target.value)} className={inputCls}>
                    <option value="">Toutes les actions</option>
                    {actionTypes.map(a => (
                        <option key={a} value={a}>{ACTION_CONFIG[a]?.label ?? a}</option>
                    ))}
                </select>

                <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold">
                    <Filter size={13} />
                    <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputCls + ' text-xs'} />
                    <span>→</span>
                    <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputCls + ' text-xs'} />
                </div>

                <button onClick={load} disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all disabled:opacity-50">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Actualiser
                </button>

                <button onClick={handleExport} disabled={exporting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all disabled:opacity-50">
                    <Download size={14} />
                    Export CSV
                </button>
            </div>

            {/* ── Count ────────────────────────────────────────────── */}
            <p className="text-xs text-gray-400 font-semibold">
                {loading ? 'Chargement…' : `${logs.length} entrée${logs.length !== 1 ? 's' : ''}`}
            </p>

            {/* ── Log table ────────────────────────────────────────── */}
            {!loading && logs.length === 0 ? (
                <div className="text-center py-16 text-gray-300">
                    <ScrollText size={40} className="mx-auto mb-3" />
                    <p className="font-semibold text-gray-400">Aucun événement enregistré</p>
                    <p className="text-sm mt-1">Les actions s'afficheront ici au fur et à mesure</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[140px_1fr_160px_1fr_36px] bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                        {['Date', 'Utilisateur', 'Action', 'Entité', ''].map(h => (
                            <span key={h} className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{h}</span>
                        ))}
                    </div>

                    {/* Rows */}
                    {logs.map(log => {
                        const { relative, full } = formatDate(log.created_at)
                        const initials = (log.user_name ?? '?').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                        const isOpen = expanded === log.id
                        const hasDetails = log.old_value || log.new_value

                        return (
                            <div key={log.id} className="border-b border-gray-50 last:border-0">
                                <div className="grid grid-cols-[140px_1fr_160px_1fr_36px] items-center px-4 py-3 hover:bg-gray-50/50 transition-colors">
                                    {/* Date */}
                                    <div title={full} className="text-xs text-gray-400 font-medium cursor-default">{relative}</div>

                                    {/* User */}
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center text-[10px] font-black text-indigo-600 flex-shrink-0">
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate">{log.user_name ?? '—'}</p>
                                        </div>
                                    </div>

                                    {/* Action */}
                                    <div><ActionBadge action={log.action} /></div>

                                    {/* Entity */}
                                    <div className="min-w-0">
                                        <p className="text-xs text-gray-600 font-medium truncate">{log.entity_label ?? log.entity_type ?? '—'}</p>
                                        {log.entity_type && log.entity_label && (
                                            <p className="text-[10px] text-gray-300 mt-0.5">{log.entity_type}</p>
                                        )}
                                    </div>

                                    {/* Expand */}
                                    <div className="flex justify-center">
                                        {hasDetails && (
                                            <button onClick={() => setExpanded(isOpen ? null : log.id)}
                                                className="p-1 text-gray-300 hover:text-indigo-500 transition-colors rounded">
                                                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded details */}
                                {isOpen && hasDetails && (
                                    <div className="px-6 pb-4 bg-gray-50/50 border-t border-gray-100">
                                        <JsonDiff old={log.old_value} new={log.new_value} />
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
