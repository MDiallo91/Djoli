import { useState, useEffect, useCallback, useMemo } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Users, Download, CheckSquare, Square, Calendar, Filter, Palette } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import SchoolCardDocument, { type CardStudent, type CardOptions } from './SchoolCardPDF';

const THEMES = [
  { id: 'navy',    label: 'Bleu marine', color: '#1e3a5f' },
  { id: 'green',   label: 'Vert',        color: '#166534' },
  { id: 'burgundy',label: 'Bordeaux',    color: '#7f1d1d' },
  { id: 'purple',  label: 'Violet',      color: '#4c1d95' },
  { id: 'black',   label: 'Noir',        color: '#111827' },
  { id: 'orange',  label: 'Orange',      color: '#9a3412' },
];

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function initials(s: CardStudent) {
  return `${(s.first_name || '')[0] || ''}${(s.last_name || '')[0] || ''}`.toUpperCase();
}

function defaultExpiry(years: any[]) {
  const active = years.find(y => y.is_active == 1 || y.is_active === true);
  if (active?.end_date) return active.end_date.slice(0, 10);
  const now = new Date();
  return `${now.getFullYear()}-06-30`;
}

interface CardPreviewProps {
  student: CardStudent | null;
  opts: CardOptions;
}

function CardPreview({ student, opts }: CardPreviewProps) {
  const [imgError, setImgError] = useState(false);
  useEffect(() => { setImgError(false); }, [student?.photo_url]);

  if (!student) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Sélectionnez un élève pour voir l'aperçu
      </div>
    );
  }

  const showPhoto = student.photo_url && !imgError;
  const cardInitials = initials(student);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-xs text-slate-400">Aperçu — {student.first_name} {student.last_name}</p>
      {/* Ratio 85:54 ≈ 1.574 */}
      <div
        className="rounded-xl overflow-hidden shadow-lg"
        style={{ width: 340, height: 216, backgroundColor: '#fff', border: '1px solid #e2e8f0', flexShrink: 0 }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4"
          style={{ height: 52, backgroundColor: opts.themeColor }}
        >
          <div>
            <p className="text-white font-bold text-sm leading-tight">{opts.schoolName || 'Nom de l\'école'}</p>
            <p className="text-white/80 text-xs">Carte scolaire — {opts.yearLabel}</p>
          </div>
          {opts.logoUrl ? (
            <img src={opts.logoUrl} alt="" className="w-9 h-9 rounded object-cover" />
          ) : (
            <div className="w-9 h-9 rounded bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-xs">{(opts.schoolName || 'É')[0]}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex px-3 py-2.5 gap-3 h-[calc(100%-52px-28px)]">
          {/* Photo */}
          <div
            className="rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100"
            style={{ width: 60, height: 80 }}
          >
            {showPhoto ? (
              <img src={student.photo_url!} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
            ) : (
              <span className="text-slate-400 font-bold text-lg">{cardInitials}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col justify-center gap-1 min-w-0">
            <p className="font-bold text-slate-900 text-sm leading-tight truncate">
              {student.first_name} {student.last_name}
            </p>
            {[
              ['Classe',          student.class_name   || '—'],
              ['Matricule',       student.matricule    || '—'],
              ['Né(e) le',        formatDate(student.birth_date)],
              ['Valide jusqu\'au', formatDate(opts.expiryDate)],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-1.5">
                <span className="text-slate-400 text-[10px] w-20 flex-shrink-0">{label}</span>
                <span className="text-slate-700 text-[10px] font-medium truncate">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer stripe */}
        <div
          className="flex items-center justify-end px-3"
          style={{ height: 28, borderTop: '1px solid #e2e8f0' }}
        >
          <span className="text-slate-300 text-[9px]">DJOLI • École</span>
        </div>
      </div>
    </div>
  );
}

interface Props {
  user: any;
}

export default function SchoolCardsPage({ user }: Props) {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses]   = useState<any[]>([]);
  const [years, setYears]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  const [selectedYear,  setSelectedYear]  = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [checked, setChecked]             = useState<Set<string>>(new Set());
  const [themeId, setThemeId]             = useState('navy');
  const [expiryDate, setExpiryDate]       = useState('');
  const [previewId, setPreviewId]         = useState<string | null>(null);

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, yrs] = await Promise.all([api.getClasses(), api.getSchoolYears()]);
      setClasses(cls);
      setYears(yrs);
      const active = yrs.find((y: any) => y.is_active == 1 || y.is_active === true) || yrs[0];
      if (active) setSelectedYear(String(active.id));
      setExpiryDate(defaultExpiry(yrs));
    } catch { toast.error('Erreur de chargement'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selectedYear) return;
    setLoading(true);
    api.getStudentsDetailed(selectedYear)
      .then((res: any) => {
        const list: any[] = res.students ?? res ?? [];
        setStudents(list);
        const allIds = new Set(list.map((s: any) => String(s.id)));
        setChecked(allIds);
        setPreviewId(list[0]?.id ? String(list[0].id) : null);
      })
      .catch(() => toast.error('Erreur de chargement des élèves'))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  const filtered = useMemo(() => {
    if (selectedClass === 'all') return students;
    return students.filter(s => String(s.class_id) === selectedClass);
  }, [students, selectedClass]);

  useEffect(() => {
    const ids = new Set(filtered.map(s => String(s.id)));
    setChecked(prev => new Set([...prev].filter(id => ids.has(id))));
    if (!filtered.some(s => String(s.id) === previewId)) {
      setPreviewId(filtered[0]?.id ? String(filtered[0].id) : null);
    }
  }, [filtered]);

  const toggleOne = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setPreviewId(id);
  };

  const toggleAll = () => {
    if (checked.size === filtered.length) setChecked(new Set());
    else setChecked(new Set(filtered.map(s => String(s.id))));
  };

  const selectedStudents: CardStudent[] = filtered
    .filter(s => checked.has(String(s.id)))
    .map(s => ({
      id:         String(s.id),
      first_name: s.first_name,
      last_name:  s.last_name,
      birth_date: s.birth_date,
      matricule:  s.matricule,
      photo_url:  s.photo_url,
      class_name: s.class_name,
      gender:     s.gender,
    }));

  const previewStudent: CardStudent | null = (() => {
    const s = students.find(s => String(s.id) === previewId);
    if (!s) return null;
    return { id: String(s.id), first_name: s.first_name, last_name: s.last_name,
      birth_date: s.birth_date, matricule: s.matricule, photo_url: s.photo_url,
      class_name: s.class_name, gender: s.gender };
  })();

  const activeYear = years.find(y => String(y.id) === selectedYear);
  const yearLabel  = activeYear?.label || activeYear?.name || '';

  const opts: CardOptions = {
    schoolName: user.schoolName || 'Mon École',
    logoUrl:    user.logoUrl    || null,
    yearLabel,
    themeColor: theme.color,
    expiryDate,
  };

  const allChecked = filtered.length > 0 && checked.size === filtered.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cartes scolaires</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedStudents.length} élève{selectedStudents.length !== 1 ? 's' : ''} sélectionné{selectedStudents.length !== 1 ? 's' : ''}
          </p>
        </div>
        {selectedStudents.length > 0 ? (
          <PDFDownloadLink
            document={<SchoolCardDocument students={selectedStudents} opts={opts} />}
            fileName={`cartes-scolaires-${yearLabel.replace(/\//g, '-')}.pdf`}
          >
            {({ loading: pdfLoading }) => (
              <button
                disabled={pdfLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60"
                style={{ backgroundColor: theme.color }}
              >
                <Download size={15} />
                {pdfLoading ? 'Préparation…' : `Générer PDF (${selectedStudents.length})`}
              </button>
            )}
          </PDFDownloadLink>
        ) : (
          <button disabled className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-slate-300 cursor-not-allowed">
            <Download size={15} />
            Générer PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* ─── Left: Filters + List ─── */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
            {/* Year + Class */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Calendar size={11} /> Année scolaire
                </label>
                <select
                  value={selectedYear}
                  onChange={e => setSelectedYear(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  {years.map((y: any) => (
                    <option key={y.id} value={String(y.id)}>{y.label || y.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                  <Filter size={11} /> Classe
                </label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  <option value="all">Toutes les classes</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={String(c.id)}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expiry date */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Date de validité
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              />
            </div>

            {/* Theme */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
                <Palette size={11} /> Thème de couleur
              </label>
              <div className="flex gap-2 flex-wrap">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    title={t.label}
                    onClick={() => setThemeId(t.id)}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <div
                      className="w-8 h-8 rounded-full transition-all"
                      style={{
                        backgroundColor: t.color,
                        outline: themeId === t.id ? `3px solid ${t.color}` : '3px solid transparent',
                        outlineOffset: 2,
                        transform: themeId === t.id ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                    <span className="text-[9px] text-slate-400 group-hover:text-slate-600">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Student list */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
                  {allChecked
                    ? <CheckSquare size={14} className="text-indigo-600" />
                    : <Square size={14} />}
                  {allChecked ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
              </div>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users size={11} /> {filtered.length} élève{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">Aucun élève trouvé</div>
            ) : (
              <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
                {filtered.map((st: any) => {
                  const id = String(st.id);
                  const isChecked = checked.has(id);
                  const isPreviewed = previewId === id;
                  return (
                    <div
                      key={id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isPreviewed ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                      onClick={() => { toggleOne(id); }}
                    >
                      <div onClick={e => { e.stopPropagation(); toggleOne(id); }}>
                        {isChecked
                          ? <CheckSquare size={16} className="text-indigo-600 flex-shrink-0" />
                          : <Square size={16} className="text-slate-300 flex-shrink-0" />}
                      </div>

                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                        {st.photo_url
                          ? <img src={st.photo_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-slate-400 font-bold text-xs">{initials(st)}</span>}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {st.first_name} {st.last_name}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {st.class_name || 'Sans classe'}{st.matricule ? ` · ${st.matricule}` : ''}
                        </p>
                      </div>

                      {isPreviewed && (
                        <span className="text-[9px] font-semibold text-indigo-400 flex-shrink-0">Aperçu</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Preview ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col items-center justify-start gap-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider self-start">
            Aperçu en temps réel
          </p>
          <CardPreview student={previewStudent} opts={opts} />

          {selectedStudents.length > 0 && (
            <div className="mt-2 rounded-xl p-3 text-xs text-slate-500 text-center" style={{ backgroundColor: `${theme.color}10` }}>
              Le PDF contiendra <strong>{selectedStudents.length}</strong> carte{selectedStudents.length > 1 ? 's' : ''}, imprimées 2 par ligne sur pages A4.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
