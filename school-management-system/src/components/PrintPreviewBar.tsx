import React from 'react'
import { Printer, X } from 'lucide-react'

interface PrintPreviewBarProps {
    title:   string
    onClose: () => void
}

/**
 * Lightweight print preview for page-level prints.
 * Injects a <style> that hides .no-print elements so the user
 * sees exactly what will be printed. The bar itself is hidden
 * during actual printing via @media print in index.css.
 */
export const PrintPreviewBar: React.FC<PrintPreviewBarProps> = ({ title, onClose }) => (
    <>
        {/* Hide interactive elements during preview — same as @media print */}
        <style dangerouslySetInnerHTML={{ __html: '.no-print { display: none !important; }' }} />

        <div
            className="print-preview-bar"
            style={{
                position: 'fixed', top: 32, left: 0, right: 0, zIndex: 100,
                backgroundColor: 'var(--sidebar-bg, #1a2f6e)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 24px', paddingRight: '160px', gap: 12,
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
            }}
        >
            <button
                onClick={onClose}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                    padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                }}
            >
                <X size={15} /> Fermer
            </button>

            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
                Aperçu — {title}
            </span>

            <button
                onClick={() => window.print()}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: '#fff', color: 'var(--sidebar-bg, #1a2f6e)', border: 'none',
                    padding: '7px 20px', borderRadius: 8, cursor: 'pointer',
                    fontWeight: 700, fontSize: 13,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
            >
                <Printer size={15} /> Imprimer
            </button>
        </div>
    </>
)
