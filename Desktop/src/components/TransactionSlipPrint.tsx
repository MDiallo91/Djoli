import React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { PrintHeader } from './PrintHeader'

interface TransactionSlipProps {
    transaction: { id: any; type: 'IN' | 'OUT'; amount: number; reason: string; date: string }
    schoolYear:  string
}

const fmt = (n: number) =>
    new Intl.NumberFormat('fr-GN', { style: 'currency', currency: 'GNF' }).format(n)

export const TransactionSlipPrint: React.FC<TransactionSlipProps> = ({ transaction: t, schoolYear }) => {
    const ref      = `TX-${t.id}-${new Date(t.date).getFullYear()}`
    const dateStr  = new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    const isIn     = t.type === 'IN'
    const docTitle = isIn ? 'Reçu d\'Entrée de Caisse' : 'Bon de Sortie de Caisse'
    const BLUE     = '#1a2f6e'

    const qrData = [
        `Réf: ${ref}`,
        `Type: ${isIn ? 'Entrée' : 'Sortie'}`,
        `Motif: ${t.reason}`,
        `Montant: ${fmt(t.amount)}`,
        `Date: ${dateStr}`,
        `Année: ${schoolYear}`,
    ].join('\n')

    return (
        <div style={{ padding: '2mm 10mm 10mm', backgroundColor: '#fff', color: '#000', fontFamily: 'serif', minHeight: '100vh' }}>
            <style>{`@page { size: A4 portrait; margin: 5mm; }`}</style>

            <PrintHeader alwaysVisible docTitle={docTitle} />

            {/* Référence + date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6mm', borderBottom: `2px solid ${BLUE}`, paddingBottom: '4mm' }}>
                <div>
                    <div style={{ fontSize: '9pt', color: '#6b7280', fontStyle: 'italic' }}>Année scolaire</div>
                    <div style={{ fontSize: '12pt', fontWeight: 700 }}>{schoolYear}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '8pt', color: '#6b7280' }}>Référence</div>
                    <div style={{ fontSize: '10pt', fontWeight: 700, fontFamily: 'monospace' }}>{ref}</div>
                    <div style={{ fontSize: '8pt', color: '#6b7280', marginTop: '1mm' }}>{dateStr}</div>
                </div>
            </div>

            {/* Détail du mouvement */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '6mm' }}>
                <thead>
                    <tr style={{ backgroundColor: BLUE, color: '#fff' }}>
                        <th style={{ padding: '3mm 4mm', textAlign: 'left', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.4pt' }}>
                            Désignation
                        </th>
                        <th style={{ padding: '3mm 4mm', textAlign: 'right', fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase' }}>
                            Montant
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '4mm' }}>{t.reason}</td>
                        <td style={{ padding: '4mm', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: isIn ? '#059669' : '#dc2626' }}>
                            {isIn ? '+' : '−'}{fmt(t.amount)}
                        </td>
                    </tr>
                    <tr style={{ backgroundColor: BLUE, color: '#fff' }}>
                        <td style={{ padding: '4mm', fontWeight: 700, fontSize: '10pt', textTransform: 'uppercase' }}>
                            {isIn ? 'Total Encaissé' : 'Total Décaissé'}
                        </td>
                        <td style={{ padding: '4mm', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, fontSize: '12pt' }}>
                            {fmt(t.amount)}
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

            <div style={{ marginTop: '8mm', paddingTop: '4mm', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '7pt', color: '#9ca3af', fontStyle: 'italic' }}>
                Document généré électroniquement — Réf. {ref} — Imprimé le {new Date().toLocaleDateString('fr-FR')}
            </div>
        </div>
    )
}
