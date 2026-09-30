import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Hash, Layers, Calendar, CheckSquare, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import { Tabs, Card, Button, IconButton, Modal, Input, Select, Checkbox, EmptyState, confirmDialog } from '../../ui/design_system';

const LEVELS = ['Maternelle', 'Primaire', 'Collège', 'Lycée'] as const;

export default function StructureSection() {
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'years'>('classes');
  const [classes, setClasses]     = useState<any[]>([]);
  const [subjects, setSubjects]   = useState<any[]>([]);
  const [years, setYears]         = useState<any[]>([]);

  const [isClassModal, setIsClassModal]   = useState(false);
  const [isSubjectModal, setIsSubjectModal] = useState(false);
  const [isYearModal, setIsYearModal]   = useState(false);

  const [newClass, setNewClass]     = useState({ name: '', level: 'Primaire' });
  const [newSubject, setNewSubject] = useState({ name: '', coefficient: 1 });
  const [newYear, setNewYear]       = useState({ id: null as string | null, name: '', start_date: '', end_date: '', is_active: false });
  const [editingYear, setEditingYear] = useState(false);

  // Class → subjects panel
  const [selectedClass, setSelectedClass]   = useState<any>(null);
  const [classSubjects, setClassSubjects]   = useState<any[]>([]);
  const [checkedSubjects, setCheckedSubjects] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    const [cls, sub, yrs] = await Promise.all([api.getClasses(), api.getSubjects(), api.getSchoolYears()]);
    setClasses(cls || []); setSubjects(sub || []); setYears(yrs || []);
  };

  useEffect(() => { fetchData(); }, []);

  const loadClassSubjects = async (cls: any) => {
    setSelectedClass(cls);
    const cs = await api.getClassSubjects(cls.id);
    setClassSubjects(cs);
    setCheckedSubjects(new Set(cs.map((s: any) => s.subject_id?.toString())));
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.createClass(newClass); setIsClassModal(false); setNewClass({ name: '', level: 'Primaire' }); fetchData(); toast.success('Classe ajoutée'); }
    catch { toast.error('Erreur'); }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await api.createSubject(newSubject); setIsSubjectModal(false); setNewSubject({ name: '', coefficient: 1 }); fetchData(); toast.success('Matière ajoutée'); }
    catch { toast.error('Erreur'); }
  };

  const handleAddYear = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingYear && newYear.id) await api.updateSchoolYear(newYear.id, newYear);
      else await api.createSchoolYear(newYear);
      setIsYearModal(false); setEditingYear(false); setNewYear({ id: null, name: '', start_date: '', end_date: '', is_active: false });
      fetchData(); toast.success(editingYear ? 'Année modifiée' : 'Année ajoutée');
    } catch { toast.error('Erreur'); }
  };

  const handleSetActiveYear = async (y: any) => {
    try {
      await api.updateSchoolYear(y.id, { ...y, is_active: true });
      fetchData(); toast.success(`${y.name} définie comme active`);
    } catch { toast.error('Erreur'); }
  };

  const handleDeleteClass = async (id: string) => {
    if (!(await confirmDialog({ message: 'Supprimer cette classe ?', variant: 'danger' }))) return;
    await api.deleteClass(id); fetchData();
  };
  const handleDeleteSubject = async (id: string) => {
    if (!(await confirmDialog({ message: 'Supprimer cette matière ?', variant: 'danger' }))) return;
    await api.deleteSubject(id); fetchData();
  };
  const handleDeleteYear = async (id: string) => {
    if (!(await confirmDialog({ message: 'Supprimer cette année ?', variant: 'danger' }))) return;
    await api.deleteSchoolYear(id); fetchData();
  };

  const toggleSubjectForClass = async (subjectId: string) => {
    if (!selectedClass) return;
    if (checkedSubjects.has(subjectId)) {
      const link = classSubjects.find((s: any) => s.subject_id?.toString() === subjectId);
      if (link) { await api.deleteClassSubject(link.id); }
    } else {
      const subj = subjects.find(s => s.id?.toString() === subjectId);
      await api.createClassSubject({ class_id: selectedClass.id, subject_id: subjectId, coefficient: subj?.coefficient || 1 });
    }
    await loadClassSubjects(selectedClass);
    toast.success('Matières mises à jour');
  };

  const TABS = [
    { value: 'classes', label: 'Classes', icon: <Layers size={16} /> },
    { value: 'subjects', label: 'Matières', icon: <BookOpen size={16} /> },
    { value: 'years', label: 'Années Scolaires', icon: <Calendar size={16} /> },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Sub-tab bar ─── */}
      <Tabs
        options={TABS}
        value={activeTab}
        onChange={t => { setActiveTab(t); setSelectedClass(null); }}
        activeClassName="bg-blue-600 text-white shadow-sm"
        className="w-fit bg-white border border-gray-100 shadow-sm p-1.5"
      />

      {/* ─── CLASSES ─── */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <Card padding="none" className="overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers size={20} className="text-blue-600" />
                <h3 className="font-black text-gray-900 tracking-tight">Classes</h3>
                <span className="bg-blue-50 text-blue-600 text-xs font-black px-2 py-0.5 rounded-full">{classes.length}</span>
              </div>
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsClassModal(true)}>Ajouter</Button>
            </div>
            <div className="divide-y divide-gray-50">
              {classes.length === 0 ? (
                <p className="p-8 text-center text-gray-400 text-sm">Aucune classe</p>
              ) : classes.map(c => (
                <button key={c.id} onClick={() => loadClassSubjects(c)}
                  className={`w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left ${selectedClass?.id === c.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}>
                  <div>
                    <p className={`font-bold text-sm ${selectedClass?.id === c.id ? 'text-blue-700' : 'text-gray-900'}`}>{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.level || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c.student_count || 0} élèves</span>
                    <IconButton
                      icon={<Trash2 size={14} />} label="Supprimer" variant="danger"
                      onClick={e => { e.stopPropagation(); handleDeleteClass(c.id); }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Class subjects panel */}
          {selectedClass ? (
            <Card padding="none" className="overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="font-black text-gray-900 tracking-tight">Matières — {selectedClass.name}</h3>
                <p className="text-gray-400 text-xs mt-0.5">Cochez les matières enseignées dans cette classe</p>
              </div>
              <div className="divide-y divide-gray-50 overflow-y-auto" style={{ maxHeight: 400 }}>
                {subjects.map(s => {
                  const checked = checkedSubjects.has(s.id?.toString());
                  return (
                    <button key={s.id} onClick={() => toggleSubjectForClass(s.id?.toString())}
                      className={`w-full flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors text-left ${checked ? 'bg-blue-50/30' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                          {checked && <Check size={12} className="text-white" strokeWidth={3} />}
                        </div>
                        <p className={`font-semibold text-sm ${checked ? 'text-blue-700' : 'text-gray-700'}`}>{s.name}</p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">coeff {s.coefficient}</span>
                    </button>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card padding="none" className="flex items-center justify-center py-20">
              <EmptyState
                icon={<Layers size={24} />}
                message="Sélectionnez une classe"
                hint="pour gérer ses matières"
              />
            </Card>
          )}
        </div>
      )}

      {/* ─── MATIÈRES ─── */}
      {activeTab === 'subjects' && (
        <Card padding="none" className="overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-blue-600" />
              <h3 className="font-black text-gray-900 tracking-tight">Matières</h3>
              <span className="bg-blue-50 text-blue-600 text-xs font-black px-2 py-0.5 rounded-full">{subjects.length}</span>
            </div>
            <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setIsSubjectModal(true)}>Ajouter</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="th-desktop">#</th>
                  <th className="th-desktop">Nom de la matière</th>
                  <th className="th-desktop text-center">Coefficient</th>
                  <th className="th-desktop text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-gray-400 text-sm">Aucune matière</td></tr>
                ) : subjects.map((s, i) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-black text-gray-400">{i + 1}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">{s.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-black">
                        <Hash size={10} /> {s.coefficient}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <IconButton icon={<Trash2 size={15} />} label="Supprimer" variant="danger" onClick={() => handleDeleteSubject(s.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── ANNÉES SCOLAIRES ─── */}
      {activeTab === 'years' && (
        <Card padding="none" className="overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-blue-600" />
              <h3 className="font-black text-gray-900 tracking-tight">Années Scolaires</h3>
            </div>
            <Button
              variant="primary" size="sm" leftIcon={<Plus size={14} />}
              onClick={() => { setEditingYear(false); setNewYear({ id: null, name: '', start_date: '', end_date: '', is_active: false }); setIsYearModal(true); }}
            >
              Ajouter
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <th className="th-desktop">Année</th>
                  <th className="th-desktop">Début</th>
                  <th className="th-desktop">Fin</th>
                  <th className="th-desktop text-center">Statut</th>
                  <th className="th-desktop text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {years.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">Aucune année scolaire</td></tr>
                ) : years.map(y => {
                  const isActive = y.is_active == 1 || y.is_active === true;
                  return (
                    <tr key={y.id} className={`hover:bg-gray-50/50 transition-colors ${isActive ? 'bg-blue-50/20' : ''}`}>
                      <td className="px-6 py-4 font-black text-gray-900">{y.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{y.start_date ? new Date(y.start_date).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{y.end_date ? new Date(y.end_date).toLocaleDateString('fr-FR') : '—'}</td>
                      <td className="px-6 py-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-secondary-50 text-secondary-700 rounded-full text-[10px] font-black uppercase">
                            <CheckSquare size={10} /> Active
                          </span>
                        ) : (
                          <button onClick={() => handleSetActiveYear(y)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-black uppercase hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            Activer
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton
                            icon={<Pencil size={14} />} label="Modifier"
                            onClick={() => { setEditingYear(true); setNewYear({ id: y.id, name: y.name, start_date: y.start_date || '', end_date: y.end_date || '', is_active: isActive }); setIsYearModal(true); }}
                          />
                          <IconButton icon={<Trash2 size={14} />} label="Supprimer" variant="danger" onClick={() => handleDeleteYear(y.id)} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── Modals ─── */}
      <Modal open={isClassModal} onClose={() => setIsClassModal(false)} title="Nouvelle Classe" size="sm">
        <form onSubmit={handleAddClass} className="space-y-4">
          <Input label="Nom de la classe" required value={newClass.name} onChange={e => setNewClass(p => ({ ...p, name: e.target.value }))} placeholder="Ex : 6ème A" />
          <Select
            label="Niveau" value={newClass.level} onChange={e => setNewClass(p => ({ ...p, level: e.target.value }))}
            options={LEVELS.map(l => ({ value: l, label: l }))}
          />
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setIsClassModal(false)}>Annuler</Button>
            <Button type="submit" variant="primary" fullWidth>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <Modal open={isSubjectModal} onClose={() => setIsSubjectModal(false)} title="Nouvelle Matière" size="sm">
        <form onSubmit={handleAddSubject} className="space-y-4">
          <Input label="Nom de la matière" required value={newSubject.name} onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))} placeholder="Ex : Mathématiques" />
          <Input
            label="Coefficient" type="number" min="1" max="10" required value={newSubject.coefficient}
            onChange={e => setNewSubject(p => ({ ...p, coefficient: parseInt(e.target.value) || 1 }))}
          />
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setIsSubjectModal(false)}>Annuler</Button>
            <Button type="submit" variant="primary" fullWidth>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      <Modal open={isYearModal} onClose={() => setIsYearModal(false)} title={editingYear ? 'Modifier l\'année' : 'Nouvelle Année Scolaire'} size="sm">
        <form onSubmit={handleAddYear} className="space-y-4">
          <Input label="Nom (ex : 2024-2025)" required value={newYear.name} onChange={e => setNewYear(p => ({ ...p, name: e.target.value }))} placeholder="2024-2025" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Date de début" type="date" value={newYear.start_date} onChange={e => setNewYear(p => ({ ...p, start_date: e.target.value }))} />
            <Input label="Date de fin" type="date" value={newYear.end_date} onChange={e => setNewYear(p => ({ ...p, end_date: e.target.value }))} />
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border-2 border-blue-100">
            <Checkbox
              color="blue"
              checked={newYear.is_active}
              onChange={v => setNewYear(p => ({ ...p, is_active: v }))}
              label={<span className="text-sm font-bold text-blue-700">Définir comme année active</span>}
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setIsYearModal(false)}>Annuler</Button>
            <Button type="submit" variant="primary" fullWidth>{editingYear ? 'Modifier' : 'Créer'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
