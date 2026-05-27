import React, { useState, useEffect } from 'react'
import {
    Building2, Sparkles, MapPin, Phone, Mail, Camera, Save,
    GraduationCap, Hash, Plus, Trash2, RotateCcw, CheckCircle,
    School, BookOpen, Medal, Users, ScrollText,
} from 'lucide-react'
import { dbService } from '../services/db'
import { UserManagement } from './UserManagement'
import { AuditLog } from './AuditLog'
import { useAppStore } from '../stores/useAppStore'
import { hasPermission } from '../constants/permissions'

// ── Types ─────────────────────────────────────────────────────────────────────

interface GradeMention {
    min:   number
    max:   number
    label: string
    color: string
}

interface LevelConfig {
    scale:  number
    config: GradeMention[]
}

// ── Color palette for mentions ────────────────────────────────────────────────

const COLORS: Record<string, { dot: string; bg: string; text: string; border: string; label: string }> = {
    red:    { dot: 'bg-red-400',    bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'Rouge' },
    orange: { dot: 'bg-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Orange' },
    yellow: { dot: 'bg-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Jaune' },
    green:  { dot: 'bg-green-400',  bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  label: 'Vert' },
    blue:   { dot: 'bg-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Bleu' },
    purple: { dot: 'bg-purple-400', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', label: 'Violet' },
}

// ── Level metadata ────────────────────────────────────────────────────────────

const LEVELS = [
    { key: 'Maternelle', icon: School,      color: 'text-pink-500',   bg: 'bg-pink-50',   active: 'bg-pink-500'   },
    { key: 'Primaire',   icon: BookOpen,    color: 'text-amber-500',  bg: 'bg-amber-50',  active: 'bg-amber-500'  },
    { key: 'Collège',    icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-50',   active: 'bg-blue-500'   },
    { key: 'Lycée',      icon: Medal,       color: 'text-purple-500', bg: 'bg-purple-50', active: 'bg-purple-500' },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function FieldLabel({ icon: Icon, label, color }: { icon: React.ElementType; label: string; color: string }) {
    return (
        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
            <Icon size={12} className={color} />
            {label}
        </label>
    )
}

function Field({ children }: { children: React.ReactNode }) {
    return <div>{children}</div>
}

const inputCls = 'w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-4 py-3 font-semibold text-gray-900 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 focus:bg-white transition-all placeholder:text-gray-300 text-sm'

// ── Grading level editor ──────────────────────────────────────────────────────

function GradingLevelEditor({
    levelMeta,
    config,
    onChange,
    onReset,
}: {
    levelMeta: typeof LEVELS[0]
    config:    LevelConfig
    onChange:  (updated: LevelConfig) => void
    onReset:   () => void
}) {
    const LevelIcon = levelMeta.icon

    const setScale = (scale: number) => onChange({ ...config, scale })

    const updateMention = (i: number, field: keyof GradeMention, value: any) => {
        const next = config.config.map((m, idx) => idx === i ? { ...m, [field]: value } : m)
        onChange({ ...config, config: next })
    }

    const addMention = () => {
        const last = config.config[config.config.length - 1]
        const newMin = last ? last.max : 0
        onChange({
            ...config,
            config: [...config.config, { min: newMin, max: config.scale, label: 'Nouveau', color: 'blue' }],
        })
    }

    const removeMention = (i: number) => {
        onChange({ ...config, config: config.config.filter((_, idx) => idx !== i) })
    }

    return (
        <div className="space-y-5">
            {/* Scale selector */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Hash size={13} className="text-amber-500" /> Barème :
                </span>
                {[10, 20].map(s => (
                    <button
                        key={s}
                        type="button"
                        onClick={() => setScale(s)}
                        className={`px-4 py-1.5 rounded-xl text-sm font-black transition-all ${
                            config.scale === s
                                ? `${levelMeta.active} text-white shadow-md`
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        /{s}
                    </button>
                ))}
                <span className="ml-auto">
                    <button
                        type="button"
                        onClick={onReset}
                        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors font-semibold"
                    >
                        <RotateCcw size={12} />
                        Réinitialiser
                    </button>
                </span>
            </div>

            {/* Mentions table */}
            <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="grid grid-cols-[80px_80px_1fr_120px_40px] bg-gray-50 px-4 py-2 border-b border-gray-100">
                    {['Min', 'Max', 'Mention', 'Couleur', ''].map(h => (
                        <span key={h} className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{h}</span>
                    ))}
                </div>

                {config.config.map((mention, i) => {
                    const c = COLORS[mention.color] ?? COLORS.blue
                    return (
                        <div key={i} className="grid grid-cols-[80px_80px_1fr_120px_40px] items-center px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                            {/* Min */}
                            <input
                                type="number"
                                min={0}
                                max={config.scale}
                                step={0.5}
                                value={mention.min}
                                onChange={e => updateMention(i, 'min', parseFloat(e.target.value))}
                                className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                            />
                            {/* Max */}
                            <input
                                type="number"
                                min={0}
                                max={config.scale}
                                step={0.5}
                                value={mention.max}
                                onChange={e => updateMention(i, 'max', parseFloat(e.target.value))}
                                className="w-16 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-center outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                            />
                            {/* Label */}
                            <input
                                type="text"
                                value={mention.label}
                                onChange={e => updateMention(i, 'label', e.target.value)}
                                className="mr-3 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-sm font-bold outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                            />
                            {/* Color picker */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                                {Object.entries(COLORS).map(([key, val]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => updateMention(i, 'color', key)}
                                        title={val.label}
                                        className={`w-5 h-5 rounded-full ${val.dot} transition-transform hover:scale-110 ${
                                            mention.color === key ? 'ring-2 ring-offset-1 ring-gray-400 scale-110' : ''
                                        }`}
                                    />
                                ))}
                            </div>
                            {/* Preview badge + delete */}
                            <div className="flex items-center justify-end gap-1">
                                <span className={`hidden xl:inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${c.bg} ${c.text} border ${c.border}`}>
                                    {mention.label}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeMention(i)}
                                    className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        </div>
                    )
                })}

                <button
                    type="button"
                    onClick={addMention}
                    className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all"
                >
                    <Plus size={15} />
                    Ajouter une mention
                </button>
            </div>

            {/* Preview row */}
            <div className="flex flex-wrap gap-2 pt-1">
                {config.config.map((m, i) => {
                    const c = COLORS[m.color] ?? COLORS.blue
                    return (
                        <span key={i} className={`px-3 py-1 rounded-full text-xs font-black ${c.bg} ${c.text} border ${c.border}`}>
                            {m.min}–{m.max} — {m.label}
                        </span>
                    )
                })}
            </div>
        </div>
    )
}

// ── Main Settings component ───────────────────────────────────────────────────

export function Settings() {
    const { user } = useAppStore()
    const canManageUsers = hasPermission(user?.permissions ?? null, 'manage_users')
    const [activeTab, setActiveTab] = useState<'school' | 'grading' | 'users' | 'audit' | 'backup'>('school')
    const [activeLevel, setActiveLevel] = useState('Collège')

    const [schoolInfo, setSchoolInfo] = useState({
        name: '', motto: '', address: '', phone: '', email: '', logo_url: '',
        city: '', region: '', commune: '', sous_prefecture: '', director_name: '',
        color_sidebar: '#1a2f6e', color_accent: '#2563eb',
    })
    const [gradingConfigs, setGradingConfigs] = useState<Record<string, LevelConfig>>({})
    const [dirtyLevels, setDirtyLevels] = useState<Set<string>>(new Set())

    const [isSaving, setIsSaving] = useState(false)
    const [savedMsg, setSavedMsg] = useState('')

    useEffect(() => {
        dbService.getSchoolInfo().then(info => { if (info) setSchoolInfo(info) })
        dbService.getGradingConfigs().then(configs => { if (configs) setGradingConfigs(configs) })
    }, [])

    const showSuccess = (msg = 'Enregistré !') => {
        setSavedMsg(msg)
        setTimeout(() => setSavedMsg(''), 3000)
    }

    const handleSaveSchool = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            await dbService.updateSchoolInfo(schoolInfo)
            showSuccess('Informations enregistrées !')
        } catch { showSuccess('Erreur lors de l\'enregistrement.') }
        finally { setIsSaving(false) }
    }

    const handleSaveGrading = async () => {
        setIsSaving(true)
        try {
            for (const level of dirtyLevels) {
                const cfg = gradingConfigs[level]
                if (cfg) await dbService.saveGradingConfig({ level, ...cfg })
            }
            setDirtyLevels(new Set())
            showSuccess('Barème enregistré !')
        } catch { showSuccess('Erreur.') }
        finally { setIsSaving(false) }
    }

    const handleLevelChange = (level: string, updated: LevelConfig) => {
        setGradingConfigs(prev => ({ ...prev, [level]: updated }))
        setDirtyLevels(prev => new Set(prev).add(level))
    }

    const handleResetLevel = async (level: string) => {
        await dbService.resetGradingConfig(level)
        const fresh = await dbService.getGradingConfigs()
        setGradingConfigs(fresh)
        setDirtyLevels(prev => { const n = new Set(prev); n.delete(level); return n })
    }

    const currentLevelMeta = LEVELS.find(l => l.key === activeLevel)!
    const currentLevelConfig = gradingConfigs[activeLevel]

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

            {/* ── Tabs ───────────────────────────────────────────── */}
            <div className="flex items-end gap-1 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('school')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                        activeTab === 'school'
                            ? 'border-gray-900 text-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                >
                    <Building2 size={15} />
                    Informations École
                </button>
                <button
                    onClick={() => setActiveTab('grading')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                        activeTab === 'grading'
                            ? 'border-gray-900 text-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                >
                    <GraduationCap size={15} />
                    Barème &amp; Mentions
                    {dirtyLevels.size > 0 && (
                        <span className="ml-1 w-2 h-2 bg-amber-400 rounded-full" />
                    )}
                </button>
                {canManageUsers && (
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                            activeTab === 'users'
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <Users size={15} />
                        Utilisateurs &amp; Rôles
                    </button>
                )}
                {canManageUsers && (
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                            activeTab === 'audit'
                                ? 'border-gray-900 text-gray-900'
                                : 'border-transparent text-gray-400 hover:text-gray-700'
                        }`}
                    >
                        <ScrollText size={15} />
                        Journal d'activité
                    </button>
                )}
                <button
                    onClick={() => setActiveTab('backup')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                        activeTab === 'backup'
                            ? 'border-gray-900 text-gray-900'
                            : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                >
                    <Save size={15} />
                    Sauvegarde
                </button>
            </div>

            {/* ═══════════════════════════════════════════════════════
                  TAB 1 — SCHOOL INFO
              ═══════════════════════════════════════════════════════ */}
            {activeTab === 'school' && (
                <form onSubmit={handleSaveSchool} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 space-y-8">

                        {/* Identité + Logo */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-5">
                                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <Building2 size={13} className="text-indigo-400" />
                                    Identité
                                </h3>

                                <Field>
                                    <FieldLabel icon={Building2} label="Nom de l'établissement" color="text-indigo-500" />
                                    <input required type="text" className={inputCls}
                                        value={schoolInfo.name}
                                        onChange={e => setSchoolInfo({ ...schoolInfo, name: e.target.value })}
                                        placeholder="École Excellence 224" />
                                </Field>

                                <Field>
                                    <FieldLabel icon={Sparkles} label="Devise / Slogan" color="text-amber-500" />
                                    <input type="text" className={inputCls}
                                        value={schoolInfo.motto}
                                        onChange={e => setSchoolInfo({ ...schoolInfo, motto: e.target.value })}
                                        placeholder="L'éducation est la clé..." />
                                </Field>
                            </div>

                            {/* Logo */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                                    <Camera size={13} className="text-purple-400" />
                                    Logo
                                </h3>
                                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-3xl p-8 bg-gray-50 hover:bg-gray-100 hover:border-purple-300 transition-all cursor-pointer group">
                                    {schoolInfo.logo_url ? (
                                        <img src={schoolInfo.logo_url} alt="Logo" className="w-28 h-28 object-contain rounded-2xl bg-white shadow-md p-2 mb-3" />
                                    ) : (
                                        <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-gray-300 mb-3 shadow-sm group-hover:scale-105 transition-transform">
                                            <Camera size={32} />
                                        </div>
                                    )}
                                    <span className="text-xs font-bold text-gray-500">Cliquez pour choisir une image</span>
                                    <span className="text-[10px] text-gray-400 mt-1">PNG, JPG, SVG</span>
                                    <input type="file" accept="image/*" className="hidden"
                                        onChange={e => {
                                            const f = e.target.files?.[0]
                                            if (f) {
                                                const r = new FileReader()
                                                r.onloadend = () => setSchoolInfo({ ...schoolInfo, logo_url: r.result as string })
                                                r.readAsDataURL(f)
                                            }
                                        }} />
                                </label>
                                {schoolInfo.logo_url && (
                                    <button type="button" onClick={() => setSchoolInfo({ ...schoolInfo, logo_url: '' })}
                                        className="text-[11px] text-red-400 hover:text-red-600 font-bold flex items-center gap-1 mx-auto transition-colors">
                                        <Trash2 size={11} /> Supprimer le logo
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Contact */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                <Phone size={13} className="text-emerald-400" />
                                Contact
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1">
                                    <FieldLabel icon={MapPin} label="Adresse complète" color="text-rose-500" />
                                    <input type="text" className={inputCls}
                                        value={schoolInfo.address}
                                        onChange={e => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                                        placeholder="Quartier, Commune, Ville" />
                                </div>
                                <div>
                                    <FieldLabel icon={Phone} label="Téléphone" color="text-emerald-500" />
                                    <input type="tel" className={inputCls}
                                        value={schoolInfo.phone}
                                        onChange={e => setSchoolInfo({ ...schoolInfo, phone: e.target.value })}
                                        placeholder="620 00 00 00" />
                                </div>
                                <div>
                                    <FieldLabel icon={Mail} label="Email" color="text-blue-500" />
                                    <input type="email" className={inputCls}
                                        value={schoolInfo.email}
                                        onChange={e => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                                        placeholder="direction@ecole.com" />
                                </div>
                            </div>
                        </div>

                        {/* Administrative (bulletin header) */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                <BookOpen size={13} className="text-amber-500" />
                                Administration — En-tête des bulletins
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">IRE (Région)</label>
                                    <input type="text" className={inputCls}
                                        value={schoolInfo.region}
                                        onChange={e => setSchoolInfo({ ...schoolInfo, region: e.target.value })}
                                        placeholder="CONAKRY" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">DCE (Commune)</label>
                                    <input type="text" className={inputCls}
                                        value={schoolInfo.commune}
                                        onChange={e => setSchoolInfo({ ...schoolInfo, commune: e.target.value })}
                                        placeholder="RATOMA" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">DSEE / S-Préfecture</label>
                                    <input type="text" className={inputCls}
                                        value={schoolInfo.sous_prefecture}
                                        onChange={e => setSchoolInfo({ ...schoolInfo, sous_prefecture: e.target.value })}
                                        placeholder="YATTAYA" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">Ville (signature)</label>
                                    <input type="text" className={inputCls}
                                        value={schoolInfo.city}
                                        onChange={e => setSchoolInfo({ ...schoolInfo, city: e.target.value })}
                                        placeholder="Conakry" />
                                </div>
                            </div>
                        </div>

                        {/* ── Apparence ── */}
                        <div className="border-t border-gray-100 pt-8">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2 mb-5">
                                <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: schoolInfo.color_sidebar }} />
                                Apparence & Couleurs
                            </h3>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Sidebar color */}
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-3 block">Couleur de la barre latérale</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={schoolInfo.color_sidebar}
                                                onChange={e => {
                                                    const c = e.target.value
                                                    setSchoolInfo({ ...schoolInfo, color_sidebar: c })
                                                    document.documentElement.style.setProperty('--sidebar-bg', c)
                                                }}
                                                className="w-14 h-14 rounded-2xl cursor-pointer border-2 border-gray-200 p-1"
                                                style={{ backgroundColor: schoolInfo.color_sidebar }}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">{schoolInfo.color_sidebar.toUpperCase()}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Sidebar + navigation</p>
                                            <div className="flex gap-1.5 mt-2">
                                                {['#1a2f6e','#0f4c75','#1b1b2f','#2d6a4f','#7b2d8b','#c0392b'].map(c => (
                                                    <button key={c} type="button"
                                                        onClick={() => { setSchoolInfo({ ...schoolInfo, color_sidebar: c }); document.documentElement.style.setProperty('--sidebar-bg', c) }}
                                                        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125"
                                                        style={{ backgroundColor: c, borderColor: schoolInfo.color_sidebar === c ? '#000' : 'transparent' }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Accent color */}
                                <div>
                                    <label className="text-xs font-medium text-gray-600 mb-3 block">Couleur d'accentuation</label>
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <input
                                                type="color"
                                                value={schoolInfo.color_accent}
                                                onChange={e => {
                                                    const c = e.target.value
                                                    setSchoolInfo({ ...schoolInfo, color_accent: c })
                                                    document.documentElement.style.setProperty('--accent', c)
                                                }}
                                                className="w-14 h-14 rounded-2xl cursor-pointer border-2 border-gray-200 p-1"
                                                style={{ backgroundColor: schoolInfo.color_accent }}
                                            />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">{schoolInfo.color_accent.toUpperCase()}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">Boutons + éléments actifs</p>
                                            <div className="flex gap-1.5 mt-2">
                                                {['#2563eb','#16a34a','#dc2626','#d97706','#7c3aed','#0891b2'].map(c => (
                                                    <button key={c} type="button"
                                                        onClick={() => { setSchoolInfo({ ...schoolInfo, color_accent: c }); document.documentElement.style.setProperty('--accent', c) }}
                                                        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-125"
                                                        style={{ backgroundColor: c, borderColor: schoolInfo.color_accent === c ? '#000' : 'transparent' }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live preview */}
                            <div className="mt-5 rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ height: '60px', display: 'flex' }}>
                                <div className="w-32 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: schoolInfo.color_sidebar }}>
                                    Sidebar
                                </div>
                                <div className="flex-1 bg-white flex items-center px-4 gap-3">
                                    <span className="text-xs font-bold text-gray-900">Aperçu en direct</span>
                                    <button type="button" className="px-3 py-1 text-white text-xs font-bold rounded-lg" style={{ backgroundColor: schoolInfo.color_accent }}>
                                        Bouton
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-8 py-5 bg-gray-50 border-t border-gray-100">
                        {savedMsg ? (
                            <span className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl">
                                <CheckCircle size={15} /> {savedMsg}
                            </span>
                        ) : <span />}
                        <button type="submit" disabled={isSaving}
                            className="flex items-center gap-2 px-7 py-3 text-white rounded-2xl font-black text-sm transition-all hover:-translate-y-0.5 disabled:opacity-50"
                            style={{ backgroundColor: schoolInfo.color_accent }}>
                            <Save size={16} />
                            {isSaving ? 'Enregistrement…' : 'Sauvegarder'}
                        </button>
                    </div>
                </form>
            )}

            {/* ═══════════════════════════════════════════════════════
                  TAB 2 — GRADING CONFIG
              ═══════════════════════════════════════════════════════ */}
            {activeTab === 'grading' && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 space-y-6">

                        <p className="text-sm text-gray-500 leading-relaxed">
                            Définissez les <span className="font-bold text-gray-700">mentions</span> et les <span className="font-bold text-gray-700">barèmes</span> pour chaque cycle scolaire.
                            Les primaires sont notés <span className="font-bold">/10</span>, les collégiens et lycéens <span className="font-bold">/20</span>.
                        </p>

                        {/* Level tabs */}
                        <div className="flex gap-2 flex-wrap">
                            {LEVELS.map(lvl => {
                                const LvlIcon = lvl.icon
                                const isDirty = dirtyLevels.has(lvl.key)
                                return (
                                    <button key={lvl.key} type="button"
                                        onClick={() => setActiveLevel(lvl.key)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                                            activeLevel === lvl.key
                                                ? `${lvl.active} text-white shadow-md`
                                                : `${lvl.bg} ${lvl.color} hover:opacity-80`
                                        }`}
                                    >
                                        <LvlIcon size={14} />
                                        {lvl.key}
                                        {isDirty && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Editor */}
                        {currentLevelConfig && (
                            <GradingLevelEditor
                                levelMeta={currentLevelMeta}
                                config={currentLevelConfig}
                                onChange={cfg => handleLevelChange(activeLevel, cfg)}
                                onReset={() => handleResetLevel(activeLevel)}
                            />
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-8 py-5 bg-gray-50 border-t border-gray-100">
                        {savedMsg ? (
                            <span className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-2xl">
                                <CheckCircle size={15} /> {savedMsg}
                            </span>
                        ) : (
                            dirtyLevels.size > 0
                                ? <span className="text-xs text-amber-600 font-bold bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                                    {dirtyLevels.size} niveau{dirtyLevels.size > 1 ? 'x' : ''} modifié{dirtyLevels.size > 1 ? 's' : ''}
                                  </span>
                                : <span />
                        )}
                        <button type="button" onClick={handleSaveGrading} disabled={isSaving || dirtyLevels.size === 0}
                            className="flex items-center gap-2 px-7 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-sm transition-all hover:shadow-lg hover:shadow-purple-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0">
                            <Save size={16} />
                            {isSaving ? 'Enregistrement…' : 'Sauvegarder le barème'}
                        </button>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                  TAB 3 — USERS & ROLES
              ═══════════════════════════════════════════════════════ */}
            {activeTab === 'users' && canManageUsers && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 min-h-[500px]">
                    <UserManagement />
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                  TAB 4 — AUDIT LOG
              ═══════════════════════════════════════════════════════ */}
            {activeTab === 'audit' && canManageUsers && (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 min-h-[500px]">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                            <ScrollText size={20} className="text-slate-600" />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900">Journal d'activité</h3>
                            <p className="text-sm text-gray-400">Toutes les actions enregistrées dans l'application</p>
                        </div>
                    </div>
                    <AuditLog />
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                  TAB 5 — BACKUP / RESTORE
              ═══════════════════════════════════════════════════════ */}
            {activeTab === 'backup' && (
                <BackupTab />
            )}
        </div>
    )
}

// ── Backup Tab ────────────────────────────────────────────────────────────────
function BackupTab() {
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null)
    const [busy, setBusy] = useState(false)

    const ipc = (window as any).ipcRenderer

    const notify = (type: 'success' | 'error' | 'info', msg: string) => {
        setStatus({ type, msg })
        setTimeout(() => setStatus(null), 5000)
    }

    const handleExport = async () => {
        setBusy(true)
        try {
            const res = await ipc.invoke('export-school-db')
            if (res?.success)  notify('success', `Exporté : ${res.filePath}`)
            else if (!res?.canceled) notify('error', res?.error || 'Erreur export')
        } catch { notify('error', 'Erreur inattendue') }
        finally { setBusy(false) }
    }

    const handleImport = async () => {
        if (!confirm('Importer une sauvegarde va remplacer les données actuelles. Une copie de secours sera créée automatiquement. Continuer ?')) return
        setBusy(true)
        try {
            const res = await ipc.invoke('import-school-db')
            if (res?.success)  notify('success', 'Base importée avec succès. Les données sont rechargées.')
            else if (!res?.canceled) notify('error', res?.error || 'Erreur import')
        } catch { notify('error', 'Erreur inattendue') }
        finally { setBusy(false) }
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8 space-y-8">
            <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Save size={20} className="text-amber-600" />
                </div>
                <div>
                    <h3 className="font-black text-gray-900">Sauvegarde & Restauration</h3>
                    <p className="text-sm text-gray-400">Exportez vos données ou restaurez une sauvegarde précédente.</p>
                </div>
            </div>

            {status && (
                <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold ${
                    status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    status.type === 'error'   ? 'bg-red-50 text-red-700 border border-red-100' :
                                               'bg-blue-50 text-blue-700 border border-blue-100'
                }`}>
                    <CheckCircle size={16} />
                    {status.msg}
                </div>
            )}

            <div className="grid grid-cols-2 gap-6">
                {/* Export */}
                <div className="border border-gray-100 rounded-2xl p-6 space-y-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Save size={20} className="text-blue-600" />
                    </div>
                    <h4 className="font-black text-gray-900">Exporter la base</h4>
                    <p className="text-sm text-gray-500">Crée un fichier <code className="bg-gray-100 px-1 rounded">.db</code> que vous pouvez stocker sur clé USB, cloud ou disque externe.</p>
                    <button
                        onClick={handleExport}
                        disabled={busy}
                        className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                        <Save size={16} />
                        {busy ? 'Export en cours…' : 'Exporter les données'}
                    </button>
                </div>

                {/* Import */}
                <div className="border border-amber-100 rounded-2xl p-6 space-y-3 bg-amber-50/30">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                        <RotateCcw size={20} className="text-amber-600" />
                    </div>
                    <h4 className="font-black text-gray-900">Importer une sauvegarde</h4>
                    <p className="text-sm text-gray-500">Restaure un fichier <code className="bg-amber-100 px-1 rounded">.db</code> précédemment exporté. Une copie de secours de la base actuelle est créée avant le remplacement.</p>
                    <button
                        onClick={handleImport}
                        disabled={busy}
                        className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all disabled:opacity-50"
                    >
                        <RotateCcw size={16} />
                        {busy ? 'Import en cours…' : 'Importer une sauvegarde'}
                    </button>
                </div>
            </div>

            <div className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
                Les sauvegardes contiennent : élèves, notes, paiements, classes, matières, emplois du temps, personnel.<br/>
                Elles ne contiennent pas les comptes utilisateurs ni la configuration de licence.
            </div>
        </div>
    )
}
