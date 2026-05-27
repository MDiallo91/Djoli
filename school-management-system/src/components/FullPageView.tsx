import React from 'react'
import { ArrowLeft } from 'lucide-react'

interface FullPageViewProps {
    title:    string
    onBack:   () => void
    children: React.ReactNode
    maxWidth?: number
}

/** Remplace les modaux — pleine page blanche avec flèche de retour */
export const FullPageView: React.FC<FullPageViewProps> = ({
    title, onBack, children, maxWidth = 760,
}) => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: '#fff', overflowY: 'auto' }}>
        {/* Top bar */}
        <div style={{
            position: 'sticky', top: 0, zIndex: 10,
            backgroundColor: '#fff',
            borderBottom: '1px solid #e5e7eb',
            padding: '12px 24px',
            display: 'flex', alignItems: 'center', gap: 16,
        }}>
            <button
                type="button"
                onClick={onBack}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#374151', fontSize: 14, fontWeight: 500, padding: '4px 0',
                }}
            >
                <ArrowLeft size={16} />
                Retour
            </button>
            <div style={{ width: 1, height: 18, backgroundColor: '#e5e7eb' }} />
            <h1 style={{
                margin: 0, fontSize: 13, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.07em', color: '#111827',
            }}>
                {title}
            </h1>
        </div>

        {/* Content */}
        <div style={{ maxWidth, margin: '0 auto', padding: '32px 24px' }}>
            {children}
        </div>
    </div>
)

// ── Helpers for consistent field display ──────────────────────────────────────

interface FieldProps {
    label: string
    value?: string | null
}

export const InfoField: React.FC<FieldProps> = ({ label, value }) => (
    <div>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 3 }}>
            {label}
        </p>
        <p style={{ margin: 0, fontSize: 14, color: value ? '#111827' : '#9ca3af', fontStyle: value ? 'normal' : 'italic' }}>
            {value || '—'}
        </p>
    </div>
)

export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
        color: '#6b7280', borderBottom: '1px solid #e5e7eb', paddingBottom: 8, marginBottom: 16,
    }}>
        {children}
    </div>
)

// ── Form field style ──────────────────────────────────────────────────────────
export const formInputCls = [
    'w-full px-3 py-2 text-sm text-gray-900',
    'border border-gray-200 rounded-lg',
    'bg-white outline-none',
    'focus:border-gray-400 transition-colors',
    'placeholder:text-gray-300',
].join(' ')

export const formLabelCls = 'block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1'
