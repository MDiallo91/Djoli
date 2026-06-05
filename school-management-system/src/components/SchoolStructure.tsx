import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { useSchoolStore } from '../stores/useSchoolStore';
import { Layout, BookOpen, Plus, Trash2, Hash, GraduationCap, Layers, Calendar, Wallet, Settings, CheckSquare } from 'lucide-react';

const ALL_CLASS_LEVELS = ['Maternelle', 'Primaire', 'Collège', 'Lycée'] as const;

export function SchoolStructure() {
    const { schoolLevels } = useSchoolStore()
    const availableClassLevels = schoolLevels.length > 0 ? schoolLevels : [...ALL_CLASS_LEVELS]
    const [activeSubTab, setActiveSubTab] = useState<'classes' | 'subjects' | 'years'>('classes');
    const [classes, setClasses] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [schoolYears, setSchoolYears] = useState<any[]>([]);

    const [isClassModalOpen, setIsClassModalOpen] = useState(false);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [isYearModalOpen, setIsYearModalOpen] = useState(false);
    const [isYearEditMode, setIsYearEditMode] = useState(false);

    const [newClass, setNewClass] = useState({ name: '', level: availableClassLevels[0] ?? 'Primaire' });
    const [newSubject, setNewSubject] = useState({ name: '', coefficient: 1 });
    const [newYear, setNewYear] = useState({ id: null as string | null, name: '', start_date: '', end_date: '', is_active: false });
    const [selectedClass, setSelectedClass] = useState<any>(null);
    const [classSubjects, setClassSubjects] = useState<any[]>([]);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [showSubjectAdd, setShowSubjectAdd] = useState(false);
    const [selectedSubjectToAdd, setSelectedSubjectToAdd] = useState({ id: '', coefficient: 1 });
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = async () => {
        try {
            const [cls, sub, years] = await Promise.all([
                dbService.getClasses(),
                dbService.getSubjects(),
                dbService.getSchoolYears()
            ]);
            setClasses(cls || []);
            setSubjects(sub || []);
            setSchoolYears(years || []);
        } catch (error) {
            console.error('Error fetching school structure data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddClass = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await dbService.addClass(newClass);
            setIsClassModalOpen(false);
            setNewClass({ name: '', level: 'Primaire' });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddSubject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await dbService.addSubject(newSubject);
            setIsSubjectModalOpen(false);
            setNewSubject({ name: '', coefficient: 1 });
            fetchData();
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddYear = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isYearEditMode && newYear.id) {
                await dbService.updateSchoolYear(newYear);
                showNotification('Année scolaire mise à jour !');
            } else {
                await dbService.addSchoolYear(newYear);
                showNotification('Année scolaire ajoutée !');
            }
            setIsYearModalOpen(false);
            setNewYear({ id: null, name: '', start_date: '', end_date: '', is_active: false });
            fetchData();
            useSchoolStore.getState().fetchAll();
        } catch (error) {
            console.error(error);
            showNotification('Erreur lors de l\'enregistrement de l\'année.', 'error');
        }
    };

    const handleDeleteYear = async (id: string) => {
        if (window.confirm('Supprimer cette année scolaire ? Cela pourrait affecter les inscriptions.')) {
            try {
                await dbService.deleteSchoolYear(id);
                showNotification('Année scolaire supprimée !');
                fetchData();
            } catch (error) {
                console.error(error);
                showNotification('Erreur lors de la suppression.', 'error');
            }
        }
    };

    const handleEditYear = (year: any) => {
        setNewYear({
            id: year.id,
            name: year.name,
            start_date: year.start_date,
            end_date: year.end_date,
            is_active: year.is_active === 1 || year.is_active === true
        });
        setIsYearEditMode(true);
        setIsYearModalOpen(true);
    };

    const handleToggleActiveYear = async (year: any) => {
        try {
            await dbService.updateSchoolYear({ ...year, is_active: true });
            showNotification(`Année ${year.name} définie comme active !`);
            fetchData();
            useSchoolStore.getState().fetchAll();
        } catch (error) {
            console.error(error);
            showNotification('Erreur lors du changement d\'année active.', 'error');
        }
    };

    const handleDeleteClass = async (id: string) => {
        if (window.confirm('Supprimer cette classe ?')) {
            try {
                await dbService.deleteClass(id);
                fetchData();
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleDeleteSubject = async (id: string) => {
        if (window.confirm('Supprimer cette matière ?')) {
            try {
                await dbService.deleteSubject(id);
                fetchData();
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleConfigureClass = async (cls: any) => {
        setSelectedClass(cls);
        const subjects = await dbService.getClassSubjects(cls.id);
        setClassSubjects(subjects);
        setIsConfigModalOpen(true);
    };

    const handleUpdateTuition = async () => {
        try {
            const fee = selectedClass.tuition_fee || 0;
            await dbService.updateClassTuition(selectedClass.id, fee);
            showNotification('Frais de scolarité mis à jour avec succès !');
            fetchData();
        } catch (error) {
            console.error(error);
            showNotification('Erreur lors de la mise à jour des frais.', 'error');
        }
    };

    const handleAddSubjectToClass = async () => {
        if (!selectedSubjectToAdd.id) return;
        try {
            await dbService.addClassSubject(selectedClass.id, selectedSubjectToAdd.id, selectedSubjectToAdd.coefficient);
            const updated = await dbService.getClassSubjects(selectedClass.id);
            setClassSubjects(updated);
            setShowSubjectAdd(false);
            setSelectedSubjectToAdd({ id: '', coefficient: 1 });
            showNotification('Matière ajoutée à la classe !');
        } catch (error) {
            console.error(error);
            showNotification('Erreur lors de l\'ajout de la matière.', 'error');
        }
    };

    const handleRemoveSubjectFromClass = async (id: string) => {
        await dbService.removeClassSubject(id);
        const updated = await dbService.getClassSubjects(selectedClass.id);
        setClassSubjects(updated);
    };

    return (
        <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div className="flex items-end gap-1">
                    <button
                        onClick={() => setActiveSubTab('classes')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${activeSubTab === 'classes' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                    >
                        <GraduationCap size={14} />
                        Classes ({classes.length})
                    </button>
                    <button
                        onClick={() => setActiveSubTab('subjects')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${activeSubTab === 'subjects' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                    >
                        <BookOpen size={14} />
                        Matières ({subjects.length})
                    </button>
                    <button
                        onClick={() => setActiveSubTab('years')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${activeSubTab === 'years' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'}`}
                    >
                        <Calendar size={14} />
                        Années ({schoolYears.length})
                    </button>
                </div>
                <button
                    onClick={() => {
                        if (activeSubTab === 'classes') setIsClassModalOpen(true);
                        else if (activeSubTab === 'subjects') setIsSubjectModalOpen(true);
                        else {
                            setIsYearEditMode(false);
                            setNewYear({ id: null, name: '', start_date: '', end_date: '', is_active: false });
                            setIsYearModalOpen(true);
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium text-sm hover:bg-gray-700 transition-all"
                >
                    <Plus size={15} />
                    {activeSubTab === 'classes' ? 'Nouvelle Classe' : activeSubTab === 'subjects' ? 'Nouvelle Matière' : 'Nouvelle Année'}
                </button>
            </div>

            {/* Content List */}
            <div className={`grid gap-4 ${activeSubTab === 'subjects' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
                {activeSubTab === 'classes' && classes.map(c => (
                    <div key={c.id} className="group bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:translate-y-[-8px] transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                        <div className="flex justify-between items-start mb-4 relative">
                            <div className="p-3 bg-primary/10 rounded-xl text-primary">
                                <GraduationCap size={24} />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleConfigureClass(c)}
                                    className="p-2 text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    title="Configurer"
                                >
                                    <Settings size={16} />
                                </button>
                                <button onClick={() => handleDeleteClass(c.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-1 leading-tight">{c.name}</h3>
                        <p className="text-xs font-black uppercase tracking-widest text-primary/60 mb-4">{c.level}</p>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                <Wallet size={12} className="text-primary/40" />
                                Frais: {c.tuition_fee?.toLocaleString()} GNF
                            </div>
                            <div className="flex gap-2">
                                <span className="px-3 py-1 bg-gray-50 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-tighter">Effectif: 0</span>
                            </div>
                        </div>
                    </div>
                ))}

                {activeSubTab === 'subjects' && subjects.map(s => (
                    <div key={s.id} className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:translate-y-[-2px] transition-all relative overflow-hidden flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-500 flex-shrink-0">
                            <BookOpen size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900 truncate leading-tight">{s.name}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Hash size={10} className="text-gray-300" />
                                <span className="text-xs font-semibold text-gray-400">Coeff. {s.coefficient}</span>
                            </div>
                        </div>
                        <button onClick={() => handleDeleteSubject(s.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0">
                            <Trash2 size={13} />
                        </button>
                    </div>
                ))}

                {activeSubTab === 'years' && schoolYears.map(y => (
                    <div key={y.id} className={`group p-6 rounded-3xl border transition-all relative overflow-hidden ${y.is_active ? 'bg-primary border-primary shadow-xl shadow-primary/20 text-white' : 'bg-white border-gray-100 shadow-sm hover:shadow-xl hover:translate-y-[-8px]'}`}>
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 ${y.is_active ? 'bg-white/10' : 'bg-primary/5'}`} />
                        <div className="flex justify-between items-start mb-4 relative">
                            <div className={`p-3 rounded-xl ${y.is_active ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'}`}>
                                <Calendar size={24} />
                            </div>
                            <div className="flex gap-2">
                                {!y.is_active && (
                                    <button
                                        onClick={() => handleToggleActiveYear(y)}
                                        className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${y.is_active ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gray-300 hover:text-primary hover:bg-primary/5'}`}
                                        title="Définir comme active"
                                    >
                                        <CheckSquare size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => handleEditYear(y)}
                                    className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${y.is_active ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gray-300 hover:text-primary hover:bg-primary/5'}`}
                                    title="Modifier"
                                >
                                    <Settings size={16} />
                                </button>
                                <button
                                    onClick={() => handleDeleteYear(y.id)}
                                    className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${y.is_active ? 'text-white/40 hover:text-red-200 hover:bg-white/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                                    title="Supprimer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            {y.is_active && <span className="px-3 py-1 bg-white/20 rounded-lg text-[10px] font-black uppercase tracking-widest">Active</span>}
                        </div>
                        <h3 className={`text-sm font-semibold mb-1 leading-tight ${y.is_active ? 'text-white' : 'text-gray-900'}`}>{y.name}</h3>
                        <p className={`text-xs font-bold uppercase tracking-widest ${y.is_active ? 'text-white/70' : 'text-gray-400'}`}>
                            {y.start_date} — {y.end_date}
                        </p>
                    </div>
                ))}
            </div>

            {/* Modal for Class */}
            {isClassModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleAddClass} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 leading-none mb-1">Nouvelle Classe</h3>
                                <p className="text-xs text-gray-400 uppercase tracking-widest">Ajouter un palier académique</p>
                            </div>
                            <button type="button" onClick={() => setIsClassModalOpen(false)} className="text-2xl font-medium text-gray-300 hover:text-gray-900 transition-colors">×</button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2 px-1">Nom de la classe</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                    placeholder="ex: CP A, Terminale S"
                                    value={newClass.name}
                                    onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2 px-1">Niveau / Cycle</label>
                                <select
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                    value={newClass.level}
                                    onChange={e => setNewClass({ ...newClass, level: e.target.value })}
                                >
                                    {availableClassLevels.map(lvl => (
                                        <option key={lvl} value={lvl}>{lvl}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-10 bg-primary text-white py-5 rounded-3xl font-black text-sm hover:translate-y-[-4px] active:translate-y-0 transition-all shadow-xl shadow-primary/30">
                            Enregistrer la Classe
                        </button>
                    </form>
                </div>
            )}

            {/* Modal for Subject */}
            {isSubjectModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleAddSubject} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 leading-none mb-1">Nouvelle Matière</h3>
                                <p className="text-xs text-gray-400 uppercase tracking-widest">Enseigner de nouveaux savoirs</p>
                            </div>
                            <button type="button" onClick={() => setIsSubjectModalOpen(false)} className="text-2xl font-medium text-gray-300 hover:text-gray-900 transition-colors">×</button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2 px-1">Nom de la matière</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                    placeholder="ex: Algorithmique, Grammaire"
                                    value={newSubject.name}
                                    onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2 px-1">Coefficient / Poids</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max="10"
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                    value={newSubject.coefficient}
                                    onChange={e => setNewSubject({ ...newSubject, coefficient: parseInt(e.target.value) })}
                                />
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-10 bg-primary text-white py-5 rounded-3xl font-black text-sm hover:translate-y-[-4px] active:translate-y-0 transition-all shadow-xl shadow-primary/30">
                            Enregistrer la Matière
                        </button>
                    </form>
                </div>
            )}

            {/* Modal for School Year */}
            {isYearModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <form onSubmit={handleAddYear} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 leading-none mb-1">{isYearEditMode ? 'Modifier l\'Année' : 'Nouvelle Année'}</h3>
                                <p className="text-xs text-gray-400 uppercase tracking-widest">{isYearEditMode ? 'Mettre à jour la période' : 'Définir une période scolaire'}</p>
                            </div>
                            <button type="button" onClick={() => setIsYearModalOpen(false)} className="text-2xl font-medium text-gray-300 hover:text-gray-900 transition-colors">×</button>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2 px-1">Nom de l'année</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                    placeholder="ex: 2026-2027"
                                    value={newYear.name}
                                    onChange={e => setNewYear({ ...newYear, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2 px-1">Début</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                        value={newYear.start_date}
                                        onChange={e => setNewYear({ ...newYear, start_date: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-primary/60 mb-2 px-1">Fin</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-4 focus:ring-primary/10 transition-all"
                                        value={newYear.end_date}
                                        onChange={e => setNewYear({ ...newYear, end_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border-2 border-gray-100">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    className="w-5 h-5 accent-primary"
                                    checked={newYear.is_active}
                                    onChange={e => setNewYear({ ...newYear, is_active: e.target.checked })}
                                />
                                <label htmlFor="is_active" className="text-sm font-bold text-gray-700 cursor-pointer select-none">Définir comme année active</label>
                            </div>
                        </div>
                        <button type="submit" className="w-full mt-10 bg-primary text-white py-5 rounded-3xl font-black text-sm hover:translate-y-[-4px] active:translate-y-0 transition-all shadow-xl shadow-primary/30">
                            {isYearEditMode ? 'Enregistrer les modifications' : 'Créer l\'Année Scolaire'}
                        </button>
                    </form>
                </div>
            )}
            {/* Modal for Class Configuration */}
            {isConfigModalOpen && selectedClass && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-10 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 leading-none mb-1">Configuration : {selectedClass.name}</h3>
                                <p className="text-xs text-gray-400 uppercase tracking-widest">Gérer les frais et les matières</p>
                            </div>
                            <button onClick={() => setIsConfigModalOpen(false)} className="text-2xl font-medium text-gray-300 hover:text-gray-900 transition-colors">×</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 space-y-10">
                            {/* Tuition Fee Section */}
                            <section>
                                <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Wallet size={13} className="text-gray-400" />
                                    Frais de Scolarité
                                </h4>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-5 py-4 font-bold text-gray-900 outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                                            value={selectedClass.tuition_fee || ''}
                                            onChange={e => setSelectedClass({ ...selectedClass, tuition_fee: e.target.value ? parseFloat(e.target.value) : 0 })}
                                            placeholder="Montant total de la scolarité"
                                        />
                                    </div>
                                    <button
                                        onClick={handleUpdateTuition}
                                        className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-sm hover:translate-y-[-2px] active:translate-y-0 transition-all shadow-lg shadow-primary/20"
                                    >
                                        Mettre à jour
                                    </button>
                                </div>
                            </section>

                            {/* Subjects Section */}
                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <BookOpen size={13} className="text-gray-400" />
                                        Matières Enseignées
                                    </h4>
                                    <button
                                        onClick={() => setShowSubjectAdd(!showSubjectAdd)}
                                        className="flex items-center gap-2 text-primary font-black text-xs uppercase tracking-widest hover:bg-primary/5 px-4 py-2 rounded-xl transition-all"
                                    >
                                        <Plus size={14} />
                                        Ajouter une matière
                                    </button>
                                </div>

                                {showSubjectAdd && (
                                    <div className="bg-gray-50 p-6 rounded-[2rem] border-2 border-dashed border-gray-200 mb-6 flex gap-4 animate-in slide-in-from-top-2">
                                        <div className="flex-1">
                                            <select
                                                className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:border-primary transition-all"
                                                value={selectedSubjectToAdd.id}
                                                onChange={e => setSelectedSubjectToAdd({ ...selectedSubjectToAdd, id: e.target.value })}
                                            >
                                                <option value="">Sélectionner une matière...</option>
                                                {subjects.map(s => (
                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="w-32">
                                            <input
                                                type="number"
                                                className="w-full bg-white border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-900 outline-none focus:border-primary transition-all"
                                                placeholder="Coeff"
                                                value={selectedSubjectToAdd.coefficient}
                                                onChange={e => setSelectedSubjectToAdd({ ...selectedSubjectToAdd, coefficient: e.target.value ? parseFloat(e.target.value) : 1 })}
                                            />
                                        </div>
                                        <button
                                            onClick={handleAddSubjectToClass}
                                            className="px-6 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:translate-y-[-2px] transition-all"
                                        >
                                            Ajouter
                                        </button>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    {classSubjects.map(cs => (
                                        <div key={cs.id} className="bg-white border-2 border-gray-50 p-4 rounded-3xl flex justify-between items-center group/item hover:border-primary/20 transition-all">
                                            <div>
                                                <p className="font-black text-gray-900">{cs.name}</p>
                                                <p className="text-[10px] font-black text-primary uppercase tracking-widest">Coefficient: {cs.coefficient}</p>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveSubjectFromClass(cs.id)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/item:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    {classSubjects.length === 0 && (
                                        <div className="col-span-2 py-10 text-center bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-100">
                                            <p className="text-gray-400 font-bold italic">Aucune matière configurée pour cette classe</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* Notification Toast */}
            {toast && (
                <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] px-8 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4 duration-500 font-bold text-sm flex items-center gap-3 ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'
                    }`}>
                    {toast.type === 'success' ? <CheckSquare size={18} className="text-primary" /> : <Plus size={18} className="rotate-45" />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
