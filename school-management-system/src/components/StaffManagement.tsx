import React, { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Mail, Phone, MapPin, Search, Printer } from 'lucide-react';
import { dbService } from '../services/db';
import { PrintHeader } from './PrintHeader';
import { PrintPreviewBar } from './PrintPreviewBar';
import { FullPageView, SectionTitle, formInputCls, formLabelCls } from './FullPageView';

export function StaffManagement() {
    const [staff, setStaff] = useState<any[]>([]);
    const [printPreview, setPrintPreview] = useState(false)
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    const [formData, setFormData] = useState<any>({
        first_name: '',
        last_name: '',
        role: 'Enseignant',
        phone: '',
        email: '',
        address: '',
        salary_base: 0,
        hire_date: new Date().toISOString().split('T')[0]
    });
    const [editingStaff, setEditingStaff] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const staffData = await dbService.getStaff();
                setStaff(staffData || []);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        };
        fetchData();
    }, [refreshKey]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            console.log('Attempting to save staff data:', formData);
            if (editingStaff) {
                console.log('Updating existing staff:', editingStaff.id);
                await dbService.updateStaff({ ...formData, id: editingStaff.id });
                console.log('Update successful');
            } else {
                console.log('Adding new staff');
                const result = await dbService.addStaff(formData);
                console.log('Add successful, result:', result);
            }
            setIsFormOpen(false);
            setEditingStaff(null);
            setRefreshKey(prev => prev + 1);
            resetForm();
        } catch (error) {
            console.error('Failed to save staff in frontend:', error);
            alert(`Erreur lors de l'enregistrement: ${error}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre du personnel ?')) return;
        try {
            await dbService.deleteStaff(id);
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('Failed to delete staff:', error);
        }
    };

    const handleEdit = (person: any) => {
        setEditingStaff(person);
        setFormData({
            first_name: person.first_name,
            last_name: person.last_name,
            role: person.role,
            phone: person.phone || '',
            email: person.email || '',
            address: person.address || '',
            salary_base: person.salary_base,
            hire_date: person.hire_date || new Date().toISOString().split('T')[0]
        });
        setIsFormOpen(true);
    };

    const resetForm = () => {
        setFormData({
            first_name: '',
            last_name: '',
            role: 'Enseignant',
            phone: '',
            email: '',
            address: '',
            salary_base: 0,
            hire_date: new Date().toISOString().split('T')[0]
        });
        setEditingStaff(null);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' }).format(amount);
    };

    const filteredStaff = staff.filter(s =>
        (s.first_name + ' ' + s.last_name).toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {printPreview && <PrintPreviewBar title="Liste du personnel" onClose={() => setPrintPreview(false)} />}
            <PrintHeader />
            {/* Header Actions */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm no-print">
                <div className="flex items-center gap-3 w-1/3">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un membre du personnel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700"
                        />
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="btn-primary flex items-center gap-2 py-2"
                    >
                        <Plus size={18} />
                        Nouveau Personnel
                    </button>
                    <button
                        onClick={() => setPrintPreview(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-gray-900/10"
                    >
                        <Printer size={18} />
                        Imprimer
                    </button>
                </div>
            </div>

            {/* Staff List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStaff.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-300">
                        <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <h3 className="text-lg font-medium text-gray-900">Aucun personnel trouvé</h3>
                        <p className="mt-1 text-sm">Commencez par ajouter un enseignant ou un employé.</p>
                    </div>
                ) : (
                    filteredStaff.map((person) => (
                        <div key={person.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-lg border-2 border-white shadow-sm">
                                        {person.first_name[0]}{person.last_name[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">
                                            {person.first_name} {person.last_name}
                                        </h3>
                                        <p className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full inline-block mt-1">
                                            {person.role}
                                        </p>
                                        {person.role === 'Enseignant' && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {person.subjects_list ? person.subjects_list.split(',').map((sub: string, i: number) => (
                                                    <span key={i} className="bg-primary/5 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold border border-primary/10">
                                                        {sub.trim()}
                                                    </span>
                                                )) : (
                                                    <span className="text-gray-400 text-[10px] italic">Aucune matière</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleEdit(person)}
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(person.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4 pt-4 border-t border-gray-50">
                                {person.phone && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Phone size={14} className="text-gray-400" />
                                        <span>{person.phone}</span>
                                    </div>
                                )}
                                {person.email && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Mail size={14} className="text-gray-400" />
                                        <span className="truncate">{person.email}</span>
                                    </div>
                                )}
                                {person.address && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <MapPin size={14} className="text-gray-400" />
                                        <span className="truncate">{person.address}</span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-sm">
                                <span className="text-gray-500">Base Salariale</span>
                                <span className="font-bold text-gray-900">{formatCurrency(person.salary_base)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Full-page form */}
            {isFormOpen && (
                <FullPageView
                    title={editingStaff ? 'MODIFIER LE PERSONNEL' : 'NOUVEAU PERSONNEL'}
                    onBack={() => { setIsFormOpen(false); resetForm(); }}
                >
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 28 }}>
                            <SectionTitle>Informations personnelles</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                                <div>
                                    <label className={formLabelCls}>Prénom *</label>
                                    <input type="text" required className={formInputCls} value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className={formLabelCls}>Nom *</label>
                                    <input type="text" required className={formInputCls} value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className={formLabelCls}>Téléphone</label>
                                    <input type="tel" className={formInputCls} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="620 00 00 00" />
                                </div>
                                <div>
                                    <label className={formLabelCls}>Email</label>
                                    <input type="email" className={formInputCls} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="exemple@ecole.com" />
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label className={formLabelCls}>Adresse</label>
                                    <input type="text" className={formInputCls} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: 28 }}>
                            <SectionTitle>Profil professionnel</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                                <div>
                                    <label className={formLabelCls}>Rôle *</label>
                                    <select className={formInputCls} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                        <option value="Enseignant">Enseignant</option>
                                        <option value="Directeur">Directeur</option>
                                        <option value="Comptable">Comptable</option>
                                        <option value="Surveillant">Surveillant</option>
                                        <option value="Autre">Autre</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={formLabelCls}>Salaire de base (GNF)</label>
                                    <input type="number" min="0" className={formInputCls} value={formData.salary_base} onChange={e => setFormData({ ...formData, salary_base: Number(e.target.value) })} placeholder="2 000 000" />
                                </div>
                                <div>
                                    <label className={formLabelCls}>Date d'embauche</label>
                                    <input type="date" className={formInputCls} value={formData.hire_date} onChange={e => setFormData({ ...formData, hire_date: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                            <button type="button" onClick={() => { setIsFormOpen(false); resetForm(); }}
                                className="px-5 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                                Annuler
                            </button>
                            <button type="submit" className="btn-primary">
                                {editingStaff ? 'Mettre à jour' : 'Enregistrer'}
                            </button>
                        </div>
                    </form>
                </FullPageView>
            )}
        </div>
    );
}
