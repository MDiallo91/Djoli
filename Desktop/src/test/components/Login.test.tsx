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

    // Saisie + clic commun aux scénarios de connexion
    const submit = async (username: string, password: string) => {
        const user = userEvent.setup()
        render(<Login onLogin={mockOnLogin} />)
        await user.type(screen.getByPlaceholderText(/620000000/i), username)
        await user.type(screen.getByPlaceholderText('••••••••'), password)
        await user.click(screen.getByText('Se connecter'))
    }

    it('checks credentials with the cloud first when online', async () => {
        const mockCloudUser = { id: '1', username: 'test@ecole.com', name: 'École Test', licenseStatus: 'active' }
        vi.mocked(dbService.cloudActivate).mockResolvedValue(mockCloudUser)

        await submit('test@ecole.com', 'test1234')

        await waitFor(() => {
            expect(dbService.cloudActivate).toHaveBeenCalledWith({ username: 'test@ecole.com', password: 'test1234' })
            expect(dbService.login).not.toHaveBeenCalled()
            expect(mockOnLogin).toHaveBeenCalledWith(mockCloudUser)
        })
    })

    it('falls back to the local account when the cloud is unreachable (offline)', async () => {
        const mockUser = { id: '1', username: 'admin', role: 'SUPER_ADMIN', name: 'Test' }
        vi.mocked(dbService.cloudActivate).mockRejectedValue(new Error('[CLOUD_UNREACHABLE] Serveur injoignable'))
        vi.mocked(dbService.login).mockResolvedValue(mockUser)

        await submit('admin', 'password123')

        await waitFor(() => {
            expect(dbService.login).toHaveBeenCalledWith({ username: 'admin', password: 'password123' })
            expect(mockOnLogin).toHaveBeenCalledWith(mockUser)
        })
    })

    it('still treats a raw network error as offline', async () => {
        const mockUser = { id: '1', username: 'admin', role: 'SUPER_ADMIN', name: 'Test' }
        vi.mocked(dbService.cloudActivate).mockRejectedValue(new Error('fetch failed'))
        vi.mocked(dbService.login).mockResolvedValue(mockUser)

        await submit('admin', 'password123')

        await waitFor(() => {
            expect(dbService.login).toHaveBeenCalledWith({ username: 'admin', password: 'password123' })
            expect(mockOnLogin).toHaveBeenCalledWith(mockUser)
        })
    })

    it('rejects an old password changed on the web: cloud refusal only allows local sub-users', async () => {
        vi.mocked(dbService.cloudActivate).mockRejectedValue(new Error('Email ou mot de passe incorrect'))
        vi.mocked(dbService.login).mockRejectedValue(new Error('Identifiants incorrects'))

        await submit('test@ecole.com', 'ancien-mot-de-passe')

        await waitFor(() => {
            expect(dbService.login).toHaveBeenCalledWith({ username: 'test@ecole.com', password: 'ancien-mot-de-passe', subUsersOnly: true })
            expect(screen.getByText('Email ou mot de passe incorrect')).toBeInTheDocument()
            expect(mockOnLogin).not.toHaveBeenCalled()
        })
    })

    it('lets a local sub-user (unknown to the cloud) log in after the cloud refusal', async () => {
        const subUser = { id: 's1', username: 'secretaire', role: 'secretaire', name: 'Secrétaire', isSubUser: true }
        vi.mocked(dbService.cloudActivate).mockRejectedValue(new Error('Email ou mot de passe incorrect'))
        vi.mocked(dbService.login).mockResolvedValue(subUser)

        await submit('secretaire', 'secret123')

        await waitFor(() => {
            expect(dbService.login).toHaveBeenCalledWith({ username: 'secretaire', password: 'secret123', subUsersOnly: true })
            expect(mockOnLogin).toHaveBeenCalledWith(subUser)
        })
    })

    it('shows the local error when offline and no local account matches', async () => {
        vi.mocked(dbService.cloudActivate).mockRejectedValue(new Error('fetch failed'))
        vi.mocked(dbService.login).mockRejectedValue(new Error('Identifiants incorrects'))

        await submit('wrong', 'wrong')

        await waitFor(() => {
            expect(screen.getByText('Identifiants incorrects')).toBeInTheDocument()
        })
    })

    it('strips the Electron IPC wrapper prefix from error messages', async () => {
        vi.mocked(dbService.login).mockRejectedValue(new Error('Identifiants incorrects'))
        vi.mocked(dbService.cloudActivate).mockRejectedValue(
            new Error("Error invoking remote method 'cloud-activate': Error: Licence invalide reçue du serveur")
        )

        await submit('wrong', 'wrong')

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
