import { useState, useEffect, useCallback, useRef } from 'react';
import { Printer, ChevronLeft, GraduationCap, Search, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import * as api from '../../services/schoolApi';

// ── Design tokens (identiques desktop BulletinPrint) ─────────────────────────
const BLUE   = '#1a2f6e';
const B_SOFT = '#e8edf8';

const thStyle: React.CSSProperties = {
  border: `1px solid ${BLUE}`, padding: '4pt 5pt', textAlign: 'center',
  fontWeight: 'bold', fontSize: '9pt', backgroundColor: BLUE, color: '#fff',
};
const tdStyle: React.CSSProperties = {
  border: `1px solid ${BLUE}`, padding: '3pt 5pt', fontSize: '9pt', color: '#000', backgroundColor: '#fff',
};

const fmt = (v: number | null, dec = 2) => v !== null ? v.toFixed(dec).replace('.', ',') : '—';

function getMention(avg: number | null) {
  if (avg === null) return '—';
  if (avg >= 16) return 'Très Bien';
  if (avg >= 14) return 'Bien';
  if (avg >= 12) return 'Assez Bien';
  if (avg >= 10) return 'Passable';
  return 'Insuffisant';
}

const TERMS_LABELS = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];

// ── Bulletin imprimable (clone de BulletinPrint.tsx du desktop) ───────────────
function BulletinPrint({ data, term }: { data: any; term: string }) {
  const { student, class: cls, year, subjectResults, termAverages, annualAvg, rankings, classSize, schoolInfo } = data;

  const isT1 = term.includes('1er');
  const isT2 = term.includes('2ème') && !term.toLowerCase().includes('ann');
  const isT3 = term.includes('3ème') || term.toLowerCase().includes('ann');

  const showT2  = !isT1;
  const showT3  = isT3;
  const showAnn = isT3;

  // Recalculer totaux
  const termKeys: Array<'T1' | 'T2' | 'T3'> = ['T1', 'T2', 'T3'];
  const termMap: Record<string, 'T1' | 'T2' | 'T3'> = { [TERMS_LABELS[0]]: 'T1', [TERMS_LABELS[1]]: 'T2', [TERMS_LABELS[2]]: 'T3' };
  const activeTKey: 'T1' | 'T2' | 'T3' = termMap[term] ?? 'T3';

  const totalCoeff = subjectResults.reduce((s: number, g: any) => s + (g.coefficient || 1), 0);

  const termTotal = (key: 'T1' | 'T2' | 'T3') =>
    subjectResults.reduce((s: number, g: any) => {
      const v = g.grades?.[key]?.moyenne;
      return v !== null && v !== undefined ? s + v * (g.coefficient || 1) : s;
    }, 0);
  const termVC = (key: 'T1' | 'T2' | 'T3') =>
    subjectResults.reduce((s: number, g: any) => g.grades?.[key]?.moyenne !== null && g.grades?.[key]?.moyenne !== undefined ? s + (g.coefficient || 1) : s, 0);

  const tt: Record<string, number> = {};
  const vc: Record<string, number> = {};
  const mg: Record<string, number | null> = {};
  for (const k of termKeys) { tt[k] = termTotal(k); vc[k] = termVC(k); mg[k] = vc[k] > 0 ? tt[k] / vc[k] : null; }

  const annualTotal = Object.values(mg).filter(v => v !== null).reduce((s, v) => s + v!, 0);
  const annualCount = Object.values(mg).filter(v => v !== null).length;
  const mgA = annualCount > 0 ? annualTotal / annualCount : null;

  const activeMoy = isT1 ? mg.T1 : isT2 ? mg.T2 : mgA ?? mg.T3;
  const globalMention = getMention(activeMoy ?? null);
  const rank = isT1 ? rankings.T1 : isT2 ? rankings.T2 : rankings.T3;

  const colSpanMoyennes = 1 + (showT2 ? 1 : 0) + (showT3 ? 1 : 0) + (showAnn ? 1 : 0);

  return (
    <div style={{ padding: '2mm 14mm 10mm', minHeight: '270mm', maxWidth: '190mm', margin: '0 auto', fontFamily: '"Times New Roman", serif', fontSize: '10pt', color: '#000', backgroundColor: '#fff' }}>

      {/* ═══ HEADER BAND ═══ */}
      <div style={{ backgroundColor: BLUE, color: '#fff', padding: '6pt 10pt', marginBottom: '5mm', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8pt', alignItems: 'center' }}>
        <div style={{ fontSize: '8pt', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Ministère de l'Éducation Nationale</div>
          <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>et de l'Alphabétisation</div>
          <div style={{ marginTop: '3pt' }}>IRE : {schoolInfo?.region ?? '—'}</div>
          <div>DPE : {schoolInfo?.commune ?? '—'}</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: '120pt' }}>
          {schoolInfo?.logo_url
            ? <img src={schoolInfo.logo_url} alt="Logo" style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto 4pt', display: 'block' }} />
            : <div style={{ width: 52, height: 52, border: '2pt solid rgba(255,255,255,0.6)', borderRadius: '50%', margin: '0 auto 4pt', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7pt', fontWeight: 'bold' }}>LOGO</div>
          }
          <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '13pt', textTransform: 'uppercase', lineHeight: 1.2 }}>
            {schoolInfo?.name ?? 'Établissement Scolaire'}
          </div>
          <div style={{ fontWeight: 'bold', fontSize: '12pt', marginTop: '3pt', letterSpacing: '0.5pt', borderTop: '1pt solid rgba(255,255,255,0.35)', paddingTop: '3pt' }}>
            BULLETIN DE NOTES
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: '8pt', lineHeight: 1.6 }}>
          <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>République de Guinée</div>
          <div style={{ fontStyle: 'italic', marginTop: '3pt' }}>Travail — Justice — Solidarité</div>
        </div>
      </div>

      {/* ═══ INFOS ÉLÈVE ═══ */}
      <div style={{ marginBottom: '4mm', padding: '3pt 0', borderBottom: `2pt solid ${BLUE}`, display: 'grid', gridTemplateColumns: 'max-content 1fr max-content 1fr', gap: '2pt 16pt', fontSize: '10pt', lineHeight: 1.9 }}>
        <strong>Année Scolaire :</strong><span>{year?.name ?? '—'}</span>
        <strong>Classe :</strong><span>{cls?.name ?? '—'}</span>
        <strong style={{ gridColumn: '1' }}>Élève :</strong>
        <span style={{ gridColumn: '2 / 5' }}>{student?.first_name} {student?.last_name}</span>
      </div>

      {/* ═══ SECTION 1 ═══ */}
      <div style={{ backgroundColor: BLUE, color: '#fff', textAlign: 'center', fontWeight: 'bold', padding: '3pt', fontSize: '10pt', marginBottom: '3mm' }}>
        {isT1 ? '1 — Moyenne du 1er Trimestre' : isT2 ? '1 — Moyennes des 1er et 2ème Trimestres' : '1 — Moyennes trimestrielle et annuelle'}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm', fontSize: '9pt' }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ ...thStyle, textAlign: 'left', paddingLeft: '6pt', width: '28%' }}>Matières</th>
            <th rowSpan={2} style={{ ...thStyle, width: '7%' }}>Coeff.</th>
            <th colSpan={colSpanMoyennes} style={thStyle}>Moyenne{colSpanMoyennes > 1 ? 's' : ''}</th>
            <th rowSpan={2} style={{ ...thStyle, width: '17%' }}>Appréciations</th>
          </tr>
          <tr>
            <th style={{ ...thStyle, width: '11%' }}>1er Trim.</th>
            {showT2  && <th style={{ ...thStyle, width: '11%' }}>2ème Trim.</th>}
            {showT3  && <th style={{ ...thStyle, width: '11%' }}>3ème Trim.</th>}
            {showAnn && <th style={{ ...thStyle, width: '11%' }}>Annuelle</th>}
          </tr>
        </thead>
        <tbody>
          {subjectResults.map((g: any, i: number) => {
            const activeMoyRow = isT1 ? g.grades?.T1?.moyenne : isT2 ? g.grades?.T2?.moyenne : (g.grades?.T3?.moyenne ?? null);
            const rowBg = i % 2 === 0 ? '#fff' : B_SOFT;
            const ann = (() => {
              const vals = (['T1','T2','T3'] as const).map(k => g.grades?.[k]?.moyenne).filter((v: any) => v !== null && v !== undefined);
              return vals.length > 0 ? vals.reduce((a: number, b: any) => a + b, 0) / vals.length : null;
            })();
            return (
              <tr key={i}>
                <td style={{ ...tdStyle, fontWeight: 'bold', backgroundColor: rowBg }}>{g.name}</td>
                <td style={{ ...tdStyle, textAlign: 'center', backgroundColor: rowBg }}>{g.coefficient}</td>
                <td style={{ ...tdStyle, textAlign: 'center', backgroundColor: rowBg }}>{fmt(g.grades?.T1?.moyenne ?? null)}</td>
                {showT2  && <td style={{ ...tdStyle, textAlign: 'center', backgroundColor: rowBg }}>{fmt(g.grades?.T2?.moyenne ?? null)}</td>}
                {showT3  && <td style={{ ...tdStyle, textAlign: 'center', backgroundColor: rowBg }}>{fmt(g.grades?.T3?.moyenne ?? null)}</td>}
                {showAnn && <td style={{ ...tdStyle, textAlign: 'center', backgroundColor: rowBg }}>{fmt(ann)}</td>}
                <td style={{ ...tdStyle, textAlign: 'center', fontStyle: 'italic', backgroundColor: rowBg }}>
                  {getMention(activeMoyRow ?? null) !== '—' ? getMention(activeMoyRow ?? null) : ''}
                </td>
              </tr>
            );
          })}
          {/* Total */}
          <tr>
            <td style={{ ...tdStyle, fontWeight: 'bold', backgroundColor: B_SOFT }}>Total</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: B_SOFT }}>{totalCoeff}</td>
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: B_SOFT }}>{vc.T1 > 0 ? fmt(tt.T1) : '—'}</td>
            {showT2  && <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: B_SOFT }}>{vc.T2 > 0 ? fmt(tt.T2) : '—'}</td>}
            {showT3  && <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: B_SOFT }}>{vc.T3 > 0 ? fmt(tt.T3) : '—'}</td>}
            {showAnn && <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: B_SOFT }}>{vc.T3 > 0 ? fmt(tt.T3) : '—'}</td>}
            <td style={{ ...tdStyle, backgroundColor: BLUE }} />
          </tr>
          {/* Moyenne générale */}
          <tr>
            <td style={{ ...tdStyle, fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>Moyenne générale</td>
            <td style={{ ...tdStyle, backgroundColor: BLUE }} />
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>{mg.T1 !== null ? `${fmt(mg.T1)}/20` : '—'}</td>
            {showT2 && <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>{mg.T2 !== null ? `${fmt(mg.T2)}/20` : '—'}</td>}
            {showT3 && <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>{mg.T3 !== null ? `${fmt(mg.T3)}/20` : '—'}</td>}
            {showAnn && <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>{mgA !== null ? `${fmt(mgA)}/20` : '—'}</td>}
            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', fontStyle: 'italic', backgroundColor: BLUE, color: '#fff' }}>{globalMention}</td>
          </tr>
        </tbody>
      </table>

      {/* ═══ SECTION 2 ═══ */}
      <div style={{ backgroundColor: BLUE, color: '#fff', textAlign: 'center', fontWeight: 'bold', padding: '3pt', fontSize: '10pt', marginBottom: '3mm' }}>
        2 — Récapitulation des moyennes, appréciations et observations
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm', fontSize: '9pt' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '26%' }}>Période</th>
            <th style={thStyle}>Moyenne</th>
            <th style={thStyle}>Appréciation</th>
            <th colSpan={2} style={thStyle}>Observation</th>
          </tr>
          <tr>
            <th style={thStyle}></th><th style={thStyle}></th><th style={thStyle}></th>
            <th style={thStyle}>Passe en classe sup.</th>
            <th style={thStyle}>Redouble la classe</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            const rows: { label: string; moy: number | null }[] = [
              { label: '1er Trimestre',  moy: mg.T1 },
              ...(showT2 ? [{ label: '2ème Trimestre', moy: mg.T2 ?? null }] : []),
              ...(showT3 ? [{ label: '3ème Trimestre', moy: mg.T3 ?? null }] : []),
            ];
            return rows.map(({ label, moy }, i) => {
              const rowBg = i % 2 === 0 ? '#fff' : B_SOFT;
              const passes = moy !== null && moy >= 10;
              return (
                <tr key={label}>
                  <td style={{ ...tdStyle, fontWeight: 'bold', backgroundColor: rowBg }}>{label}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', backgroundColor: rowBg }}>{moy !== null ? fmt(moy) : ''}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', backgroundColor: rowBg }}>{moy !== null ? getMention(moy) : ''}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: rowBg }}>{moy !== null && passes ? 'X' : ''}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: rowBg }}>{moy !== null && !passes ? 'X' : ''}</td>
                </tr>
              );
            });
          })()}
          {isT3 && (
            <>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 'bold', backgroundColor: B_SOFT }}>Moyenne annuelle</td>
                <td style={{ ...tdStyle, textAlign: 'center', backgroundColor: B_SOFT }}>{mgA !== null ? fmt(mgA) : ''}</td>
                <td style={{ ...tdStyle, textAlign: 'center', backgroundColor: B_SOFT }}>{mgA !== null ? getMention(mgA) : ''}</td>
                <td style={{ ...tdStyle, backgroundColor: B_SOFT }} /><td style={{ ...tdStyle, backgroundColor: B_SOFT }} />
              </tr>
              <tr>
                <td style={{ ...tdStyle, fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>Classement annuel</td>
                <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>
                  {rank ? `${rank}ème` : '—'} / {classSize} Élèves
                </td>
              </tr>
            </>
          )}
          {!isT3 && (
            <tr>
              <td style={{ ...tdStyle, fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>
                Classement {isT1 ? '1er Trimestre' : '2ème Trimestre'}
              </td>
              <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>
                {rank ? `${rank}ème` : '—'} / {classSize} Élèves
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ═══ FOOTER ═══ */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '6mm' }}>
        <div style={{ border: `1pt solid ${BLUE}`, padding: '4pt 10pt', fontSize: '10pt' }}>
          <strong>Appréciation :</strong> {activeMoy !== null ? getMention(activeMoy) : '—'}
        </div>
        <div style={{ textAlign: 'center', fontSize: '10pt' }}>
          <div>{schoolInfo?.city ?? 'Conakry'}, le {new Date().toLocaleDateString('fr-FR')}</div>
          <div style={{ fontWeight: 'bold', marginTop: '5mm', textDecoration: 'underline' }}>Le Directeur Général</div>
          <div style={{ height: '18mm' }} />
          <div style={{ fontWeight: 'bold' }}>{schoolInfo?.director_name ?? ''}</div>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

interface Props { student?: any; onBack: () => void }

export default function BulletinSection({ student: initStudent, onBack }: Props) {
  const [mobileView, setMobileView] = useState<'list' | 'bulletin'>(initStudent ? 'bulletin' : 'list');
  const [students, setStudents]   = useState<any[]>([]);
  const [years, setYears]         = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(initStudent || null);
  const [selectedYear, setSelectedYear]       = useState('');
  const [selectedTerm, setSelectedTerm]       = useState(TERMS_LABELS[0]);
  const [bulletinData, setBulletinData]       = useState<any>(null);
  const [loading, setLoading]     = useState(false);
  const [search, setSearch]       = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const loadBase = useCallback(async () => {
    const [sData, yData] = await Promise.all([api.getStudentsDetailed(), api.getSchoolYears()]);
    setStudents(sData.students || []);
    setYears(yData);
    const active = yData.find((y: any) => y.is_active == 1 || y.is_active === true) || yData[0];
    if (active && !selectedYear) setSelectedYear(String(active.id));
  }, []);

  useEffect(() => { loadBase(); }, [loadBase]);

  const loadBulletin = useCallback(async () => {
    if (!selectedStudent) return;
    setLoading(true);
    try { const data = await api.getStudentBulletin(selectedStudent.id, selectedYear || undefined); setBulletinData(data); }
    catch { toast.error('Erreur chargement bulletin'); }
    finally { setLoading(false); }
  }, [selectedStudent, selectedYear]);

  useEffect(() => { loadBulletin(); }, [loadBulletin]);

  const print = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>Bulletin</title><meta charset="utf-8"><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:"Times New Roman",serif;background:white;}@media print{@page{size:A4;margin:15mm;}body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style></head><body>${printRef.current.innerHTML}</body></html>`);
    win.document.close(); win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  const q = search.toLowerCase();
  const filteredStudents = students.filter(s => !q || (s.first_name + ' ' + s.last_name).toLowerCase().includes(q) || (s.class_name || '').toLowerCase().includes(q));

  return (
    <div className="space-y-4 animate-in">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} style={{ background: BLUE }} className="p-2 text-white rounded-xl hover:opacity-90 transition-all flex-shrink-0">
            <ChevronLeft size={18} />
          </button>
          <div>
            <h2 className="text-lg lg:text-2xl font-black text-gray-900 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Bulletins</h2>
            <p className="text-gray-400 text-xs lg:text-sm font-bold uppercase tracking-widest hidden sm:block">Résultats et bulletins scolaires</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Bouton retour liste sur mobile */}
          {mobileView === 'bulletin' && (
            <button onClick={() => setMobileView('list')}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-semibold">
              ← Élèves
            </button>
          )}
          {bulletinData && (
            <button onClick={print} style={{ background: BLUE }} className="flex items-center gap-2 px-3 lg:px-5 py-2 lg:py-2.5 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all">
              <Printer size={15} /> <span className="hidden sm:inline">Imprimer</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── Split layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {/* Liste élèves — masquée sur mobile si bulletin ouvert */}
        <div className={`lg:col-span-4 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${mobileView === 'bulletin' ? 'hidden lg:flex' : 'flex'}`}
          style={{ height: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 600 : undefined, minHeight: 280 }}>
          <div className="p-4 border-b border-gray-200 bg-gray-50 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Chercher un élève…" value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none" />
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400 flex-shrink-0" />
              <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)}
                className="flex-1 p-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none">
                {years.map(y => <option key={y.id} value={y.id}>{y.name}{(y.is_active == 1 || y.is_active) ? ' ★' : ''}</option>)}
              </select>
            </div>
            <div className="flex gap-1">
              {TERMS_LABELS.map((t, i) => (
                <button key={t} onClick={() => setSelectedTerm(t)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedTerm === t ? 'text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                  style={selectedTerm === t ? { backgroundColor: BLUE } : undefined}>
                  T{i + 1}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredStudents.length === 0 ? (
              <p className="p-8 text-center text-gray-400 text-sm">Aucun élève</p>
            ) : filteredStudents.map(s => (
              <button key={s.id} onClick={() => { setSelectedStudent(s); setMobileView('bulletin'); }}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center gap-3 ${selectedStudent?.id === s.id ? 'border-l-4 border-blue-600' : ''}`}
                style={selectedStudent?.id === s.id ? { backgroundColor: `${BLUE}08` } : undefined}>
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-400 text-xs flex-shrink-0">
                  {s.first_name[0]}{s.last_name[0]}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-bold truncate ${selectedStudent?.id === s.id ? 'text-blue-700' : 'text-gray-900'}`}>
                    {s.first_name} {s.last_name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{s.class_name || 'Sans classe'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Bulletin — masqué sur mobile si on est en liste */}
        <div className={`lg:col-span-8 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}`}
          style={{ height: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 600 : undefined, minHeight: 400 }}>
          {!selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/30">
              <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-6">
                <GraduationCap className="text-gray-200" size={40} />
              </div>
              <h3 className="text-lg font-bold text-gray-400">Sélectionnez un élève</h3>
              <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">Choisissez un élève dans la liste à gauche pour afficher son bulletin.</p>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Chargement du bulletin…</p>
              </div>
            </div>
          ) : bulletinData ? (
            <>
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs flex-shrink-0" style={{ backgroundColor: BLUE }}>
                    {selectedStudent.first_name[0]}{selectedStudent.last_name[0]}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                    <p className="text-xs text-gray-400">{bulletinData.class?.name} · {selectedTerm}</p>
                  </div>
                </div>
                <button onClick={print} style={{ background: BLUE }} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-bold text-xs hover:opacity-90 transition-all">
                  <Printer size={14} /> Imprimer
                </button>
              </div>
              <div ref={printRef} className="flex-1 overflow-y-auto">
                <BulletinPrint data={bulletinData} term={selectedTerm} />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Erreur de chargement</div>
          )}
        </div>
      </div>
    </div>
  );
}
