import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import ImageUpload from '../ui/ImageUpload';
import { Modal, Input, Select, Button } from '../../ui/design_system';

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
    first_name: '', last_name: '', gender: 'M', birth_date: '', birth_place: '',
    phone: '', address: '', matricule: '',
    pere: '', mere: '',
    parent_first_name: '', parent_last_name: '', parent_phone: '', parent_email: '', parent_profession: '',
    class_id: '', year_id: activeYearId,
    photo_url: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        gender: student.gender || 'M',
        birth_date: student.birth_date || '',
        birth_place: student.birth_place || '',
        phone: student.phone || '',
        address: student.address || '',
        matricule: student.matricule || '',
        pere: student.pere || '',
        mere: student.mere || '',
        // Le cloud ne garde que le nom complet du tuteur (tutor_name) : on le remet dans « Prénom tuteur ».
        parent_first_name: student.parent_first_name || student.tutor_name || '',
        parent_last_name: student.parent_last_name || '',
        parent_phone: student.parent_phone || student.tutor_phone || '',
        parent_email: student.parent_email || '',
        parent_profession: student.parent_profession || '',
        class_id: student.class_id?.toString() || '',
        year_id: activeYearId,
        photo_url: student.photo_url || '',
      });
    }
  }, [student, activeYearId]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error('Nom et prénom requis'); return; }
    setSaving(true);
    // Tuteur stocké côté cloud en nom complet + téléphone (utilisés par les cartes scolaires)
    const payload = {
      ...form,
      tutor_name: `${form.parent_first_name} ${form.parent_last_name}`.trim(),
      tutor_phone: form.parent_phone.trim(),
    };
    try {
      let studentId: string;
      if (student) {
        await api.updateStudent(student.id, payload);
        studentId = student.id;
      } else {
        const res = await api.createStudent(payload);
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
    <Modal open onClose={onClose} title={student ? 'Modifier l\'élève' : 'Inscrire un élève'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Photo */}
        <div className="flex justify-center pt-2">
          <ImageUpload
            value={form.photo_url}
            onChange={url => set('photo_url', url)}
            folder="djoli/students"
            shape="circle"
            size="lg"
            placeholder="Photo"
          />
        </div>

        {/* Identité */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-100">Identité</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Prénom *" required value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="Ex : Mamadou" />
            <Input label="Nom *" required value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Ex : Diallo" />
            <Select
              label="Genre"
              value={form.gender}
              onChange={e => set('gender', e.target.value)}
              options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]}
            />
            <Input label="Date de naissance" type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
            <Input label="Lieu de naissance" value={form.birth_place} onChange={e => set('birth_place', e.target.value)} placeholder="Ex : Kindia" />
            <Input label="Matricule" value={form.matricule} onChange={e => set('matricule', e.target.value)} placeholder="Ex : 2024001" />
            <Input label="Téléphone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="Ex : 620 00 00 00" />
            <Input label="Père" value={form.pere} onChange={e => set('pere', e.target.value)} placeholder="Nom du père" />
            <Input label="Mère" value={form.mere} onChange={e => set('mere', e.target.value)} placeholder="Nom de la mère" />
            <div className="sm:col-span-2">
              <Input label="Adresse / Quartier" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Quartier, commune…" />
            </div>
          </div>
        </section>

        {/* Scolarité */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-100">Scolarité</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Classe"
              value={form.class_id}
              onChange={e => set('class_id', e.target.value)}
              options={[{ value: '', label: '— Aucune classe —' }, ...classes.map(c => ({ value: c.id, label: c.name }))]}
            />
            <Select
              label="Année scolaire"
              value={form.year_id}
              onChange={e => set('year_id', e.target.value)}
              options={years.map(y => ({ value: y.id, label: `${y.name}${(y.is_active == 1 || y.is_active) ? ' ★' : ''}` }))}
            />
          </div>
        </section>

        {/* Tuteur */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 pb-1 border-b border-gray-100">Tuteur / Parent</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Prénom tuteur" value={form.parent_first_name} onChange={e => set('parent_first_name', e.target.value)} />
            <Input label="Nom tuteur" value={form.parent_last_name} onChange={e => set('parent_last_name', e.target.value)} />
            <Input label="Téléphone tuteur" type="tel" value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)} />
            <Input label="Email tuteur" type="email" value={form.parent_email} onChange={e => set('parent_email', e.target.value)} />
            <div className="sm:col-span-2">
              <Input label="Profession tuteur" value={form.parent_profession} onChange={e => set('parent_profession', e.target.value)} />
            </div>
          </div>
        </section>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" fullWidth onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="primary" fullWidth loading={saving}>
            {student ? 'Modifier' : 'Inscrire'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
