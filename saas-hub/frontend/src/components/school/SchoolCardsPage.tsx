import { useState, useEffect, useCallback, useMemo } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import { Users, Download, CheckSquare, Square, Calendar, Filter } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';
import { shrinkImageToDataUrl } from '../../lib/imageData';
import SchoolCardDocument, { type CardStudent, type CardOptions, formatDate, initials, tint, cardFields, CARD_FONT } from './SchoolCardPDF';
import { Card, Select, Input, Spinner, EmptyState } from '../../ui/design_system';

// Armoiries de la République de Guinée (public/cartes)
const ARMOIRIE_URL = '/cartes/armoirie-guinee.png';

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

// ─── Aperçus HTML (miroir visuel du PDF — SchoolCardPDF.tsx) ────────────────────
// Même mise en page à l'échelle : 1 mm = 4 px, 1 pt ≈ 1,41 px.
const MM = (n: number) => n * 4;
const PT = (n: number) => n * 1.41;
const F = CARD_FONT;

function PLogo({ opts, size }: { opts: CardOptions; size: number }) {
  return (
    <div style={{ width: MM(size), height: MM(size), borderRadius: MM(1.5), background: '#fff', padding: MM(0.8), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
      {opts.logoUrl
        ? <img src={opts.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        : <span style={{ fontSize: PT(size * 0.9), fontWeight: 700, color: opts.themeColor }}>{(opts.schoolName || 'É')[0]}</span>}
    </div>
  );
}

function PArmoirie({ opts, size }: { opts: CardOptions; size: number }) {
  if (!opts.armoirieUrl) return null;
  return (
    <div style={{ width: MM(size * 0.85), height: MM(size), borderRadius: MM(1.5), background: '#fff', padding: MM(0.6), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
      <img src={opts.armoirieUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  );
}

function PPhoto({ student, color, w, h, round }: { student: CardStudent; color: string; w: number; h: number; round?: boolean }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div style={{ width: MM(w), height: MM(h), borderRadius: round ? '50%' : MM(1.5), border: `${MM(0.6)}px solid ${color}`, background: tint(color, 0.08), overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxSizing: 'border-box' }}>
      {student.photo_url && !imgErr
        ? <img src={student.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setImgErr(true)} />
        : <span style={{ fontSize: PT(13), fontWeight: 700, color: tint(color, 0.5) }}>{initials(student)}</span>}
    </div>
  );
}

function PFields({ rows }: { rows: [string, string][] }) {
  return (
    <div>
      {rows.map(([l, v]) => (
        <div key={l} style={{ display: 'flex', alignItems: 'baseline', marginBottom: MM(1) }}>
          <span style={{ fontSize: PT(F.label), color: '#64748b', width: MM(15), flexShrink: 0 }}>{l}</span>
          <span style={{ fontSize: PT(F.value), color: '#0f172a', fontWeight: 700 }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

const pCard: React.CSSProperties = { width: MM(85), height: MM(54), background: '#fff', borderRadius: MM(2.5), overflow: 'hidden', border: '1px solid #e2e8f0', flexShrink: 0, fontFamily: 'Helvetica, Arial, sans-serif', boxSizing: 'border-box' };
const pName: React.CSSProperties = { fontSize: PT(F.name), fontWeight: 700, color: '#0f172a', margin: `0 0 ${MM(1.6)}px`, lineHeight: 1.15 };

export function PreviewClassique({ student, opts, color }: { student: CardStudent; opts: CardOptions; color: string }) {
  return (
    <div style={{ ...pCard, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: MM(14), background: color, display: 'flex', alignItems: 'center', padding: `0 ${MM(3)}px`, flexShrink: 0 }}>
        <PLogo opts={opts} size={10} />
        <div style={{ marginLeft: MM(2.5), flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: PT(F.school), fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.15 }}>{(opts.schoolName || 'Nom école').toUpperCase()}</p>
          <p style={{ fontSize: PT(F.tag), color: 'rgba(255,255,255,0.85)', letterSpacing: 0.8, margin: '2px 0 0' }}>CARTE SCOLAIRE · {opts.yearLabel}</p>
        </div>
        <PArmoirie opts={opts} size={10} />
      </div>
      <div style={{ height: MM(0.9), background: tint(color, 0.35), flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', padding: `${MM(2.3)}px ${MM(3)}px` }}>
        <PPhoto student={student} color={color} w={21} h={26} />
        <div style={{ flex: 1, marginLeft: MM(3), display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          <p style={pName}>{student.first_name} {student.last_name}</p>
          <PFields rows={cardFields(student)} />
        </div>
        {student.qrDataUrl && <img src={student.qrDataUrl} alt="QR" style={{ width: MM(13), height: MM(13), alignSelf: 'flex-end', marginLeft: MM(1) }} />}
      </div>
    </div>
  );
}

export function PreviewModerne({ student, opts, color }: { student: CardStudent; opts: CardOptions; color: string }) {
  return (
    <div style={{ ...pCard, display: 'flex' }}>
      <div style={{ width: MM(25), background: color, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `0 ${MM(1.5)}px`, flexShrink: 0 }}>
        <PLogo opts={opts} size={8} />
        <div style={{ marginTop: MM(2), borderRadius: '50%', border: `${MM(0.8)}px solid #fff` }}>
          <PPhoto student={student} color={color} w={18} h={18} round />
        </div>
        <p style={{ fontSize: PT(5.8), fontWeight: 700, color: '#fff', textAlign: 'center', margin: `${MM(1.8)}px 0 0`, lineHeight: 1.2 }}>{opts.schoolName.toUpperCase()}</p>
      </div>
      <div style={{ flex: 1, padding: `${MM(2.8)}px ${MM(3.5)}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: MM(1.5) }}>
            <div>
              <div style={{ fontSize: PT(F.tag), fontWeight: 700, color, letterSpacing: 0.8 }}>CARTE SCOLAIRE</div>
              <div style={{ fontSize: PT(F.tag), color: '#64748b', marginTop: 1 }}>{opts.yearLabel}</div>
            </div>
            {opts.armoirieUrl && <img src={opts.armoirieUrl} alt="" style={{ width: MM(7), height: MM(8.5), objectFit: 'contain' }} />}
          </div>
          <p style={pName}>{student.first_name} {student.last_name}</p>
          <div style={{ height: MM(0.4), background: tint(color, 0.25), marginBottom: MM(1.5) }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}><PFields rows={cardFields(student)} /></div>
          {student.qrDataUrl && <img src={student.qrDataUrl} alt="QR" style={{ width: MM(12), height: MM(12) }} />}
        </div>
      </div>
    </div>
  );
}

export function PreviewElegant({ student, opts, color }: { student: CardStudent; opts: CardOptions; color: string }) {
  return (
    <div style={{ ...pCard, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: MM(12), background: color, display: 'flex', alignItems: 'center', padding: `0 ${MM(3)}px`, flexShrink: 0 }}>
        <PLogo opts={opts} size={8.5} />
        <div style={{ marginLeft: MM(2), flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: PT(8), fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.15 }}>{(opts.schoolName || 'Nom école').toUpperCase()}</p>
          <p style={{ fontSize: PT(F.tag), color: 'rgba(255,255,255,0.85)', letterSpacing: 0.6, margin: '1px 0 0' }}>CARTE SCOLAIRE · {opts.yearLabel}</p>
        </div>
        <PArmoirie opts={opts} size={8.5} />
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: `0 ${MM(3)}px`, background: tint(color, 0.05) }}>
        <PPhoto student={student} color={color} w={21} h={21} round />
        <div style={{ flex: 1, marginLeft: MM(3), minWidth: 0 }}>
          <p style={pName}>{student.first_name} {student.last_name}</p>
          <PFields rows={cardFields(student)} />
        </div>
        {student.qrDataUrl && <img src={student.qrDataUrl} alt="QR" style={{ width: MM(13), height: MM(13) }} />}
      </div>
      <div style={{ height: MM(3.5), background: color, flexShrink: 0 }} />
    </div>
  );
}

export function PreviewVerso({ opts, color }: { opts: CardOptions; color: string }) {
  return (
    <div style={{ ...pCard, display: 'flex', flexDirection: 'column', border: `${MM(0.3)}px solid ${tint(color, 0.3)}` }}>
      <div style={{ height: MM(3.5), background: color, flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: `0 ${MM(6)}px`, textAlign: 'center' }}>
        <PLogo opts={opts} size={16} />
        <p style={{ fontSize: PT(9), fontWeight: 700, color: '#0f172a', margin: `${MM(2)}px 0 0` }}>{(opts.schoolName || 'Nom école').toUpperCase()}</p>
        {opts.schoolAddress && <p style={{ fontSize: PT(6.8), color: '#475569', margin: `${MM(1.2)}px 0 0` }}>{opts.schoolAddress}</p>}
        {opts.schoolPhone && <p style={{ fontSize: PT(7.4), fontWeight: 700, color, margin: `${MM(1)}px 0 0` }}>Tél. {opts.schoolPhone}</p>}
        <div style={{ width: MM(30), height: MM(0.4), background: tint(color, 0.3), margin: `${MM(2)}px 0` }} />
        <p style={{ fontSize: PT(6.4), color: '#0f172a', margin: 0 }}>Année scolaire {opts.yearLabel} · valable jusqu'au {formatDate(opts.expiryDate)}</p>
        <p style={{ fontSize: PT(5.6), color: '#64748b', margin: `${MM(1)}px 0 0` }}>En cas de perte, merci de rapporter cette carte à l'établissement.</p>
      </div>
      <div style={{ height: MM(3.5), background: color, flexShrink: 0 }} />
    </div>
  );
}

// ─── Miniatures modèles ──────────────────────────────────────────────────────
function ModelThumb({ model, color, selected, onClick }: { model: typeof MODELS[0]; color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border-2 p-3 text-left transition-all cursor-pointer w-full ${selected ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
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
      <p className={`text-xs font-semibold ${selected ? 'text-primary-700' : 'text-slate-700'}`}>{model.label}</p>
      <p className="text-[10px] text-slate-400 leading-tight">{model.desc}</p>
      {selected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary-500 flex items-center justify-center">
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
    setChecked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setPreviewId(id);
  };
  const toggleAll = () => {
    setChecked(checked.size === filtered.length ? new Set() : new Set(filtered.map(s => String(s.id))));
  };

  // Images stockées en base (/api/media/<id>) : URL complète pour le générateur PDF,
  // qui les télécharge lui-même (une URL relative n'est pas toujours résolue).
  const absoluteUrl = (u?: string | null) => (u ? new URL(u, window.location.origin).href : null);

  // Logo et armoiries répétés sur chaque carte (recto + verso) : réduits à ~240 px en
  // data URL, sinon le PDF intègre l'image pleine taille à chaque face (PDF de 15+ Mo).
  const [logoData, setLogoData] = useState<string | null>(null);
  const [armoirieData, setArmoirieData] = useState<string | null>(null);
  useEffect(() => {
    const logo = absoluteUrl(user.logoUrl);
    if (logo) shrinkImageToDataUrl(logo).then(setLogoData).catch(() => setLogoData(logo));
    shrinkImageToDataUrl(absoluteUrl(ARMOIRIE_URL)!).then(setArmoirieData).catch(() => setArmoirieData(null));
  }, [user.logoUrl]);

  // Élève → données de carte. Téléphone : celui du tuteur en priorité, sinon celui de l'élève.
  const toCard = (s: any): CardStudent => ({
    id: String(s.id), first_name: s.first_name, last_name: s.last_name,
    birth_date: s.birth_date, matricule: s.matricule, photo_url: absoluteUrl(s.photo_url),
    class_name: s.class_name, gender: s.gender, qrDataUrl: qrCodes[String(s.id)],
    phone: s.tutor_phone || s.phone || null,
    phoneLabel: s.tutor_phone ? 'Tél. tuteur' : 'Téléphone',
  });

  const selectedStudents: CardStudent[] = filtered.filter(s => checked.has(String(s.id))).map(toCard);

  const previewStudent: CardStudent | null = (() => {
    const s = students.find(s => String(s.id) === previewId);
    return s ? toCard(s) : null;
  })();

  const activeYear = years.find(y => String(y.id) === selectedYear);
  const yearLabel  = activeYear?.label || activeYear?.name || '';

  const opts: CardOptions = {
    schoolName: user.schoolName || 'Mon École',
    logoUrl:    logoData ?? absoluteUrl(user.logoUrl),
    armoirieUrl: armoirieData,
    schoolPhone: user.phone || null,
    // Pas de champ « adresse » dans le profil web : composée à partir de la localisation
    schoolAddress: [user.sousPrefecture, user.prefecture, user.city, user.country]
      .filter((v: string | null | undefined) => v && String(v).trim())
      .filter((v: string, i: number, arr: string[]) => arr.findIndex(x => x.toLowerCase() === v.toLowerCase()) === i)
      .join(', ') || null,
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
          <Card padding="sm" className="space-y-4">
            {/* Année + Classe */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-1.5">
                  <Calendar size={11} /> Année scolaire
                </label>
                <Select
                  value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                  options={years.map((y: any) => ({ value: String(y.id), label: y.label || y.name }))}
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-semibold text-slate-500 mb-1.5">
                  <Filter size={11} /> Classe
                </label>
                <Select
                  value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                  options={[{ value: 'all', label: 'Toutes les classes' }, ...classes.map((c: any) => ({ value: String(c.id), label: c.name }))]}
                />
              </div>
            </div>

            {/* Date de validité */}
            <Input label="Date de validité" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />

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
          </Card>

          {/* Liste élèves */}
          <Card padding="none" className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary-600 transition-colors">
                {allChecked ? <CheckSquare size={14} className="text-primary-600" /> : <Square size={14} />}
                {allChecked ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Users size={11} /> {filtered.length} élève{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <Spinner size="lg" color="primary" />
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState message="Aucun élève trouvé" />
            ) : (
              <div className="divide-y divide-slate-50 max-h-[380px] overflow-y-auto">
                {filtered.map((st: any) => {
                  const id = String(st.id);
                  const isChecked = checked.has(id);
                  const isPreviewed = previewId === id;
                  return (
                    <div key={id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isPreviewed ? 'bg-primary-50' : 'hover:bg-slate-50'}`}
                      onClick={() => toggleOne(id)}>
                      <div onClick={e => { e.stopPropagation(); toggleOne(id); }}>
                        {isChecked
                          ? <CheckSquare size={16} className="text-primary-600 flex-shrink-0" />
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
                      {isPreviewed && <span className="text-[9px] font-semibold text-primary-400 flex-shrink-0">Aperçu</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ─── Droite : Aperçu ─── */}
        <Card padding="md" className="flex flex-col items-center gap-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider self-start">Aperçu en temps réel</p>
          {previewStudent ? (
            <>
              <div className="overflow-x-auto w-full flex flex-col items-center">
                <p className="text-[11px] text-slate-400 mb-1.5">Recto</p>
                <PreviewComp student={previewStudent} opts={opts} color={theme.color} />
                <p className="text-[11px] text-slate-400 mt-3 mb-1.5">Verso</p>
                <PreviewVerso opts={opts} color={theme.color} />
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
        </Card>
      </div>
    </div>
  );
}
