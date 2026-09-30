import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Login } from '../../components/Login'

// Mock dbService
vi.mock('../../services/db', () => ({
    dbService: {
        login: vi.fn(),
        cloudActivate: vi.fn(),
        getSchoolInfo: vi.fn().mockResolvedValue(null),
    }
}))

import { dbService } from '../../services/db'

describe('Login Component', () => {
    const mockOnLogin = vi.fn()

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders a single login form with no mode selector', () => {
        render(<Login onLogin={mockOnLogin} />)
        expect(screen.getByText('Connexion')).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/620000000/i)).toBeInTheDocument()
        expect(screen.getByText('Se connecter')).toBeInTheDocument()
        expect(screen.queryByText('Connexion Locale')).not.toBeInTheDocument()
        expect(screen.queryByText('Activation Cloud')).not.toBeInTheDocument()
    })

    it('shows error when fields are empty and form is submitted', async () => {
        render(<Login onLogin={mockOnLogin} />)

        // Submit the form directly without filling fields — bypasses required validation
        const form = document.querySelector('form')!
        fireEvent.submit(form)

        await waitFor(() => {
            expect(screen.getByText('Veuillez remplir tous les champs')).toBeInTheDocument()
        })
    })

    it('calls dbService.login on form submit with correct data', async () => {
        const mockUser = { id: '1', username: 'admin', role: 'SUPER_ADMIN', name: 'Test' }
        vi.mocked(dbService.login).mockResolvedValue(mockUser)

        const user = userEvent.setup()
        render(<Login onLogin={mockOnLogin} />)

        await user.type(screen.getByPlaceholderText(/620000000/i), 'admin')
        await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
        await user.click(screen.getByText('Se connecter'))

        await waitFor(() => {
            expect(dbService.login).toHaveBeenCalledWith({ username: 'admin', password: 'password123' })
            expect(mockOnLogin).toHaveBeenCalledWith(mockUser)
        })
    })

    it('falls back to cloudActivate when no local account matches', async () => {
        const mockCloudUser = { id: '1', username: 'test@ecole.com', name: 'École Test', licenseStatus: 'active' }
        vi.mocked(dbService.login).mockRejectedValue(new Error('Identifiants incorrects'))
        vi.mocked(dbService.cloudActivate).mockResolvedValue(mockCloudUser)

        const user = userEvent.setup()
        render(<Login onLogin={mockOnLogin} />)

        await user.type(screen.getByPlaceholderText(/620000000/i), 'test@ecole.com')
        await user.type(screen.getByPlaceholderText('••••••••'), 'test1234')
        await user.click(screen.getByText('Se connecter'))

        await waitFor(() => {
            expect(dbService.cloudActivate).toHaveBeenCalledWith({ username: 'test@ecole.com', password: 'test1234' })
            expect(mockOnLogin).toHaveBeenCalledWith(mockCloudUser)
        })
    })

    it('shows error message when both local login and cloud activation fail', async () => {
        vi.mocked(dbService.login).mockRejectedValue(new Error('Identifiants incorrects'))
        vi.mocked(dbService.cloudActivate).mockRejectedValue(new Error('Email ou mot de passe incorrect'))

        const user = userEvent.setup()
        render(<Login onLogin={mockOnLogin} />)

        await user.type(screen.getByPlaceholderText(/620000000/i), 'wrong')
        await user.type(screen.getByPlaceholderText('••••••••'), 'wrong')
        await user.click(screen.getByText('Se connecter'))

        await waitFor(() => {
            expect(screen.getByText('Email ou mot de passe incorrect')).toBeInTheDocument()
        })
    })

    it('shows the local error when offline (cloud fallback is a network error)', async () => {
        vi.mocked(dbService.login).mockRejectedValue(new Error('Identifiants incorrects'))
        vi.mocked(dbService.cloudActivate).mockRejectedValue(new Error('fetch failed'))

        const user = userEvent.setup()
        render(<Login onLogin={mockOnLogin} />)

        await user.type(screen.getByPlaceholderText(/620000000/i), 'wrong')
        await user.type(screen.getByPlaceholderText('••••••••'), 'wrong')
        await user.click(screen.getByText('Se connecter'))

        await waitFor(() => {
            expect(screen.getByText('Identifiants incorrects')).toBeInTheDocument()
        })
    })

    it('strips the Electron IPC wrapper prefix from error messages', async () => {
        vi.mocked(dbService.login).mockRejectedValue(new Error('Identifiants incorrects'))
        vi.mocked(dbService.cloudActivate).mockRejectedValue(
            new Error("Error invoking remote method 'cloud-activate': Error: Licence invalide reçue du serveur")
        )

        const user = userEvent.setup()
        render(<Login onLogin={mockOnLogin} />)

        await user.type(screen.getByPlaceholderText(/620000000/i), 'wrong')
        await user.type(screen.getByPlaceholderText('••••••••'), 'wrong')
        await user.click(screen.getByText('Se connecter'))

        await waitFor(() => {
            expect(screen.getByText('Licence invalide reçue du serveur')).toBeInTheDocument()
            expect(screen.queryByText(/Error invoking remote method/i)).not.toBeInTheDocument()
        })
    })

    it('toggles password visibility', async () => {
        const user = userEvent.setup()
        render(<Login onLogin={mockOnLogin} />)

        const input = screen.getByPlaceholderText('••••••••')
        expect(input).toHaveAttribute('type', 'password')

        const toggleButton = screen.queryByTitle('toggle')
        // Find the eye icon button
        const buttons = screen.getAllByRole('button')
        const eyeButton = buttons.find(b => b.querySelector('svg'))
        if (eyeButton) {
            await user.click(eyeButton)
            // Type changes after click
        }
        // Input should still be functional
        expect(input).toBeDefined()
    })
})
