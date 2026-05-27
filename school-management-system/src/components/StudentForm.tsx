import React, { useState, useEffect } from 'react'
import { ArrowLeft, Save, Search, RefreshCw, GraduationCap, User, Users, Phone } from 'lucide-react'
import { dbService } from '../services/db'

interface StudentFormProps {
    onClose: () => void
    onSave: (data: any) => void
    initialData?: any
}

const inputCls = 'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all'
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5'

function Section({ num, icon: Icon, color, title, children }: {
    num: number; icon: React.ElementType; color: string; title: string; children: React.ReactNode
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 ${color}`}>
                <div className="w-7 h-7 rounded-lg bg-white/30 flex items-center justify-center text-inherit">
                    <Icon size={15} />
                </div>
                <span className="font-black text-sm uppercase tracking-wider">{num}. {title}</span>
            </div>
            <div className="p-6 space-y-4">{children}</div>
        </div>
    )
}

export const StudentForm: React.FC<StudentFormProps> = ({ onClose, onSave, initialData }) => {
    const [classes, setClasses] = useState<any[]>([])
    const [schoolYears, setSchoolYears] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)

    const [parentIsTutor, setParentIsTutor] = useState(true)

    const [studentData, setStudentData] = useState({
        id: null as string | null,
        matricule: '',
        first_name: '',
        last_name: '',
        gender: 'M' as 'M' | 'F',
        birth_date: '',
        address: '',
        pere: '',
        mere: '',
        phone: '',
    })

    const [parentData, setParentData] = useState({
        id: null as string | null,
        first_name: '',
        last_name: '',
        phone: '',
        address: '',
        profession: ''
    })

    const [enrollmentData, setEnrollmentData] = useState({
        class_id: '',
        school_year_id: ''
    })

    useEffect(() => {
        const load = async () => {
            try {
                const [cls, years] = await Promise.all([
                    dbService.getClasses(),
                    dbService.getSchoolYears()
                ])
                setClasses(cls)
                setSchoolYears(years)

                const activeYear = years.find((y: any) => y.is_active)
                if (activeYear) setEnrollmentData(prev => ({ ...prev, school_year_id: activeYear.id }))
                if (cls.length > 0) setEnrollmentData(prev => ({ ...prev, class_id: cls[0].id }))

                if (initialData) {
                    setStudentData({
                        id: initialData.id,
                        matricule: initialData.matricule || '',
                        first_name: initialData.first_name || '',
                        last_name: initialData.last_name || '',
                        gender: initialData.gender || 'M',
                        birth_date: initialData.birth_date || '',
                        address: initialData.address || '',
                        pere: initialData.pere || '',
                        mere: initialData.mere || '',
                        phone: initialData.phone || '',
                    })
                    setParentData({
                        id: initialData.parent_id || null,
                        first_name: initialData.parent_first_name || '',
                        last_name: initialData.parent_last_name || '',
                        phone: initialData.parent_phone || '',
                        address: initialData.parent_address || '',
                        profession: initialData.parent_profession || ''
                    })
                    if (initialData.class_id) setEnrollmentData(prev => ({ ...prev, class_id: initialData.class_id }))
                    if (initialData.school_year_id) setEnrollmentData(prev => ({ ...prev, school_year_id: initialData.school_year_id }))
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const handleSearch = async (val: string) => {
        setSearchTerm(val)
        if (val.trim().length > 1) {
            setIsSearching(true)
            try {
                setSearchResults(await dbService.searchStudents(val))
            } finally {
                setIsSearching(false)
            }
        } else {
            setSearchResults([])
        }
    }

    const handleSelectStudent = (s: any) => {
        setStudentData({
            id: s.id,
            matricule: s.matricule || '',
            first_name: s.first_name,
            last_name: s.last_name,
            gender: s.gender,
            birth_date: s.birth_date || '',
            address: s.address || '',
            pere: s.pere || '',
            mere: s.mere || '',
            phone: s.phone || '',
        })
        setParentData({
            id: s.parent_id,
            first_name: s.parent_first_name || '',
            last_name: s.parent_last_name || '',
            phone: s.parent_phone || '',
            address: s.parent_address || '',
            profession: s.parent_profession || ''
        })
        setSearchTerm('')
        setSearchResults([])
    }

    const resetStudent = () => {
        setStudentData({ id: null, matricule: '', first_name: '', last_name: '', gender: 'M', birth_date: '', address: '', pere: '', mere: '', phone: '' })
        setParentData({ id: null, first_name: '', last_name: '', phone: '', address: '', profession: '' })
    }

    const handlePhoneLookup = async () => {
        if (parentData.phone.trim().length >= 8) {
            try {
                const existing = await dbService.getParentByPhone(parentData.phone)
                if (existing) {
                    setParentData({ id: existing.id, first_name: existing.first_name, last_name: existing.last_name, phone: existing.phone, address: existing.address || '', profession: existing.profession || '' })
                }
            } catch { /* non-bloquant */ }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const finalParent = parentIsTutor
                ? {
                    ...parentData,
                    first_name: parentData.first_name || studentData.pere || '',
                    last_name: parentData.last_name || '',
                }
                : parentData

            await onSave({
                student: studentData,
                parent: { ...finalParent, id: finalParent.id || null },
                enrollment: enrollmentData
            })
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
    )

    const isEdit = !!initialData
    const isReEnroll = !!studentData.id && !isEdit

    return (
        <div className="animate-in fade-in duration-200">
            {/* Sticky header */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 px-6 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-bold text-sm"
                    >
                        <ArrowLeft size={18} />
                        Retour
                    </button>
                    <div className="w-px h-6 bg-gray-200" />
                    <div className="flex-1">
                        <h2 className="font-black text-gray-900 text-base leading-tight">
                            {isEdit ? 'Modifier les informations' : isReEnroll ? 'Ré-inscription' : 'Nouvelle Inscription'}
                        </h2>
                        <p className="text-xs text-gray-400 font-medium">
                            {schoolYears.find(y => y.id.toString() === enrollmentData.school_year_id)?.name || '—'}
                        </p>
                    </div>
                    <button
                        form="student-form"
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-60"
                    >
                        <Save size={16} />
                        {saving ? 'Enregistrement…' : (isEdit ? 'Sauvegarder' : isReEnroll ? 'Valider la ré-inscription' : "Inscrire l'élève")}
                    </button>
                </div>
            </div>

            <form id="student-form" onSubmit={handleSubmit}>
                <div className="max-w-3xl mx-auto py-8 px-4 space-y-5">

                    {/* Recherche ré-inscription */}
                    {!isEdit && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                    Rechercher un élève existant (ré-inscription)
                                </p>
                                {studentData.id && (
                                    <button type="button" onClick={resetStudent}
                                        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/70 transition-colors">
                                        <RefreshCw size={12} /> Nouvel élève
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Nom, prénom ou téléphone parent..."
                                    value={searchTerm}
                                    onChange={e => handleSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                />
                                {isSearching && (
                                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                                        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            {searchResults.length > 0 && (
                                <div className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-10">
                                    {searchResults.map(s => (
                                        <button key={s.id} type="button" onClick={() => handleSelectStudent(s)}
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-sm border-b border-gray-50 last:border-0 transition-colors">
                                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-xs flex-shrink-0">
                                                {s.first_name[0]}{s.last_name[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-900 truncate">{s.first_name} {s.last_name}</p>
                                                <p className="text-xs text-gray-400">Parent: {s.parent_first_name} · {s.parent_phone}</p>
                                            </div>
                                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">Choisir</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {studentData.id && (
                                <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-primary/5 rounded-lg">
                                    <div className="w-2 h-2 rounded-full bg-primary" />
                                    <p className="text-xs font-bold text-primary">
                                        Élève sélectionné : {studentData.first_name} {studentData.last_name}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section 1 — Scolarité */}
                    <Section num={1} icon={GraduationCap} color="bg-primary/5 text-primary" title="Scolarité">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Année scolaire</label>
                                <select required value={enrollmentData.school_year_id}
                                    onChange={e => setEnrollmentData({ ...enrollmentData, school_year_id: e.target.value })}
                                    className={inputCls}>
                                    <option value="">Sélectionner…</option>
                                    {schoolYears.map(y => (
                                        <option key={y.id} value={y.id}>{y.name}{y.is_active ? ' (active)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Classe</label>
                                <select required value={enrollmentData.class_id}
                                    onChange={e => setEnrollmentData({ ...enrollmentData, class_id: e.target.value })}
                                    className={inputCls}>
                                    <option value="">Sélectionner…</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} — {c.level}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </Section>

                    {/* Section 2 — Identité élève */}
                    <Section num={2} icon={User} color="bg-blue-50 text-blue-600" title="Identité de l'élève">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Matricule</label>
                                <input type="text" placeholder="ST-2024-001"
                                    value={studentData.matricule}
                                    onChange={e => setStudentData({ ...studentData, matricule: e.target.value })}
                                    className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Prénom <span className="text-red-400">*</span></label>
                                <input required type="text" placeholder="ex: Jean"
                                    value={studentData.first_name}
                                    onChange={e => setStudentData({ ...studentData, first_name: e.target.value })}
                                    className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Nom <span className="text-red-400">*</span></label>
                                <input required type="text" placeholder="ex: Dupont"
                                    value={studentData.last_name}
                                    onChange={e => setStudentData({ ...studentData, last_name: e.target.value })}
                                    className={inputCls} />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Genre</label>
                                <select value={studentData.gender}
                                    onChange={e => setStudentData({ ...studentData, gender: e.target.value as 'M' | 'F' })}
                                    className={inputCls}>
                                    <option value="M">Masculin</option>
                                    <option value="F">Féminin</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Date de naissance</label>
                                <input type="date"
                                    value={studentData.birth_date}
                                    onChange={e => setStudentData({ ...studentData, birth_date: e.target.value })}
                                    className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Tél. élève</label>
                                <input type="tel" placeholder="ex: 600 00 00 00"
                                    value={studentData.phone}
                                    onChange={e => setStudentData({ ...studentData, phone: e.target.value })}
                                    className={inputCls} />
                            </div>
                        </div>
                        <div>
                            <label className={labelCls}>Adresse</label>
                            <input type="text" placeholder="ex: Conakry, Matam"
                                value={studentData.address}
                                onChange={e => setStudentData({ ...studentData, address: e.target.value })}
                                className={inputCls} />
                        </div>
                    </Section>

                    {/* Section 3 — Famille & Tuteur */}
                    <Section num={3} icon={Users} color="bg-amber-50 text-amber-600" title="Famille & Tuteur légal">
                        {/* Père / Mère */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Nom du père</label>
                                <input type="text" placeholder="Nom complet du père"
                                    value={studentData.pere}
                                    onChange={e => setStudentData({ ...studentData, pere: e.target.value })}
                                    className={inputCls} />
                            </div>
                            <div>
                                <label className={labelCls}>Nom de la mère</label>
                                <input type="text" placeholder="Nom complet de la mère"
                                    value={studentData.mere}
                                    onChange={e => setStudentData({ ...studentData, mere: e.target.value })}
                                    className={inputCls} />
                            </div>
                        </div>

                        {/* Checkbox tuteur */}
                        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${parentIsTutor ? 'border-primary/30 bg-primary/5' : 'border-gray-200 bg-gray-50'}`}>
                            <input
                                type="checkbox"
                                checked={parentIsTutor}
                                onChange={e => setParentIsTutor(e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-primary flex-shrink-0"
                            />
                            <div>
                                <p className="font-bold text-gray-900 text-sm">Le père ou la mère est le tuteur légal</p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {parentIsTutor
                                        ? 'Le contact enregistré sera le père ou la mère de l\'élève.'
                                        : 'Le tuteur est une autre personne (oncle, tante, frère…).'}
                                </p>
                            </div>
                        </label>

                        {parentIsTutor ? (
                            /* Tuteur = père ou mère : juste le téléphone */
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                                    <Phone size={12} />
                                    Contact du parent (père ou mère)
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Téléphone <span className="text-red-400">*</span></label>
                                        <input required type="tel" placeholder="ex: 620 00 00 00"
                                            value={parentData.phone}
                                            onChange={e => setParentData({ ...parentData, phone: e.target.value })}
                                            onBlur={handlePhoneLookup}
                                            className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Adresse</label>
                                        <input type="text" placeholder="ex: Conakry, Kaloum"
                                            value={parentData.address}
                                            onChange={e => setParentData({ ...parentData, address: e.target.value })}
                                            className={inputCls} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Tuteur différent : formulaire complet */
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
                                    <Users size={12} />
                                    Informations du tuteur légal
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Prénom tuteur <span className="text-red-400">*</span></label>
                                        <input required type="text"
                                            value={parentData.first_name}
                                            onChange={e => setParentData({ ...parentData, first_name: e.target.value })}
                                            className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Nom tuteur <span className="text-red-400">*</span></label>
                                        <input required type="text"
                                            value={parentData.last_name}
                                            onChange={e => setParentData({ ...parentData, last_name: e.target.value })}
                                            className={inputCls} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelCls}>Téléphone <span className="text-red-400">*</span></label>
                                        <input required type="tel" placeholder="ex: 620 00 00 00"
                                            value={parentData.phone}
                                            onChange={e => setParentData({ ...parentData, phone: e.target.value })}
                                            onBlur={handlePhoneLookup}
                                            className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Profession</label>
                                        <input type="text"
                                            value={parentData.profession}
                                            onChange={e => setParentData({ ...parentData, profession: e.target.value })}
                                            className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Adresse</label>
                                    <input type="text"
                                        value={parentData.address}
                                        onChange={e => setParentData({ ...parentData, address: e.target.value })}
                                        className={inputCls} />
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* Spacer bottom */}
                    <div className="h-6" />
                </div>
            </form>
        </div>
    )
}
