import { useState, useEffect, useCallback, useMemo } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { Users, Download, CheckSquare, Square, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import SchoolCardDocument, { type CardStudent, type CardOptions, formatDate, initials } from './SchoolCardPDF';

// ─── Couleurs ───────────────────────────────────────────────────────────────
const THEMES = [
  { id: 'navy',     label: 'Bleu marine', color: '#1e3a5f' },
  { id: 'green',    label: 'Vert',        color: '#166534' },
  { id: 'burgundy', label: 'Bordeaux',    color: '#7f1d1d' },
  { id: 'purple',   label: 'Violet',      color: '#4c1d95' },
  { id: 'black',    label: 'Noir',        color: '#111827' },
  { id: 'orange',   label: 'Orange',      color: '#9a3412' },
];

// ─── Modèles ────────────────────────────────────────────────────────────────
type ModelId = 'classique' | 'moderne' | 'elegant';
const MODELS: { id: ModelId; label: string; desc: string }[] = [
  { id: 'classique', label: 'Classique', desc: 'Bandeau haut · Photo gauche · QR droite' },
  { id: 'moderne',   label: 'Moderne',   desc: 'Barre latérale · Photo ronde · QR bas' },
  { id: 'elegant',   label: 'Élégant',   desc: 'Double bandeau · Photo circle · QR bas' },
];

function defaultExpiry(years: any[]) {
  const active = years.find(y => y.is_active == 1 || y.is_active === true);
  if (active?.end_date) return active.end_date.slice(0, 10);
  return `${new Date().getFullYear()}-06-30`;
}

async function generateQR(text: string): Promise<string> {
  return QRCode.toDataURL(text, { width: 120, margin: 1, color: { dark: '#000000', light: '#ffffff' } });
}

// ─── Aperçus HTML (miroir visuel des 3 modèles PDF) ─────────────────────────
function PreviewClassique({ student, opts, color }: { student: CardStudent; opts: CardOptions; color: string }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div style={{ width: 340, height: 216, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ height: 52, backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
        <div>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>{opts.schoolName || 'Nom école'}</p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, margin: 0 }}>Carte scolaire — {opts.yearLabel}</p>
        </div>
        {opts.logoUrl
          ? <img src={opts.logoUrl} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
          : <div style={{ width: 36, height: 36, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 12 }}>{(opts.schoolName || 'É')[0]}</span>
            </div>}
      </div>
      {/* Body */}
      <div style={{ display: 'flex', padding: '10px 12px', gap: 12, height: 'calc(100% - 52px)' }}>
        <div style={{ width: 58, height: 76, borderRadius: 6, overflow: 'hidden', backgroundColor: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }}>
          {student.photo_url && !imgErr
            ? <img src={student.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgErr(true)} />
            : <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 18 }}>{initials(student)}</span>}
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: '0 0 4px' }}>{student.first_name} {student.last_name}</p>
          {[['Classe', student.class_name || '—'], ['Matricule', student.matricule || '—'], ['Né(e) le', formatDate(student.birth_date)], ['Valide', formatDate(opts.expiryDate)]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 4 }}>
              <span style={{ color: '#94a3b8', fontSize: 10, width: 56, flexShrink: 0 }}>{l}</span>
              <span style={{ color: '#1e293b', fontSize: 10, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
          {student.qrDataUrl && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
              <img src={student.qrDataUrl} alt="QR" style={{ width: 44, height: 44 }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewModerne({ student, opts, color }: { student: CardStudent; opts: CardOptions; color: string }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div style={{ width: 340, height: 216, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexShrink: 0 }}>
      {/* Sidebar */}
      <div style={{ width: 80, backgroundColor: color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0', gap: 6 }}>
        {opts.logoUrl && <img src={opts.logoUrl} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />}
        <div style={{ width: 56, height: 56, borderRadius: 28, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {student.photo_url && !imgErr
            ? <img src={student.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgErr(true)} />
            : <span style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>{initials(student)}</span>}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 8, textAlign: 'center', margin: 0, padding: '0 4px', lineHeight: 1.2 }}>{opts.schoolName}</p>
      </div>
      {/* Right */}
      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <p style={{ color: '#94a3b8', fontSize: 9, margin: '0 0 2px' }}>{opts.yearLabel}</p>
          <p style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', margin: '0 0 6px' }}>{student.first_name} {student.last_name}</p>
          {[['Classe', student.class_name || '—'], ['Matricule', student.matricule || '—'], ['Né(e) le', formatDate(student.birth_date)], ['Valide', formatDate(opts.expiryDate)]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
              <span style={{ color: '#94a3b8', fontSize: 10, width: 56, flexShrink: 0 }}>{l}</span>
              <span style={{ color: '#1e293b', fontSize: 10, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
        {student.qrDataUrl && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <img src={student.qrDataUrl} alt="QR" style={{ width: 44, height: 44 }} />
          </div>
        )}
      </div>
    </div>
  );
}

function PreviewElegant({ student, opts, color }: { student: CardStudent; opts: CardOptions; color: string }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div style={{ width: 340, height: 216, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
      {/* Top band */}
      <div style={{ height: 38, backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {opts.logoUrl && <img src={opts.logoUrl} alt="" style={{ width: 24, height: 24, borderRadius: 3, objectFit: 'cover' }} />}
          <div>
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 11, margin: 0 }}>{opts.schoolName || 'Nom école'}</p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, margin: 0 }}>{opts.yearLabel}</p>
          </div>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '2px 8px' }}>
          <span style={{ color: '#fff', fontSize: 9, fontWeight: 600 }}>CARTE SCOLAIRE</span>
        </div>
      </div>
      {/* Body */}
      <div style={{ flex: 1, display: 'flex', padding: '8px 12px', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 32, overflow: 'hidden', backgroundColor: '#f1f5f9', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {student.photo_url && !imgErr
            ? <img src={student.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgErr(true)} />
            : <span style={{ color: '#94a3b8', fontWeight: 700, fontSize: 20 }}>{initials(student)}</span>}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', margin: '0 0 5px' }}>{student.first_name} {student.last_name}</p>
          {[['Classe', student.class_name || '—'], ['Matricule', student.matricule || '—'], ['Né(e) le', formatDate(student.birth_date)]].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', gap: 4, marginBottom: 2 }}>
              <span style={{ color: '#94a3b8', fontSize: 10, width: 56, flexShrink: 0 }}>{l}</span>
              <span style={{ color: '#1e293b', fontSize: 10, fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Bottom band */}
      <div style={{ height: 38, backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10 }}>Valide jusqu'au {formatDate(opts.expiryDate)}</span>
        {student.qrDataUrl && <img src={student.qrDataUrl} alt="QR" style={{ width: 30, height: 30 }} />}
      </div>
    </div>
  );
}

// ─── Miniatures modèles ──────────────────────────────────────────────────────
function ModelThumb({ model, color, selected, onClick }: { model: typeof MODELS[0]; color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border-2 p-3 text-left transition-all cursor-pointer w-full ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
    >
      {/* Mini card preview */}
      <div style={{ height: 44, borderRadius: 6, overflow: 'hidden', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 6 }}>
        {model.id === 'classique' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 14, backgroundColor: color }} />
            <div style={{ flex: 1, display: 'flex', gap: 4, padding: '3px 4px' }}>
              <div style={{ width: 14, height: 18, borderRadius: 2, backgroundColor: '#e2e8f0' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center' }}>
                {[60, 80, 50, 70].map((w, i) => <div key={i} style={{ height: 2, width: `${w}%`, backgroundColor: '#cbd5e1', borderRadius: 1 }} />)}
              </div>
              <div style={{ width: 12, height: 12, backgroundColor: '#e2e8f0', alignSelf: 'flex-end' }} />
            </div>
          </div>
        )}
        {model.id === 'moderne' && (
          <div style={{ height: '100%', display: 'flex' }}>
            <div style={{ width: 18, backgroundColor: color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              <div style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.4)' }} />
            </div>
            <div style={{ flex: 1, padding: '3px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[70, 50, 60, 45].map((w, i) => <div key={i} style={{ height: 2, width: `${w}%`, backgroundColor: '#cbd5e1', borderRadius: 1 }} />)}
              </div>
              <div style={{ width: 10, height: 10, backgroundColor: '#e2e8f0', alignSelf: 'flex-end' }} />
            </div>
          </div>
        )}
        {model.id === 'elegant' && (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: 12, backgroundColor: color }} />
            <div style={{ flex: 1, display: 'flex', gap: 4, padding: '3px 4px', alignItems: 'center' }}>
              <div style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#e2e8f0', flexShrink: 0 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[65, 45, 55].map((w, i) => <div key={i} style={{ height: 2, width: `${w}%`, backgroundColor: '#cbd5e1', borderRadius: 1 }} />)}
              </div>
            </div>
            <div style={{ height: 12, backgroundColor: color }} />
          </div>
        )}
      </div>
      <p className={`text-xs font-semibold ${selected ? 'text-indigo-700' : 'text-slate-700'}`}>{model.label}</p>
      <p className="text-[10px] text-slate-400 leading-tight">{model.desc}</p>
      {selected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
          <svg viewBox="0 0 8 8" className="w-2.5 h-2.5 fill-white"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.2" fill="none" strokeLinecap="round" /></svg>
        </div>
      )}
    </button>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────
interface Props { user: any }

export default function SchoolCardsPage({ user }: Props) {
  const [students, setStudents]     = useState<any[]>([]);
  const [classes, setClasses]       = useState<any[]>([]);
  const [years, setYears]           = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [qrCodes, setQrCodes]       = useState<Record<string, string>>({});
  const [qrReady, setQrReady]       = useState(false);

  const [selectedYear,  setSelectedYear]  = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [checked, setChecked]             = useState<Set<string>>(new Set());
  const [themeId, setThemeId]             = useState('navy');
  const [modelId, setModelId]             = useState<ModelId>('classique');
  const [expiryDate, setExpiryDate]       = useState('');
  const [previewId, setPreviewId]         = useState<string | null>(null);

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[0];

  // Chargement initial classes + années
  const loadMeta = useCallback(async () => {
    try {
      const [cls, yrs] = await Promise.all([api.getClasses(), api.getSchoolYears()]);
      setClasses(cls);
      setYears(yrs);
      const active = yrs.find((y: any) => y.is_active == 1 || y.is_active === true) || yrs[0];
      if (active) setSelectedYear(String(active.id));
      setExpiryDate(defaultExpiry(yrs));
    } catch { toast.error('Erreur de chargement'); }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  // Chargement élèves à chaque changement d'année
  useEffect(() => {
    if (!selectedYear) return;
    setLoading(true);
    setQrReady(false);
    api.getStudentsDetailed(selectedYear)
      .then((res: any) => {
        const list: any[] = res.students ?? res ?? [];
        setStudents(list);
        setChecked(new Set(list.map((s: any) => String(s.id))));
        setPreviewId(list[0]?.id ? String(list[0].id) : null);
      })
      .catch(() => toast.error('Erreur de chargement des élèves'))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  // Génération QR codes (async, après chargement des élèves)
  useEffect(() => {
    if (students.length === 0) return;
    setQrReady(false);
    const schoolName = user.schoolName || 'École';
    Promise.all(
      students.map(async (s: any) => {
        const content = [s.first_name, s.last_name, s.class_name, s.matricule, schoolName]
          .filter(Boolean).join(' | ');
        const dataUrl = await generateQR(content);
        return [String(s.id), dataUrl] as [string, string];
      })
    ).then(pairs => {
      setQrCodes(Object.fromEntries(pairs));
      setQrReady(true);
    });
  }, [students, user.schoolName]);

  const filtered = useMemo(() => {
    if (selectedClass === 'all') return students;
    return students.filter(s => String(s.class_id) === selectedClass);
  }, [students, selectedClass]);

  // Réajustement sélection quand la classe change
  useEffect(() => {
    const ids = new Set(filtered.map(s => String(s.id)));
    setChecked(prev => new Set([...prev].filter(id => ids.has(id))));
    if (filtered.length > 0 && !filtered.some(s => String(s.id) === previewId)) {
      setPreviewId(String(filtered[0].id));
    }
  }, [filtered]);

  const toggleOne = (id: string) => {
    setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setPreviewId(id);
  };
  const toggleAll = () => {
    setChecked(checked.size === filtered.length ? new Set() : new Set(filtered.map(s => String(s.id))));
  };

  const selectedStudents: CardStudent[] = filtered
    .filter(s => checked.has(String(s.id)))
    .map(s => ({
      id: String(s.id), first_name: s.first_name, last_name: s.last_name,
      birth_date: s.birth_date, matricule: s.matricule, photo_url: s.photo_url,
      class_name: s.class_name, gender: s.gender, qrDataUrl: qrCodes[String(s.id)],
    }));

  const previewStudent: CardStudent | null = (() => {
    const s = students.find(s => String(s.id) === previewId);
    if (!s) return null;
    return { id: String(s.id), first_name: s.first_name, last_name: s.last_name,
      birth_date: s.birth_date, matricule: s.matricule, photo_url: s.photo_url,
      class_name: s.class_name, gender: s.gender, qrDataUrl: qrCodes[String(s.id)] };
  })();

  const activeYear = years.find(y => String(y.id) === selectedYear);
  const yearLabel  = activeYear?.label || activeYear?.name || '';

  const opts: CardOptions = {
    schoolName: user.schoolName || 'Mon École',
    logoUrl:    user.logoUrl    || null,
    yearLabel,
    themeColor: theme.color,
    expiryDate,
    modelId,
  };

  const allChecked = filtered.length > 0 && checked.size === filtered.length;
  const canGenerate = selectedStudents.length > 0 && qrReady;

  const PreviewComp = modelId === 'moderne' ? PreviewModerne : modelId === 'elegant' ? PreviewElegant : PreviewClassique;

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cartes scolaires</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {selectedStudents.length} élève{selectedStudents.length !== 1 ? 's' : ''} sélectionné{selectedStudents.length !== 1 ? 's' : ''}
            {!qrReady && students.length > 0 && <span className="ml-2 text-amber-500">· Génération QR…</span>}
          </p>
        </div>
        {canGenerate ? (
          <PDFDownloadLink
            document={<SchoolCardDocument students={selectedStudents} opts={opts} />}
            fileName={`cartes-scolaires-${yearLabel.replace(/\//g, '-')}.pdf`}
          >
            {({ loading: pdfLoading }) => (
              <button
                disabled={pdfLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60 shadow-sm"
                style={{ backgroundColor: theme.color }}
              >
                <Download size={15} />
                {pdfLoading ? 'Préparation…' : `Générer PDF (${selectedStudents.length})`}
              </button>
            )}
          </PDFDownloadLink>
        ) : (
          <button disabled className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-slate-300 cursor-not-allowed shadow-sm">
            <Download size={15} />
            Générer PDF
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* ─── Gauche : Filtres + Liste ─── */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4">
            {/* Année + Classe */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-1.5">
                  <Calendar size={11} /> Année scolaire
                </label>
                <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  {years.map((y: any) => <option key={y.id} value={String(y.id)}>{y.label || y.name}</option>)}
                </select>
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-1.5">
                  <Filter size={11} /> Classe
                </label>
                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                  <option value="all">Toutes les classes</option>
                  {classes.map((c: any) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Date de validité */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date de validité</label>
              <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
            </div>

            {/* Modèles */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Modèle de carte</label>
              <div className="grid grid-cols-3 gap-2">
                {MODELS.map(m => (
                  <ModelThumb key={m.id} model={m} color={theme.color} selected={modelId === m.id} onClick={() => setModelId(m.id)} />
                ))}
              </div>
            </div>

            {/* Couleurs */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Couleur du thème</label>
              <div className="flex gap-2 flex-wrap">
                {THEMES.map(t => (
                  <button key={t.id} title={t.label} onClick={() => setThemeId(t.id)}
                    className="flex flex-col items-center gap-1 group">
                    <div className="w-8 h-8 rounded-full transition-all"
                      style={{ backgroundColor: t.color,
                        outline: themeId === t.id ? `3px solid ${t.color}` : '3px solid transparent',
                        outlineOffset: 2, transform: themeId === t.id ? 'scale(1.15)' : 'scale(1)' }} />
                    <span className="text-[9px] text-slate-400 group-hover:text-slate-600">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Liste élèves */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
                {allChecked ? <CheckSquare size={14} className="text-indigo-600" /> : <Square size={14} />}
                {allChecked ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
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
              <div className="divide-y divide-slate-50 max-h-[380px] overflow-y-auto">
                {filtered.map((st: any) => {
                  const id = String(st.id);
                  const isChecked = checked.has(id);
                  const isPreviewed = previewId === id;
                  return (
                    <div key={id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isPreviewed ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                      onClick={() => toggleOne(id)}>
                      <div onClick={e => { e.stopPropagation(); toggleOne(id); }}>
                        {isChecked
                          ? <CheckSquare size={16} className="text-indigo-600 flex-shrink-0" />
                          : <Square size={16} className="text-slate-300 flex-shrink-0" />}
                      </div>
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex-shrink-0 flex items-center justify-center">
                        {st.photo_url
                          ? <img src={st.photo_url} alt="" className="w-full h-full object-cover" />
                          : <span className="text-slate-400 font-bold text-xs">{initials(st)}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{st.first_name} {st.last_name}</p>
                        <p className="text-xs text-slate-400 truncate">{st.class_name || 'Sans classe'}{st.matricule ? ` · ${st.matricule}` : ''}</p>
                      </div>
                      {qrReady && qrCodes[id] && <img src={qrCodes[id]} alt="" className="w-6 h-6 opacity-40 flex-shrink-0" />}
                      {isPreviewed && <span className="text-[9px] font-semibold text-indigo-400 flex-shrink-0">Aperçu</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ─── Droite : Aperçu ─── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col items-center gap-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider self-start">Aperçu en temps réel</p>
          {previewStudent ? (
            <>
              <div className="overflow-x-auto w-full flex justify-center">
                <PreviewComp student={previewStudent} opts={opts} color={theme.color} />
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                {previewStudent.first_name} {previewStudent.last_name}
                {!qrReady && <span className="ml-1 text-amber-400">· QR en cours…</span>}
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Sélectionnez un élève pour voir l'aperçu
            </div>
          )}

          {selectedStudents.length > 0 && (
            <div className="mt-1 rounded-xl p-3 text-xs text-slate-500 text-center w-full"
              style={{ backgroundColor: `${theme.color}12` }}>
              Le PDF contiendra <strong>{selectedStudents.length}</strong> carte{selectedStudents.length > 1 ? 's' : ''} avec QR code, 2 par ligne sur pages A4.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
