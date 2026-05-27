import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { PrintHeader } from './PrintHeader'

interface PaySlipPrintProps {
    person:  any
    salary:  any
    month:   string  // "2024-01"
}

const fmt = (n: number) =>
    new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' }).format(n)

const monthLabel = (m: string) => {
    const [y, mo] = m.split('-')
    const d = new Date(parseInt(y), parseInt(mo) - 1, 1)
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export const PaySlipPrint: React.FC<PaySlipPrintProps> = ({ person, salary, month }) => {
    const ref = `BP-${salary.id}-${month.replace('-', '')}`

    const qrData = [
        `Réf: ${ref}`,
        `Employé: ${person.first_name} ${person.last_name}`,
        `Rôle: ${person.role}`,
        `Période: ${monthLabel(month)}`,
        `Net: ${fmt(salary.net_salary)}`,
    ].join('\n')

    return (
        <div style={{ padding: '2mm 10mm 10mm', backgroundColor: '#fff', color: '#000', fontFamily: 'serif', minHeight: '100vh' }}>
            <style>{`@page { size: A4 portrait; margin: 5mm; }`}</style>

            {/* Entête officielle */}
            <PrintHeader alwaysVisible docTitle="Bulletin de Paie" />

            {/* Référence + période */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6mm', borderBottom: '2px solid #1a2f6e', paddingBottom: '4mm' }}>
                <div>
                    <div style={{ fontSize: '9pt', color: '#6b7280', fontStyle: 'italic' }}>
                        Période de paiement
                    </div>
                    <div style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'capitalize' }}>
                        {monthLabel(month)}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '8pt', color: '#6b7280' }}>Référence</div>
                    <div style={{ fontSize: '10pt', fontWeight: 700, fontFamily: 'monospace' }}>{ref}</div>
                </div>
            </div>

            {/* Infos employé */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5mm', marginBottom: '6mm' }}>
                <div style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', color: '#1a2f6e', letterSpacing: '0.5pt', marginBottom: '3mm' }}>
                    Informations de l'Employé
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm', fontSize: '9pt' }}>
                    <div>
                        <span style={{ color: '#6b7280' }}>Nom & Prénoms : </span>
                        <strong>{person.last_name} {person.first_name}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#6b7280' }}>Fonction : </span>
                        <strong>{person.role}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#6b7280' }}>Téléphone : </span>
                        <strong>{person.phone || '—'}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#6b7280' }}>Adresse : </span>
                        <strong>{person.address || '—'}</strong>
                    </div>
                </div>
            </div>

            {/* Tableau salaire */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '6mm' }}>
                <thead>
                    <tr style={{ backgroundColor: '#1a2f6e', color: '#fff' }}>
                        <th style={{ padding: '3mm 4mm', textAlign: 'left', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.4pt' }}>
                            Élément de rémunération
                        </th>
                        <th style={{ padding: '3mm 4mm', textAlign: 'right', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase' }}>
                            Montant
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '3mm 4mm' }}>Salaire de base</td>
                        <td style={{ padding: '3mm 4mm', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                            {fmt(salary.base_salary)}
                        </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #e2e8f0', color: salary.bonus > 0 ? '#059669' : '#9ca3af' }}>
                        <td style={{ padding: '3mm 4mm' }}>Prime / Bonus</td>
                        <td style={{ padding: '3mm 4mm', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                            +{fmt(salary.bonus || 0)}
                        </td>
                    </tr>
                    {person.monthly_hours > 0 && (
                        <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#6b7280', fontSize: '8pt' }}>
                            <td style={{ padding: '2mm 4mm', fontStyle: 'italic' }}>Heures effectuées ce mois</td>
                            <td style={{ padding: '2mm 4mm', textAlign: 'right', fontFamily: 'monospace' }}>
                                {person.monthly_hours} h
                            </td>
                        </tr>
                    )}
                    <tr style={{ backgroundColor: '#1a2f6e', color: '#fff' }}>
                        <td style={{ padding: '4mm', fontWeight: 700, fontSize: '10pt', textTransform: 'uppercase' }}>
                            Net à Payer
                        </td>
                        <td style={{ padding: '4mm', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '12pt' }}>
                            {fmt(salary.net_salary)}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* QR code + signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '8mm', alignItems: 'flex-start', marginTop: '8mm' }}>
                {/* QR */}
                <div style={{ textAlign: 'center' }}>
                    <QRCodeSVG value={qrData} size={90} level="M" />
                    <div style={{ fontSize: '7pt', color: '#6b7280', marginTop: '2mm' }}>Vérification</div>
                </div>

                {/* Cachet */}
                <div style={{ textAlign: 'center', paddingTop: '2mm' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '14mm' }}>
                        Cachet de l'Établissement
                    </div>
                    <div style={{ width: '70px', height: '70px', border: '2px dashed #d1d5db', borderRadius: '50%', margin: '0 auto' }} />
                </div>

                {/* Signature */}
                <div style={{ textAlign: 'center', paddingTop: '2mm' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '14mm' }}>
                        Signature de l'Employé
                    </div>
                    <div style={{ height: '1px', backgroundColor: '#d1d5db', marginTop: '54px' }} />
                    <div style={{ fontSize: '8pt', color: '#9ca3af', marginTop: '2mm' }}>
                        {person.first_name} {person.last_name}
                    </div>
                </div>
            </div>

            {/* Pied de page */}
            <div style={{ marginTop: '8mm', paddingTop: '4mm', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '7pt', color: '#9ca3af', fontStyle: 'italic' }}>
                Ce bulletin de paie est généré électroniquement et fait foi de paiement pour la période indiquée.
                Réf. {ref} — Imprimé le {new Date().toLocaleDateString('fr-FR')}
            </div>
        </div>
    )
}
