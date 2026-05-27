import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Calendar, Plus, Trash2, User, Printer } from 'lucide-react';
import { PrintPreview } from './PrintPreview';
import { FullPageView, SectionTitle, formInputCls, formLabelCls } from './FullPageView';

const DAYS  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const TIMES = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];

// ── Print table ───────────────────────────────────────────────────────────────
function TimetablePrint({ timetable, className, schoolInfo, year }: {
    timetable:  any[]
    className:  string
    schoolInfo: any
    year:       string
}) {
    const BLUE = '#1a2f6e'
    const th: React.CSSProperties = {
        border: `1px solid ${BLUE}`, padding: '4pt 5pt', textAlign: 'center',
        fontWeight: 700, fontSize: '9pt', backgroundColor: BLUE, color: '#fff',
    }
    const td: React.CSSProperties = {
        border: '1px solid #ccc', padding: '4pt 5pt', fontSize: '8pt',
        verticalAlign: 'top', minHeight: 32,
    }

    // Build unique time-range slots from data, fallback to TIMES pairs
    const slots: { start: string; end: string }[] = []
    timetable.forEach(item => {
        if (!slots.find(s => s.start === item.start_time))
            slots.push({ start: item.start_time, end: item.end_time })
    })
    if (slots.length === 0) {
        TIMES.slice(0, -1).forEach((t, i) => slots.push({ start: t, end: TIMES[i + 1] }))
    }
    slots.sort((a, b) => a.start.localeCompare(b.start))

    const getCell = (day: string, start: string) =>
        timetable.find(item => item.day_of_week === day && item.start_time === start) ?? null

    return (
        <div style={{ padding: '10mm 12mm', fontFamily: '"Times New Roman", serif', color: '#000', backgroundColor: '#fff' }}>
            {/* ── Header ── */}
            <div style={{ backgroundColor: BLUE, color: '#fff', padding: '6pt 10pt', marginBottom: '5mm', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8pt', alignItems: 'center' }}>
                <div style={{ fontSize: '8pt', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>Ministère de l'Éducation Nationale</div>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>et de l'Alphabétisation</div>
                    {schoolInfo?.region  && <div>IRE : {schoolInfo.region}</div>}
                    {schoolInfo?.commune && <div>DPE : {schoolInfo.commune}</div>}
                </div>
                <div style={{ textAlign: 'center', minWidth: '120pt' }}>
                    {schoolInfo?.logo_url
                        ? <img src={schoolInfo.logo_url} alt="Logo" style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 4pt', display: 'block' }} />
                        : <div style={{ width: 48, height: 48, border: '2pt solid rgba(255,255,255,0.5)', borderRadius: '50%', margin: '0 auto 4pt', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7pt', fontWeight: 700 }}>LOGO</div>
                    }
                    <div style={{ fontWeight: 700, fontStyle: 'italic', fontSize: '13pt', textTransform: 'uppercase' }}>
                        {schoolInfo?.name ?? 'Établissement Scolaire'}
                    </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '8pt', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>République de Guinée</div>
                    <div style={{ fontStyle: 'italic', marginTop: '3pt' }}>Travail — Justice — Solidarité</div>
                </div>
            </div>

            {/* ── Title ── */}
            <div style={{ textAlign: 'center', marginBottom: '5mm' }}>
                <div style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1pt' }}>
                    Emploi du Temps
                </div>
                <div style={{ fontSize: '10pt', marginTop: '2pt' }}>
                    Classe : <strong>{className}</strong>
                    {year && <> &nbsp;—&nbsp; Année scolaire : <strong>{year}</strong></>}
                </div>
            </div>

            {/* ── Table ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                <thead>
                    <tr>
                        <th style={{ ...th, width: '12%' }}>Horaire</th>
                        {DAYS.map(d => <th key={d} style={{ ...th, width: `${88 / DAYS.length}%` }}>{d}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {slots.map(({ start, end }, ri) => (
                        <tr key={start} style={{ backgroundColor: ri % 2 === 0 ? '#fff' : '#f5f7ff' }}>
                            <td style={{ ...td, textAlign: 'center', fontWeight: 700, backgroundColor: '#eef1fa', fontSize: '8pt' }}>
                                {start}<br /><span style={{ fontSize: '7pt', color: '#555' }}>{end}</span>
                            </td>
                            {DAYS.map(day => {
                                const cell = getCell(day, start)
                                return (
                                    <td key={day} style={{ ...td, backgroundColor: cell ? '#eff6ff' : 'inherit' }}>
                                        {cell ? (
                                            <>
                                                <div style={{ fontWeight: 700, color: '#1a2f6e', fontSize: '8.5pt' }}>{cell.subject_name}</div>
                                                <div style={{ color: '#555', fontSize: '7pt', marginTop: 2 }}>
                                                    {cell.teacher_first} {cell.teacher_last}
                                                </div>
                                            </>
                                        ) : null}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* ── Footer ── */}
            <div style={{ marginTop: '8mm', display: 'flex', justifyContent: 'space-between', fontSize: '9pt' }}>
                <div>
                    <div style={{ fontSize: '8pt', color: '#555' }}>
                        {schoolInfo?.city ?? 'Conakry'}, le {new Date().toLocaleDateString('fr-FR')}
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, textDecoration: 'underline' }}>Le Directeur Général</div>
                    <div style={{ height: 18 }} />
                    <div style={{ fontWeight: 600 }}>{schoolInfo?.director_name ?? ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, textDecoration: 'underline' }}>Visa Inspection</div>
                    <div style={{ height: 18 }} />
                </div>
            </div>
        </div>
    )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function toMinutes(t: string) {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + (m || 0)
}

function getSpan(startTime: string, endTime: string): number {
    const diff = (toMinutes(endTime) - toMinutes(startTime)) / 60
    return Math.max(1, Math.round(diff))
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Timetable() {
    const [classes,       setClasses]       = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [subjects,      setSubjects]      = useState<any[]>([]);
    const [staff,         setStaff]         = useState<any[]>([]);
    const [timetable,     setTimetable]     = useState<any[]>([]);
    const [schoolInfo,    setSchoolInfo]     = useState<any>(null);
    const [activeYear,    setActiveYear]     = useState('');
    const [isFormOpen,    setIsFormOpen]     = useState(false);
    const [printOpen,     setPrintOpen]      = useState(false);
    const [newEntry, setNewEntry] = useState({
        subject_id: '', teacher_id: '', day_of_week: 'Lundi',
        start_time: '08:00', end_time: '10:00'
    });

    useEffect(() => {
        Promise.all([
            dbService.getClasses(), dbService.getSubjects(), dbService.getStaff(),
            dbService.getSchoolInfo(), dbService.getSchoolYears(),
        ]).then(([cls, sub, stf, info, years]) => {
            setClasses(cls);
            setSubjects(sub);
            setStaff(stf.filter((s: any) => s.role === 'Enseignant'));
            if (info) setSchoolInfo(info);
            if (years?.length) {
                const active = years.find((y: any) => y.is_active) ?? years[0];
                setActiveYear(active?.name ?? '');
            }
            if (cls.length > 0) setSelectedClass(cls[0].id);
        });
    }, []);

    useEffect(() => {
        if (selectedClass) dbService.getTimetable(selectedClass).then(setTimetable);
    }, [selectedClass]);

    const handleSaveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !newEntry.subject_id || !newEntry.teacher_id) return;
        await dbService.addTimetableEntry({ ...newEntry, class_id: selectedClass });
        setIsFormOpen(false);
        dbService.getTimetable(selectedClass).then(setTimetable);
        setNewEntry({ subject_id: '', teacher_id: '', day_of_week: 'Lundi', start_time: '08:00', end_time: '10:00' });
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Supprimer ce créneau ?')) return;
        await dbService.deleteTimetableEntry(id);
        dbService.getTimetable(selectedClass).then(setTimetable);
    };

    const selectedClassName = classes.find(c => c.id?.toString() === selectedClass?.toString())?.name ?? '';

    return (
        <div className="space-y-5 animate-in fade-in duration-500">

            {/* Print preview overlay */}
            {printOpen && (
                <PrintPreview
                    title={`Emploi du temps — ${selectedClassName}`}
                    onClose={() => setPrintOpen(false)}
                >
                    <TimetablePrint
                        timetable={timetable}
                        className={selectedClassName}
                        schoolInfo={schoolInfo}
                        year={activeYear}
                    />
                </PrintPreview>
            )}

            {/* Add entry full page */}
            {isFormOpen && (
                <FullPageView title="NOUVEAU CRÉNEAU" onBack={() => setIsFormOpen(false)} maxWidth={520}>
                    <form onSubmit={handleSaveEntry}>
                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Cours</SectionTitle>
                            <div style={{ display: 'grid', gap: 16 }}>
                                <div>
                                    <label className={formLabelCls}>Matière *</label>
                                    <select className={formInputCls} value={newEntry.subject_id} onChange={e => setNewEntry({ ...newEntry, subject_id: e.target.value })} required>
                                        <option value="">Sélectionner une matière</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={formLabelCls}>Enseignant *</label>
                                    <select className={formInputCls} value={newEntry.teacher_id} onChange={e => setNewEntry({ ...newEntry, teacher_id: e.target.value })} required>
                                        <option value="">Sélectionner un enseignant</option>
                                        {staff.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Horaire</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 20px' }}>
                                <div>
                                    <label className={formLabelCls}>Jour *</label>
                                    <select className={formInputCls} value={newEntry.day_of_week} onChange={e => setNewEntry({ ...newEntry, day_of_week: e.target.value })} required>
                                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className={formLabelCls}>Heure début</label>
                                    <input type="time" className={formInputCls} value={newEntry.start_time} onChange={e => setNewEntry({ ...newEntry, start_time: e.target.value })} required />
                                </div>
                                <div>
                                    <label className={formLabelCls}>Heure fin</label>
                                    <input type="time" className={formInputCls} value={newEntry.end_time} onChange={e => setNewEntry({ ...newEntry, end_time: e.target.value })} required />
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                            <button type="button" onClick={() => setIsFormOpen(false)} className="px-5 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Annuler</button>
                            <button type="submit" className="btn-primary">Enregistrer</button>
                        </div>
                    </form>
                </FullPageView>
            )}

            {/* Header */}
            <div className="no-print bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Emploi du Temps</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Organisation hebdomadaire des cours</p>
                </div>
                <div className="flex items-center gap-2">
                    <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white outline-none focus:border-blue-400" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                        <option value="">Sélectionner une classe</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button onClick={() => setPrintOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                        <Printer size={14} /> Imprimer
                    </button>
                    <button onClick={() => setIsFormOpen(true)} className="btn-primary flex items-center gap-1.5 text-sm">
                        <Plus size={14} /> Ajouter un cours
                    </button>
                </div>
            </div>

            {/* Timetable Grid */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
                <table className="w-full border-collapse text-sm" style={{ minWidth: 700 }}>
                    <thead>
                        <tr style={{ backgroundColor: '#1a2f6e' }}>
                            <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ width: '10%', color: '#fff' }}>Horaire</th>
                            {DAYS.map(d => (
                                <th key={d} className="p-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: '#fff' }}>{d}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {(() => {
                            const occupied = new Set<string>()
                            // Pre-compute occupied cells from spanning entries
                            TIMES.slice(0, -1).forEach((time, ri) => {
                                DAYS.forEach(day => {
                                    if (occupied.has(`${day}-${time}`)) return
                                    const item = timetable.find(t => t.day_of_week === day && t.start_time === time)
                                    if (item) {
                                        const span = getSpan(item.start_time, item.end_time)
                                        for (let i = 1; i < span; i++) {
                                            if (TIMES[ri + i]) occupied.add(`${day}-${TIMES[ri + i]}`)
                                        }
                                    }
                                })
                            })

                            return TIMES.slice(0, -1).map((time, ri) => (
                                <tr key={time} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                    <td className="p-3 text-xs text-gray-500 font-medium text-center border-r border-gray-100">
                                        {time}<br /><span className="text-gray-400">{TIMES[ri + 1]}</span>
                                    </td>
                                    {DAYS.map(day => {
                                        if (occupied.has(`${day}-${time}`)) return null
                                        const item = timetable.find(t => t.day_of_week === day && t.start_time === time)
                                        const span = item ? getSpan(item.start_time, item.end_time) : 1
                                        return (
                                            <td key={day} rowSpan={span} className="p-2 border-l border-gray-100 align-top" style={{ minHeight: 56 }}>
                                                {item && (
                                                    <div className="group relative rounded-lg p-2 h-full" style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                                        <button onClick={() => handleDelete(item.id)} className="no-print absolute top-1 right-1 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-50">
                                                            <Trash2 size={12} />
                                                        </button>
                                                        <p className="text-xs font-semibold text-blue-900 leading-tight">{item.subject_name}</p>
                                                        <p className="text-[10px] text-blue-400 mt-0.5">{item.start_time} – {item.end_time}</p>
                                                        <div className="flex items-center gap-1 mt-1">
                                                            <User size={9} className="text-gray-400" />
                                                            <p className="text-[10px] text-gray-500">{item.teacher_first} {item.teacher_last}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))
                        })()}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
