import React, { useState, useEffect } from 'react'
import { dbService } from '../services/db'

interface PrintHeaderProps {
    schoolYear?:    string
    docTitle?:      string
    alwaysVisible?: boolean  // pass true when inside a PrintPreview overlay
}

const BLUE = '#1a2f6e'

export function PrintHeader({ schoolYear, docTitle, alwaysVisible }: PrintHeaderProps) {
    const [schoolInfo, setSchoolInfo] = useState<any>(null)
    const [activeYear, setActiveYear] = useState<string>('')

    useEffect(() => {
        Promise.all([dbService.getSchoolInfo(), dbService.getSchoolYears()]).then(([info, years]) => {
            if (info) setSchoolInfo(info)
            if (years?.length) {
                const active = years.find((y: any) => y.is_active) ?? years[0]
                setActiveYear(active?.name ?? '')
            }
        })
    }, [])

    if (!schoolInfo) return null

    const displayYear = schoolYear ?? activeYear ?? '—'

    return (
        <div className={alwaysVisible ? undefined : 'hidden print:block'} style={{ marginBottom: '5mm', fontFamily: '"Times New Roman", serif' }}>
            {/* ── Bande officielle ── */}
            <div style={{
                backgroundColor: BLUE, color: '#fff',
                padding: '6pt 10pt', marginBottom: docTitle ? '4mm' : '5mm',
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                gap: '8pt', alignItems: 'center',
            }}>
                {/* Gauche : Ministère */}
                <div style={{ fontSize: '8pt', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>Ministère de l'Éducation Nationale</div>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>et de l'Alphabétisation</div>
                    {schoolInfo?.region  && <div style={{ marginTop: '3pt' }}>IRE : {schoolInfo.region}</div>}
                    {schoolInfo?.commune && <div>DPE : {schoolInfo.commune}</div>}
                </div>

                {/* Centre : Logo + Nom école */}
                <div style={{ textAlign: 'center', minWidth: '120pt' }}>
                    {schoolInfo?.logo_url
                        ? <img src={schoolInfo.logo_url} alt="Logo"
                               style={{ width: 50, height: 50, objectFit: 'contain', margin: '0 auto 4pt', display: 'block' }} />
                        : <div style={{
                              width: 50, height: 50,
                              border: '2pt solid rgba(255,255,255,0.5)', borderRadius: '50%',
                              margin: '0 auto 4pt', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: '7pt', fontWeight: 700,
                          }}>LOGO</div>
                    }
                    <div style={{ fontWeight: 700, fontStyle: 'italic', fontSize: '13pt', textTransform: 'uppercase', lineHeight: 1.2 }}>
                        {schoolInfo?.name ?? 'Établissement Scolaire'}
                    </div>
                    {schoolInfo?.motto && (
                        <div style={{ fontSize: '8pt', fontStyle: 'italic', marginTop: '2pt' }}>
                            « {schoolInfo.motto} »
                        </div>
                    )}
                    {docTitle && (
                        <div style={{
                            fontWeight: 700, fontSize: '10pt', marginTop: '4pt',
                            borderTop: '1pt solid rgba(255,255,255,0.35)', paddingTop: '3pt',
                            letterSpacing: '0.5pt',
                        }}>
                            {docTitle.toUpperCase()}
                        </div>
                    )}
                </div>

                {/* Droite : République */}
                <div style={{ textAlign: 'right', fontSize: '8pt', lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>République de Guinée</div>
                    <div style={{ fontStyle: 'italic', marginTop: '3pt' }}>Travail — Justice — Solidarité</div>
                    <div style={{ marginTop: '6pt', fontSize: '7pt' }}>
                        Année scolaire : <strong>{displayYear}</strong>
                    </div>
                </div>
            </div>
        </div>
    )
}
