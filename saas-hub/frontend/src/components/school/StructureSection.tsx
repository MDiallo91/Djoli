import { useState, useEffect } from 'react';
import { Layout, BookOpen, Plus, Trash2, Hash, GraduationCap, Layers, Calendar, CheckSquare, Check, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';

const LEVELS = ['Maternelle', 'Primaire', 'Collège', 'Lycée'] as const;

export default function StructureSection() {
  const [activeTab, setActiveTab] = useState<'classes' | 'subjects' | 'years'>('classes');
  const [classes, setClasses]     = useState<any[]>([]);
  const [subjects, setSubjects]   = useState<any[]>([]);
  const [years, setYears]         = useState<any[]>([]);

  const [isClassModal, setIsClassModal]   = useState(false);
  const [isSubjectModal, setIsSubjectModal] = useState(false);
  const [isYearModal, setIsYearModal]     = useState(false);

  const [newClass, setNewClass]     = useState({ name: '', level: 'Primaire' });
  const [newSubject, setNewSubject] = useState({ name: '', coefficient: 1 });
  const [newYear, setNewYear]       = useState({ id: null as string | null, name: '', start_date: '', end_date: '', is_active: false });
  const [editingYear, setEditingYear] = useState(false);

  // Class → subjects panel
  const [selectedClass, setSelectedClass]   = useState<any>(null);
  const [classSubjects, setClassSubjects]   = useState<any[]>([]);
  const [checkedSubjects, setCheckedSubjects] = useState<Set<string>>(new Set());
  const [showSubjectAdd, setShowSubjectAdd] = useState(false);

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

  const handleDeleteClass   = async (id: string) => { if (!confirm('Supprimer cette classe ?')) return; await api.deleteClass(id); fetchData(); };
  const handleDeleteSubject = async (id: string) => { if (!confirm('Supprimer cette matière ?')) return; await api.deleteSubject(id); fetchData(); };
  const handleDeleteYear    = async (id: string) => { if (!confirm('Supprimer cette année ?')) return; await api.deleteSchoolYear(id); fetchData(); };

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
    { id: 'classes', label: 'Classes', icon: Layers },
    { id: 'subjects', label: 'Matières', icon: BookOpen },
    { id: 'years', label: 'Années Scolaires', icon: Calendar },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Sub-tab bar ─── */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setActiveTab(t.id); setSelectedClass(null); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === t.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            <t.icon size={16} /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── CLASSES ─── */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="card-main">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Layers size={20} className="text-blue-600" />
                <h3 className="font-black text-gray-900 tracking-tight">Classes</h3>
                <span className="bg-blue-50 text-blue-600 text-xs font-black px-2 py-0.5 rounded-full">{classes.length}</span>
              </div>
              <button onClick={() => setIsClassModal(true)} className="btn-primary flex items-center gap-1.5 py-2 text-xs">
                <Plus size={14} /> Ajouter
              </button>
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
                    <button onClick={e => { e.stopPropagation(); handleDeleteClass(c.id); }}
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Class subjects panel */}
          {selectedClass ? (
            <div className="card-main">
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
            </div>
          ) : (
            <div className="card-main flex items-center justify-center py-20 text-center">
              <div>
                <Layers className="text-gray-200 mx-auto mb-3" size={40} />
                <p className="text-gray-400 font-bold text-sm">Sélectionnez une classe<br />pour gérer ses matières</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── MATIÈRES ─── */}
      {activeTab === 'subjects' && (
        <div className="card-main">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen size={20} className="text-blue-600" />
              <h3 className="font-black text-gray-900 tracking-tight">Matières</h3>
              <span className="bg-blue-50 text-blue-600 text-xs font-black px-2 py-0.5 rounded-full">{subjects.length}</span>
            </div>
            <button onClick={() => setIsSubjectModal(true)} className="btn-primary flex items-center gap-1.5 py-2 text-xs">
              <Plus size={14} /> Ajouter
            </button>
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
                      <button onClick={() => handleDeleteSubject(s.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ANNÉES SCOLAIRES ─── */}
      {activeTab === 'years' && (
        <div className="card-main">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-blue-600" />
              <h3 className="font-black text-gray-900 tracking-tight">Années Scolaires</h3>
            </div>
            <button onClick={() => { setEditingYear(false); setNewYear({ id: null, name: '', start_date: '', end_date: '', is_active: false }); setIsYearModal(true); }}
              className="btn-primary flex items-center gap-1.5 py-2 text-xs">
              <Plus size={14} /> Ajouter
            </button>
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
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase">
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
                          <button onClick={() => { setEditingYear(true); setNewYear({ id: y.id, name: y.name, start_date: y.start_date || '', end_date: y.end_date || '', is_active: isActive }); setIsYearModal(true); }}
                            className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDeleteYear(y.id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Modals ─── */}
      {isClassModal && (
        <Modal title="Nouvelle Classe" onClose={() => setIsClassModal(false)}>
          <form onSubmit={handleAddClass} className="space-y-4">
            <Field label="Nom de la classe">
              <input required value={newClass.name} onChange={e => setNewClass(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex : 6ème A" className="input-field" />
            </Field>
            <Field label="Niveau">
              <select value={newClass.level} onChange={e => setNewClass(p => ({ ...p, level: e.target.value }))} className="input-field">
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
            <ModalActions onCancel={() => setIsClassModal(false)} />
          </form>
        </Modal>
      )}

      {isSubjectModal && (
        <Modal title="Nouvelle Matière" onClose={() => setIsSubjectModal(false)}>
          <form onSubmit={handleAddSubject} className="space-y-4">
            <Field label="Nom de la matière">
              <input required value={newSubject.name} onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))}
                placeholder="Ex : Mathématiques" className="input-field" />
            </Field>
            <Field label="Coefficient">
              <input type="number" min="1" max="10" required value={newSubject.coefficient}
                onChange={e => setNewSubject(p => ({ ...p, coefficient: parseInt(e.target.value) || 1 }))} className="input-field" />
            </Field>
            <ModalActions onCancel={() => setIsSubjectModal(false)} />
          </form>
        </Modal>
      )}

      {isYearModal && (
        <Modal title={editingYear ? 'Modifier l\'année' : 'Nouvelle Année Scolaire'} onClose={() => setIsYearModal(false)}>
          <form onSubmit={handleAddYear} className="space-y-4">
            <Field label="Nom (ex : 2024-2025)">
              <input required value={newYear.name} onChange={e => setNewYear(p => ({ ...p, name: e.target.value }))}
                placeholder="2024-2025" className="input-field" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date de début">
                <input type="date" value={newYear.start_date} onChange={e => setNewYear(p => ({ ...p, start_date: e.target.value }))} className="input-field" />
              </Field>
              <Field label="Date de fin">
                <input type="date" value={newYear.end_date} onChange={e => setNewYear(p => ({ ...p, end_date: e.target.value }))} className="input-field" />
              </Field>
            </div>
            <label className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border-2 border-blue-100 cursor-pointer">
              <input type="checkbox" checked={newYear.is_active} onChange={e => setNewYear(p => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4 accent-blue-600" />
              <span className="text-sm font-bold text-blue-700">Définir comme année active</span>
            </label>
            <ModalActions onCancel={() => setIsYearModal(false)} label={editingYear ? 'Modifier' : 'Créer'} />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl leading-none">×</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onCancel, label = 'Enregistrer' }: { onCancel: () => void; label?: string }) {
  return (
    <div className="pt-4 flex gap-3">
      <button type="button" onClick={onCancel}
        className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all">
        Annuler
      </button>
      <button type="submit" className="flex-1 btn-primary py-3 shadow-lg shadow-blue-500/30">{label}</button>
    </div>
  );
}

// Inline style for form inputs used in modals
const style = document.createElement('style');
style.textContent = `.input-field { width: 100%; padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 14px; outline: none; } .input-field:focus { box-shadow: 0 0 0 3px rgba(37,99,235,0.15); border-color: #3b82f6; }`;
if (typeof document !== 'undefined') document.head.appendChild(style);
