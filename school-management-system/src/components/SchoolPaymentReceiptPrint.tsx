import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { PrintHeader } from './PrintHeader'

interface ReceiptProps {
    student:    { first_name: string; last_name: string; class_name?: string; matricule?: string; parent_phone?: string }
    payment:    { amount: number; method: string; description?: string; months?: string[] }
    schoolYear: string
    reference:  string
    date:       Date
}

const fmt = (n: number) =>
    new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' }).format(n)

export const SchoolPaymentReceiptPrint: React.FC<ReceiptProps> = ({
    student, payment, schoolYear, reference, date,
}) => {
    const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    const qrData = [
        `Réf: ${reference}`,
        `Élève: ${student.last_name} ${student.first_name}`,
        `Classe: ${student.class_name || '—'}`,
        `Montant: ${fmt(payment.amount)}`,
        `Mode: ${payment.method}`,
        `Date: ${dateStr}`,
        `Année: ${schoolYear}`,
    ].join('\n')

    return (
        <div style={{ padding: '2mm 10mm 10mm', backgroundColor: '#fff', color: '#000', fontFamily: 'serif', minHeight: '100vh' }}>
            <style>{`@page { size: A4 portrait; margin: 5mm; }`}</style>

            {/* Entête officielle */}
            <PrintHeader alwaysVisible docTitle="Reçu de Paiement Scolaire" />

            {/* Référence + date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6mm', borderBottom: '2px solid #1a2f6e', paddingBottom: '4mm' }}>
                <div>
                    <div style={{ fontSize: '9pt', color: '#6b7280', fontStyle: 'italic' }}>Année scolaire</div>
                    <div style={{ fontSize: '12pt', fontWeight: 700 }}>{schoolYear}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '8pt', color: '#6b7280' }}>Référence</div>
                    <div style={{ fontSize: '10pt', fontWeight: 700, fontFamily: 'monospace' }}>{reference}</div>
                    <div style={{ fontSize: '8pt', color: '#6b7280', marginTop: '1mm' }}>{dateStr}</div>
                </div>
            </div>

            {/* Infos élève */}
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5mm', marginBottom: '6mm' }}>
                <div style={{ fontSize: '7pt', fontWeight: 700, textTransform: 'uppercase', color: '#1a2f6e', letterSpacing: '0.5pt', marginBottom: '3mm' }}>
                    Informations de l'Élève
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3mm', fontSize: '9pt' }}>
                    <div>
                        <span style={{ color: '#6b7280' }}>Nom & Prénoms : </span>
                        <strong>{student.last_name} {student.first_name}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#6b7280' }}>Classe : </span>
                        <strong>{student.class_name || '—'}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#6b7280' }}>Matricule : </span>
                        <strong>{student.matricule || '—'}</strong>
                    </div>
                    <div>
                        <span style={{ color: '#6b7280' }}>Tél. parent : </span>
                        <strong>{student.parent_phone || '—'}</strong>
                    </div>
                </div>
            </div>

            {/* Détails du paiement */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '6mm' }}>
                <thead>
                    <tr style={{ backgroundColor: '#1a2f6e', color: '#fff' }}>
                        <th style={{ padding: '3mm 4mm', textAlign: 'left', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.4pt' }}>
                            Désignation
                        </th>
                        <th style={{ padding: '3mm 4mm', textAlign: 'right', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase' }}>
                            Montant
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {payment.months && payment.months.length > 0 && (
                        <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '3mm 4mm' }}>
                                Scolarité — {payment.months.join(', ')}
                            </td>
                            <td style={{ padding: '3mm 4mm', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600 }}>
                                {fmt(payment.amount)}
                            </td>
                        </tr>
                    )}
                    {payment.description && (
                        <tr style={{ borderBottom: '1px solid #e2e8f0', fontSize: '8pt', color: '#6b7280' }}>
                            <td style={{ padding: '2mm 4mm', fontStyle: 'italic' }} colSpan={2}>
                                Note : {payment.description}
                            </td>
                        </tr>
                    )}
                    <tr style={{ borderBottom: '1px solid #e2e8f0', fontSize: '8pt', color: '#374151' }}>
                        <td style={{ padding: '2mm 4mm' }}>Mode de règlement</td>
                        <td style={{ padding: '2mm 4mm', textAlign: 'right', fontWeight: 600 }}>{payment.method}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#1a2f6e', color: '#fff' }}>
                        <td style={{ padding: '4mm', fontWeight: 700, fontSize: '10pt', textTransform: 'uppercase' }}>
                            Total Reçu
                        </td>
                        <td style={{ padding: '4mm', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '12pt' }}>
                            {fmt(payment.amount)}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* QR + signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr', gap: '8mm', alignItems: 'flex-start', marginTop: '8mm' }}>
                <div style={{ textAlign: 'center' }}>
                    <QRCodeSVG value={qrData} size={90} level="M" />
                    <div style={{ fontSize: '7pt', color: '#6b7280', marginTop: '2mm' }}>Vérification</div>
                </div>

                <div style={{ textAlign: 'center', paddingTop: '2mm' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '14mm' }}>
                        Cachet de l'Établissement
                    </div>
                    <div style={{ width: '70px', height: '70px', border: '2px dashed #d1d5db', borderRadius: '50%', margin: '0 auto' }} />
                </div>

                <div style={{ textAlign: 'center', paddingTop: '2mm' }}>
                    <div style={{ fontSize: '8pt', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', marginBottom: '14mm' }}>
                        Signature du Caissier
                    </div>
                    <div style={{ height: '1px', backgroundColor: '#d1d5db', marginTop: '54px' }} />
                </div>
            </div>

            {/* Pied */}
            <div style={{ marginTop: '8mm', paddingTop: '4mm', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '7pt', color: '#9ca3af', fontStyle: 'italic' }}>
                Ce reçu est généré électroniquement et constitue une preuve de paiement valide.
                Réf. {reference} — Imprimé le {new Date().toLocaleDateString('fr-FR')}
            </div>
        </div>
    )
}
