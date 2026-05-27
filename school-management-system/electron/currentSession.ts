// Stores the currently authenticated user in the main process.
// Written by authService after login; read by auditLogger.

export interface SessionUser {
    id:       string
    name:     string
    username: string
    role:     string
}

export let currentUser: SessionUser | null = null

export function setCurrentUser(user: SessionUser | null): void {
    currentUser = user
}
