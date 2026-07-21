// Stores the currently authenticated user in the main process (Electron) or
// the Worker realm (navigateur). Written by authService after login; read by
// auditLogger.

export interface SessionUser {
    id:           string
    name:         string
    username:     string
    role:         string
    scope_levels: string[]
}

export let currentUser: SessionUser | null = null

export function setCurrentUser(user: SessionUser | null): void {
    currentUser = user
}
