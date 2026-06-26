import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Printer, TrendingUp, Award, FileText, GraduationCap, Save } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';

const TERMS = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];
const EXAM_TYPES = ['Devoir', 'Composition', 'Moyenne'];

function getMention(avg: number | null) {
  if (avg === null) return { label: '—', color: 'text-gray-400' };
  if (avg >= 16) return { label: 'Très Bien', color: 'text-emerald-600' };
  if (avg >= 14) return { label: 'Bien', color: 'text-blue-600' };
  if (avg >= 12) return { label: 'Assez Bien', color: 'text-indigo-600' };
  if (avg >= 10) return { label: 'Passable', color: 'text-amber-600' };
  return { label: 'Insuffisant', color: 'text-red-600' };
}

export default function GradesSection() {
  const [mobileView, setMobileView]     = useState<'list' | 'detail'>('list');
  const [students, setStudents]         = useState<any[]>([]);
  const [classes, setClasses]           = useState<any[]>([]);
  const [years, setYears]               = useState<any[]>([]);
  const [subjects, setSubjects]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  const [viewMode, setViewMode]         = useState<'individual' | 'class'>('individual');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);
  const [searchTerm, setSearchTerm]     = useState('');

  // Saisie individuelle
  const [activeStudent, setActiveStudent] = useState<any>(null);
  const [grades, setGrades]               = useState<any[]>([]);
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [newGrade, setNewGrade]           = useState({ subject_id: '', score: '', exam_type: 'Moyenne', term: TERMS[0] });

  // Saisie par classe
  const [classGrades, setClassGrades]   = useState<any[]>([]);
  const [saving, setSaving]             = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sub, cls, yrs] = await Promise.all([api.getSubjects(), api.getClasses(), api.getSchoolYears()]);
      setSubjects(sub); setClasses(cls); setYears(yrs);
      const active = yrs.find((y: any) => y.is_active == 1 || y.is_active === true) || yrs[0];
      const yearId = active?.id?.toString() || '';
      setSelectedYear(yearId);
      if (sub.length > 0) { setSelectedSubject(sub[0].id.toString()); setNewGrade(p => ({ ...p, subject_id: sub[0].id.toString() })); }
      const studentsData = await api.getStudents(yearId);
      setStudents(Array.isArray(studentsData) ? studentsData : studentsData.students ?? []);
    } catch { toast.error('Erreur chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const reloadStudents = async (yearId: string) => {
    const res = await api.getStudents(yearId);
    setStudents(Array.isArray(res) ? res : res.students ?? []);
  };

  const filteredStudents = students.filter(s =>
    ((s.first_name + ' ' + s.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
     (s.matricule || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedClassId === '' || s.class_id?.toString() === selectedClassId)
  );

  // Quand on sélectionne un élève → charger ses notes + matières de sa classe
  useEffect(() => {
    if (!activeStudent) return;
    const load = async () => {
      const [g, cs] = await Promise.all([
        api.getGrades({ studentId: activeStudent.id, yearId: selectedYear }),
        activeStudent.class_id ? api.getClassSubjects(activeStudent.class_id) : Promise.resolve([]),
      ]);
      setGrades(g);
      setClassSubjects(cs);
    };
    load();
  }, [activeStudent, selectedYear]);

  // Quand on change de classe/matière/trimestre en mode classe
  useEffect(() => {
    if (viewMode !== 'class' || !selectedClassId || !selectedSubject) return;
    api.getGrades({ classId: selectedClassId, subjectId: selectedSubject, term: selectedTerm, yearId: selectedYear })
      .then(setClassGrades).catch(() => {});
  }, [viewMode, selectedClassId, selectedSubject, selectedTerm, selectedYear]);

  const calculateAverage = () => {
    const termGrades = grades.filter(g => g.term === selectedTerm);
    if (termGrades.length === 0) return null;
    const totalScore = termGrades.reduce((acc, g) => {
      const cs = classSubjects.find(cs => cs.subject_id === g.subject_id);
      return acc + g.score * (cs ? cs.coefficient : g.coefficient || 1);
    }, 0);
    const totalCoeff = classSubjects.reduce((a, cs) => a + cs.coefficient, 0) || termGrades.reduce((a, g) => a + (g.coefficient || 1), 0);
    return totalCoeff > 0 ? totalScore / totalCoeff : null;
  };

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !newGrade.subject_id || newGrade.score === '') return;
    try {
      await api.saveGradesBulk([{
        student_id: activeStudent.id,
        subject_id: newGrade.subject_id,
        score: parseFloat(newGrade.score),
        exam_type: newGrade.exam_type,
        term: newGrade.term,
        school_year_id: selectedYear,
      }]);
      setIsModalOpen(false);
      setNewGrade(p => ({ ...p, score: '' }));
      const g = await api.getGrades({ studentId: activeStudent.id, yearId: selectedYear });
      setGrades(g);
      toast.success('Note enregistrée');
    } catch { toast.error('Erreur'); }
  };

  const handleSaveBulk = async () => {
    if (!selectedClassId || classGrades.length === 0) return;
    setSaving(true);
    try {
      const toSave = classGrades
        .filter(cg => cg.moyenne !== '' && cg.moyenne !== null && cg.moyenne !== undefined)
        .map(cg => ({
          student_id: cg.student_id,
          subject_id: selectedSubject,
          score: parseFloat(cg.moyenne),
          exam_type: 'Moyenne',
          term: selectedTerm,
          school_year_id: selectedYear,
        }));
      await api.saveGradesBulk(toSave);
      toast.success('Notes enregistrées !');
    } catch { toast.error('Erreur enregistrement'); }
    finally { setSaving(false); }
  };

  const avg = calculateAverage();
  const mention = getMention(avg);

  return (
    <div className="space-y-5 animate-in">
      {/* ─── Stats bar ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Moyenne générale', icon: TrendingUp, iconBg: 'linear-gradient(135deg,#2563eb,#60a5fa)', shadow: 'rgba(37,99,235,0.3)',
            value: activeStudent && avg !== null ? `${avg.toFixed(2)}/20` : '—', sub: activeStudent ? 'Élève sélectionné' : 'Sélectionner un élève' },
          { label: 'Mention', icon: Award, iconBg: 'linear-gradient(135deg,#f59e0b,#fbbf24)', shadow: 'rgba(245,158,11,0.3)',
            value: activeStudent && avg !== null ? mention.label : '—', sub: 'Trimestre courant',
            valueClass: activeStudent && avg !== null ? mention.color : 'text-gray-900' },
          { label: 'Notes saisies', icon: FileText, iconBg: 'linear-gradient(135deg,#7c3aed,#a78bfa)', shadow: 'rgba(124,58,237,0.3)',
            value: String(activeStudent ? grades.length : students.length > 0 ? '—' : '0'), sub: 'Entrées au total' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: s.iconBg, boxShadow: `0 4px 12px ${s.shadow}` }}>
              <s.icon size={19} />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-black leading-tight ${(s as any).valueClass ?? 'text-gray-900'}`}
                style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Mode toggle + Year + filtres ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 p-3 lg:p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
            {(['individual', 'class'] as const).map(m => (
              <button key={m} onClick={() => { setViewMode(m); setMobileView('list'); }}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-bold text-sm transition-all ${viewMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {m === 'individual' ? 'Individuelle' : 'Par Classe'}
              </button>
            ))}
          </div>
          <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setActiveStudent(null); reloadStudents(e.target.value); }}
            className="w-full sm:w-auto p-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none">
            {years.map(y => <option key={y.id} value={y.id}>{y.name}{y.is_active ? ' ✓' : ''}</option>)}
          </select>
        </div>
        {viewMode === 'class' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none">
              <option value="">— Classe</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none">
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none">
              {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* ─── Panel split ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Liste élèves — masquée sur mobile si on est en vue détail */}
        <div className={`lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}`}
          style={{ height: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 600 : undefined, minHeight: 300 }}>
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Chercher un élève…" value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              <p className="p-10 text-center text-gray-400 text-sm">Chargement…</p>
            ) : filteredStudents.map(s => (
              <button key={s.id} onClick={() => { setActiveStudent(s); setMobileView('detail'); }}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-3 ${activeStudent?.id === s.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}>
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 flex-shrink-0">
                  {s.first_name[0]}{s.last_name[0]}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate ${activeStudent?.id === s.id ? 'text-blue-600' : 'text-gray-900'}`}>
                    {s.first_name} {s.last_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 font-bold truncate">{s.class_name || 'Sans Classe'}</p>
                    {s.matricule && <span className="text-[10px] text-gray-300">| {s.matricule}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Zone de saisie — masquée sur mobile si on est en vue liste */}
        <div className={`lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}
          style={{ height: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 600 : undefined, minHeight: 400 }}>
          {viewMode === 'individual' ? (
            activeStudent ? (
              <>
                <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={() => setMobileView('list')} className="lg:hidden p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0">
                      ←
                    </button>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-base lg:text-lg leading-tight">Relevé de Notes</h3>
                      <p className="text-gray-500 text-sm truncate">{activeStudent.first_name} {activeStudent.last_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
                      {(['1er Trim.', '2ème Trim.', '3ème Trim.'] as const).map((label, i) => {
                        const term = TERMS[i];
                        return (
                          <button key={term} onClick={() => setSelectedTerm(term)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedTerm === term ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
                      <Plus size={18} /> Ajouter
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
                      ) : grades.filter(g => g.term === selectedTerm).map(g => {
                        const isPass = g.score >= 10;
                        return (
                          <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-8 py-4 font-bold text-gray-800">{g.subject_name}</td>
                            <td className="px-8 py-4">
                              <p className="text-sm text-gray-900">{g.exam_type}</p>
                              <p className="text-xs text-gray-500">{g.term}</p>
                            </td>
                            <td className="px-8 py-4 text-center">
                              <span className={`text-lg font-bold ${isPass ? 'text-green-600' : 'text-red-600'}`}>
                                {g.score} <span className="text-xs text-gray-400">/20</span>
                              </span>
                            </td>
                            <td className="px-8 py-4 text-center text-gray-500 font-medium">x{g.coefficient || 1}</td>
                          </tr>
                        );
                      })}
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
            <div className="flex flex-col h-full">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Saisie par Classe</h3>
                  <p className="text-gray-400 text-xs">
                    {classes.find(c => c.id.toString() === selectedClassId)?.name || 'Sélectionnez une classe'}
                    {selectedSubject ? ` · ${subjects.find(s => s.id.toString() === selectedSubject)?.name}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3">Élève</th>
                      <th className="px-6 py-3 text-center">Note / 20</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {classGrades.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-16 text-center text-gray-400 italic text-sm">
                          {selectedClassId ? 'Chargement des élèves…' : 'Sélectionnez une classe, une matière et un trimestre.'}
                        </td>
                      </tr>
                    ) : classGrades.map((cg, idx) => (
                      <tr key={cg.student_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 font-semibold text-sm text-gray-900">
                          {cg.first_name} {cg.last_name}
                          <span className="ml-2 text-[10px] text-gray-400 font-normal">{cg.matricule}</span>
                        </td>
                        <td className="px-6 py-3">
                          <input type="number" step="0.25" min="0" max="20" placeholder="—"
                            className="w-20 mx-auto block px-3 py-1.5 border border-gray-200 rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                            value={cg.moyenne ?? ''}
                            onChange={e => {
                              const updated = [...classGrades];
                              updated[idx] = { ...updated[idx], moyenne: e.target.value };
                              setClassGrades(updated);
                            }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-end">
                <button onClick={handleSaveBulk} disabled={!selectedClassId || classGrades.length === 0 || saving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-40">
                  <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer les notes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal nouvelle note ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">Nouvelle Note</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSaveGrade} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Matière</label>
                <select value={newGrade.subject_id} onChange={e => setNewGrade({ ...newGrade, subject_id: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm">
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name} (coeff {s.coefficient})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Note (sur 20)</label>
                <input type="number" step="0.25" min="0" max="20" required
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm"
                  value={newGrade.score} onChange={e => setNewGrade({ ...newGrade, score: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Trimestre</label>
                <select value={newGrade.term} onChange={e => setNewGrade({ ...newGrade, term: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm">
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Type d'examen</label>
                <select value={newGrade.exam_type} onChange={e => setNewGrade({ ...newGrade, exam_type: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm">
                  {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all">
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary py-3 shadow-lg shadow-blue-500/30">
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
