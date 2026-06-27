import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, Filter, Calendar, Download, Trash2, Eye, Edit2, Users, UserRound, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import StudentModal from './StudentModal';

const ITEMS_PER_PAGE = 10;

const AVATAR_COLORS = [
  ['#dbeafe','#1d4ed8'], ['#d1fae5','#065f46'], ['#fce7f3','#9d174d'],
  ['#ede9fe','#5b21b6'], ['#fef3c7','#92400e'], ['#fee2e2','#991b1b'],
  ['#e0f2fe','#0369a1'], ['#f0fdf4','#166534'],
];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

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
  const [openMenu, setOpenMenu]       = useState<string | null>(null);
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
    if (!confirm('Supprimer cet élève ?')) return;
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
  const openEdit = (s: any) => { setEditStudent(s); setShowModal(true); setOpenMenu(null); };
  const openAdd  = () => { setEditStudent(null); setShowModal(true); };

  const activeYear = years.find(y => String(y.id) === selectedYear);

  return (
    <div className="space-y-0 animate-in">
      <div className="card-main">

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
              <button className="btn-secondary text-xs py-2 px-3 gap-1.5">
                <Download size={13} /> Exporter
              </button>
              <button onClick={openAdd} className="btn-primary text-sm py-2 px-4 gap-1.5">
                <UserPlus size={14} /> Inscrire un élève
              </button>
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
            <div className="relative md:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input type="text" placeholder="Rechercher par nom, prénom ou matricule…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:bg-white transition-all"
                style={{ ':focus': { boxShadow: '0 0 0 3px rgba(37,99,235,0.1)' } } as any}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-blue-400 transition-all appearance-none">
                <option value="all">Toutes les classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:border-blue-400 transition-all appearance-none">
                {years.map(y => <option key={y.id} value={y.id}>{y.name}{(y.is_active == 1 || y.is_active) ? ' ✦' : ''}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ─── Table ─── */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-10 h-10 border-[3px] border-blue-100 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Chargement…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center px-8">
              <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-dashed border-gray-200">
                <Users className="text-gray-200" size={36} />
              </div>
              <p className="text-gray-800 font-bold text-base mb-1">Aucun élève trouvé</p>
              <p className="text-gray-400 text-sm mb-5">{search ? 'Essayez avec un autre terme de recherche.' : 'Commencez par inscrire un élève.'}</p>
              <button onClick={openAdd} className="btn-primary mx-auto">
                <UserPlus size={14} /> Inscrire un élève
              </button>
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
                    <th className="th-desktop w-12 text-center pl-6">#</th>
                    <th className="th-desktop">Élève</th>
                    <th className="th-desktop">Matricule</th>
                    <th className="th-desktop hidden md:table-cell">Sexe</th>
                    <th className="th-desktop hidden lg:table-cell">Père</th>
                    <th className="th-desktop hidden lg:table-cell">Mère</th>
                    <th className="th-desktop">Classe</th>
                    <th className="th-desktop hidden xl:table-cell">Naissance</th>
                    <th className="th-desktop text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s, i) => {
                    const fullName = `${s.first_name} ${s.last_name}`;
                    const initials = `${s.first_name?.[0] ?? ''}${s.last_name?.[0] ?? ''}`.toUpperCase();
                    const [bg, fg] = avatarColor(fullName);
                    return (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors duration-100 group">
                        <td className="pl-6 pr-2 py-3 text-[11px] font-black text-gray-300 text-center">
                          {(page - 1) * ITEMS_PER_PAGE + i + 1}
                        </td>
                        <td className="px-4 py-3 min-w-[180px]">
                          <div className="flex items-center gap-3">
                            {s.photo_url ? (
                              <img src={s.photo_url} alt={fullName} className="w-8 h-8 rounded-xl object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0"
                                style={{ backgroundColor: bg, color: fg }}>
                                {initials}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-gray-900 text-sm leading-tight">{fullName}</p>
                              {s.phone && <p className="text-[10px] text-gray-400">{s.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="badge badge-blue font-mono text-[10px]">
                            {s.matricule || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`badge ${s.gender === 'M' ? 'badge-blue' : 'badge-pink'}`}>
                            {s.gender === 'M' ? '♂ M' : '♀ F'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                          {s.pere || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">
                          {s.mere || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {s.class_name
                            ? <span className="badge badge-indigo">{s.class_name}</span>
                            : <span className="text-gray-300 text-sm">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 font-medium hidden xl:table-cell">
                          {s.birth_date || <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 pr-6 py-3 text-right relative">
                          <button onClick={() => setOpenMenu(openMenu === s.id ? null : s.id)}
                            className="p-1.5 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-all font-bold text-lg leading-none opacity-0 group-hover:opacity-100">
                            ⋮
                          </button>
                          {openMenu === s.id && (
                            <div className="absolute right-6 top-full mt-1 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden"
                              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
                              <button onClick={() => { setViewStudent(s); setOpenMenu(null); }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors">
                                <Eye size={14} className="text-gray-400" /> Voir la fiche
                              </button>
                              <button onClick={() => { onOpenBulletin(s); setOpenMenu(null); }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-blue-50 text-sm text-blue-700 font-medium transition-colors">
                                <FileText size={14} className="text-blue-400" /> Bulletin
                              </button>
                              <button onClick={() => openEdit(s)}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors">
                                <Edit2 size={14} className="text-gray-400" /> Modifier
                              </button>
                              <div className="mx-3 border-t border-gray-100" />
                              <button onClick={() => { handleDelete(s.id); setOpenMenu(null); }}
                                className="flex items-center gap-2.5 w-full px-4 py-2.5 hover:bg-red-50 text-red-600 text-sm font-medium transition-colors">
                                <Trash2 size={14} /> Supprimer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
      </div>

      {/* ─── Panneau détail élève ─── */}
      {viewStudent && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-end"
          onClick={() => setViewStudent(null)}>
          <div className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto slide-in-right"
            onClick={e => e.stopPropagation()}>
            {/* Header panel */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <p className="section-label">Fiche Élève</p>
              <button onClick={() => setViewStudent(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-black leading-none w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-all">×</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar + nom */}
              {(() => {
                const name = `${viewStudent.first_name} ${viewStudent.last_name}`;
                const ini = `${viewStudent.first_name?.[0] ?? ''}${viewStudent.last_name?.[0] ?? ''}`.toUpperCase();
                const [bg, fg] = avatarColor(name);
                return (
                  <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
                    {viewStudent.photo_url ? (
                      <img src={viewStudent.photo_url} alt={name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
                        style={{ backgroundColor: bg, color: fg }}>
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
                <button onClick={() => { openEdit(viewStudent); setViewStudent(null); }}
                  className="btn-secondary flex-1 justify-center py-2.5 text-sm">
                  <Edit2 size={14} /> Modifier
                </button>
                <button onClick={() => { onOpenBulletin(viewStudent); setViewStudent(null); }}
                  className="btn-primary flex-1 justify-center py-2.5 text-sm">
                  <FileText size={14} /> Bulletin
                </button>
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

      {openMenu && <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />}
    </div>
  );
}
