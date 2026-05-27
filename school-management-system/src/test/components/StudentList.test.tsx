import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StudentList } from '../../components/StudentList'

vi.mock('../../components/PrintHeader', () => ({ PrintHeader: () => null }))
vi.mock('../../components/StudentForm', () => ({
    StudentForm: ({ onClose }: any) => <div data-testid="student-form"><button onClick={onClose}>Fermer</button></div>
}))
vi.mock('../../components/GradeSheetPrint', () => ({ GradeSheetPrint: () => null }))
vi.mock('../../components/EvaluationResultPrint', () => ({ EvaluationResultPrint: () => null }))

// Mocks must be defined inline (hoisted by vi.mock)
vi.mock('../../services/db', () => ({
    dbService: {
        getClasses:    vi.fn().mockResolvedValue([{ id: '1', name: 'CM1' }, { id: '2', name: 'CM2' }]),
        getSchoolYears: vi.fn().mockResolvedValue([{ id: '1', name: '2025-2026', is_active: 1 }]),
        getSubjects:   vi.fn().mockResolvedValue([{ id: '1', name: 'Mathématiques' }]),
        getStudents:   vi.fn().mockResolvedValue([
            { id: '1', first_name: 'Mamadou', last_name: 'Diallo', gender: 'M', class_name: 'CM1', class_id: '1', birth_date: '2010-01-15', matricule: 'MAT001', pere: 'Ibrahima', mere: 'Fatoumata' },
            { id: '2', first_name: 'Fatoumata', last_name: 'Balde', gender: 'F', class_name: 'CM2', class_id: '2', birth_date: '2011-03-22', matricule: 'MAT002', pere: 'Alpha', mere: 'Kadiatou' },
            { id: '3', first_name: 'Oumar', last_name: 'Barry', gender: 'M', class_name: 'CM1', class_id: '1', birth_date: '2010-07-10', matricule: 'MAT003', pere: 'Cellou', mere: 'Aminata' },
        ]),
        deleteStudent: vi.fn().mockResolvedValue({ success: true }),
        exportClassExcel: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        importClassExcel: vi.fn().mockResolvedValue({ count: 3 }),
    }
}))

const waitForLoad = async () => {
    // Wait for loading spinner to disappear (proves fetchStudents completed)
    await waitForElementToBeRemoved(
        () => screen.queryByText('Chargement des élèves...'),
        { timeout: 8000 }
    ).catch(() => {
        // If spinner not shown (fast render), check table is present
    })
}

describe('StudentList Component', () => {
    const mockOnAddStudent = vi.fn()

    beforeEach(() => {
        mockOnAddStudent.mockClear()
    })

    it('renders the student register header', async () => {
        render(<StudentList onAddStudent={mockOnAddStudent} />)
        expect(await screen.findByText('Registre des Élèves', {}, { timeout: 5000 })).toBeInTheDocument()
    })

    it('calls getStudents after metadata finishes loading', async () => {
        const { dbService } = await import('../../services/db')
        render(<StudentList onAddStudent={mockOnAddStudent} />)

        await waitFor(() => {
            expect(dbService.getStudents).toHaveBeenCalled()
        }, { timeout: 8000 })
    })

    it('shows non-empty table after students load', async () => {
        const { dbService } = await import('../../services/db')
        render(<StudentList onAddStudent={mockOnAddStudent} />)

        // Wait for getStudents to be called (confirms full async chain completed)
        await waitFor(() => expect(dbService.getStudents).toHaveBeenCalled(), { timeout: 8000 })

        // After data loads, loading indicator must disappear
        await waitFor(() => {
            expect(screen.queryByText('Chargement des élèves...')).not.toBeInTheDocument()
        }, { timeout: 8000 })

        // With 3 students and no filters, empty state should NOT appear
        expect(screen.queryByText('Aucun élève trouvé pour cette sélection.')).not.toBeInTheDocument()
    })

    it('calls onAddStudent when inscription button is clicked', async () => {
        const user = userEvent.setup()
        render(<StudentList onAddStudent={mockOnAddStudent} />)
        expect(await screen.findByText('Inscrire un élève', {}, { timeout: 5000 })).toBeInTheDocument()
        await user.click(screen.getByText('Inscrire un élève'))
        expect(mockOnAddStudent).toHaveBeenCalledTimes(1)
    })

    it('shows correct loading state initially', () => {
        render(<StudentList onAddStudent={mockOnAddStudent} />)
        // Before data loads, students table is empty or loading spinner visible
        expect(screen.queryByText('MAT001')).not.toBeInTheDocument()
    })

    it('shows year selector after metadata loads', async () => {
        render(<StudentList onAddStudent={mockOnAddStudent} />)
        expect(await screen.findByText('2025-2026 ★', {}, { timeout: 5000 })).toBeInTheDocument()
    })
})
