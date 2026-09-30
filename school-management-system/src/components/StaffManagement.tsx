import React, { useState, useEffect } from 'react';
import { Users, Plus, Pencil, Trash2, Search, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { dbService } from '../services/db';
import { PrintHeader } from './PrintHeader';
import { PrintPreview } from './PrintPreview';
import { FullPageView, SectionTitle, formInputCls, formLabelCls } from './FullPageView';

export function StaffManagement() {
    const [staff, setStaff] = useState<any[]>([]);
    const [printPreview, setPrintPreview] = useState(false)
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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

    const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
    const paginatedStaff = filteredStaff.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => { setCurrentPage(1) }, [searchTerm]);

    return (
        <>
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Liste du personnel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 space-y-4 no-print">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="text-primary" size={20} />
                            <h3 className="text-lg font-bold normal-case text-gray-900">Liste du Personnel</h3>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setPrintPreview(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-lg shadow-gray-900/10"
                            >
                                <Printer size={16} />
                                Imprimer
                            </button>
                            <button
                                onClick={() => setIsFormOpen(true)}
                                className="btn-primary flex items-center gap-2 py-2"
                            >
                                <Plus size={18} />
                                Nouveau Personnel
                            </button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher un membre du personnel..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm text-gray-700"
                        />
                    </div>
                </div>

                {filteredStaff.length === 0 ? (
                    <div className="py-16 text-center text-gray-500">
                        <Users className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                        <p className="text-base font-bold normal-case text-gray-900">Aucun personnel trouvé</p>
                        <p className="mt-1 text-sm">Commencez par ajouter un enseignant ou un employé.</p>
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 border-y border-gray-200">
                                        <th className="px-4 py-4 text-xs font-bold text-gray-700 w-16 text-center">N°</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-700">Nom & Prénom</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-700">Rôle</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-700">Téléphone</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-700">Email</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-700">Salaire de base</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedStaff.map((person, index) => (
                                        <tr key={person.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-4 text-xs font-black text-gray-400 text-center">
                                                {(currentPage - 1) * itemsPerPage + index + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs flex-shrink-0">
                                                        {person.first_name[0]}{person.last_name[0]}
                                                    </div>
                                                    <p className="text-gray-900">{person.first_name} {person.last_name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full normal-case">
                                                    {person.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{person.phone || '---'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 truncate max-w-[180px]">{person.email || '---'}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatCurrency(person.salary_base)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={() => handleEdit(person)} className="icon-btn-edit" title="Modifier">
                                                        <Pencil size={15} />
                                                    </button>
                                                    <button onClick={() => handleDelete(person.id)} className="icon-btn-danger" title="Supprimer">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-2 py-2 no-print">
                                <p className="text-xs font-bold text-gray-500">
                                    Page {currentPage} sur {totalPages} — {filteredStaff.length} membre{filteredStaff.length !== 1 ? 's' : ''}
                                </p>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(p => p - 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft size={15} />
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setCurrentPage(p)}
                                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                                p === currentPage ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                    <button
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(p => p + 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronRight size={15} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
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

        {printPreview && (
            <PrintPreview title="Liste du personnel" onClose={() => setPrintPreview(false)}>
                <PrintHeader alwaysVisible docTitle="Liste du Personnel" />
                <table className="w-full border-collapse border border-gray-900 mt-4">
                    <thead>
                        <tr className="bg-gray-100 border-b border-gray-900">
                            <th className="border border-gray-900 px-2 py-2 text-[10px] font-black uppercase text-center w-10">#</th>
                            <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase">Nom & Prénom</th>
                            <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase">Rôle</th>
                            <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase">Téléphone</th>
                            <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase">Email</th>
                            <th className="border border-gray-900 px-3 py-2 text-[10px] font-black uppercase">Salaire de base</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredStaff.map((s, index) => (
                            <tr key={s.id} className="border-b border-gray-900">
                                <td className="border border-gray-900 px-2 py-2 text-[10px] font-bold text-center">{index + 1}</td>
                                <td className="border border-gray-900 px-3 py-2 text-[10px]">{s.first_name} {s.last_name}</td>
                                <td className="border border-gray-900 px-3 py-2 text-[10px] font-bold">{s.role}</td>
                                <td className="border border-gray-900 px-3 py-2 text-[10px] font-bold">{s.phone || '---'}</td>
                                <td className="border border-gray-900 px-3 py-2 text-[10px] font-bold">{s.email || '---'}</td>
                                <td className="border border-gray-900 px-3 py-2 text-[10px] font-bold">{formatCurrency(s.salary_base)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </PrintPreview>
        )}
    </>
    );
}
