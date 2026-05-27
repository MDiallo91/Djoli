import React, { useState, useEffect } from 'react'
import { Wallet, ArrowUpCircle, ArrowDownCircle, Plus, Filter, Printer, Calendar, CheckSquare, Square, MoreVertical, Eye, Pencil, Trash2 } from 'lucide-react'
import { PrintHeader } from './PrintHeader'
import { PrintPreviewBar } from './PrintPreviewBar'
import { PrintPreview } from './PrintPreview'
import { SchoolPaymentReceiptPrint } from './SchoolPaymentReceiptPrint'
import { TransactionSlipPrint } from './TransactionSlipPrint'
import { FullPageView, SectionTitle, formInputCls, formLabelCls } from './FullPageView'
import { dbService } from '../services/db'
import { useSchoolStore } from '../stores/useSchoolStore'

const ALL_MONTHS = [
    'Septembre', 'Octobre', 'Novembre', 'Décembre',
    'Janvier', 'Février', 'Mars', 'Avril',
    'Mai', 'Juin', 'Juillet', 'Août'
];

export const FinanceManagement: React.FC = () => {
    const { activeYear } = useSchoolStore()
    const [printPreview, setPrintPreview] = useState<string | null>(null)
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isGeneralModalOpen, setIsGeneralModalOpen] = useState(false);
    const [schoolYears, setSchoolYears] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
    const [viewMode, setViewMode] = useState<'transactions' | 'reports'>('transactions');

    // Payment Form State
    const [selectedYear, setSelectedYear] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [studentBalance, setStudentBalance] = useState<any>(null);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
    const [paymentData, setPaymentData] = useState({
        amount: 0,
        method: 'Espèces',
        description: ''
    });

    // General Transaction Form State
    const [generalData, setGeneralData] = useState({
        type: 'OUT' as 'IN' | 'OUT',
        amount: 0,
        reason: ''
    });

    // Report State
    const [classes, setClasses] = useState<any[]>([]);
    const [reportConfig, setReportConfig] = useState({
        classId: '',
        month: ALL_MONTHS[0] // Default to first month
    });
    const [reportData, setReportData] = useState<any[]>([]);
    const [isReportLoading, setIsReportLoading] = useState(false);
    const [reportFilter, setReportFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');

    const [isSearching, setIsSearching] = useState(false);
    const [openMenuId, setOpenMenuId]     = useState<any>(null)
    const [viewTx, setViewTx]             = useState<any>(null)
    const [editTx, setEditTx]             = useState<any>(null)
    const [printTx, setPrintTx]           = useState<any>(null)

    const handleDeleteTx = async (id: any) => {
        if (!window.confirm('Supprimer cette transaction ?')) return
        await dbService.deleteTransaction(id)
        setOpenMenuId(null)
        fetchData()
    }

    const handleEditTxSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editTx) return
        await dbService.updateTransaction(editTx.id, { reason: editTx.reason, amount: editTx.amount })
        setEditTx(null)
        fetchData()
    }

    const [receiptData, setReceiptData] = useState<null | {
        student: any; payment: { amount: number; method: string; description?: string; months?: string[] };
        schoolYear: string; reference: string; date: Date;
    }>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [years, cls] = await Promise.all([
                dbService.getSchoolYears(),
                dbService.getClasses()
            ]);
            setSchoolYears(years);
            setClasses(cls);
            const active = years.find((y: any) => y.is_active);
            const activeId = active ? active.id.toString() : (years[0]?.id?.toString() ?? '');
            setSelectedYear(activeId);
            const txs = await dbService.getTransactions(activeId || undefined);
            setTransactions(txs);
        } finally {
            setLoading(false);
        }
    };

    const generateReport = async () => {
        if (!reportConfig.classId || !selectedYear) return;
        setIsReportLoading(true);
        try {
            const data = await dbService.getClassPaymentStatus(
                reportConfig.classId,
                reportConfig.month,
                selectedYear
            );
            setReportData(data);
        } finally {
            setIsReportLoading(false);
        }
    };

    useEffect(() => {
        if (reportConfig.classId) {
            generateReport();
        }
    }, [reportConfig.classId, reportConfig.month, selectedYear]);

    // Reload quand l'année active change globalement
    useEffect(() => { fetchData() }, [activeYear?.id]);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const results = await dbService.searchStudents(term);
            setSearchResults(results);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectStudent = async (student: any) => {
        setSelectedStudent(student);
        setSearchTerm(`${student.first_name} ${student.last_name}`);
        setSearchResults([]);
        if (selectedYear) {
            const balance = await dbService.getStudentBalance(student.id, selectedYear);
            setStudentBalance(balance);
            // Default amount to remaining balance?
            setPaymentData(prev => ({ ...prev, amount: balance.balance }));
        }
    };

    const toggleMonth = (month: string) => {
        if (studentBalance?.paidMonths?.includes(month)) return; // Already paid

        const newMonths = selectedMonths.includes(month)
            ? selectedMonths.filter(m => m !== month)
            : [...selectedMonths, month];
        setSelectedMonths(newMonths);

        const monthsLabel = newMonths.join(', ');

        // Auto-calculate amount: (Total Tuition / 10 months) * num selected
        // We assume 10 months for calculation, but user can override
        const monthlyFee = (studentBalance?.tuitionFee || 0) / 10;
        const autoAmount = newMonths.length * monthlyFee;

        setPaymentData(prev => ({
            ...prev,
            description: `Mois: ${monthsLabel}`,
            amount: autoAmount || prev.amount
        }));
    };

    const handleSavePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !selectedYear) return;

        await dbService.addPayment({
            studentId: selectedStudent.id,
            amount: paymentData.amount,
            yearId: selectedYear,
            method: paymentData.method,
            description: paymentData.description,
            months: selectedMonths
        });

        const yearName = schoolYears.find((y: any) => y.id.toString() === selectedYear)?.name || selectedYear;
        const ref = `PAY-${selectedStudent.id}-${Date.now().toString().slice(-8)}`;

        setReceiptData({
            student: selectedStudent,
            payment: { amount: paymentData.amount, method: paymentData.method, description: paymentData.description, months: selectedMonths },
            schoolYear: yearName,
            reference: ref,
            date: new Date(),
        });

        setIsPaymentModalOpen(false);
        resetPaymentForm();
        fetchData();
    };

    const handleSaveGeneral = async (e: React.FormEvent) => {
        e.preventDefault();
        await dbService.addCashTransaction(generalData.type, generalData.amount, generalData.reason, selectedYear || undefined);

        setIsGeneralModalOpen(false);
        setGeneralData({ type: 'OUT', amount: 0, reason: '' });
        fetchData();
    };

    const resetPaymentForm = () => {
        setSelectedStudent(null);
        setSearchTerm('');
        setStudentBalance(null);
        setSelectedMonths([]);
        setPaymentData({ amount: 0, method: 'Espèces', description: '' });
    };

    const totalBalance = transactions.reduce((acc, t) => acc + (t.type === 'IN' ? t.amount : -t.amount), 0)
    const monthlyIn = transactions
        .filter(t => t.type === 'IN' && new Date(t.date).getMonth() === new Date().getMonth())
        .reduce((acc, t) => acc + t.amount, 0)
    const monthlyOut = transactions
        .filter(t => t.type === 'OUT' && new Date(t.date).getMonth() === new Date().getMonth())
        .reduce((acc, t) => acc + t.amount, 0)

    const filteredTransactions = activeTab === 'ALL' ? transactions : transactions.filter(t => t.type === activeTab);
    const filteredReportData = reportData.filter(s => {
        if (reportFilter === 'PAID') return s.has_paid;
        if (reportFilter === 'UNPAID') return !s.has_paid;
        return true;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {printPreview && <PrintPreviewBar title={printPreview} onClose={() => setPrintPreview(null)} />}
            <PrintHeader />
            <div className="grid grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Solde Actuel</p>
                            <p className="text-2xl font-bold text-gray-900">{totalBalance.toLocaleString()} FG</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
                            <ArrowUpCircle size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Entrées (Mois)</p>
                            <p className="text-2xl font-bold text-gray-900">{monthlyIn.toLocaleString()} FG</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                            <ArrowDownCircle size={24} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">Sorties (Mois)</p>
                            <p className="text-2xl font-bold text-gray-900">{monthlyOut.toLocaleString()} FG</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-gray-900">{viewMode === 'transactions' ? 'Flux de Trésorerie' : 'Suivi des Paiements par Classe'}</h2>
                <button
                    onClick={() => setViewMode(viewMode === 'transactions' ? 'reports' : 'transactions')}
                    className="btn-primary flex items-center gap-2"
                >
                    {viewMode === 'transactions' ? 'Voir le Suivi par Classe' : 'Retour aux Transactions'}
                </button>
            </div>

            {viewMode === 'transactions' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between no-print mb-4">
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('ALL')}
                            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            TOUTES
                        </button>
                        <button
                            onClick={() => setActiveTab('IN')}
                            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'IN' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            PAIEMENTS (ENTRÉES)
                        </button>
                        <button
                            onClick={() => setActiveTab('OUT')}
                            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${activeTab === 'OUT' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            SORTIES D'ARGENT
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 hidden">
                            <Filter size={18} />
                            Filtrer
                        </button>
                        <button
                            onClick={() => setPrintPreview('Journal de caisse')}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors shadow-lg shadow-gray-900/10"
                        >
                            <Printer size={18} />
                            Imprimer
                        </button>
                        <button
                            onClick={() => setIsGeneralModalOpen(true)}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-200"
                        >
                            <Plus size={18} />
                            Nouveau Mouvement
                        </button>
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Encaisser Scolarité
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto" onClick={() => setOpenMenuId(null)}>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Type</th>
                                <th className="px-6 py-4 font-semibold">Raison / Référence</th>
                                <th className="px-6 py-4 font-semibold text-right">Montant</th>
                                <th className="px-4 py-4 font-semibold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Chargement...</td></tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">Aucune transaction trouvée pour cet onglet.</td></tr>
                            ) : filteredTransactions.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] px-2 py-1 rounded-full ${t.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {t.type === 'IN' ? 'Entrée' : 'Sortie'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 font-medium">
                        <div>{t.student_first_name ? <span className="text-xs font-bold text-indigo-600 mr-2">👤 {t.student_first_name} {t.student_last_name}</span> : null}</div>
                        <span className="text-gray-500">{t.reason}</span>
                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${t.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.type === 'IN' ? '+' : '-'}{t.amount.toLocaleString()} FG
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                            >
                                                <MoreVertical size={16} />
                                            </button>
                                            {openMenuId === t.id && (
                                                <div className="absolute right-0 top-9 z-30 bg-white border border-gray-200 rounded-xl shadow-xl w-44 py-1 animate-in fade-in zoom-in-95 duration-100">
                                                    <button
                                                        onClick={() => { setViewTx(t); setOpenMenuId(null) }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Eye size={15} className="text-blue-500" /> Voir les détails
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditTx({ ...t }); setOpenMenuId(null) }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Pencil size={15} className="text-amber-500" /> Modifier
                                                    </button>
                                                    <button
                                                        onClick={() => { setPrintTx(t); setOpenMenuId(null) }}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                    >
                                                        <Printer size={15} className="text-green-600" /> Imprimer le reçu
                                                    </button>
                                                    <div className="my-1 border-t border-gray-100" />
                                                    <button
                                                        onClick={() => handleDeleteTx(t.id)}
                                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 size={15} /> Supprimer
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* Class Payment Report Section */}
            {viewMode === 'reports' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between no-print">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Suivi des Paiements par Classe</h3>
                        <p className="text-xs text-gray-500">Consultez l'état des paiements pour un mois donné</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <select
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary"
                            value={reportConfig.classId}
                            onChange={e => setReportConfig({ ...reportConfig, classId: e.target.value })}
                        >
                            <option value="">Sélectionner une classe...</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <select
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary"
                            value={reportFilter}
                            onChange={e => setReportFilter(e.target.value as any)}
                        >
                            <option value="ALL">Tous les élèves</option>
                            <option value="PAID">Ont Payé (À jour)</option>
                            <option value="UNPAID">N'ont Pas Payé</option>
                        </select>
                        <select
                            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-primary"
                            value={reportConfig.month}
                            onChange={e => setReportConfig({ ...reportConfig, month: e.target.value })}
                        >
                            {ALL_MONTHS.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => setPrintPreview('Rapport de paiements')}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
                        >
                            <Printer size={18} />
                            Imprimer le Rapport
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Élève</th>
                                <th className="px-6 py-4 font-semibold">Contact Parent</th>
                                <th className="px-6 py-4 font-semibold">Statut ({reportConfig.month})</th>
                                <th className="px-6 py-4 font-semibold text-right">Montant Payé</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {isReportLoading ? (
                                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">Chargement du rapport...</td></tr>
                            ) : !reportConfig.classId ? (
                                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">Veuillez sélectionner une classe pour générer le rapport.</td></tr>
                            ) : filteredReportData.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">Aucun élève trouvé pour ces filtres.</td></tr>
                            ) : filteredReportData.map((s) => (
                                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-900 font-bold">
                                        {s.first_name} {s.last_name}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{s.parent_phone || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] px-2 py-1 rounded-full ${s.has_paid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {s.has_paid ? 'Payé' : 'Non Payé'}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-bold ${s.has_paid ? 'text-green-600' : 'text-gray-400'}`}>
                                        {s.payment_amount.toLocaleString()} FG
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <FullPageView title="ENCAISSER UN PAIEMENT" onBack={() => setIsPaymentModalOpen(false)}>
                    <form onSubmit={handleSavePayment}>
                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Année scolaire</SectionTitle>
                            <select className={formInputCls} value={selectedYear} onChange={e => setSelectedYear(e.target.value)} required>
                                <option value="">Sélectionner l'année...</option>
                                {schoolYears.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Élève</SectionTitle>
                            <div style={{ position: 'relative' }}>
                                <input type="text" className={formInputCls} placeholder="Rechercher par nom, prénom ou téléphone parent..." value={searchTerm} onChange={e => handleSearch(e.target.value)} />
                                {searchResults.length > 0 && (
                                    <div style={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', maxHeight: 200, overflowY: 'auto' }}>
                                        {searchResults.map(s => (
                                            <button key={s.id} type="button" onClick={() => handleSelectStudent(s)} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid #f3f4f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}
                                                onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                                                <span style={{ fontWeight: 500, color: '#111827' }}>{s.first_name} {s.last_name}</span>
                                                <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>{s.class_name} — {s.parent_phone}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {selectedStudent && (
                                <div style={{ marginTop: 12, padding: '10px 14px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13 }}>
                                    <strong>{selectedStudent.first_name} {selectedStudent.last_name}</strong>
                                    <span style={{ marginLeft: 8, color: '#6b7280' }}>{selectedStudent.class_name} · {selectedStudent.matricule}</span>
                                    {studentBalance && (
                                        <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 12 }}>
                                            <span>Dû : <strong>{studentBalance.tuitionFee?.toLocaleString()} FG</strong></span>
                                            <span style={{ color: '#16a34a' }}>Payé : <strong>{studentBalance.totalPaid?.toLocaleString()} FG</strong></span>
                                            <span style={{ color: '#dc2626' }}>Reste : <strong>{studentBalance.balance?.toLocaleString()} FG</strong></span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Mois concernés</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                {ALL_MONTHS.map(month => {
                                    const paid = studentBalance?.paidMonths?.includes(month)
                                    const selected = selectedMonths.includes(month)
                                    return (
                                        <button key={month} type="button" onClick={() => !paid && toggleMonth(month)} disabled={paid}
                                            style={{ padding: '7px 4px', borderRadius: 6, fontSize: 12, fontWeight: 500, border: `1px solid ${paid ? '#16a34a' : selected ? '#2563eb' : '#e5e7eb'}`, background: paid ? '#dcfce7' : selected ? '#eff6ff' : '#fff', color: paid ? '#16a34a' : selected ? '#2563eb' : '#374151', cursor: paid ? 'default' : 'pointer' }}>
                                            {month}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Paiement</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                                <div>
                                    <label className={formLabelCls}>Montant (GNF)</label>
                                    <input type="number" required className={formInputCls} value={paymentData.amount} onChange={e => setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className={formLabelCls}>Mode de règlement</label>
                                    <select className={formInputCls} value={paymentData.method} onChange={e => setPaymentData({ ...paymentData, method: e.target.value })}>
                                        <option value="Espèces">Espèces</option>
                                        <option value="Chèque">Chèque</option>
                                        <option value="Virement">Virement</option>
                                        <option value="Mobile Money">Mobile Money</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <label className={formLabelCls}>Commentaire</label>
                                    <input type="text" className={formInputCls} placeholder="ex: Frais d'inscription, Novembre..." value={paymentData.description} onChange={e => setPaymentData({ ...paymentData, description: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                            <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="px-5 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Annuler</button>
                            <button type="submit" disabled={!selectedStudent || paymentData.amount <= 0} className="btn-primary disabled:opacity-50">Enregistrer le paiement</button>
                        </div>
                    </form>
                </FullPageView>
            )}

            {/* Modal Voir */}
            {viewTx && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewTx(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900">Détails de la transaction</h3>
                            <button onClick={() => setViewTx(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                        </div>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500 font-medium">Référence</span>
                                <span className="font-mono font-bold">TX-{viewTx.id}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500 font-medium">Date</span>
                                <span className="font-bold">{new Date(viewTx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500 font-medium">Type</span>
                                <span className={`font-bold ${viewTx.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>{viewTx.type === 'IN' ? 'Entrée' : 'Sortie'}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-500 font-medium">Raison</span>
                                <span className="font-bold text-right max-w-xs">{viewTx.reason}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-500 font-medium">Montant</span>
                                <span className={`font-bold text-lg ${viewTx.type === 'IN' ? 'text-green-600' : 'text-red-600'}`}>{viewTx.type === 'IN' ? '+' : '-'}{viewTx.amount.toLocaleString()} FG</span>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => { setPrintTx(viewTx); setViewTx(null) }} className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#1a2f6e] text-white rounded-xl font-bold text-sm">
                                <Printer size={14} /> Imprimer
                            </button>
                            <button onClick={() => setViewTx(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Fermer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Modifier */}
            {editTx && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditTx(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-gray-900">Modifier la transaction</h3>
                            <button onClick={() => setEditTx(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                        </div>
                        <form onSubmit={handleEditTxSave} className="space-y-4">
                            <div>
                                <label className={formLabelCls}>Raison / Motif</label>
                                <input type="text" required className={formInputCls} value={editTx.reason} onChange={e => setEditTx({ ...editTx, reason: e.target.value })} />
                            </div>
                            <div>
                                <label className={formLabelCls}>Montant (FG)</label>
                                <input type="number" required className={formInputCls} value={editTx.amount} onChange={e => setEditTx({ ...editTx, amount: parseFloat(e.target.value) })} />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="flex-1 py-2 bg-[#1a2f6e] text-white rounded-xl font-bold text-sm">Enregistrer</button>
                                <button type="button" onClick={() => setEditTx(null)} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm">Annuler</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Impression reçu transaction */}
            {printTx && (() => {
                const yearName = schoolYears.find((y: any) => y.id.toString() === selectedYear)?.name || selectedYear
                const isStudentPayment = !!printTx.student_first_name

                if (isStudentPayment) {
                    const months = (() => {
                        try { return printTx.payment_months ? JSON.parse(printTx.payment_months) : [] }
                        catch { return [] }
                    })()
                    const ref = `PAY-${printTx.reference_id?.slice(-8) || printTx.id.slice(-8)}`
                    return (
                        <PrintPreview
                            title={`Reçu — ${printTx.student_first_name} ${printTx.student_last_name} — ${ref}`}
                            onClose={() => setPrintTx(null)}
                        >
                            <SchoolPaymentReceiptPrint
                                student={{
                                    first_name:   printTx.student_first_name,
                                    last_name:    printTx.student_last_name,
                                    class_name:   printTx.student_class_name,
                                    matricule:    printTx.student_matricule,
                                    parent_phone: printTx.student_parent_phone,
                                }}
                                payment={{
                                    amount:      printTx.amount,
                                    method:      printTx.payment_method || 'Espèces',
                                    description: printTx.payment_description,
                                    months,
                                }}
                                schoolYear={yearName}
                                reference={ref}
                                date={new Date(printTx.date)}
                            />
                        </PrintPreview>
                    )
                }

                return (
                    <PrintPreview
                        title={`Reçu — TX-${printTx.id} — ${new Date(printTx.date).toLocaleDateString('fr-FR')}`}
                        onClose={() => setPrintTx(null)}
                    >
                        <TransactionSlipPrint
                            transaction={printTx}
                            schoolYear={yearName}
                        />
                    </PrintPreview>
                )
            })()}

            {/* Reçu de paiement scolaire */}
            {receiptData && (
                <PrintPreview
                    title={`Reçu — ${receiptData.student.first_name} ${receiptData.student.last_name} — ${receiptData.reference}`}
                    onClose={() => setReceiptData(null)}
                >
                    <SchoolPaymentReceiptPrint
                        student={receiptData.student}
                        payment={receiptData.payment}
                        schoolYear={receiptData.schoolYear}
                        reference={receiptData.reference}
                        date={receiptData.date}
                    />
                </PrintPreview>
            )}

            {/* General Transaction Full Page */}
            {isGeneralModalOpen && (
                <FullPageView title="NOUVEAU MOUVEMENT DE CAISSE" onBack={() => setIsGeneralModalOpen(false)} maxWidth={520}>
                    <form onSubmit={handleSaveGeneral}>
                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Type de mouvement</SectionTitle>
                            <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                                <button type="button" onClick={() => setGeneralData({ ...generalData, type: 'IN' })}
                                    style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, background: generalData.type === 'IN' ? '#dcfce7' : '#fff', color: generalData.type === 'IN' ? '#16a34a' : '#6b7280', border: 'none', cursor: 'pointer', borderRight: '1px solid #e5e7eb' }}>
                                    + ENTRÉE
                                </button>
                                <button type="button" onClick={() => setGeneralData({ ...generalData, type: 'OUT' })}
                                    style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 600, background: generalData.type === 'OUT' ? '#fee2e2' : '#fff', color: generalData.type === 'OUT' ? '#dc2626' : '#6b7280', border: 'none', cursor: 'pointer' }}>
                                    − SORTIE
                                </button>
                            </div>
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Détails</SectionTitle>
                            <div style={{ display: 'grid', gap: 16 }}>
                                <div>
                                    <label className={formLabelCls}>Montant (GNF)</label>
                                    <input type="number" required className={formInputCls} value={generalData.amount} onChange={e => setGeneralData({ ...generalData, amount: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label className={formLabelCls}>Raison / Motif</label>
                                    <textarea required className={formInputCls} rows={3} placeholder="ex: Achat de fournitures..." value={generalData.reason} onChange={e => setGeneralData({ ...generalData, reason: e.target.value })} style={{ resize: 'none' }} />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                            <button type="button" onClick={() => setIsGeneralModalOpen(false)} className="px-5 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Annuler</button>
                            <button type="submit" disabled={generalData.amount <= 0 || !generalData.reason}
                                style={{ padding: '8px 20px', background: generalData.type === 'IN' ? '#16a34a' : '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                                Enregistrer
                            </button>
                        </div>
                    </form>
                </FullPageView>
            )}
        </div>
    );
}
