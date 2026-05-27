// Shared sync session state — written by authService, read by syncService.
// Avoids circular imports between the two services.

export interface SyncSession {
    schoolId:   string;
    licenseKey: string;
}

export let currentSyncSession: SyncSession | null = null;

export function setSyncSession(schoolId: string, licenseKey: string): void {
    currentSyncSession = { schoolId, licenseKey };
}

export function clearSyncSession(): void {
    currentSyncSession = null;
}
