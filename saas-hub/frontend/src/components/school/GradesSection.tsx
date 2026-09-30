import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, TrendingUp, Award, FileText, GraduationCap, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import { Card, Tabs, Select, Input, Button, IconButton, Modal, EmptyState } from '../../ui/design_system';

const TERMS = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];
const EXAM_TYPES = ['Devoir', 'Composition', 'Moyenne'];

function getMention(avg: number | null) {
  if (avg === null) return { label: '—', color: 'text-gray-400' };
  if (avg >= 16) return { label: 'Très Bien', color: 'text-secondary-600' };
  if (avg >= 14) return { label: 'Bien', color: 'text-blue-600' };
  if (avg >= 12) return { label: 'Assez Bien', color: 'text-primary-600' };
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
          <Card key={i} hover className="flex items-center gap-4">
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
          </Card>
        ))}
      </div>

      {/* ─── Mode toggle + Year + filtres ─── */}
      <Card padding="sm" className="lg:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Tabs
            options={[{ value: 'individual', label: 'Individuelle' }, { value: 'class', label: 'Par Classe' }]}
            value={viewMode}
            onChange={m => { setViewMode(m); setMobileView('list'); }}
            activeClassName="bg-white text-blue-600 shadow-sm"
          />
          <Select
            value={selectedYear}
            onChange={e => { setSelectedYear(e.target.value); setActiveStudent(null); reloadStudents(e.target.value); }}
            options={years.map(y => ({ value: y.id, label: `${y.name}${y.is_active ? ' ✓' : ''}` }))}
          />
        </div>
        {viewMode === 'class' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select
              value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
              options={[{ value: '', label: '— Classe' }, ...classes.map(c => ({ value: c.id, label: c.name }))]}
            />
            <Select
              value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
              options={subjects.map(s => ({ value: s.id, label: s.name }))}
            />
            <Select
              value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)}
              options={TERMS.map(t => ({ value: t, label: t }))}
            />
          </div>
        )}
      </Card>

      {/* ─── Panel split ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Liste élèves — masquée sur mobile si on est en vue détail */}
        <div className={`lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${mobileView === 'detail' ? 'hidden lg:flex' : 'flex'}`}
          style={{ height: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 600 : undefined, minHeight: 300 }}>
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <Input type="text" placeholder="Chercher un élève…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} leftIcon={<Search size={16} />} />
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
                    <IconButton
                      icon={<ArrowLeft size={18} />} label="Retour à la liste" size="lg"
                      onClick={() => setMobileView('list')} className="lg:hidden flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-base lg:text-lg leading-tight">Relevé de Notes</h3>
                      <p className="text-gray-500 text-sm truncate">{activeStudent.first_name} {activeStudent.last_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Tabs
                      size="sm"
                      options={TERMS.map((term, i) => ({ value: term, label: ['1er Trim.', '2ème Trim.', '3ème Trim.'][i] }))}
                      value={selectedTerm}
                      onChange={setSelectedTerm}
                    />
                    <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => setIsModalOpen(true)}>Ajouter</Button>
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
              <div className="flex-1 flex items-center justify-center bg-gray-50/30">
                <EmptyState
                  icon={<GraduationCap size={28} />}
                  message="Sélectionnez un élève"
                  hint="Choisissez un élève dans la liste à gauche pour consulter ses notes ou en ajouter de nouvelles."
                />
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
                <Button
                  variant="primary" leftIcon={<Save size={15} />}
                  disabled={!selectedClassId || classGrades.length === 0 || saving}
                  loading={saving}
                  onClick={handleSaveBulk}
                >
                  Enregistrer les notes
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal nouvelle note ─── */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouvelle Note" size="sm">
        <form onSubmit={handleSaveGrade} className="space-y-4">
          <Select
            label="Matière"
            value={newGrade.subject_id} onChange={e => setNewGrade({ ...newGrade, subject_id: e.target.value })}
            options={subjects.map(s => ({ value: s.id, label: `${s.name} (coeff ${s.coefficient})` }))}
          />
          <Input
            label="Note (sur 20)" type="number" step="0.25" min="0" max="20" required
            value={newGrade.score} onChange={e => setNewGrade({ ...newGrade, score: e.target.value })}
          />
          <Select
            label="Trimestre"
            value={newGrade.term} onChange={e => setNewGrade({ ...newGrade, term: e.target.value })}
            options={TERMS.map(t => ({ value: t, label: t }))}
          />
          <Select
            label="Type d'examen"
            value={newGrade.exam_type} onChange={e => setNewGrade({ ...newGrade, exam_type: e.target.value })}
            options={EXAM_TYPES.map(t => ({ value: t, label: t }))}
          />
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setIsModalOpen(false)}>Annuler</Button>
            <Button type="submit" variant="primary" fullWidth>Enregistrer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
