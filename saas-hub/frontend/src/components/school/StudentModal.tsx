import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';

interface Props {
  student?: any;
  classes: any[];
  years: any[];
  activeYearId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function StudentModal({ student, classes, years, activeYearId, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    first_name: '', last_name: '', gender: 'M', birth_date: '',
    phone: '', address: '', matricule: '',
    pere: '', mere: '',
    parent_first_name: '', parent_last_name: '', parent_phone: '', parent_email: '', parent_profession: '',
    class_id: '', year_id: activeYearId,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        gender: student.gender || 'M',
        birth_date: student.birth_date || '',
        phone: student.phone || '',
        address: student.address || '',
        matricule: student.matricule || '',
        pere: student.pere || '',
        mere: student.mere || '',
        parent_first_name: student.parent_first_name || '',
        parent_last_name: student.parent_last_name || '',
        parent_phone: student.parent_phone || '',
        parent_email: student.parent_email || '',
        parent_profession: student.parent_profession || '',
        class_id: student.class_id?.toString() || '',
        year_id: activeYearId,
      });
    }
  }, [student, activeYearId]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error('Nom et prénom requis'); return; }
    setSaving(true);
    try {
      let studentId: string;
      if (student) {
        await api.updateStudent(student.id, form);
        studentId = student.id;
      } else {
        const res = await api.createStudent(form);
        studentId = res.id;
      }
      // Gestion inscription
      if (form.class_id && form.year_id && studentId) {
        try {
          await api.createEnrollment({ student_id: studentId, class_id: form.class_id, school_year_id: form.year_id });
        } catch {
          // already enrolled — ignore
        }
      }
      toast.success(student ? 'Élève modifié' : 'Élève inscrit');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Erreur lors de l\'enregistrement');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-2xl overflow-hidden border border-gray-100 max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0">
          <h2 className="text-xl font-bold text-gray-900">{student ? 'Modifier l\'élève' : 'Inscrire un élève'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Identité */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-100">Identité</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Prénom *">
                <input required value={form.first_name} onChange={e => set('first_name', e.target.value)} className="inp" placeholder="Ex : Mamadou" />
              </Field>
              <Field label="Nom *">
                <input required value={form.last_name} onChange={e => set('last_name', e.target.value)} className="inp" placeholder="Ex : Diallo" />
              </Field>
              <Field label="Genre">
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className="inp">
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </Field>
              <Field label="Date de naissance">
                <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} className="inp" />
              </Field>
              <Field label="Matricule">
                <input value={form.matricule} onChange={e => set('matricule', e.target.value)} className="inp" placeholder="Ex : 2024001" />
              </Field>
              <Field label="Téléphone">
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="inp" placeholder="Ex : 620 00 00 00" />
              </Field>
              <Field label="Père">
                <input value={form.pere} onChange={e => set('pere', e.target.value)} className="inp" placeholder="Nom du père" />
              </Field>
              <Field label="Mère">
                <input value={form.mere} onChange={e => set('mere', e.target.value)} className="inp" placeholder="Nom de la mère" />
              </Field>
              <Field label="Adresse" className="sm:col-span-2">
                <input value={form.address} onChange={e => set('address', e.target.value)} className="inp" placeholder="Quartier, commune…" />
              </Field>
            </div>
          </section>

          {/* Scolarité */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-100">Scolarité</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Classe">
                <select value={form.class_id} onChange={e => set('class_id', e.target.value)} className="inp">
                  <option value="">— Aucune classe —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Année scolaire">
                <select value={form.year_id} onChange={e => set('year_id', e.target.value)} className="inp">
                  {years.map(y => <option key={y.id} value={y.id}>{y.name}{(y.is_active == 1 || y.is_active) ? ' ★' : ''}</option>)}
                </select>
              </Field>
            </div>
          </section>

          {/* Tuteur */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-100">Tuteur / Parent</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Prénom tuteur">
                <input value={form.parent_first_name} onChange={e => set('parent_first_name', e.target.value)} className="inp" />
              </Field>
              <Field label="Nom tuteur">
                <input value={form.parent_last_name} onChange={e => set('parent_last_name', e.target.value)} className="inp" />
              </Field>
              <Field label="Téléphone tuteur">
                <input type="tel" value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} className="inp" />
              </Field>
              <Field label="Email tuteur">
                <input type="email" value={form.parent_email} onChange={e => set('parent_email', e.target.value)} className="inp" />
              </Field>
              <Field label="Profession tuteur" className="sm:col-span-2">
                <input value={form.parent_profession} onChange={e => set('parent_profession', e.target.value)} className="inp" />
              </Field>
            </div>
          </section>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all">
              Annuler
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 btn-primary py-3 shadow-lg shadow-blue-500/30 disabled:opacity-50">
              {saving ? 'Enregistrement…' : student ? 'Modifier' : 'Inscrire'}
            </button>
          </div>
        </form>
      </div>

      <style>{`.inp { width:100%;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;font-size:14px;outline:none;} .inp:focus{box-shadow:0 0 0 3px rgba(37,99,235,.15);border-color:#3b82f6;}`}</style>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="block text-xs font-bold text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
