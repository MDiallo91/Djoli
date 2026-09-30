import { useState, useEffect } from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Plus, Filter, Search, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import { Card, Tabs, Select, Input, Textarea, Button, Modal, EmptyState, Spinner, Checkbox, confirmDialog } from '../../ui/design_system';

const ALL_MONTHS = ['Septembre','Octobre','Novembre','Décembre','Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août'];
const METHODS    = ['Espèces','Chèque','Virement','Mobile Money'];

const fmt = (n: number) => new Intl.NumberFormat('fr-FR').format(n) + ' GNF';

export default function FinanceSection() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [years, setYears]               = useState<any[]>([]);
  const [classes, setClasses]           = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);

  const [selectedYear, setSelectedYear] = useState('');
  const [activeTab, setActiveTab]       = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [viewMode, setViewMode]         = useState<'transactions' | 'reports'>('transactions');
  const [searchTerm, setSearchTerm]     = useState('');

  const [isPaymentOpen, setIsPaymentOpen]   = useState(false);
  const [isGeneralOpen, setIsGeneralOpen]   = useState(false);
  const [openMenuId, setOpenMenuId]         = useState<any>(null);

  // Payment form
  const [studentSearch, setStudentSearch]   = useState('');
  const [searchResults, setSearchResults]   = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [paymentData, setPaymentData]       = useState({ amount: 0, method: 'Espèces', description: '' });

  // General transaction form
  const [generalData, setGeneralData] = useState({ type: 'OUT' as 'IN' | 'OUT', amount: 0, reason: '' });

  // Reports
  const [reportConfig, setReportConfig] = useState({ classId: '', month: ALL_MONTHS[0] });
  const [reportData, setReportData]     = useState<any[]>([]);
  const [reportFilter, setReportFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL');
  const [loadingReport, setLoadingReport] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [yrs, cls] = await Promise.all([api.getSchoolYears(), api.getClasses()]);
      setYears(yrs); setClasses(cls);
      const active = yrs.find((y: any) => y.is_active == 1 || y.is_active === true);
      const id = active?.id?.toString() ?? yrs[0]?.id?.toString() ?? '';
      setSelectedYear(id);
      const txs = await api.getTransactions(id || undefined);
      setTransactions(txs);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!selectedYear) return;
    api.getTransactions(selectedYear).then(setTransactions).catch(() => {});
  }, [selectedYear]);

  const handleSearch = async (term: string) => {
    setStudentSearch(term);
    if (term.length < 2) { setSearchResults([]); return; }
    const res = await api.getStudentsDetailed();
    setSearchResults((res.students || []).filter((s: any) =>
      (s.first_name + ' ' + s.last_name).toLowerCase().includes(term.toLowerCase())
    ).slice(0, 6));
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) { toast.error('Sélectionnez un élève'); return; }
    try {
      await api.createPayment({
        student_id: selectedStudent.id,
        amount: paymentData.amount,
        method: paymentData.method,
        description: paymentData.description || selectedMonths.join(', '),
        months: selectedMonths,
        school_year_id: selectedYear,
      });
      toast.success('Paiement enregistré');
      setIsPaymentOpen(false);
      setSelectedStudent(null); setStudentSearch(''); setSelectedMonths([]); setPaymentData({ amount: 0, method: 'Espèces', description: '' });
      if (selectedYear) { const txs = await api.getTransactions(selectedYear); setTransactions(txs); }
    } catch { toast.error('Erreur'); }
  };

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createTransaction({ ...generalData, school_year_id: selectedYear });
      toast.success('Transaction enregistrée');
      setIsGeneralOpen(false);
      setGeneralData({ type: 'OUT', amount: 0, reason: '' });
      if (selectedYear) { const txs = await api.getTransactions(selectedYear); setTransactions(txs); }
    } catch (err: any) {
      // ex. sortie supérieure au solde de caisse de l'année
      toast.error(err?.response?.data?.error || "Impossible d'enregistrer la transaction");
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ message: 'Supprimer cette transaction ?', variant: 'danger' }))) return;
    try { await api.deleteTransaction(id); setTransactions(p => p.filter(t => t.id !== id)); toast.success('Supprimé'); }
    catch { toast.error('Erreur'); }
    setOpenMenuId(null);
  };

  const filtered = transactions.filter(tx => {
    const matchTab = activeTab === 'ALL' || tx.type === activeTab;
    const q = searchTerm.toLowerCase();
    const matchSearch = !q || (tx.reason || '').toLowerCase().includes(q) || (tx.student_name || '').toLowerCase().includes(q);
    return matchTab && matchSearch;
  });

  const totalIn  = transactions.filter(t => t.type === 'IN').reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = transactions.filter(t => t.type === 'OUT').reduce((s, t) => s + (t.amount || 0), 0);
  const balance  = totalIn - totalOut;

  const generateReport = async () => {
    if (!reportConfig.classId) return;
    setLoadingReport(true);
    try {
      const data = await api.getStudentsDetailed(selectedYear);
      const students = (data.students || []).filter((s: any) => s.class_id?.toString() === reportConfig.classId);
      setReportData(students);
    } finally { setLoadingReport(false); }
  };

  useEffect(() => { if (reportConfig.classId) generateReport(); }, [reportConfig.classId, reportConfig.month, selectedYear]);

  const reportFiltered = reportData.filter(s => {
    if (reportFilter === 'PAID') return s.has_paid;
    if (reportFilter === 'UNPAID') return !s.has_paid;
    return true;
  });

  return (
    <div className="space-y-5 animate-in">
      {/* ─── KPI bar ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Encaissé', sub: 'Entrées cumulées', value: fmt(totalIn),  icon: ArrowUpCircle,   iconBg: 'linear-gradient(135deg,#059669,#34d399)', shadow: 'rgba(5,150,105,0.3)' },
          { label: 'Total Dépensé',  sub: 'Sorties cumulées', value: fmt(totalOut), icon: ArrowDownCircle, iconBg: 'linear-gradient(135deg,#dc2626,#f87171)', shadow: 'rgba(220,38,38,0.3)' },
          { label: 'Solde Net',      sub: balance >= 0 ? 'Bilan positif' : 'Bilan déficitaire', value: fmt(balance), icon: Wallet,
            iconBg: balance >= 0 ? 'linear-gradient(135deg,#2563eb,#60a5fa)' : 'linear-gradient(135deg,#dc2626,#f87171)',
            shadow: balance >= 0 ? 'rgba(37,99,235,0.3)' : 'rgba(220,38,38,0.3)' },
        ].map(k => (
          <Card key={k.label} hover className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background: k.iconBg, boxShadow: `0 4px 12px ${k.shadow}` }}>
              <k.icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{k.label}</p>
              <p className="text-lg font-black text-gray-900 truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{k.value}</p>
              <p className="text-[10px] text-gray-400 font-medium mt-0.5">{k.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ─── Header + mode toggle ─── */}
      <Card padding="sm" className="lg:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Tabs
              options={[{ value: 'transactions', label: 'Transactions' }, { value: 'reports', label: 'Rapports' }]}
              value={viewMode}
              onChange={setViewMode}
              activeClassName="bg-white text-blue-600 shadow-sm"
            />
            <Select
              value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              options={years.map(y => ({ value: y.id, label: `${y.name}${y.is_active ? ' ✓' : ''}` }))}
            />
          </div>
          {viewMode === 'transactions' && (
            <div className="flex gap-2">
              <Button variant="primary" size="sm" leftIcon={<Plus size={15} />} onClick={() => setIsPaymentOpen(true)}>
                <span className="hidden xs:inline">Paiement</span> élève
              </Button>
              <button onClick={() => setIsGeneralOpen(true)}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-black transition-all">
                <Plus size={15} /> Caisse
              </button>
            </div>
          )}
        </div>
      </Card>

      {viewMode === 'transactions' ? (
        <Card padding="none" className="overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Tabs
              options={[{ value: 'ALL', label: 'Tout' }, { value: 'IN', label: 'Entrées' }, { value: 'OUT', label: 'Sorties' }]}
              value={activeTab}
              onChange={setActiveTab}
            />
            <div className="w-full sm:w-52">
              <Input type="text" placeholder="Rechercher…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} leftIcon={<Search size={15} />} />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 text-center">
                <Spinner size="2xl" color="blue" className="mx-auto" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={<Wallet size={24} />} message="Aucune transaction" />
            ) : (
              <>
              <div className="sm:hidden divide-y divide-gray-50">
                {filtered.map(tx => (
                  <div key={tx.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'IN' ? 'bg-secondary-50' : 'bg-red-50'}`}>
                      {tx.type === 'IN' ? <ArrowUpCircle size={18} className="text-secondary-600" /> : <ArrowDownCircle size={18} className="text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{tx.description || tx.reason || '—'}</p>
                      <p className="text-[11px] text-gray-400">{tx.created_at ? new Date(tx.created_at).toLocaleDateString('fr-FR') : '—'}{tx.student_name ? ` · ${tx.student_name}` : ''}</p>
                    </div>
                    <p className={`font-black text-sm flex-shrink-0 ${tx.type === 'IN' ? 'text-secondary-600' : 'text-red-600'}`}>
                      {tx.type === 'IN' ? '+' : '−'}{fmt(tx.amount || 0)}
                    </p>
                  </div>
                ))}
              </div>
              {/* ─── Desktop : table ─── */}
              <table className="hidden sm:table w-full text-left">
                <thead>
                  <tr style={{ background: 'linear-gradient(to right,#f8fafc,#f1f5f9)' }}>
                    <th className="th-desktop">Date</th>
                    <th className="th-desktop">Description</th>
                    <th className="th-desktop hidden md:table-cell">Élève / Motif</th>
                    <th className="th-desktop">Type</th>
                    <th className="th-desktop text-right">Montant</th>
                    <th className="th-desktop text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-4 py-3.5 text-xs text-gray-500 font-bold whitespace-nowrap">
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-bold text-gray-800 max-w-[160px] truncate">{tx.description || tx.reason || '—'}</td>
                      <td className="px-4 py-3.5 text-sm text-gray-600 hidden md:table-cell">{tx.student_name || tx.reason || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${tx.type === 'IN' ? 'bg-secondary-50 text-secondary-700' : 'bg-red-50 text-red-600'}`}>
                          {tx.type === 'IN' ? <ArrowUpCircle size={9} /> : <ArrowDownCircle size={9} />}
                          {tx.type === 'IN' ? 'Entrée' : 'Sortie'}
                        </span>
                      </td>
                      <td className={`px-4 py-3.5 text-right font-black text-sm ${tx.type === 'IN' ? 'text-secondary-600' : 'text-red-600'}`}>
                        {tx.type === 'IN' ? '+' : '−'}{fmt(tx.amount || 0)}
                      </td>
                      <td className="px-4 py-3.5 text-center relative">
                        <button onClick={() => setOpenMenuId(openMenuId === tx.id ? null : tx.id)}
                          className="p-1.5 text-gray-300 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
                          <MoreVertical size={15} />
                        </button>
                        {openMenuId === tx.id && (
                          <div className="absolute right-4 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                            <button onClick={() => handleDelete(tx.id)}
                              className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-red-50 text-red-600 text-sm transition-colors">
                              <Trash2 size={14} /> Supprimer
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </>
            )}
          </div>
        </Card>
      ) : (
        /* ─── Rapports ─── */
        <Card padding="none" className="overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <Select
                value={reportConfig.classId} onChange={e => setReportConfig(p => ({ ...p, classId: e.target.value }))}
                options={[{ value: '', label: 'Sélectionner une classe' }, ...classes.map(c => ({ value: c.id, label: c.name }))]}
              />
              <Select
                value={reportConfig.month} onChange={e => setReportConfig(p => ({ ...p, month: e.target.value }))}
                options={ALL_MONTHS.map(m => ({ value: m, label: m }))}
              />
            </div>
            <Tabs
              size="sm"
              options={[{ value: 'ALL', label: 'Tous' }, { value: 'PAID', label: 'Payé' }, { value: 'UNPAID', label: 'Non payé' }]}
              value={reportFilter}
              onChange={setReportFilter}
            />
          </div>
          <div className="overflow-x-auto p-2">
            {loadingReport ? (
              <div className="py-16 flex justify-center">
                <Spinner size="xl" color="blue" />
              </div>
            ) : reportFiltered.length === 0 ? (
              <EmptyState message="Sélectionnez une classe" />
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="th-desktop">N°</th>
                    <th className="th-desktop">Élève</th>
                    <th className="th-desktop">Classe</th>
                    <th className="th-desktop text-center">Statut {reportConfig.month}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportFiltered.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-xs font-black text-gray-400">{i + 1}</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{s.first_name} {s.last_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{s.class_name || '—'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${s.has_paid ? 'bg-secondary-50 text-secondary-700' : 'bg-amber-50 text-amber-700'}`}>
                          {s.has_paid ? 'Payé' : 'Non payé'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}

      {/* ─── Modal Paiement élève ─── */}
      <Modal open={isPaymentOpen} onClose={() => setIsPaymentOpen(false)} title="Paiement Scolarité">
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          {/* Recherche élève */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Élève</label>
            <div className="relative">
              <Input type="text" placeholder="Rechercher un élève…" value={studentSearch} onChange={e => handleSearch(e.target.value)} />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden">
                  {searchResults.map(s => (
                    <button key={s.id} type="button" onClick={() => { setSelectedStudent(s); setStudentSearch(s.first_name + ' ' + s.last_name); setSearchResults([]); }}
                      className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors border-b last:border-0">
                      <span className="font-bold">{s.first_name} {s.last_name}</span>
                      {s.class_name && <span className="text-gray-400 ml-2 text-xs">· {s.class_name}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Mois */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Mois concernés</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_MONTHS.map(m => (
                <Checkbox
                  key={m} variant="chip" label={m}
                  checked={selectedMonths.includes(m)}
                  onChange={() => setSelectedMonths(p => p.includes(m) ? p.filter(x => x !== m) : [...p, m])}
                />
              ))}
            </div>
          </div>
          <Input
            label="Montant (GNF)" type="number" min="0" required value={paymentData.amount || ''}
            onChange={e => setPaymentData(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
          />
          <Select
            label="Mode de paiement"
            value={paymentData.method} onChange={e => setPaymentData(p => ({ ...p, method: e.target.value }))}
            options={METHODS.map(m => ({ value: m, label: m }))}
          />
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setIsPaymentOpen(false)}>Annuler</Button>
            <Button type="submit" variant="primary" fullWidth>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {/* ─── Modal Caisse ─── */}
      <Modal open={isGeneralOpen} onClose={() => setIsGeneralOpen(false)} title="Transaction de Caisse" size="sm">
        <form onSubmit={handleGeneralSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
            <div className="flex gap-3">
              {(['IN', 'OUT'] as const).map(t => (
                <label key={t} className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer font-bold text-sm transition-all ${generalData.type === t ? (t === 'IN' ? 'border-secondary-500 bg-secondary-50 text-secondary-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-gray-100 text-gray-500'}`}>
                  <input type="radio" name="type" value={t} checked={generalData.type === t}
                    onChange={() => setGeneralData(p => ({ ...p, type: t }))} className="sr-only" />
                  {t === 'IN' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                  {t === 'IN' ? 'Entrée' : 'Sortie'}
                </label>
              ))}
            </div>
          </div>
          <Input
            label="Montant (GNF)" type="number" min="0" required value={generalData.amount || ''}
            onChange={e => setGeneralData(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
          />
          <Textarea
            label="Motif / Description" required value={generalData.reason}
            onChange={e => setGeneralData(p => ({ ...p, reason: e.target.value }))} rows={3}
          />
          <div className="pt-4 flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setIsGeneralOpen(false)}>Annuler</Button>
            <Button type="submit" variant="primary" fullWidth>Enregistrer</Button>
          </div>
        </form>
      </Modal>

      {openMenuId && <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />}
    </div>
  );
}
