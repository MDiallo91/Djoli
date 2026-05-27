import React, { useState, useEffect } from 'react'
import { dbService, Student } from '../services/db'
import { UserPlus, Search, Printer, Filter, Calendar, History, Download, Upload, Trash2, Eye, Edit2, Users, UserRound } from 'lucide-react'
import { PrintHeader } from './PrintHeader'
import { GradeSheetPrint } from './GradeSheetPrint'
import { EvaluationResultPrint } from './EvaluationResultPrint'
import { PrintPreviewBar } from './PrintPreviewBar'
import { FullPageView, InfoField, SectionTitle } from './FullPageView'

interface StudentListProps {
    onAddStudent: () => void
    onEditStudent?: (student: any) => void
}

export const StudentList: React.FC<StudentListProps> = ({ onAddStudent, onEditStudent }) => {
    const [students, setStudents] = useState<Student[]>([])
    const [classes, setClasses] = useState<any[]>([])
    const [schoolYears, setSchoolYears] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [selectedClass, setSelectedClass] = useState<string>('all')
    const [selectedYear, setSelectedYear] = useState<string>('')
    const [searchTerm, setSearchTerm] = useState('')

    // UI States
    const [viewingStudent, setViewingStudent] = useState<any>(null)
    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null)
    
    // Pagination States
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    
    //boution d'action
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    
    // Printing States
    const [selectedSubject, setSelectedSubject] = useState<string>('')
    const [selectedTerm, setSelectedTerm] = useState<string>('1er Trimestre')
    const [subjects, setSubjects] = useState<any[]>([])
    const [activePrintType, setActivePrintType] = useState<'list' | 'grade' | 'evaluation' | null>(null)

    const handlePrint = (type: 'list' | 'grade' | 'evaluation') => {
        setActivePrintType(type)
    }
    const handleClosePrintPreview = () => setActivePrintType(null)

    // Fetch initial metadata (classes, years, and subjects)
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const [classData, yearData, subjectsData] = await Promise.all([
                    dbService.getClasses(),
                    dbService.getSchoolYears(),
                    dbService.getSubjects()
                ])
                setClasses(classData)
                setSchoolYears(yearData)
                setSubjects(subjectsData)

                const activeYear = yearData.find((y: any) => y.is_active)
                if (activeYear) {
                    setSelectedYear(activeYear.id.toString())
                } else if (yearData.length > 0) {
                    setSelectedYear(yearData[0].id.toString())
                }
            } catch (error) {
                console.error('Error fetching metadata:', error)
            }
        }
        fetchMetadata()
    }, [])

    // Fetch students when the selected year changes
    useEffect(() => {
        if (!selectedYear) return

        const fetchStudents = async () => {
            setLoading(true)
            try {
                const data = await dbService.getStudents(selectedYear)
                setStudents(data)
            } catch (error) {
                console.error('Error fetching students:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStudents()
    }, [selectedYear])

    const filteredStudents = students.filter(s => {
        const matchesClass = selectedClass === 'all' || s.class_id?.toString() === selectedClass
        const fullName = (s.first_name + ' ' + s.last_name).toLowerCase()
        const matricule = (s.matricule || '').toLowerCase()
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || matricule.includes(searchTerm.toLowerCase())
        return matchesClass && matchesSearch
    })

    const classStats = {
        total: filteredStudents.length,
        girls: filteredStudents.filter(s => s.gender === 'F').length,
        boys: filteredStudents.filter(s => s.gender === 'M').length
    }

    // Pagination Calculation
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
    const paginatedStudents = filteredStudents.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [selectedClass, searchTerm, selectedYear])

    const handleDelete = async (id: string) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer cet élève ?')) {
            try {
                await dbService.deleteStudent(id)
                setStudents(prev => prev.filter(s => s.id !== id))
            } catch (error) {
                console.error('Delete failed:', error)
                alert('La suppression a échoué.')
            }
        }
    }

    const handleExportExcel = async () => {
        const className = selectedClass === 'all' ? 'Tous les élèves' : classes.find(c => c.id.toString() === selectedClass)?.name || 'Classe'
        try {
            const buffer = await dbService.exportClassExcel(filteredStudents, className)
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `Liste_Eleves_${className.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
            a.click()
        } catch (error) {
            console.error('Export failed:', error)
        }
    }

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || selectedClass === 'all') {
            if (selectedClass === 'all') alert('Veuillez sélectionner une classe avant l\'import.')
            return
        }

        try {
            const buffer = await file.arrayBuffer()
            const result = await dbService.importClassExcel(buffer, selectedClass, selectedYear)
            alert(`${result.count} élèves importés avec succès !`)
            // Refresh
            const updatedData = await dbService.getStudents(selectedYear)
            setStudents(updatedData)
        } catch (error) {
            console.error('Import failed:', error)
            alert('L\'importation a échoué. Vérifiez le format du fichier.')
        } finally {
            e.target.value = ''
        }
    }

    return (
        <>
            {activePrintType && (
                <PrintPreviewBar
                    title={activePrintType === 'list' ? 'Liste des élèves' : activePrintType === 'grade' ? 'Feuille de notes' : 'Résultats d\'évaluation'}
                    onClose={handleClosePrintPreview}
                />
            )}
            {activePrintType === 'list' && <PrintHeader />}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-primary/5 overflow-hidden min-h-[600px] flex flex-col">
                <div className="p-8 border-b border-gray-100 space-y-6 no-print">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <History className="text-primary" size={24} />
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Registre des Élèves</h3>
                            </div>
                            <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">
                                {selectedYear ? `Année Scolaire: ${schoolYears.find(y => y.id.toString() === selectedYear)?.name}` : 'Chargement...'}
                            </p>
                        </div>
                            <div className="flex items-center gap-2">
                                <input type="file" id="excel-import" className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
                                <label htmlFor="excel-import" className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors">
                                    <Upload size={14} /> Importer
                                </label>
                                <button onClick={handleExportExcel} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                                    <Download size={14} /> Exporter
                                </button>
                                <button onClick={onAddStudent} className="btn-primary flex items-center gap-1.5">
                                    <UserPlus size={14} /> Inscrire
                                </button>
                                <button onClick={() => handlePrint('list')} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                                    <Printer size={14} /> Imprimer
                                </button>
                            </div>
                        </div>

                        {/* Print Controls */}
                        {selectedClass !== 'all' && (
                            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-100">
                                <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
                                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none">
                                    <option value="1er Trimestre">1er Trimestre</option>
                                    <option value="2ème Trimestre">2ème Trimestre</option>
                                    <option value="3ème Trimestre">3ème Trimestre</option>
                                    <option value="Annuel">Annuel</option>
                                </select>
                                <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                                    className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none">
                                    <option value="">Matière...</option>
                                    {subjects.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                                </select>
                                <div className="w-px h-5 bg-gray-200" />
                                <button onClick={() => handlePrint('grade')}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                                    <Printer size={12} /> Fiche de Notes
                                </button>
                                <button onClick={() => handlePrint('evaluation')}
                                    className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                                    <Printer size={12} />
                                    Résultats d'Évaluation
                                </button>
                            </div>
                        )}

                    {/* Class Stats */}
                    {selectedClass !== 'all' && (
                        <div className="flex items-center gap-6 py-2 border-t border-gray-100 text-sm">
                            <div className="flex items-center gap-2">
                                <Users size={14} className="text-gray-400" />
                                <span className="text-gray-500 text-xs uppercase tracking-wide">Effectif</span>
                                <span className="font-semibold text-gray-900">{classStats.total}</span>
                            </div>
                            <div className="w-px h-4 bg-gray-200" />
                            <div className="flex items-center gap-2">
                                <UserRound size={14} style={{ color: '#ec4899' }} />
                                <span className="text-gray-500 text-xs uppercase tracking-wide">Filles</span>
                                <span className="font-semibold text-gray-900">{classStats.girls}</span>
                            </div>
                            <div className="w-px h-4 bg-gray-200" />
                            <div className="flex items-center gap-2">
                                <UserRound size={14} style={{ color: '#3b82f6' }} />
                                <span className="text-gray-500 text-xs uppercase tracking-wide">Garçons</span>
                                <span className="font-semibold text-gray-900">{classStats.boys}</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative md:col-span-2">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Rechercher par nom ou prénom..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all appearance-none outline-none"
                            >
                                <option value="all">Toutes les classes</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-primary transition-all appearance-none outline-none border-primary/20 bg-primary/5"
                            >
                                {schoolYears.map(y => (
                                    <option key={y.id} value={y.id}>{y.name} {y.is_active ? '★' : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-x-auto p-8">
                    {loading ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Chargement des élèves...</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="text-gray-200" size={40} />
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Aucun élève trouvé pour cette sélection.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <table className="w-full text-left border-collapse bg-white no-print">
                                <thead>
                                    <tr className="bg-gray-50 border-y border-gray-200">
                                        <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 w-16 text-center">N°</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700">Matricule</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700">Nom & Prénom</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700">Sexe</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700">Père</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700">Mère</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700">Classe</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700">Date de naissance</th>
                                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedStudents.map((s, index) => (
                                        <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-4 text-xs font-black text-gray-400 text-center border-r border-gray-50">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black text-primary bg-primary/5  py-1 rounded">
                                                    {s.matricule || 'SANS MAT'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 min-w-[200px]">
                                                <p className="font-bold text-gray-900 leading-tight">{s.first_name} {s.last_name}</p>
                                            </td>
                                            <td className="px-6 py-4 max-w-[100px]">
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${s.gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                                    {s.gender}
                                                </span>
                                            </td>
                                            <td className="px-2 py-2 text-xs font-bold text-gray-600 min-w-[100px]">{s.pere || '---'}</td>
                                            <td className="px-2 py-2 text-xs font-bold text-gray-600 min-w-[130px]">{s.mere || '---'}</td>
                                            <td className="px-2 py-2 text-xs font-bold text-gray-600">{s.class_name || '---'}</td>
                                            <td className="px-2 py-2 text-xs font-bold text-gray-500">{s.birth_date || '---'}</td>
                                            <td className="px-2 py-2 text-right relative max-w-[50px]">
                                                <button
                                                    onClick={() => setOpenMenuId(openMenuId === s.id ? null : s.id)}
                                                    className="p-2 text-gray-500 hover:text-black"
                                                >
                                                    ⋮
                                                </button>

                                                {openMenuId === s.id && (
                                                    <div className="absolute right-6 mt-2 w-40 bg-white border rounded-lg shadow-lg z-50">

                                                        <button
                                                            onClick={() => {
                                                                setViewingStudent(s)
                                                                setOpenMenuId(null)
                                                            }}
                                                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-100 text-sm"
                                                        >
                                                            <Eye size={14} /> Détails
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                onEditStudent?.(s)
                                                                setOpenMenuId(null)
                                                            }}
                                                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-100 text-sm"
                                                        >
                                                            <Edit2 size={14} /> Modifier
                                                        </button>

                                                        <button
                                                            onClick={() => {
                                                                handleDelete(s.id)
                                                                setOpenMenuId(null)
                                                            }}
                                                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-red-100 text-red-600 text-sm"
                                                        >
                                                            <Trash2 size={14} /> Supprimer
                                                        </button>

                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-8 py-4 bg-gray-50 rounded-2xl no-print">
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                                        Page <span className="text-primary">{currentPage}</span> sur <span className="text-primary">{totalPages}</span>
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => p - 1)}
                                            className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-all shadow-sm"
                                        >
                                            Précédent
                                        </button>
                                        <button
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => p + 1)}
                                            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-lg shadow-primary/20"
                                        >
                                            Suivant
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Classic Table for PRINT (No Action, No Pagination) */}
                            <table className={`${activePrintType === 'list' ? 'print:table' : 'hidden'} w-full border-collapse border border-gray-900 mt-4`}>
                                <thead>
                                    <tr className="bg-gray-100 border-b border-gray-900">
                                        <th className="border border-gray-900 px-2 py-2 text-[10px] font-black uppercase text-center w-10">#</th>
                                        <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase">Matricule</th>
                                        <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase">Nom & Prénom</th>
                                        <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase text-center">Sexe</th>
                                        <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase">Père</th>
                                        <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase">Mère</th>
                                        <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase">Date Naissance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((s, index) => (
                                        <tr key={s.id} className="border-b border-gray-900">
                                            <td className="border border-gray-900 px-2 py-2 text-[10px] font-bold text-center">{index + 1}</td>
                                            <td className="border border-gray-900 px-3 py-2 text-[10px] font-bold">{s.matricule || '---'}</td>
                                            <td className="border border-gray-900 px-3 py-2 text-[10px] font-bold uppercase">{s.first_name} {s.last_name}</td>
                                            <td className="border border-gray-900 px-3 py-2 text-[10px] font-bold text-center">{s.gender}</td>
                                            <td className="border border-gray-900 px-3 py-2 text-[10px] font-bold">{s.pere || '---'}</td>
                                            <td className="border border-gray-900 px-3 py-2 text-[10px] font-bold">{s.mere || '---'}</td>
                                            <td className="border border-gray-900 px-3 py-2 text-[10px] font-bold">{s.birth_date || '---'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {viewingStudent && (
                    <FullPageView title="FICHE ÉLÈVE" onBack={() => setViewingStudent(null)}>
                        {/* Identity header */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600, color: '#374151', flexShrink: 0 }}>
                                {viewingStudent.first_name?.[0]}{viewingStudent.last_name?.[0]}
                            </div>
                            <div>
                                <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#9ca3af', marginBottom: 4 }}>
                                    {viewingStudent.matricule || 'Sans matricule'}
                                </p>
                                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827' }}>
                                    {viewingStudent.first_name} {viewingStudent.last_name}
                                </h2>
                                {viewingStudent.class_name && (
                                    <p style={{ margin: 0, fontSize: 13, color: '#6b7280', marginTop: 2 }}>{viewingStudent.class_name}</p>
                                )}
                            </div>
                        </div>

                        {/* Informations personnelles */}
                        <div style={{ marginBottom: 32 }}>
                            <SectionTitle>Informations personnelles</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px' }}>
                                <InfoField label="Sexe" value={viewingStudent.gender === 'M' ? 'Masculin' : viewingStudent.gender === 'F' ? 'Féminin' : viewingStudent.gender} />
                                <InfoField label="Date de naissance" value={viewingStudent.birth_date} />
                                <InfoField label="Adresse" value={viewingStudent.address} />
                                <InfoField label="Téléphone" value={viewingStudent.phone} />
                                <InfoField label="Père" value={viewingStudent.pere} />
                                <InfoField label="Mère" value={viewingStudent.mere} />
                            </div>
                        </div>

                        {/* Tuteur / Parent */}
                        <div style={{ marginBottom: 32 }}>
                            <SectionTitle>Tuteur / Parent</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px' }}>
                                <InfoField label="Nom complet" value={[viewingStudent.parent_first_name, viewingStudent.parent_last_name].filter(Boolean).join(' ') || null} />
                                <InfoField label="Téléphone" value={viewingStudent.parent_phone || viewingStudent.phone} />
                                <InfoField label="Email" value={viewingStudent.parent_email} />
                                <InfoField label="Profession" value={viewingStudent.parent_profession} />
                                <InfoField label="Adresse" value={viewingStudent.parent_address || viewingStudent.address} />
                            </div>
                        </div>

                        {/* Scolarité */}
                        <div>
                            <SectionTitle>Scolarité</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px' }}>
                                <InfoField label="Classe" value={viewingStudent.class_name} />
                                <InfoField label="Niveau" value={viewingStudent.level} />
                                <InfoField label="Année scolaire" value={viewingStudent.school_year_name} />
                                <InfoField label="Date d'inscription" value={viewingStudent.registration_date} />
                            </div>
                        </div>
                    </FullPageView>
                )}

                {/* Print Templates (Hidden except when printing) */}
                {selectedClass !== 'all' && (
                    <>
                        {activePrintType === 'grade' && (
                            <GradeSheetPrint 
                                className={classes.find(c => c.id.toString() === selectedClass)?.name || ''}
                                subjectName={selectedSubject}
                                term={selectedTerm}
                                students={filteredStudents}
                                schoolYear={schoolYears.find(y => y.id.toString() === selectedYear)?.name || ''}
                            />
                        )}
                        {activePrintType === 'evaluation' && (
                            <EvaluationResultPrint 
                                className={classes.find(c => c.id.toString() === selectedClass)?.name || ''}
                                evaluationName="Evaluation Sommative"
                                term={selectedTerm}
                                students={filteredStudents}
                                schoolYear={schoolYears.find(y => y.id.toString() === selectedYear)?.name || ''}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    )
}
