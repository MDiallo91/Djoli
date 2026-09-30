import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Mail, Phone, MapPin, Search, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import ImageUpload from '../ui/ImageUpload';
import { Button, Card, IconButton, Input, Select, Modal, EmptyState, confirmDialog, Tabs } from '../../ui/design_system';
import StaffPermissionsSection from './StaffPermissionsSection';

const ROLES = ['Enseignant', 'Directeur', 'Directeur Adjoint', 'Secrétaire', 'Comptable', 'Surveillant', 'Agent de service'];

const EMPTY_FORM = {
  first_name: '', last_name: '', role: 'Enseignant',
  phone: '', email: '', address: '',
  salary_base: 0, hire_date: new Date().toISOString().split('T')[0],
  photo_url: '',
};

export default function StaffSection() {
  const [tab, setTab]                 = useState<'staff' | 'permissions'>('staff');
  const [staff, setStaff]             = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen]   = useState(false);
  const [searchTerm, setSearchTerm]   = useState('');
  const [formData, setFormData]       = useState<any>({ ...EMPTY_FORM });
  const [editingStaff, setEditingStaff] = useState<any>(null);

  const fetchData = async () => {
    try { const data = await api.getStaff(); setStaff(data || []); }
    catch { toast.error('Erreur de chargement'); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaff) await api.updateStaff(editingStaff.id, formData);
      else await api.createStaff(formData);
      setIsFormOpen(false); setEditingStaff(null); setFormData({ ...EMPTY_FORM });
      fetchData();
      toast.success(editingStaff ? 'Personnel modifié' : 'Personnel ajouté');
    } catch { toast.error('Erreur lors de l\'enregistrement'); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ message: 'Supprimer ce membre du personnel ?', variant: 'danger' }))) return;
    try { await api.deleteStaff(id); fetchData(); toast.success('Supprimé'); }
    catch { toast.error('Erreur'); }
  };

  const handleEdit = (p: any) => {
    setEditingStaff(p);
    setFormData({ first_name: p.first_name, last_name: p.last_name, role: p.role, phone: p.phone || '', email: p.email || '', address: p.address || '', salary_base: p.salary_base || 0, hire_date: p.hire_date || new Date().toISOString().split('T')[0], photo_url: p.photo_url || '' });
    setIsFormOpen(true);
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' }).format(n);

  const filtered = staff.filter(s =>
    (s.first_name + ' ' + s.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const closeForm = () => { setIsFormOpen(false); setEditingStaff(null); };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <Tabs
        options={[
          { value: 'staff', label: 'Personnel' },
          { value: 'permissions', label: 'Comptes & permissions' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'permissions' ? <StaffPermissionsSection /> : (
      <>
      {/* ─── Header Actions ─── */}
      <Card padding="sm" className="flex items-center justify-between">
        <div className="w-1/3">
          <Input
            type="text" placeholder="Rechercher un membre du personnel…" value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
        <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => { setEditingStaff(null); setFormData({ ...EMPTY_FORM }); setIsFormOpen(true); }}>
          Nouveau Personnel
        </Button>
      </Card>

      {/* ─── Grid cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={<Users size={24} />}
              message="Aucun personnel trouvé"
              hint="Commencez par ajouter un enseignant ou un employé."
            />
          </div>
        ) : filtered.map(person => (
          <Card key={person.id} padding="lg" hover className="group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                {person.photo_url ? (
                  <img src={person.photo_url} alt={person.first_name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg border-2 border-white shadow-sm flex-shrink-0">
                    {person.first_name[0]}{person.last_name[0]}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {person.first_name} {person.last_name}
                  </h3>
                  <p className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                    {person.role}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <IconButton icon={<Pencil size={16} />} label="Modifier" onClick={() => handleEdit(person)} />
                <IconButton icon={<Trash2 size={16} />} label="Supprimer" variant="danger" onClick={() => handleDelete(person.id)} />
              </div>
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-gray-50">
              {person.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />
                  <a href={`tel:${person.phone}`} className="hover:text-blue-600 transition-colors">{person.phone}</a>
                </div>
              )}
              {person.email && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{person.email}</span>
                </div>
              )}
              {person.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="truncate">{person.address}</span>
                </div>
              )}
              {person.hire_date && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={14} className="text-gray-400 flex-shrink-0" />
                  <span>Depuis le {new Date(person.hire_date).toLocaleDateString('fr-FR')}</span>
                </div>
              )}
            </div>

            {person.salary_base > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider">Salaire de base</p>
                <p className="font-bold text-gray-900 text-sm">{formatCurrency(person.salary_base)}</p>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* ─── Modal formulaire ─── */}
      <Modal open={isFormOpen} onClose={closeForm} title={`${editingStaff ? 'Modifier' : 'Nouveau'} Personnel`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo */}
          <div className="flex justify-center pb-2">
            <ImageUpload
              value={formData.photo_url}
              onChange={url => setFormData((p: any) => ({ ...p, photo_url: url }))}
              shape="circle"
              size="lg"
              placeholder="Photo"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Prénom" required value={formData.first_name} onChange={e => setFormData((p: any) => ({ ...p, first_name: e.target.value }))} />
            <Input label="Nom" required value={formData.last_name} onChange={e => setFormData((p: any) => ({ ...p, last_name: e.target.value }))} />
          </div>
          <Select
            label="Rôle"
            value={formData.role}
            onChange={e => setFormData((p: any) => ({ ...p, role: e.target.value }))}
            options={ROLES.map(r => ({ value: r, label: r }))}
          />
          <Input label="Téléphone" type="tel" value={formData.phone} onChange={e => setFormData((p: any) => ({ ...p, phone: e.target.value }))} />
          <Input label="Email" type="email" value={formData.email} onChange={e => setFormData((p: any) => ({ ...p, email: e.target.value }))} />
          <Input label="Adresse" type="text" value={formData.address} onChange={e => setFormData((p: any) => ({ ...p, address: e.target.value }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Salaire de base (GNF)" type="number" min="0" value={formData.salary_base}
              onChange={e => setFormData((p: any) => ({ ...p, salary_base: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              label="Date d'embauche" type="date" value={formData.hire_date}
              onChange={e => setFormData((p: any) => ({ ...p, hire_date: e.target.value }))}
            />
          </div>
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={closeForm}>Annuler</Button>
            <Button type="submit" variant="primary" fullWidth>{editingStaff ? 'Modifier' : 'Enregistrer'}</Button>
          </div>
        </form>
      </Modal>
      </>
      )}
    </div>
  );
}
