import { create } from 'zustand';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'offline' | 'conflict';

export interface SyncConflict {
    conflict_id:       string;
    entity_type:       string;
    entity_id:         string;
    local_data:        any;
    remote_data:       any;
    remote_updated_at: string;
}

interface SyncState {
    status:       SyncStatus;
    pendingCount: number;
    lastSyncAt:   string | null;
    conflicts:    SyncConflict[];

    setStatus:      (status: SyncStatus, meta?: { pendingCount?: number; lastSyncAt?: string }) => void;
    addConflicts:   (conflicts: SyncConflict[]) => void;
    removeConflict: (conflictId: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
    status:       'idle',
    pendingCount: 0,
    lastSyncAt:   null,
    conflicts:    [],

    setStatus: (status, meta = {}) =>
        set((s) => ({
            status,
            pendingCount: meta.pendingCount ?? s.pendingCount,
            lastSyncAt:   meta.lastSyncAt   ?? s.lastSyncAt,
        })),

    addConflicts: (conflicts) =>
        set((s) => ({
            conflicts: [...s.conflicts, ...conflicts],
            status:    'conflict',
        })),

    removeConflict: (conflictId) =>
        set((s) => {
            const next = s.conflicts.filter((c) => c.conflict_id !== conflictId);
            return { conflicts: next, status: next.length > 0 ? 'conflict' : 'synced' };
        }),
}));
