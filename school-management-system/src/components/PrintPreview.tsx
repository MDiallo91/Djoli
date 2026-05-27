import React from 'react'
import { Printer, X } from 'lucide-react'

interface PrintPreviewProps {
    title:    string
    onClose:  () => void
    children: React.ReactNode
}

export const PrintPreview: React.FC<PrintPreviewProps> = ({ title, onClose, children }) => (
    <div className="print-overlay" style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: '#f8fafc', overflowY: 'auto' }}>
        {/* Controls bar — fixed so it never gets clipped by horizontal overflow */}
        <div
            className="no-print"
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10,
                backgroundColor: 'var(--sidebar-bg, #1a2f6e)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 24px 10px 24px', paddingRight: '160px', gap: 12,
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
        >
            <button
                onClick={onClose}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                    padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                }}
            >
                <X size={15} /> Fermer
            </button>

            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>

            <button
                onClick={() => window.print()}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                    background: '#fff', color: 'var(--sidebar-bg, #1a2f6e)', border: 'none',
                    padding: '7px 20px', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
            >
                <Printer size={15} /> Imprimer
            </button>
        </div>

        {/* Printable content — offset below the fixed bar (44px) */}
        <div style={{ paddingTop: 44 }}>{children}</div>
    </div>
)
