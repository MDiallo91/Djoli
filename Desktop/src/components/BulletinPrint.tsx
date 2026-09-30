import React, { useEffect, useState } from 'react'
import { getMention, LevelConfig, DEFAULT_CONFIGS } from '../utils/gradingUtils'
import { dbService } from '../services/db'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BulletinGrade {
    subject_name:  string
    coefficient:   number
    moy_t1:        number | null
    moy_t2:        number | null
    moy_t3:        number | null
    moy_annuelle:  number | null
    notes_comp?:   number | null
    moy_cours?:    number | null
    moy_semestre?: number | null
}

interface BulletinPrintProps {
    student:       any
    grades:        BulletinGrade[]
    term:          string
    schoolYear:    string
    rank:          number
    totalStudents: number
    levelConfig?:  LevelConfig
    classAverage?: string
}

// ── Design tokens ──────────────────────────────────────────────────────────────

const BLUE   = '#1a2f6e'
const B_SOFT = '#e8edf8'
const BORDER = '1px solid #1a2f6e'

const th: React.CSSProperties = {
    border: BORDER,
    padding: '4pt 5pt',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '9pt',
    backgroundColor: BLUE,
    color: '#fff',
}

const td: React.CSSProperties = {
    border: BORDER,
    padding: '3pt 5pt',
    fontSize: '9pt',
    color: '#000',
    backgroundColor: '#fff',
}

const fmt = (v: number | null, dec = 3) =>
    v !== null ? v.toFixed(dec).replace('.', ',') : '—'

