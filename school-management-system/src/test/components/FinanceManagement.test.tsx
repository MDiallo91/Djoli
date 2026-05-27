import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FinanceManagement } from '../../components/FinanceManagement'

vi.mock('../../components/PrintHeader', () => ({
    PrintHeader: () => <div data-testid="print-header" />
}))

vi.mock('../../services/db', () => ({
    dbService: {
        getTransactions: vi.fn().mockResolvedValue([
            { id: '1', type: 'IN', amount: 50000, reason: 'Paiement scolarité', date: new Date().toISOString() },
            { id: '2', type: 'OUT', amount: 10000, reason: 'Achat fournitures', date: new Date().toISOString() },
        ]),
        getSchoolYears: vi.fn().mockResolvedValue([
            { id: '1', name: '2025-2026', is_active: 1 }
        ]),
        getClasses: vi.fn().mockResolvedValue([
            { id: '1', name: 'CM1' },
            { id: '2', name: 'CM2' },
        ]),
        searchStudents: vi.fn().mockResolvedValue([]),
        getStudentBalance: vi.fn().mockResolvedValue({ tuitionFee: 500000, totalPaid: 200000, balance: 300000, paidMonths: [] }),
        addPayment: vi.fn().mockResolvedValue({ success: true }),
        addCashTransaction: vi.fn().mockResolvedValue({ success: true }),
        getClassPaymentStatus: vi.fn().mockResolvedValue([]),
    }
}))

describe('FinanceManagement Component', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('renders finance management with stat cards', async () => {
        render(<FinanceManagement />)
        await waitFor(() => {
            expect(screen.getByText('Solde Actuel')).toBeInTheDocument()
            expect(screen.getByText('Entrées (Mois)')).toBeInTheDocument()
            expect(screen.getByText('Sorties (Mois)')).toBeInTheDocument()
        })
    })

    it('displays transactions table', async () => {
        render(<FinanceManagement />)
        await waitFor(() => {
            expect(screen.getByText('Flux de Trésorerie')).toBeInTheDocument()
        })
    })

    it('calculates correct total balance from transactions', async () => {
        render(<FinanceManagement />)
        await waitFor(() => {
            // 50000 IN - 10000 OUT = 40000
            expect(screen.getByText(/40.000 FG|40000 FG/)).toBeInTheDocument()
        })
    })

    it('shows transactions tab buttons', async () => {
        render(<FinanceManagement />)
        await waitFor(() => {
            expect(screen.getByText('TOUTES')).toBeInTheDocument()
            expect(screen.getByText('PAIEMENTS (ENTRÉES)')).toBeInTheDocument()
            expect(screen.getByText('SORTIES D\'ARGENT')).toBeInTheDocument()
        })
    })

    it('opens payment modal on button click', async () => {
        const user = userEvent.setup()
        render(<FinanceManagement />)
        await waitFor(() => screen.getByText('Encaisser Scolarité'))
        await user.click(screen.getByText('Encaisser Scolarité'))
        expect(screen.getByText('Encaisser un Paiement')).toBeInTheDocument()
    })

    it('switches to report view on button click', async () => {
        const user = userEvent.setup()
        render(<FinanceManagement />)
        await waitFor(() => screen.getByText('Voir le Suivi par Classe'))
        await user.click(screen.getByText('Voir le Suivi par Classe'))
        // Multiple elements may have this text (h2 + h3), check at least one exists
        expect(screen.getAllByText('Suivi des Paiements par Classe').length).toBeGreaterThan(0)
    })
})
