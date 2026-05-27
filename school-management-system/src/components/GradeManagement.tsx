import React, { useState, useEffect, useCallback } from 'react'
import { dbService, Student } from '../services/db'
import { useSchoolStore } from '../stores/useSchoolStore'
import { GraduationCap, Award, TrendingUp, Search, Plus, Printer, FileText } from 'lucide-react'
import { BulletinPrint, BulletinGrade } from './BulletinPrint'
import { ClassRankingPrint } from './ClassRankingPrint'
import { GradeSheetPrint } from './GradeSheetPrint'
import { EvaluationResultPrint } from './EvaluationResultPrint'
import { PrintPreview } from './PrintPreview'
import {
    getMention, getMentionColors, levelToConfigKey,
    LevelConfig, DEFAULT_CONFIGS,
} from '../utils/gradingUtils'

export const GradeManagement: React.FC = () => {
    const { activeYear } = useSchoolStore()
    const [students, setStudents] = useState<Student[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeStudent, setActiveStudent] = useState<string | null>(null)
    const [grades, setGrades] = useState<any[]>([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedTerm, setSelectedTerm] = useState('1er Trimestre')
    const [rankings, setRankings] = useState<any[]>([])
    const [newGrade, setNewGrade] = useState({
        subject_id: '',
        score: '',
        exam_type: 'Moyenne',
        term: '1er Trimestre'
    })
    const [viewMode, setViewMode] = useState<'individual' | 'class'>('individual')
    const [selectedClassId, setSelectedClassId] = useState<string>('')
    const [classes, setClasses] = useState<any[]>([])
    const [classGrades, setClassGrades] = useState<any[]>([])
    const [selectedBulkSubject, setSelectedBulkSubject] = useState<string>('')
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [schoolYears, setSchoolYears] = useState<any[]>([])
    const [activePrintStudent, setActivePrintStudent] = useState<any | null>(null)
    const [activePrintType, setActivePrintType] = useState<'bulletin' | 'class_ranking' | null>(null)
    const [gradeSheetOpen, setGradeSheetOpen] = useState(false)
    const [evalResultOpen, setEvalResultOpen] = useState(false)
    const [bulletinPreviewOpen, setBulletinPreviewOpen] = useState(false)
    const [classBulletinOpen, setClassBulletinOpen] = useState(false)
    const [classBulletinData, setClassBulletinData] = useState<{ student: any; grades: BulletinGrade[]; rank: number }[]>([])
    const [loadingBulletins, setLoadingBulletins] = useState(false)
    const [evalStudentsData, setEvalStudentsData] = useState<any[]>([])
    const [gradingConfigs, setGradingConfigs] = useState<Record<string, LevelConfig>>(DEFAULT_CONFIGS)
    const [activeLevelConfig, setActiveLevelConfig] = useState<LevelConfig>(DEFAULT_CONFIGS['Collège'])

    const filteredStudents = students.filter(s =>
        ((s.first_name + ' ' + s.last_name).toLowerCase().includes(searchTerm.toLowerCase()) || 
         (s.matricule || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedClassId === '' || s.class_id?.toString() === selectedClassId)
    )

    const fetchData = async () => {
        try {
            const [subjectsData, classesData, yearsData, configs] = await Promise.all([
                dbService.getSubjects(),
                dbService.getClasses(),
                dbService.getSchoolYears(),
                dbService.getGradingConfigs(),
            ])
            if (configs) setGradingConfigs({ ...DEFAULT_CONFIGS, ...configs })
            setSubjects(subjectsData)
            setClasses(classesData)
            setSchoolYears(yearsData)

            const active = yearsData.find((y: any) => y.is_active) || yearsData[0]
            const yearId = activeYear?.id?.toString() || active?.id?.toString() || ''
            setSelectedYear(yearId)

            const studentsData = await dbService.getStudents(yearId || undefined)
            setStudents(studentsData)

            if (newGrade.subject_id === '' && subjectsData.length > 0) {
                setNewGrade(prev => ({ ...prev, subject_id: subjectsData[0].id.toString() }))
            }
            if (selectedBulkSubject === '' && subjectsData.length > 0) {
                setSelectedBulkSubject(subjectsData[0].id.toString())
            }
        } catch (error) {
            console.error('Error fetching grade data:', error)
        } finally {
            setLoading(false)
        }
    }

    const reloadStudents = async (yearId: string) => {
        try {
            const data = await dbService.getStudents(yearId || undefined)
            setStudents(data)
        } catch (error) {
            console.error('Error reloading students:', error)
        }
    }

    const fetchClassGrades = async () => {
        if (!selectedClassId || !selectedBulkSubject || !selectedTerm) return
        setLoading(true)
        try {
            const data = await dbService.getClassGrades(selectedClassId, selectedBulkSubject, selectedTerm, selectedYear || undefined)
            setClassGrades(data)
        } catch (error) {
            console.error('Error fetching class grades:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (viewMode === 'class' && selectedClassId && selectedBulkSubject) {
            fetchClassGrades()
        } else if (viewMode === 'individual' && activeStudent) {
            dbService.getStudentGrades(activeStudent, selectedYear || undefined).then(setGrades).catch(console.error)
        }
    }, [viewMode, selectedClassId, selectedBulkSubject, selectedTerm, activeStudent, selectedYear])

    const handleSaveBulk = async () => {
        if (!selectedBulkSubject || !selectedTerm) return
        try {
            await dbService.saveClassGradesBulk(classGrades, selectedBulkSubject, selectedTerm, selectedYear || undefined)

            // Refresh arrays
            if (activeStudent) {
                const updatedGrades = await dbService.getStudentGrades(activeStudent, selectedYear || undefined)
                setGrades(updatedGrades)
            }
            fetchClassGrades()
            
            alert('Notes enregistrées avec succès !')
        } catch (error) {
            console.error('Error saving bulk grades:', error)
        }
    }

    // ── Grade computation helper (reused for individual + class bulletins) ──────
    const computeBulletinGrades = useCallback((
        studentGrades: any[],
        subjectList: any[]
    ): BulletinGrade[] => {
        const getMoyForTerm = (subjId: any, termLabel: string): number | null => {
            const tg = studentGrades.filter(
                g => (g.subject_id === subjId || g.subject_id?.toString() === subjId?.toString())
                    && g.term === termLabel
            )
            const moyenneGrade = tg.find(g => g.exam_type === 'Moyenne')
            if (moyenneGrade) return moyenneGrade.score
            const compGrade  = tg.find(g => g.exam_type === 'Composition')
            const devoirGrades = tg.filter(g => g.exam_type === 'Devoir')
            const moyCours = devoirGrades.length > 0
                ? devoirGrades.reduce((s: number, g: any) => s + g.score, 0) / devoirGrades.length
                : null
            if (compGrade && moyCours !== null) return (compGrade.score + moyCours) / 2
            return compGrade?.score ?? moyCours ?? null
        }
        return subjectList.map((subject: any): BulletinGrade => {
            const subjId   = subject.subject_id || subject.id
            const subjName = subject.name || subjects.find((s: any) => s.id === subjId)?.name
            const moy_t1 = getMoyForTerm(subjId, '1er Trimestre')
            const moy_t2 = getMoyForTerm(subjId, '2ème Trimestre')
            const moy_t3 = getMoyForTerm(subjId, '3ème Trimestre')
            const available = [moy_t1, moy_t2, moy_t3].filter((v): v is number => v !== null)
            const moy_annuelle = available.length > 0
                ? available.reduce((s, v) => s + v, 0) / available.length
                : null
            return { subject_name: subjName, coefficient: subject.coefficient ?? 1, moy_t1, moy_t2, moy_t3, moy_annuelle }
        })
    }, [subjects])

    // ── Individual bulletin ────────────────────────────────────────────────────
    const handlePrintBulletin = async (student: any) => {
        if (!student) return
        setActivePrintStudent(student)
        if (student.class_id) {
            try {
                const data = await dbService.getClassRankings(student.class_id, selectedTerm)
                setRankings(data)
            } catch { /* non-bloquant */ }
        }
        setBulletinPreviewOpen(true)
    }

    // ── Class bulletin (all students) ─────────────────────────────────────────
    const handlePrintClassBulletins = async () => {
        if (!selectedClassId) return
        setLoadingBulletins(true)
        try {
            const classStudents = students.filter(
                s => s.class_id?.toString() === selectedClassId
            )
            if (classStudents.length === 0) return

            const [subjectsForClass, rankingsData, ...allGrades] = await Promise.all([
                dbService.getClassSubjects(selectedClassId),
                dbService.getClassRankings(selectedClassId, selectedTerm),
                ...classStudents.map(s => dbService.getStudentGrades(s.id, selectedYear || undefined)),
            ])

            const classLevel = (classes.find((c: any) => c.id?.toString() === selectedClassId) as any)?.level
            const configKey  = levelToConfigKey(classLevel)
            setActiveLevelConfig(gradingConfigs[configKey] ?? DEFAULT_CONFIGS['Collège'])
            setRankings(rankingsData)

            const bulletinData = classStudents.map((student, i) => {
                const rankIdx = rankingsData.findIndex(
                    (r: any) => r.student_id?.toString() === student.id?.toString()
                )
                return {
                    student,
                    grades: computeBulletinGrades(allGrades[i] ?? [], subjectsForClass),
                    rank: rankIdx >= 0 ? rankIdx + 1 : classStudents.length,
                }
            })

            setClassBulletinData(bulletinData)
            setClassBulletinOpen(true)
        } catch (e) {
            console.error('[ClassBulletin]', e)
        } finally {
            setLoadingBulletins(false)
        }
    }

    const handleSaveGrade = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeStudent || !newGrade.subject_id || newGrade.score === '') return

        try {
            await dbService.addGrade({
                student_id: activeStudent,
                subject_id: newGrade.subject_id,
                score: parseFloat(newGrade.score),
                exam_type: newGrade.exam_type,
                term: newGrade.term,
                school_year_id: selectedYear || undefined
            })
            setIsModalOpen(false)
            setNewGrade(prev => ({ ...prev, score: '' }))
            const data = await dbService.getStudentGrades(activeStudent, selectedYear || undefined)
            setGrades(data)
        } catch (error) {
            console.error('Failed to save grade:', error)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    useEffect(() => {
        if (activeYear?.id) {
            const yearId = activeYear.id.toString()
            setSelectedYear(yearId)
            reloadStudents(yearId)
            setActiveStudent(null)
        }
    }, [activeYear?.id])

    const [classSubjects, setClassSubjects] = useState<any[]>([])

    useEffect(() => {
        if (activeStudent) {
            const fetchGradesAndSubjects = async () => {
                const data = await dbService.getStudentGrades(activeStudent, selectedYear || undefined)
                setGrades(data)

                const student = students.find(s => s.id === activeStudent)
                if (student?.class_id) {
                    const cSubjects = await dbService.getClassSubjects(student.class_id)
                    setClassSubjects(cSubjects)
                    const classLevel = (classes.find((c: any) => c.id === student.class_id || c.id?.toString() === student.class_id?.toString()) as any)?.level
                    const configKey  = levelToConfigKey(classLevel)
                    setActiveLevelConfig(gradingConfigs[configKey] ?? DEFAULT_CONFIGS['Collège'])
                }
            }
            fetchGradesAndSubjects()
        }
    }, [activeStudent, students, selectedYear])

    const calculateAverage = () => {
        if (grades.length === 0 && classSubjects.length === 0) return '0.00'
        
        const termGrades = grades.filter(g => g.term === selectedTerm)
        const totalScore = termGrades.reduce((acc, g) => {
            const cSubj = classSubjects.find(cs => cs.subject_id === g.subject_id)
            const coeff = cSubj ? cSubj.coefficient : (g.coefficient || 1)
            return acc + (g.score * coeff)
        }, 0)
        
        const totalCoeff = classSubjects.reduce((acc, cs) => acc + cs.coefficient, 0)
        const finalCoeff = totalCoeff > 0 ? totalCoeff : termGrades.reduce((acc, g) => acc + (g.coefficient || 1), 0)
        
        return finalCoeff > 0 ? (totalScore / finalCoeff).toFixed(2) : '0.00'
    }

    const handleOpenEvalResult = async () => {
        if (!selectedClassId) return
        setLoading(true)
        try {
            const classStudents = students.filter(s => s.class_id?.toString() === selectedClassId)
            const classSubjectsData = await dbService.getClassSubjects(selectedClassId)
            const allGrades = await Promise.all(
                classStudents.map(s => dbService.getStudentGrades(s.id, selectedYear || undefined))
            )
            const studentsWithAvg = classStudents.map((student, i) => {
                const termGrades = (allGrades[i] ?? []).filter((g: any) => g.term === selectedTerm)
                let totalWeighted = 0, totalCoeff = 0
                classSubjectsData.forEach((subj: any) => {
                    const sg = termGrades.filter((g: any) => g.subject_id?.toString() === subj.subject_id?.toString())
                    const moy = sg.find((g: any) => g.exam_type === 'Moyenne')
                    const comp = sg.find((g: any) => g.exam_type === 'Composition')
                    const devoirs = sg.filter((g: any) => g.exam_type === 'Devoir')
                    let note: number | null = null
                    if (moy) note = moy.score
                    else if (comp && devoirs.length > 0) note = (comp.score + devoirs.reduce((s: number, g: any) => s + g.score, 0) / devoirs.length) / 2
                    else if (comp) note = comp.score
                    else if (devoirs.length > 0) note = devoirs.reduce((s: number, g: any) => s + g.score, 0) / devoirs.length
                    if (note !== null) { totalWeighted += note * subj.coefficient; totalCoeff += subj.coefficient }
                })
                return { ...student, moyenne: totalCoeff > 0 ? totalWeighted / totalCoeff : null }
            })
            studentsWithAvg.sort((a, b) => (b.moyenne ?? -1) - (a.moyenne ?? -1))
            setEvalStudentsData(studentsWithAvg)
            setEvalResultOpen(true)
        } finally {
            setLoading(false)
        }
    }

    const fetchRankings = async () => {
        const classId = activeStudent
            ? students.find(s => s.id === activeStudent)?.class_id?.toString()
            : selectedClassId
        if (!classId) return
        const data = await dbService.getClassRankings(classId, selectedTerm)
        setRankings(data)
    }


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-8 px-1">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                        <TrendingUp size={18} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Moyenne</p>
                        <p className="text-xl font-black text-gray-900">{activeStudent ? calculateAverage() : '—'} <span className="text-sm font-normal text-gray-400">/ 20</span></p>
                    </div>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
                        <Award size={18} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Taux de réussite</p>
                        <p className="text-xl font-black text-gray-900">88%</p>
                    </div>
                </div>
                <div className="w-px h-10 bg-gray-200" />
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                        <FileText size={18} />
                    </div>
                    <div>
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Bulletins générés</p>
                        <p className="text-xl font-black text-gray-900">128</p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl no-print">
                        <button
                            onClick={() => setViewMode('individual')}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'individual' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Saisie Individuelle
                        </button>
                        <button
                            onClick={() => setViewMode('class')}
                            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === 'class' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Saisie par Classe
                        </button>
                    </div>
                    <select
                        className="p-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none no-print"
                        value={selectedYear}
                        onChange={e => {
                            setSelectedYear(e.target.value)
                            setActiveStudent(null)
                            reloadStudents(e.target.value)
                        }}
                    >
                        {schoolYears.map((y: any) => (
                            <option key={y.id} value={y.id.toString()}>
                                {y.name}{y.is_active ? ' ✓' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {viewMode === 'class' && (
                    <div className="flex gap-3 no-print">
                        <select
                            className="p-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none"
                            value={selectedClassId}
                            onChange={e => setSelectedClassId(e.target.value)}
                        >
                            <option value="">Sélectionner une classe</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <select
                            className="p-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none"
                            value={selectedBulkSubject}
                            onChange={e => setSelectedBulkSubject(e.target.value)}
                        >
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <select
                            className="p-2 bg-white border border-gray-200 rounded-xl text-sm font-bold outline-none"
                            value={selectedTerm}
                            onChange={e => setSelectedTerm(e.target.value)}
                        >
                            <option value="1er Trimestre">1er Trimestre</option>
                            <option value="2ème Trimestre">2ème Trimestre</option>
                            <option value="3ème Trimestre">3ème Trimestre</option>
                        </select>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-12 gap-6 no-print">
                {/* Student Selection List */}
                <div className="col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Chercher un élève..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                        {loading ? (
                            <p className="p-10 text-center text-gray-400">Chargement...</p>
                        ) : filteredStudents.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setActiveStudent(s.id)}
                                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-3 ${activeStudent === s.id ? 'bg-primary/5 border-l-4 border-primary' : ''
                                    }`}
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400">
                                    {s.first_name[0]}{s.last_name[0]}
                                </div>
                                <div>
                                    <p className={`text-sm font-bold ${activeStudent === s.id ? 'text-primary' : 'text-gray-900'}`}>
                                        {s.first_name} {s.last_name}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-500 font-bold">{s.class_name || 'Sans Classe'}</p>
                                        {s.matricule && <span className="text-[10px] text-gray-300">| {s.matricule}</span>}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grade Entry/View Area */}
                <div className="col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
                    {viewMode === 'individual' ? (
                        activeStudent ? (
                            <>
                                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-lg">Relevé de Notes</h3>
                                        <p className="text-gray-500 text-sm">
                                            {students.find(s => s.id === activeStudent)?.first_name} {students.find(s => s.id === activeStudent)?.last_name}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {/* Term selector */}
                                        <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                                            {(['1er Trim.', '2ème Trim.', '3ème Trim.'] as const).map((label, i) => {
                                                const term = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'][i]
                                                return (
                                                    <button
                                                        key={term}
                                                        onClick={() => setSelectedTerm(term)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedTerm === term ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                                    >
                                                        {label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        <button
                                            onClick={() => handlePrintBulletin(students.find(s => s.id === activeStudent))}
                                            className="px-4 py-2 bg-[#1a2f6e] text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#162660] transition-all"
                                        >
                                            <Printer size={15} />
                                            Bulletin
                                        </button>
                                        <button
                                            onClick={() => setIsModalOpen(true)}
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            <Plus size={18} />
                                            Ajouter
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 text-gray-400 text-[10px] font-bold uppercase tracking-widest sticky top-0">
                                            <tr>
                                                <th className="px-8 py-3">Matière</th>
                                                <th className="px-8 py-3">Type / Trimestre</th>
                                                <th className="px-8 py-3 text-center">Note</th>
                                                <th className="px-8 py-3 text-center">Coeff</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {grades.length === 0 ? (
                                                <tr><td colSpan={4} className="px-8 py-20 text-center text-gray-400 italic">Aucune note enregistrée pour cet élève.</td></tr>
                                            ) : grades.map(g => (
                                                <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-8 py-4 font-bold text-gray-800">{g.subject_name}</td>
                                                    <td className="px-8 py-4">
                                                        <p className="text-sm text-gray-900">{g.exam_type}</p>
                                                        <p className="text-xs text-gray-500">{g.term}</p>
                                                    </td>
                                                    <td className="px-8 py-4 text-center">
                                                        {(() => {
                                                            const scale = activeLevelConfig.scale
                                                            const mention = getMention(g.score, activeLevelConfig.config)
                                                            const mc = mention ? getMentionColors(mention.color) : null
                                                            return (
                                                                <div className="flex flex-col items-center gap-0.5">
                                                                    <span className={`text-lg font-bold ${g.score >= scale / 2 ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {g.score} <span className="text-xs text-gray-400">/{scale}</span>
                                                                    </span>
                                                                    {mention && (
                                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${mc?.bg} ${mc?.text}`}>
                                                                            {mention.label}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )
                                                        })()}
                                                    </td>
                                                    <td className="px-8 py-4 text-center text-gray-500 font-medium">x{g.coefficient}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/30">
                                <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                                    <GraduationCap className="text-gray-200" size={40} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-400">Sélectionnez un élève</h3>
                                <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">
                                    Choisissez un élève dans la liste à gauche pour consulter ses notes ou en ajouter de nouvelles.
                                </p>
                            </div>
                        )
                    ) : (
                        /* CLASS ENTRY MODE */
                        <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-bold text-gray-900">Saisie par Classe</h3>
                                    <p className="text-gray-400 text-xs">
                                        {classes.find(c => c.id.toString() === selectedClassId)?.name || 'Sélectionnez une classe'}
                                        {selectedBulkSubject ? ` · ${subjects.find(s => s.id.toString() === selectedBulkSubject)?.name}` : ''}
                                    </p>
                                </div>
                            </div>

                            {/* Print actions — compact row */}
                            <div className="px-5 py-3 flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 flex-wrap">
                                <button
                                    onClick={handlePrintClassBulletins}
                                    disabled={!selectedClassId || loadingBulletins}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all"
                                >
                                    <Printer size={13} />
                                    {loadingBulletins ? 'Chargement…' : 'Bulletins'}
                                </button>
                                <button
                                    onClick={() => setGradeSheetOpen(true)}
                                    disabled={!selectedClassId || classGrades.length === 0}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all"
                                >
                                    <Printer size={13} />
                                    Fiche de notes
                                </button>
                                <button
                                    onClick={async () => { await fetchRankings(); setActivePrintType('class_ranking') }}
                                    disabled={!selectedClassId}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-all"
                                >
                                    <Printer size={13} />
                                    Classement
                                </button>
                            </div>

                            {/* Table */}
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-3">Élève</th>
                                            <th className="px-6 py-3 text-center">Note</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {classGrades.length === 0 ? (
                                            <tr>
                                                <td colSpan={2} className="p-16 text-center text-gray-400 italic text-sm">
                                                    {selectedClassId ? 'Chargement des élèves...' : 'Sélectionnez une classe, une matière et un trimestre.'}
                                                </td>
                                            </tr>
                                        ) : classGrades.map((cg, idx) => (
                                            <tr key={cg.student_id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-3 font-semibold text-sm text-gray-900">
                                                    {cg.last_name} {cg.first_name}
                                                    <span className="ml-2 text-[10px] text-gray-400 font-normal">{cg.matricule}</span>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.25"
                                                        min="0"
                                                        max="20"
                                                        placeholder="—"
                                                        className="w-20 mx-auto block px-3 py-1.5 border border-gray-200 rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                                                        value={cg.moyenne || ''}
                                                        onChange={e => {
                                                            const newGrades = [...classGrades]
                                                            newGrades[idx].moyenne = e.target.value
                                                            setClassGrades(newGrades)
                                                        }}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Sticky save footer */}
                            <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-end">
                                <button
                                    onClick={handleSaveBulk}
                                    disabled={!selectedClassId || classGrades.length === 0}
                                    className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Enregistrer les notes
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for adding grade */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md mx-4 overflow-hidden border border-gray-100 shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900">Nouvelle Note</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">×</button>
                        </div>
                        <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Matière</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                    value={newGrade.subject_id}
                                    onChange={e => setNewGrade({ ...newGrade, subject_id: e.target.value })}
                                >
                                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (coeff {s.coefficient})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Note (sur {activeLevelConfig.scale})</label>
                                <input
                                    type="number"
                                    step="0.25"
                                    min="0"
                                    max={activeLevelConfig.scale}
                                    required
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                    value={newGrade.score}
                                    onChange={e => setNewGrade({ ...newGrade, score: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Trimestre</label>
                                    <select
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                        value={newGrade.term}
                                        onChange={e => setNewGrade({ ...newGrade, term: e.target.value })}
                                    >
                                        <option value="1er Trimestre">1er Trimestre</option>
                                        <option value="2ème Trimestre">2ème Trimestre</option>
                                        <option value="3ème Trimestre">3ème Trimestre</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Type d'examen</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                                    value={newGrade.exam_type}
                                    onChange={e => setNewGrade({ ...newGrade, exam_type: e.target.value })}
                                >
                                    <option value="Devoir">Devoir</option>
                                    <option value="Composition">Composition</option>
                                    <option value="Moyenne">Moyenne</option>
                                </select>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 px-4 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/30 hover:-translate-y-0.5 transition-all"
                                >
                                    Enregistrer
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Class Bulletin Preview */}
            {classBulletinOpen && classBulletinData.length > 0 && (
                <div className="print-overlay" style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: '#fff', overflowY: 'auto' }}>
                    <div className="no-print" style={{
                        position: 'sticky', top: 0, zIndex: 10,
                        backgroundColor: '#1a2f6e', color: '#fff',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 24px', paddingRight: '160px',
                    }}>
                        <button
                            onClick={() => setClassBulletinOpen(false)}
                            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}
                        >
                            ← Fermer
                        </button>
                        <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                            {classes.find((c: any) => c.id?.toString() === selectedClassId)?.name} — {selectedTerm} — {classBulletinData.length} élèves
                        </span>
                        <button
                            onClick={() => window.print()}
                            style={{ background: '#fff', color: '#1a2f6e', border: 'none', padding: '8px 22px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}
                        >
                            Imprimer
                        </button>
                    </div>
                    {classBulletinData.map(({ student, grades: bGrades, rank }, i) => (
                        <div key={student.id} style={{ pageBreakAfter: i < classBulletinData.length - 1 ? 'always' : 'avoid' }}>
                            <BulletinPrint
                                student={{ ...student, class_name: student.class_name || classes.find((c: any) => c.id?.toString() === selectedClassId)?.name }}
                                grades={bGrades}
                                term={selectedTerm}
                                schoolYear={schoolYears.find((y: any) => y.id?.toString() === selectedYear)?.name || selectedYear}
                                rank={rank}
                                totalStudents={classBulletinData.length}
                                levelConfig={activeLevelConfig}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Bulletin Preview Modal */}
            {bulletinPreviewOpen && activePrintStudent && (
                <div className="print-overlay" style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: '#fff', overflowY: 'auto' }}>
                    {/* Controls bar — hidden during print */}
                    <div className="no-print" style={{
                        position: 'sticky', top: 0, zIndex: 10,
                        backgroundColor: '#1a2f6e', color: '#fff',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 24px', paddingRight: '160px', gap: '12px',
                    }}>
                        <button
                            onClick={() => { setBulletinPreviewOpen(false); setActivePrintStudent(null) }}
                            style={{
                                background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                                padding: '8px 18px', borderRadius: '6px', cursor: 'pointer',
                                fontWeight: 'bold', fontSize: '14px', flexShrink: 0,
                            }}
                        >
                            ← Fermer
                        </button>
                        <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                            Bulletin — {activePrintStudent.first_name} {activePrintStudent.last_name}
                        </span>
                        <button
                            onClick={() => window.print()}
                            style={{
                                background: '#fff', color: '#1a2f6e', border: 'none',
                                padding: '8px 22px', borderRadius: '6px', cursor: 'pointer',
                                fontWeight: 'bold', fontSize: '14px', flexShrink: 0,
                            }}
                        >
                            Imprimer
                        </button>
                    </div>

                    {/* Bulletin content */}
                    <BulletinPrint
                        student={activePrintStudent}
                        grades={computeBulletinGrades(grades, classSubjects.length > 0 ? classSubjects : subjects)}
                        term={selectedTerm}
                        schoolYear={schoolYears.find((y: any) => y.id?.toString() === selectedYear)?.name || selectedYear}
                        rank={(() => {
                            const idx = rankings.findIndex((r: any) => r.student_id?.toString() === activePrintStudent?.id?.toString())
                            return idx >= 0 ? idx + 1 : 1
                        })()}
                        totalStudents={rankings.length || students.length}
                        levelConfig={activeLevelConfig}
                    />
                </div>
            )}

            {/* Fiche de Notes Preview */}
            {gradeSheetOpen && selectedClassId && (
                <PrintPreview
                    title={`Fiche de Notes — ${classes.find(c => c.id.toString() === selectedClassId)?.name || ''} — ${subjects.find(s => s.id.toString() === selectedBulkSubject)?.name || ''} — ${selectedTerm}`}
                    onClose={() => setGradeSheetOpen(false)}
                >
                    <GradeSheetPrint
                        className={classes.find(c => c.id.toString() === selectedClassId)?.name || ''}
                        subjectName={subjects.find(s => s.id.toString() === selectedBulkSubject)?.name || ''}
                        term={selectedTerm}
                        students={classGrades}
                        schoolYear={schoolYears.find((y: any) => y.id?.toString() === selectedYear)?.name || selectedYear}
                    />
                </PrintPreview>
            )}

            {/* Résultats d'Évaluation Preview */}
            {evalResultOpen && selectedClassId && (
                <PrintPreview
                    title={`Résultats d'Évaluation — ${classes.find(c => c.id.toString() === selectedClassId)?.name || ''} — ${selectedTerm}`}
                    onClose={() => setEvalResultOpen(false)}
                >
                    <EvaluationResultPrint
                        className={classes.find(c => c.id.toString() === selectedClassId)?.name || ''}
                        evaluationName={selectedTerm}
                        term={selectedTerm}
                        students={evalStudentsData}
                        schoolYear={schoolYears.find((y: any) => y.id?.toString() === selectedYear)?.name || selectedYear}
                    />
                </PrintPreview>
            )}

            {/* Class Ranking Preview */}
            {activePrintType === 'class_ranking' && selectedClassId && (
                <PrintPreview
                    title={`Classement — ${classes.find(c => c.id.toString() === selectedClassId)?.name || ''} — ${selectedTerm}`}
                    onClose={() => setActivePrintType(null)}
                >
                    <ClassRankingPrint
                        className={classes.find(c => c.id.toString() === selectedClassId)?.name || 'Classe inconnue'}
                        term={selectedTerm}
                        schoolYear={schoolYears.find((y: any) => y.id?.toString() === selectedYear)?.name || selectedYear}
                        rankings={rankings}
                        levelConfig={activeLevelConfig}
                    />
                </PrintPreview>
            )}
        </div>
    )
}
