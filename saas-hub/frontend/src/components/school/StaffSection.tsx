import { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Mail, Phone, MapPin, Search, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';

const ROLES = ['Enseignant', 'Directeur', 'Directeur Adjoint', 'Secrétaire', 'Comptable', 'Surveillant', 'Agent de service'];

const EMPTY_FORM = {
  first_name: '', last_name: '', role: 'Enseignant',
  phone: '', email: '', address: '',
  salary_base: 0, hire_date: new Date().toISOString().split('T')[0],
};

export default function StaffSection() {
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
    if (!confirm('Supprimer ce membre du personnel ?')) return;
    try { await api.deleteStaff(id); fetchData(); toast.success('Supprimé'); }
    catch { toast.error('Erreur'); }
  };

  const handleEdit = (p: any) => {
    setEditingStaff(p);
    setFormData({ first_name: p.first_name, last_name: p.last_name, role: p.role, phone: p.phone || '', email: p.email || '', address: p.address || '', salary_base: p.salary_base || 0, hire_date: p.hire_date || new Date().toISOString().split('T')[0] });
    setIsFormOpen(true);
  };

  const formatCurrency = (n: number) => new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' }).format(n);

  const filtered = staff.filter(s =>
    (s.first_name + ' ' + s.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ─── Header Actions ─── */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 w-1/3">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input type="text" placeholder="Rechercher un membre du personnel…" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm text-gray-700 outline-none" />
          </div>
        </div>
        <button onClick={() => { setEditingStaff(null); setFormData({ ...EMPTY_FORM }); setIsFormOpen(true); }}
          className="btn-primary flex items-center gap-2 py-2">
          <Plus size={18} /> Nouveau Personnel
        </button>
      </div>

      {/* ─── Grid cards ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
            <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Aucun personnel trouvé</h3>
            <p className="mt-1 text-sm">Commencez par ajouter un enseignant ou un employé.</p>
          </div>
        ) : filtered.map(person => (
          <div key={person.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg border-2 border-white shadow-sm flex-shrink-0">
                  {person.first_name[0]}{person.last_name[0]}
                </div>
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
                <button onClick={() => handleEdit(person)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(person.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
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
          </div>
        ))}
      </div>

      {/* ─── Modal formulaire ─── */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-100 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 sticky top-0">
              <h2 className="text-xl font-bold text-gray-900">{editingStaff ? 'Modifier' : 'Nouveau'} Personnel</h2>
              <button onClick={() => { setIsFormOpen(false); setEditingStaff(null); }} className="text-gray-400 hover:text-gray-600 font-bold text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {([['first_name', 'Prénom'], ['last_name', 'Nom']] as const).map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
                    <input type="text" required value={formData[field]}
                      onChange={e => setFormData((p: any) => ({ ...p, [field]: e.target.value }))}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Rôle</label>
                <select value={formData.role} onChange={e => setFormData((p: any) => ({ ...p, role: e.target.value }))}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {([['phone', 'Téléphone', 'tel'], ['email', 'Email', 'email'], ['address', 'Adresse', 'text']] as const).map(([field, label, type]) => (
                <div key={field}>
                  <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
                  <input type={type} value={formData[field]}
                    onChange={e => setFormData((p: any) => ({ ...p, [field]: e.target.value }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Salaire de base (GNF)</label>
                  <input type="number" min="0" value={formData.salary_base}
                    onChange={e => setFormData((p: any) => ({ ...p, salary_base: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Date d'embauche</label>
                  <input type="date" value={formData.hire_date}
                    onChange={e => setFormData((p: any) => ({ ...p, hire_date: e.target.value }))}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-sm" />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => { setIsFormOpen(false); setEditingStaff(null); }}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all">
                  Annuler
                </button>
                <button type="submit" className="flex-1 btn-primary py-3 shadow-lg shadow-blue-500/30">
                  {editingStaff ? 'Modifier' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
