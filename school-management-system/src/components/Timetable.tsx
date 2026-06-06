import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import { Plus, Trash2, User, Printer, BookOpen, FileText, ArrowLeft } from 'lucide-react';
import { PrintPreview } from './PrintPreview';
import { FullPageView, SectionTitle, formInputCls, formLabelCls } from './FullPageView';

const DAYS  = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const TIMES = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
const TERMS = ['1er Trimestre', '2ème Trimestre', '3ème Trimestre'];
const HDR   = '#111827';

// ── Shared print header ───────────────────────────────────────────────────────
function PrintHeader({ schoolInfo }: { schoolInfo: any }) {
    return (
        <div style={{ backgroundColor: HDR, color: '#fff', padding: '6pt 10pt', marginBottom: '5mm', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8pt', alignItems: 'center' }}>
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
    )
}

function PrintFooter({ schoolInfo }: { schoolInfo: any }) {
    return (
        <div style={{ marginTop: '8mm', display: 'flex', justifyContent: 'space-between', fontSize: '9pt' }}>
            <div style={{ fontSize: '8pt', color: '#555' }}>{schoolInfo?.city ?? 'Conakry'}, le {new Date().toLocaleDateString('fr-FR')}</div>
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
    )
}

// ── Print: Regular timetable ─────────────────────────────────────────────────
function TimetablePrint({ timetable, className, schoolInfo, year }: {
    timetable: any[], className: string, schoolInfo: any, year: string
}) {
    const th: React.CSSProperties = {
        border: `1px solid ${HDR}`, padding: '4pt 5pt', textAlign: 'center',
        fontWeight: 700, fontSize: '9pt', backgroundColor: HDR, color: '#fff',
    }
    const td: React.CSSProperties = {
        border: '1px solid #ccc', padding: '4pt 5pt', fontSize: '8pt', verticalAlign: 'top', minHeight: 32,
    }
    const slots: { start: string; end: string }[] = []
    timetable.forEach(item => {
        if (!slots.find(s => s.start === item.start_time)) slots.push({ start: item.start_time, end: item.end_time })
    })
    if (slots.length === 0) TIMES.slice(0, -1).forEach((t, i) => slots.push({ start: t, end: TIMES[i + 1] }))
    slots.sort((a, b) => a.start.localeCompare(b.start))
    const getCell = (day: string, start: string) =>
        timetable.find(item => item.day_of_week === day && item.start_time === start) ?? null

    return (
        <div style={{ padding: '10mm 12mm', fontFamily: '"Times New Roman", serif', color: '#000', backgroundColor: '#fff' }}>
            <PrintHeader schoolInfo={schoolInfo} />
            <div style={{ textAlign: 'center', marginBottom: '5mm' }}>
                <div style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1pt' }}>Emploi du Temps</div>
                <div style={{ fontSize: '10pt', marginTop: '2pt' }}>
                    Classe : <strong>{className}</strong>
                    {year && <> &nbsp;—&nbsp; Année scolaire : <strong>{year}</strong></>}
                </div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                <thead>
                    <tr>
                        <th style={{ ...th, width: '12%' }}>Horaire</th>
                        {DAYS.map(d => <th key={d} style={{ ...th, width: `${88 / DAYS.length}%` }}>{d}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {slots.map(({ start, end }, ri) => (
                        <tr key={start} style={{ backgroundColor: ri % 2 === 0 ? '#fff' : '#f5f5f5' }}>
                            <td style={{ ...td, textAlign: 'center', fontWeight: 700, backgroundColor: '#f0f0f0' }}>
                                {start}<br /><span style={{ fontSize: '7pt', color: '#555' }}>{end}</span>
                            </td>
                            {DAYS.map(day => {
                                const cell = getCell(day, start)
                                return (
                                    <td key={day} style={{ ...td, backgroundColor: cell ? '#f5f5f5' : 'inherit' }}>
                                        {cell && (
                                            <>
                                                <div style={{ fontWeight: 700, color: HDR }}>{cell.subject_name}</div>
                                                <div style={{ color: '#555', fontSize: '7pt', marginTop: 2 }}>{cell.teacher_first} {cell.teacher_last}</div>
                                            </>
                                        )}
                                    </td>
                                )
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <PrintFooter schoolInfo={schoolInfo} />
        </div>
    )
}

// ── Print: Composition schedule ───────────────────────────────────────────────
function CompositionPrint({ entries, scheduleName, term, schoolInfo, year, classes }: {
    entries: any[], scheduleName: string, term: string, schoolInfo: any, year: string, classes: any[]
}) {
    const th: React.CSSProperties = {
        border: `1px solid ${HDR}`, padding: '4pt 5pt', textAlign: 'center',
        fontWeight: 700, fontSize: '9pt', backgroundColor: HDR, color: '#fff',
    }
    const td: React.CSSProperties = { border: '1px solid #ccc', padding: '4pt 5pt', fontSize: '8pt', verticalAlign: 'top' }

    const slots: { start: string, end: string }[] = []
    entries.forEach(e => {
        if (!slots.find(s => s.start === e.start_time)) slots.push({ start: e.start_time, end: e.end_time })
    })
    slots.sort((a, b) => a.start.localeCompare(b.start))

    const getClassNames = (entry: any) => {
        try {
            const ids: string[] = JSON.parse(entry.class_ids || '[]')
            return ids.map(id => classes.find(c => c.id?.toString() === id?.toString())?.name ?? id).join(', ')
        } catch { return '' }
    }

    return (
        <div style={{ padding: '10mm 12mm', fontFamily: '"Times New Roman", serif', color: '#000', backgroundColor: '#fff' }}>
            <PrintHeader schoolInfo={schoolInfo} />
            <div style={{ textAlign: 'center', marginBottom: '5mm' }}>
                <div style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1pt' }}>Calendrier de Composition</div>
                <div style={{ fontSize: '10pt', marginTop: '2pt' }}>
                    <strong>{scheduleName}</strong>
                    {term && <> — {term}</>}
                    {year && <> &nbsp;—&nbsp; Année scolaire : <strong>{year}</strong></>}
                </div>
            </div>
            {slots.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#666', fontSize: '10pt' }}>Aucun créneau défini</div>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8.5pt' }}>
                    <thead>
                        <tr>
                            <th style={{ ...th, width: '12%' }}>Horaire</th>
                            {DAYS.map(d => <th key={d} style={{ ...th, width: `${88 / DAYS.length}%` }}>{d}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {slots.map(({ start, end }, ri) => (
                            <tr key={start} style={{ backgroundColor: ri % 2 === 0 ? '#fff' : '#f5f5f5' }}>
                                <td style={{ ...td, textAlign: 'center', fontWeight: 700, backgroundColor: '#f0f0f0' }}>
                                    {start}<br /><span style={{ fontSize: '7pt', color: '#555' }}>{end}</span>
                                </td>
                                {DAYS.map(day => {
                                    const cells = entries.filter(e => e.day_of_week === day && e.start_time === start)
                                    return (
                                        <td key={day} style={{ ...td, backgroundColor: cells.length > 0 ? '#f5f5f5' : 'inherit' }}>
                                            {cells.map((cell, i) => (
                                                <div key={i} style={{ marginBottom: i < cells.length - 1 ? '4pt' : 0 }}>
                                                    <div style={{ fontWeight: 700, color: HDR }}>{cell.subject_name}</div>
                                                    <div style={{ color: '#555', fontSize: '7pt', marginTop: 1 }}>{getClassNames(cell)}</div>
                                                </div>
                                            ))}
                                        </td>
                                    )
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            <PrintFooter schoolInfo={schoolInfo} />
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
    const [mode, setMode] = useState<'cours' | 'composition'>('cours');

    // Common data
    const [classes,      setClasses]      = useState<any[]>([]);
    const [subjects,     setSubjects]     = useState<any[]>([]);
    const [staff,        setStaff]        = useState<any[]>([]);
    const [schoolInfo,   setSchoolInfo]   = useState<any>(null);
    const [activeYear,   setActiveYear]   = useState('');
    const [activeYearId, setActiveYearId] = useState('');

    // Regular timetable state
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [timetable,     setTimetable]     = useState<any[]>([]);
    const [isFormOpen,    setIsFormOpen]    = useState(false);
    const [printOpen,     setPrintOpen]     = useState(false);
    const [newEntry, setNewEntry] = useState({
        subject_id: '', teacher_id: '', day_of_week: 'Lundi', start_time: '08:00', end_time: '10:00'
    });

    // Composition state
    const [schedules,        setSchedules]        = useState<any[]>([]);
    const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
    const [scheduleEntries,  setScheduleEntries]  = useState<any[]>([]);
    const [isSchFormOpen,    setIsSchFormOpen]    = useState(false);
    const [isEntryFormOpen,  setIsEntryFormOpen]  = useState(false);
    const [printCompOpen,    setPrintCompOpen]    = useState(false);
    const [newSchedule, setNewSchedule] = useState({ name: '', term: '1er Trimestre' });
    const [newCompEntry, setNewCompEntry] = useState({
        subject_id: '', day_of_week: 'Lundi', start_time: '08:00', end_time: '10:00',
        class_ids: [] as string[], notes: ''
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
                setActiveYearId(active?.id ?? '');
            }
            if (cls.length > 0) setSelectedClass(cls[0].id);
        });
    }, []);

    useEffect(() => {
        if (selectedClass) dbService.getTimetable(selectedClass).then(setTimetable);
    }, [selectedClass]);

    useEffect(() => {
        if (mode === 'composition') dbService.getCompositionSchedules().then(setSchedules);
    }, [mode]);

    // Regular timetable handlers
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

    // Composition handlers
    const handleSaveSchedule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSchedule.name) return;
        await dbService.addCompositionSchedule({ ...newSchedule, school_year_id: activeYearId || null });
        setIsSchFormOpen(false);
        setNewSchedule({ name: '', term: '1er Trimestre' });
        dbService.getCompositionSchedules().then(setSchedules);
    };

    const handleDeleteSchedule = async (id: string) => {
        if (!window.confirm('Supprimer ce calendrier et tous ses créneaux ?')) return;
        await dbService.deleteCompositionSchedule(id);
        if (selectedSchedule?.id === id) setSelectedSchedule(null);
        dbService.getCompositionSchedules().then(setSchedules);
    };

    const handleSelectSchedule = (sch: any) => {
        setSelectedSchedule(sch);
        dbService.getCompositionScheduleEntries(sch.id).then(setScheduleEntries);
    };

    const handlePrintScheduleFromList = async (sch: any) => {
        const entries = await dbService.getCompositionScheduleEntries(sch.id);
        setSelectedSchedule(sch);
        setScheduleEntries(entries);
        setPrintCompOpen(true);
    };

    const handleSaveCompEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSchedule || !newCompEntry.subject_id || newCompEntry.class_ids.length === 0) return;
        await dbService.addCompositionScheduleEntry({ ...newCompEntry, schedule_id: selectedSchedule.id });
        setIsEntryFormOpen(false);
        setNewCompEntry({ subject_id: '', day_of_week: 'Lundi', start_time: '08:00', end_time: '10:00', class_ids: [], notes: '' });
        dbService.getCompositionScheduleEntries(selectedSchedule.id).then(setScheduleEntries);
    };

    const handleDeleteCompEntry = async (id: string) => {
        if (!window.confirm('Supprimer ce créneau ?')) return;
        await dbService.deleteCompositionScheduleEntry(id);
        dbService.getCompositionScheduleEntries(selectedSchedule.id).then(setScheduleEntries);
    };

    const toggleClassId = (id: string) => {
        setNewCompEntry(prev => ({
            ...prev,
            class_ids: prev.class_ids.includes(id) ? prev.class_ids.filter(c => c !== id) : [...prev.class_ids, id]
        }));
    };

    const getClassNames = (entry: any) => {
        try {
            const ids: string[] = JSON.parse(entry.class_ids || '[]')
            return ids.map(id => classes.find(c => c.id?.toString() === id?.toString())?.name ?? id).join(', ')
        } catch { return '' }
    };

    const selectedClassName = classes.find(c => c.id?.toString() === selectedClass?.toString())?.name ?? '';

    return (
        <div className="space-y-5 animate-in fade-in duration-500">

            {/* Print previews */}
            {printOpen && (
                <PrintPreview title={`Emploi du temps — ${selectedClassName}`} onClose={() => setPrintOpen(false)}>
                    <TimetablePrint timetable={timetable} className={selectedClassName} schoolInfo={schoolInfo} year={activeYear} />
                </PrintPreview>
            )}
            {printCompOpen && selectedSchedule && (
                <PrintPreview title={`Composition — ${selectedSchedule.name}`} onClose={() => setPrintCompOpen(false)}>
                    <CompositionPrint
                        entries={scheduleEntries} scheduleName={selectedSchedule.name}
                        term={selectedSchedule.term} schoolInfo={schoolInfo} year={activeYear} classes={classes}
                    />
                </PrintPreview>
            )}

            {/* Form: add regular timetable entry */}
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

            {/* Form: create composition schedule */}
            {isSchFormOpen && (
                <FullPageView title="NOUVEAU CALENDRIER DE COMPOSITION" onBack={() => setIsSchFormOpen(false)} maxWidth={480}>
                    <form onSubmit={handleSaveSchedule}>
                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Informations</SectionTitle>
                            <div style={{ display: 'grid', gap: 16 }}>
                                <div>
                                    <label className={formLabelCls}>Nom du calendrier *</label>
                                    <input type="text" className={formInputCls} placeholder="Ex: Composition 1er Trimestre" value={newSchedule.name} onChange={e => setNewSchedule({ ...newSchedule, name: e.target.value })} required />
                                </div>
                                <div>
                                    <label className={formLabelCls}>Trimestre</label>
                                    <select className={formInputCls} value={newSchedule.term} onChange={e => setNewSchedule({ ...newSchedule, term: e.target.value })}>
                                        {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                            <button type="button" onClick={() => setIsSchFormOpen(false)} className="px-5 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Annuler</button>
                            <button type="submit" className="btn-primary">Créer</button>
                        </div>
                    </form>
                </FullPageView>
            )}

            {/* Form: add composition entry */}
            {isEntryFormOpen && (
                <FullPageView title="NOUVEAU CRÉNEAU DE COMPOSITION" onBack={() => setIsEntryFormOpen(false)} maxWidth={560}>
                    <form onSubmit={handleSaveCompEntry}>
                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Matière & Horaire</SectionTitle>
                            <div style={{ display: 'grid', gap: 16 }}>
                                <div>
                                    <label className={formLabelCls}>Matière *</label>
                                    <select className={formInputCls} value={newCompEntry.subject_id} onChange={e => setNewCompEntry({ ...newCompEntry, subject_id: e.target.value })} required>
                                        <option value="">Sélectionner une matière</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px 20px' }}>
                                    <div>
                                        <label className={formLabelCls}>Jour *</label>
                                        <select className={formInputCls} value={newCompEntry.day_of_week} onChange={e => setNewCompEntry({ ...newCompEntry, day_of_week: e.target.value })}>
                                            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={formLabelCls}>Heure début</label>
                                        <input type="time" className={formInputCls} value={newCompEntry.start_time} onChange={e => setNewCompEntry({ ...newCompEntry, start_time: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className={formLabelCls}>Heure fin</label>
                                        <input type="time" className={formInputCls} value={newCompEntry.end_time} onChange={e => setNewCompEntry({ ...newCompEntry, end_time: e.target.value })} required />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <SectionTitle>Classes concernées *</SectionTitle>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10, marginTop: 10 }}>
                                {classes.map(c => (
                                    <label key={c.id} style={{
                                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                                        border: `1.5px solid ${newCompEntry.class_ids.includes(c.id?.toString()) ? HDR : '#e5e7eb'}`,
                                        borderRadius: 8, cursor: 'pointer',
                                        backgroundColor: newCompEntry.class_ids.includes(c.id?.toString()) ? '#f3f4f6' : '#fff',
                                        transition: 'all 0.15s',
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={newCompEntry.class_ids.includes(c.id?.toString())}
                                            onChange={() => toggleClassId(c.id?.toString())}
                                        />
                                        <span style={{ fontSize: 13, fontWeight: 500 }}>{c.name}</span>
                                    </label>
                                ))}
                            </div>
                            {newCompEntry.class_ids.length === 0 && (
                                <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>Sélectionnez au moins une classe</p>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
                            <button type="button" onClick={() => setIsEntryFormOpen(false)} className="px-5 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Annuler</button>
                            <button type="submit" className="btn-primary" disabled={newCompEntry.class_ids.length === 0}>Enregistrer</button>
                        </div>
                    </form>
                </FullPageView>
            )}

            {/* ── Header bar ── */}
            <div className="no-print bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Calendrier Scolaire</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {mode === 'cours' ? 'Organisation hebdomadaire des cours' : 'Emplois du temps pour compositions'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Mode toggle */}
                    <div className="flex border border-gray-200 rounded-lg overflow-hidden mr-1">
                        <button
                            onClick={() => setMode('cours')}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${mode === 'cours' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            <BookOpen size={13} /> Cours
                        </button>
                        <button
                            onClick={() => setMode('composition')}
                            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${mode === 'composition' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        >
                            <FileText size={13} /> Compositions
                        </button>
                    </div>

                    {/* Cours actions */}
                    {mode === 'cours' && (<>
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
                    </>)}

                    {/* Composition list actions */}
                    {mode === 'composition' && !selectedSchedule && (
                        <button onClick={() => setIsSchFormOpen(true)} className="btn-primary flex items-center gap-1.5 text-sm">
                            <Plus size={14} /> Nouveau calendrier
                        </button>
                    )}

                    {/* Composition detail actions */}
                    {mode === 'composition' && selectedSchedule && (<>
                        <button onClick={() => setPrintCompOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                            <Printer size={14} /> Imprimer
                        </button>
                        <button onClick={() => setIsEntryFormOpen(true)} className="btn-primary flex items-center gap-1.5 text-sm">
                            <Plus size={14} /> Ajouter un créneau
                        </button>
                    </>)}
                </div>
            </div>

            {/* ── Regular timetable grid ── */}
            {mode === 'cours' && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
                    <table className="w-full border-collapse text-sm" style={{ minWidth: 700 }}>
                        <thead>
                            <tr style={{ backgroundColor: HDR }}>
                                <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ width: '10%', color: '#fff' }}>Horaire</th>
                                {DAYS.map(d => (
                                    <th key={d} className="p-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: '#fff' }}>{d}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                const occupied = new Set<string>()
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
                                                        <div className="group relative rounded-lg p-2 h-full" style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db' }}>
                                                            <button onClick={() => handleDelete(item.id)} className="no-print absolute top-1 right-1 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-50">
                                                                <Trash2 size={12} />
                                                            </button>
                                                            <p className="text-xs font-semibold text-gray-900 leading-tight">{item.subject_name}</p>
                                                            <p className="text-[10px] text-gray-500 mt-0.5">{item.start_time} – {item.end_time}</p>
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
            )}

            {/* ── Composition: schedule list ── */}
            {mode === 'composition' && !selectedSchedule && (
                schedules.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                        <FileText className="mx-auto text-gray-300 mb-3" size={40} />
                        <p className="text-sm font-medium text-gray-500">Aucun calendrier de composition</p>
                        <p className="text-xs text-gray-400 mt-1">Créez un nouveau calendrier pour commencer</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {schedules.map(sch => (
                            <div key={sch.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-gray-300 transition-colors">
                                <button onClick={() => handleSelectSchedule(sch)} className="flex items-center gap-3 text-left flex-1 min-w-0">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: HDR }}>
                                        <FileText size={18} className="text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 truncate">{sch.name}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{sch.term}{activeYear && ` — ${activeYear}`}</div>
                                    </div>
                                </button>
                                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                    <button onClick={() => handlePrintScheduleFromList(sch)} className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
                                        <Printer size={12} /> Imprimer
                                    </button>
                                    <button onClick={() => handleDeleteSchedule(sch.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* ── Composition: schedule detail grid ── */}
            {mode === 'composition' && selectedSchedule && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2">
                        <button onClick={() => setSelectedSchedule(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                            <ArrowLeft size={16} />
                        </button>
                        <div>
                            <div className="text-sm font-semibold text-gray-900">{selectedSchedule.name}</div>
                            <div className="text-xs text-gray-500">{selectedSchedule.term}{activeYear && ` — ${activeYear}`}</div>
                        </div>
                    </div>

                    {scheduleEntries.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                            <p className="text-sm text-gray-500">Aucun créneau défini</p>
                            <p className="text-xs text-gray-400 mt-1">Cliquez sur "Ajouter un créneau" pour commencer</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-gray-200 overflow-auto">
                            <table className="w-full border-collapse text-sm" style={{ minWidth: 700 }}>
                                <thead>
                                    <tr style={{ backgroundColor: HDR }}>
                                        <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ width: '10%', color: '#fff' }}>Horaire</th>
                                        {DAYS.map(d => (
                                            <th key={d} className="p-3 text-center text-xs font-semibold uppercase tracking-wide" style={{ color: '#fff' }}>{d}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const slots: string[] = []
                                        scheduleEntries.forEach(e => { if (!slots.includes(e.start_time)) slots.push(e.start_time) })
                                        slots.sort()
                                        return slots.map((start, ri) => {
                                            const endTime = scheduleEntries.find(e => e.start_time === start)?.end_time ?? ''
                                            return (
                                                <tr key={start} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                                                    <td className="p-3 text-xs text-gray-500 font-medium text-center border-r border-gray-100">
                                                        {start}<br /><span className="text-gray-400">{endTime}</span>
                                                    </td>
                                                    {DAYS.map(day => {
                                                        const cells = scheduleEntries.filter(e => e.day_of_week === day && e.start_time === start)
                                                        return (
                                                            <td key={day} className="p-2 border-l border-gray-100 align-top" style={{ minHeight: 56 }}>
                                                                {cells.map(cell => (
                                                                    <div key={cell.id} className="group relative rounded-lg p-2 mb-1 last:mb-0" style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db' }}>
                                                                        <button onClick={() => handleDeleteCompEntry(cell.id)} className="no-print absolute top-1 right-1 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-red-50">
                                                                            <Trash2 size={12} />
                                                                        </button>
                                                                        <p className="text-xs font-semibold text-gray-900 leading-tight">{cell.subject_name}</p>
                                                                        <p className="text-[10px] text-gray-500 mt-0.5">{getClassNames(cell)}</p>
                                                                    </div>
                                                                ))}
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            )
                                        })
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
