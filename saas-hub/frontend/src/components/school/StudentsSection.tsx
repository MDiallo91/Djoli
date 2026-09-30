import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, Download, Trash2, Eye, Edit2, Users, UserRound, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import StudentModal from './StudentModal';
import { Card, Button, Input, Select, IconButton, Spinner, EmptyState, confirmDialog } from '../../ui/design_system';

const ITEMS_PER_PAGE = 10;

interface Props { onOpenBulletin: (student: any) => void }

export default function StudentsSection({ onOpenBulletin }: Props) {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses]   = useState<any[]>([]);
  const [years, setYears]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedYear, setSelectedYear]   = useState('');
  const [search, setSearch]               = useState('');
  const [page, setPage]                   = useState(1);

  const [viewStudent, setViewStudent] = useState<any>(null);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [showModal, setShowModal]     = useState(false);

  const loadMeta = useCallback(async () => {
    const [cls, yrs] = await Promise.all([api.getClasses(), api.getSchoolYears()]);
    setClasses(cls);
    setYears(yrs);
    const active = yrs.find((y: any) => y.is_active == 1 || y.is_active === true) || yrs[0];
    if (active) setSelectedYear(String(active.id));
  }, []);

  const loadStudents = useCallback(async (yearId?: string) => {
    setLoading(true);
    try {
      const res = await api.getStudents(yearId);
      setStudents(Array.isArray(res) ? res : res.students ?? []);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { if (selectedYear) loadStudents(selectedYear); }, [selectedYear, loadStudents]);

  const handleDelete = async (id: string) => {
    if (!(await confirmDialog({ message: 'Supprimer cet élève ?', variant: 'danger' }))) return;
    try { await api.deleteStudent(id); setStudents(p => p.filter(s => s.id !== id)); toast.success('Élève supprimé'); }
    catch { toast.error('Erreur'); }
  };

  const filtered = students.filter(s => {
    const matchClass = selectedClass === 'all' || s.class_id?.toString() === selectedClass;
    const q = search.toLowerCase();
    const matchSearch = !q || (s.first_name + ' ' + s.last_name).toLowerCase().includes(q) || (s.matricule || '').toLowerCase().includes(q);
    return matchClass && matchSearch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
  const stats = { total: filtered.length, girls: filtered.filter(s => s.gender === 'F').length, boys: filtered.filter(s => s.gender === 'M').length };

  useEffect(() => { setPage(1); }, [selectedClass, search, selectedYear]);
  const openEdit = (s: any) => { setEditStudent(s); setShowModal(true); };
  const openAdd  = () => { setEditStudent(null); setShowModal(true); };

  const activeYear = years.find(y => String(y.id) === selectedYear);

  return (
    <div className="space-y-0 animate-in">
      <Card padding="none" className="overflow-hidden">

        {/* ─── Header ─── */}
        <div className="px-6 pt-6 pb-0 border-b border-gray-100">
          {/* Top row */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-5">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #7c3aed)', boxShadow: '0 3px 10px rgba(37,99,235,0.3)' }}>
                  <Users size={17} className="text-white" />
                </div>
                <h2 className="text-xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                  Registre des Élèves
                </h2>
              </div>
              {activeYear && (
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 ml-12">
                  {activeYear.name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" size="sm" leftIcon={<Download size={13} />}>Exporter</Button>
              <Button variant="primary" leftIcon={<UserPlus size={14} />} onClick={openAdd}>Inscrire un élève</Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-3 pb-4 flex-wrap">
            {[
              { icon: <Users size={13} />, label: 'Total', value: stats.total, color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: <UserRound size={13} />, label: 'Garçons', value: stats.boys, color: 'text-blue-500', bg: 'bg-blue-50' },
              { icon: <UserRound size={13} />, label: 'Filles', value: stats.girls, color: 'text-pink-500', bg: 'bg-pink-50' },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-1.5 px-3 py-1.5 ${s.bg} rounded-lg`}>
                <span className={s.color}>{s.icon}</span>
                <span className="text-[11px] font-bold text-gray-500">{s.label}</span>
                <span className={`text-[13px] font-black ${s.color}`}>{loading ? '–' : s.value}</span>
              </div>
            ))}
            {selectedClass !== 'all' && (
              <span className="badge badge-indigo">
                {classes.find(c => c.id?.toString() === selectedClass)?.name}
              </span>
            )}
          </div>

          {/* Filtres */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pb-4">
            <div className="md:col-span-2">
              <Input
                type="text" placeholder="Rechercher par nom, prénom ou matricule…" value={search}
                onChange={e => setSearch(e.target.value)} leftIcon={<Search size={15} />}
              />
            </div>
            <Select
              value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              options={[{ value: 'all', label: 'Toutes les classes' }, ...classes.map(c => ({ value: c.id, label: c.name }))]}
            />
            <Select
              value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
              options={years.map(y => ({ value: y.id, label: `${y.name}${(y.is_active == 1 || y.is_active) ? ' ✦' : ''}` }))}
            />
          </div>
        </div>

        {/* ─── Table ─── */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <Spinner size="2xl" color="blue" className="mx-auto" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Chargement…</p>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Users size={28} />}
              message="Aucun élève trouvé"
              hint={search ? 'Essayez avec un autre terme de recherche.' : 'Commencez par inscrire un élève.'}
              action={<Button variant="primary" leftIcon={<UserPlus size={14} />} onClick={openAdd}>Inscrire un élève</Button>}
            />
          ) : (
            <>
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 border border-gray-200 w-10 text-center">#</th>
                    <th className="px-3 py-2 border border-gray-200">Nom</th>
                    <th className="px-3 py-2 border border-gray-200">Matricule</th>
                    <th className="px-3 py-2 border border-gray-200 hidden md:table-cell">Sexe</th>
                    <th className="px-3 py-2 border border-gray-200 hidden lg:table-cell">Père</th>
                    <th className="px-3 py-2 border border-gray-200 hidden lg:table-cell">Mère</th>
                    <th className="px-3 py-2 border border-gray-200">Classe</th>
                    <th className="px-3 py-2 border border-gray-200 hidden xl:table-cell">Naissance</th>
                    <th className="px-3 py-2 border border-gray-200 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-200 text-center text-gray-400">
                        {(page - 1) * ITEMS_PER_PAGE + i + 1}
                      </td>
                      <td className="px-3 py-2 border border-gray-200 font-medium text-gray-900">
                        {s.first_name} {s.last_name}
                      </td>
                      <td className="px-3 py-2 border border-gray-200 text-gray-600">{s.matricule || '—'}</td>
                      <td className="px-3 py-2 border border-gray-200 hidden md:table-cell text-gray-600">{s.gender || '—'}</td>
                      <td className="px-3 py-2 border border-gray-200 hidden lg:table-cell text-gray-600">{s.pere || '—'}</td>
                      <td className="px-3 py-2 border border-gray-200 hidden lg:table-cell text-gray-600">{s.mere || '—'}</td>
                      <td className="px-3 py-2 border border-gray-200 text-gray-600">{s.class_name || '—'}</td>
                      <td className="px-3 py-2 border border-gray-200 hidden xl:table-cell text-gray-600">{s.birth_date || '—'}</td>
                      <td className="px-3 py-2 border border-gray-200">
                        <div className="flex items-center justify-center gap-1">
                          <IconButton icon={<Eye size={14} />} label="Voir la fiche" size="sm" onClick={() => setViewStudent(s)} />
                          <IconButton icon={<FileText size={14} />} label="Bulletin" size="sm" onClick={() => onOpenBulletin(s)} />
                          <IconButton icon={<Edit2 size={14} />} label="Modifier" size="sm" onClick={() => openEdit(s)} />
                          <IconButton icon={<Trash2 size={14} />} label="Supprimer" size="sm" variant="danger" onClick={() => handleDelete(s.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50 bg-gray-50/50">
                  <p className="text-[11px] font-semibold text-gray-400">
                    <span className="text-gray-700 font-black">{(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)}</span>
                    {' '}sur {filtered.length} élèves
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">
                      <ChevronLeft size={14} /> Préc.
                    </button>
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${p === page ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                          style={p === page ? { background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' } : {}}>
                          {p}
                        </button>
                      );
                    })}
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">
                      Suiv. <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* ─── Panneau détail élève ─── */}
      {viewStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-end"
          onClick={() => setViewStudent(null)}>
          <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto slide-in-right"
            onClick={e => e.stopPropagation()}>
            {/* Header panel */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <p className="section-label">Fiche Élève</p>
              <IconButton label="Fermer" size="lg" onClick={() => setViewStudent(null)} />
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar + nom */}
              {(() => {
                const name = `${viewStudent.first_name} ${viewStudent.last_name}`;
                const ini = `${viewStudent.first_name?.[0] ?? ''}${viewStudent.last_name?.[0] ?? ''}`.toUpperCase();
                return (
                  <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                    {viewStudent.photo_url ? (
                      <img src={viewStudent.photo_url} alt={name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0 bg-gray-100 text-gray-500">
                        {ini}
                      </div>
                    )}
                    <div>
                      <p className="section-label mb-1">{viewStudent.matricule || 'Sans matricule'}</p>
                      <h3 className="text-xl font-black text-gray-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {viewStudent.first_name} {viewStudent.last_name}
                      </h3>
                      {viewStudent.class_name && (
                        <span className="badge badge-indigo mt-1">{viewStudent.class_name}</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {[
                { title: 'Informations personnelles', fields: [
                  { l: 'Sexe', v: viewStudent.gender === 'M' ? 'Masculin' : 'Féminin' },
                  { l: 'Date de naissance', v: viewStudent.birth_date },
                  { l: 'Adresse', v: viewStudent.address },
                  { l: 'Téléphone', v: viewStudent.phone },
                  { l: 'Père', v: viewStudent.pere },
                  { l: 'Mère', v: viewStudent.mere },
                ]},
                { title: 'Tuteur / Parent', fields: [
                  { l: 'Nom complet', v: [viewStudent.parent_first_name, viewStudent.parent_last_name].filter(Boolean).join(' ') || null },
                  { l: 'Téléphone', v: viewStudent.parent_phone || viewStudent.phone },
                  { l: 'Email', v: viewStudent.parent_email },
                  { l: 'Profession', v: viewStudent.parent_profession },
                ]},
                { title: 'Scolarité', fields: [
                  { l: 'Classe', v: viewStudent.class_name },
                  { l: 'Année scolaire', v: years.find(y => String(y.id) === selectedYear)?.name },
                ]},
              ].map(sec => (
                <div key={sec.title}>
                  <p className="section-label mb-3 pb-2 border-b border-gray-50">{sec.title}</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {sec.fields.map(f => f.v ? (
                      <div key={f.l}>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">{f.l}</p>
                        <p className="font-semibold text-gray-900 text-sm">{f.v}</p>
                      </div>
                    ) : null)}
                  </div>
                </div>
              ))}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" fullWidth leftIcon={<Edit2 size={14} />} onClick={() => { openEdit(viewStudent); setViewStudent(null); }}>
                  Modifier
                </Button>
                <Button variant="primary" fullWidth leftIcon={<FileText size={14} />} onClick={() => { onOpenBulletin(viewStudent); setViewStudent(null); }}>
                  Bulletin
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal ajout/édition ─── */}
      {showModal && (
        <StudentModal
          student={editStudent}
          classes={classes}
          years={years}
          activeYearId={selectedYear}
          onClose={() => { setShowModal(false); setEditStudent(null); }}
          onSaved={() => { setShowModal(false); setEditStudent(null); loadStudents(selectedYear); }}
        />
      )}
    </div>
  );
}