const obs = (moy: number | null, which: 'pass' | 'fail', scale: number) => {
    if (moy === null) return ''
    const passes = moy >= scale / 2
    return (which === 'pass' && passes) || (which === 'fail' && !passes) ? 'X' : ''
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BulletinPrint: React.FC<BulletinPrintProps> = ({
    student, grades, term, schoolYear, rank, totalStudents, levelConfig,
}) => {
    const [schoolInfo, setSchoolInfo] = useState<any>(null)

    useEffect(() => {
        dbService.getSchoolInfo().then(info => { if (info) setSchoolInfo(info) })
    }, [])

    const cfg = levelConfig ?? DEFAULT_CONFIGS['Collège']
    const { scale, config: mentions } = cfg

    const totalCoeff = grades.reduce((s, g) => s + g.coefficient, 0)

    const termTotal = (key: 'moy_t1' | 'moy_t2' | 'moy_t3' | 'moy_annuelle') =>
        grades.reduce((s, g) => g[key] !== null ? s + g[key]! * g.coefficient : s, 0)

    const termVC = (key: 'moy_t1' | 'moy_t2' | 'moy_t3' | 'moy_annuelle') =>
        grades.reduce((s, g) => g[key] !== null ? s + g.coefficient : s, 0)

    const tt1 = termTotal('moy_t1'), vc1 = termVC('moy_t1')
    const tt2 = termTotal('moy_t2'), vc2 = termVC('moy_t2')
    const tt3 = termTotal('moy_t3'), vc3 = termVC('moy_t3')
    const ttA = termTotal('moy_annuelle'), vcA = termVC('moy_annuelle')

    const mg1 = vc1 > 0 ? tt1 / vc1 : null
    const mg2 = vc2 > 0 ? tt2 / vc2 : null
    const mg3 = vc3 > 0 ? tt3 / vc3 : null
    const mgA = vcA > 0 ? ttA / vcA : null

    // Which columns to display based on the trimester being printed
    const isT1 = term.includes('1')
    const isT2 = term.includes('2')
    const isT3 = !isT1 && !isT2   // 3ème trimestre = bilan annuel

    const showT2  = !isT1          // T1 only → hide T2 col
    const showT3  = isT3           // T3 only
    const showAnn = isT3           // annual only on T3

    const colSpanMoyennes = 1 + (showT2 ? 1 : 0) + (showT3 ? 1 : 0) + (showAnn ? 1 : 0)

    // Active (current-term) moyenne for each row's appréciation
    const rowMoy = (g: BulletinGrade) =>
        isT1 ? g.moy_t1 : isT2 ? g.moy_t2 : (g.moy_annuelle ?? g.moy_t3)

    const activeMoy = isT1 ? mg1 : isT2 ? mg2 : (mgA ?? mg3)
    const globalMention = activeMoy !== null ? getMention(activeMoy, mentions) : null

    return (
        <div style={{
            padding: '2mm 14mm 10mm',
            minHeight: '270mm',
            maxWidth: '190mm',
            margin: '0 auto',
            fontFamily: '"Times New Roman", serif',
            fontSize: '10pt',
            color: '#000',
            backgroundColor: '#fff',
        }}>

            {/* ═══ HEADER BAND ═══ */}
            <div style={{
                backgroundColor: BLUE, color: '#fff',
                padding: '6pt 10pt', marginBottom: '5mm',
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                gap: '8pt', alignItems: 'center',
            }}>
                <div style={{ fontSize: '8pt', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>Ministère de l'Éducation Nationale</div>
                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>et de l'Alphabétisation</div>
                    <div style={{ marginTop: '3pt' }}>IRE : {schoolInfo?.region ?? '—'}</div>
                    <div>DPE : {schoolInfo?.commune ?? '—'}</div>
                </div>

                <div style={{ textAlign: 'center', minWidth: '120pt' }}>
                    {schoolInfo?.logo_url
                        ? <img src={schoolInfo.logo_url} alt="Logo"
                               style={{ width: 52, height: 52, objectFit: 'contain', margin: '0 auto 4pt', display: 'block' }} />
                        : <div style={{
                              width: 52, height: 52,
                              border: '2pt solid rgba(255,255,255,0.6)', borderRadius: '50%',
                              margin: '0 auto 4pt', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: '7pt', fontWeight: 'bold',
                          }}>LOGO</div>
                    }
                    <div style={{ fontWeight: 'bold', fontStyle: 'italic', fontSize: '13pt', textTransform: 'uppercase', lineHeight: 1.2 }}>
                        {schoolInfo?.name ?? 'Établissement Scolaire'}
                    </div>
                    <div style={{
                        fontWeight: 'bold', fontSize: '12pt', marginTop: '3pt',
                        letterSpacing: '0.5pt',
                        borderTop: '1pt solid rgba(255,255,255,0.35)', paddingTop: '3pt',
                    }}>
                        BULLETIN DE NOTES
                    </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '8pt', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>République de Guinée</div>
                    <div style={{ fontStyle: 'italic', marginTop: '3pt' }}>Travail — Justice — Solidarité</div>
                </div>
            </div>

            {/* ═══ STUDENT INFO ═══ */}
            <div style={{
                marginBottom: '4mm', padding: '3pt 0',
                borderBottom: `2pt solid ${BLUE}`,
                display: 'grid', gridTemplateColumns: 'max-content 1fr max-content 1fr',
                gap: '2pt 16pt', fontSize: '10pt', lineHeight: 1.9,
            }}>
                <strong>Année Scolaire :</strong><span>{schoolYear}</span>
                <strong>Classe :</strong><span>{student?.class_name ?? '—'}{student?.level ? ` — ${student.level}` : ''}</span>
                <strong style={{ gridColumn: '1' }}>Élève :</strong>
                <span style={{ gridColumn: '2 / 5' }}>{student?.first_name} {student?.last_name}</span>
            </div>

            {/* ═══ SECTION 1 ═══ */}
            <div style={{
                backgroundColor: BLUE, color: '#fff',
                textAlign: 'center', fontWeight: 'bold',
                padding: '3pt', fontSize: '10pt', marginBottom: '3mm',
            }}>
                {isT1 ? '1 — Moyenne du 1er Trimestre'
                : isT2 ? '1 — Moyennes des 1er et 2ème Trimestres'
                : '1 — Moyennes trimestrielle et annuelle'}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '5mm', fontSize: '9pt' }}>
                <thead>
                    <tr>
                        <th rowSpan={2} style={{ ...th, textAlign: 'left', paddingLeft: '6pt', width: '28%' }}>Matières</th>
                        <th rowSpan={2} style={{ ...th, width: '7%' }}>Coeff.</th>
                        <th colSpan={colSpanMoyennes} style={th}>Moyenne{colSpanMoyennes > 1 ? 's' : ''}</th>
                        <th rowSpan={2} style={{ ...th, width: '17%' }}>Appréciations</th>
                    </tr>
                    <tr>
                        <th style={{ ...th, width: '11%' }}>1er Trim.</th>
                        {showT2  && <th style={{ ...th, width: '11%' }}>2ème Trim.</th>}
                        {showT3  && <th style={{ ...th, width: '11%' }}>3ème Trim.</th>}
                        {showAnn && <th style={{ ...th, width: '11%' }}>Annuelle</th>}
                    </tr>
                </thead>
                <tbody>
                    {grades.map((g, i) => {
                        const moy    = rowMoy(g)
                        const mention = moy !== null ? getMention(moy, mentions) : null
                        const rowBg  = i % 2 === 0 ? '#fff' : B_SOFT
                        return (
                            <tr key={i}>
                                <td style={{ ...td, fontWeight: 'bold', backgroundColor: rowBg }}>{g.subject_name}</td>
                                <td style={{ ...td, textAlign: 'center', backgroundColor: rowBg }}>{g.coefficient}</td>
                                <td style={{ ...td, textAlign: 'center', backgroundColor: rowBg }}>{fmt(g.moy_t1, 2)}</td>
                                {showT2  && <td style={{ ...td, textAlign: 'center', backgroundColor: rowBg }}>{fmt(g.moy_t2, 2)}</td>}
                                {showT3  && <td style={{ ...td, textAlign: 'center', backgroundColor: rowBg }}>{fmt(g.moy_t3, 2)}</td>}
                                {showAnn && <td style={{ ...td, textAlign: 'center', backgroundColor: rowBg }}>{fmt(g.moy_annuelle, 3)}</td>}
                                <td style={{ ...td, textAlign: 'center', fontStyle: mention ? 'italic' : undefined, backgroundColor: rowBg }}>
                                    {mention?.label ?? ''}
                                </td>
                            </tr>
                        )
                    })}

                    {/* Total */}
                    <tr>
                        <td style={{ ...td, fontWeight: 'bold', backgroundColor: B_SOFT }}>Total</td>
                        <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: B_SOFT }}>{totalCoeff}</td>
                        <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: B_SOFT }}>{vc1 > 0 ? fmt(tt1, 2) : '—'}</td>
                        {showT2  && <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: B_SOFT }}>{vc2 > 0 ? fmt(tt2, 2) : '—'}</td>}
                        {showT3  && <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: B_SOFT }}>{vc3 > 0 ? fmt(tt3, 2) : '—'}</td>}
                        {showAnn && <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: B_SOFT }}>{vcA > 0 ? fmt(ttA, 3) : '—'}</td>}
                        <td style={{ ...td, backgroundColor: BLUE }} />
                    </tr>

                    {/* Moyenne générale */}
                    <tr>
                        <td style={{ ...td, fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>Moyenne générale</td>
                        <td style={{ ...td, backgroundColor: BLUE }} />
                        <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>
                            {mg1 !== null ? `${fmt(mg1, 3)}/${scale}` : '—'}
                        </td>
                        {showT2 && (
                            <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>
                                {mg2 !== null ? `${fmt(mg2, 3)}/${scale}` : '—'}
                            </td>
                        )}
                        {showT3 && (
                            <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>
                                {mg3 !== null ? `${fmt(mg3, 3)}/${scale}` : '—'}
                            </td>
                        )}
                        {showAnn && (
                            <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>
                                {mgA !== null ? `${fmt(mgA, 3)}/${scale}` : '—'}
                            </td>
                        )}
                        <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', fontStyle: globalMention ? 'italic' : undefined, backgroundColor: BLUE, color: '#fff' }}>
                            {globalMention?.label ?? ''}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* ═══ SECTION 2 ═══ */}
            <div style={{
                backgroundColor: BLUE, color: '#fff',
                textAlign: 'center', fontWeight: 'bold',
                padding: '3pt', fontSize: '10pt', marginBottom: '3mm',
            }}>
                2 — Récapitulation des moyennes, appréciations et observations
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6mm', fontSize: '9pt' }}>
                <thead>
                    <tr>
                        <th style={{ ...th, width: '26%' }}>Période</th>
                        <th style={th}>Moyenne</th>
                        <th style={th}>Appréciation</th>
                        <th colSpan={2} style={th}>Observation</th>
                    </tr>
                    <tr>
                        <th style={th}></th>
                        <th style={th}></th>
                        <th style={th}></th>
                        <th style={th}>Passe en classe sup.</th>
                        <th style={th}>Redouble la classe</th>
                    </tr>
                </thead>
                <tbody>
                    {/* T1 row — always shown */}
                    {(() => {
                        const rows: { label: string; moy: number | null }[] = [
                            { label: '1er Trimestre',  moy: mg1 },
                            ...(showT2 ? [{ label: '2ème Trimestre', moy: mg2 }] : []),
                            ...(showT3 ? [{ label: '3ème Trimestre', moy: mg3 }] : []),
                        ]
                        return rows.map(({ label, moy }, i) => {
                            const rowBg = i % 2 === 0 ? '#fff' : B_SOFT
                            return (
                                <tr key={label}>
                                    <td style={{ ...td, fontWeight: 'bold', backgroundColor: rowBg }}>{label}</td>
                                    <td style={{ ...td, textAlign: 'center', backgroundColor: rowBg }}>
                                        {moy !== null ? fmt(moy, 3) : ''}
                                    </td>
                                    <td style={{ ...td, textAlign: 'center', backgroundColor: rowBg }}>
                                        {moy !== null ? (getMention(moy, mentions)?.label ?? '') : ''}
                                    </td>
                                    <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: rowBg }}>
                                        {obs(moy, 'pass', scale)}
                                    </td>
                                    <td style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: rowBg }}>
                                        {obs(moy, 'fail', scale)}
                                    </td>
                                </tr>
                            )
                        })
                    })()}

                    {/* Moyenne annuelle + classement — T3 only */}
                    {isT3 && (
                        <>
                            <tr>
                                <td style={{ ...td, fontWeight: 'bold', backgroundColor: B_SOFT }}>Moyenne annuelle</td>
                                <td style={{ ...td, textAlign: 'center', backgroundColor: B_SOFT }}>
                                    {mgA !== null ? fmt(mgA, 3) : ''}
                                </td>
                                <td style={{ ...td, textAlign: 'center', backgroundColor: B_SOFT }}>
                                    {mgA !== null ? (getMention(mgA, mentions)?.label ?? '') : ''}
                                </td>
                                <td style={{ ...td, backgroundColor: B_SOFT }} />
                                <td style={{ ...td, backgroundColor: B_SOFT }} />
                            </tr>
                            <tr>
                                <td style={{ ...td, fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>Classement annuel</td>
                                <td colSpan={4} style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>
                                    {rank > 0 ? `${rank}ème` : '—'} / {totalStudents} Élèves
                                </td>
                            </tr>
                        </>
                    )}

                    {/* Classement trimestriel — T1 et T2 */}
                    {!isT3 && (
                        <tr>
                            <td style={{ ...td, fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>
                                Classement {isT1 ? '1er Trimestre' : '2ème Trimestre'}
                            </td>
                            <td colSpan={4} style={{ ...td, textAlign: 'center', fontWeight: 'bold', backgroundColor: BLUE, color: '#fff' }}>
                                {rank > 0 ? `${rank}ème` : '—'} / {totalStudents} Élèves
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            {/* ═══ FOOTER ═══ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '6mm' }}>
                <div style={{ border: `1pt solid ${BLUE}`, padding: '4pt 10pt', fontSize: '10pt' }}>
                    <strong>Appréciation :</strong>{' '}
                    {activeMoy !== null ? (getMention(activeMoy, mentions)?.label ?? '—') : '—'}
                </div>
                <div style={{ textAlign: 'center', fontSize: '10pt' }}>
                    <div>{schoolInfo?.city ?? 'Conakry'}, le {new Date().toLocaleDateString('fr-FR')}</div>
                    <div style={{ fontWeight: 'bold', marginTop: '5mm', textDecoration: 'underline' }}>Le Directeur Général</div>
                    <div style={{ height: '18mm' }} />
                    <div style={{ fontWeight: 'bold' }}>{schoolInfo?.director_name ?? ''}</div>
                </div>
            </div>
        </div>
    )
}
