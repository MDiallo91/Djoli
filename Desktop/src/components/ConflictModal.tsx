import React from 'react';
import { AlertTriangle, Monitor, Cloud, X } from 'lucide-react';
import { useSyncStore, SyncConflict } from '../stores/useSyncStore';
import { dbService } from '../services/db';

const ENTITY_LABELS: Record<string, string> = {
    grade:   'Note',
    payment: 'Paiement',
};

function DataPreview({ data, label }: { data: any; label: string }) {
    if (!data) return <p className="text-gray-400 text-xs italic">Données supprimées</p>;
    const entries = Object.entries(data).filter(([k]) => !['id', 'device_id', 'created_at', 'deleted_at'].includes(k));
    return (
        <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-xs font-mono">
                {entries.map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                        <span className="text-gray-400 min-w-[80px]">{k}</span>
                        <span className="text-gray-800 font-semibold truncate">{String(v ?? '—')}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ConflictCard({ conflict, onResolve }: { conflict: SyncConflict; onResolve: (id: string, choice: 'local' | 'remote') => void }) {
    return (
        <div className="bg-white rounded-2xl border-2 border-orange-100 p-5 space-y-4">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle size={16} className="text-orange-600" />
                </div>
                <div>
                    <p className="font-black text-gray-900 text-sm">
                        Conflit — {ENTITY_LABELS[conflict.entity_type] ?? conflict.entity_type}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">{conflict.entity_id.slice(0, 8)}…</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <DataPreview data={conflict.local_data}  label="Version locale" />
                <DataPreview data={conflict.remote_data} label="Version distante" />
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    onClick={() => onResolve(conflict.conflict_id, 'local')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all"
                >
                    <Monitor size={14} />
                    Garder local
                </button>
                <button
                    onClick={() => onResolve(conflict.conflict_id, 'remote')}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all"
                >
                    <Cloud size={14} />
                    Accepter distant
                </button>
            </div>
        </div>
    );
}

export const ConflictModal: React.FC = () => {
    const { conflicts, removeConflict } = useSyncStore();
    if (conflicts.length === 0) return null;

    const handleResolve = async (conflictId: string, choice: 'local' | 'remote') => {
        const conflict = conflicts.find((c) => c.conflict_id === conflictId);
        if (!conflict) return;
        await dbService.resolveConflict({
            conflict_id:  conflictId,
            choice,
            entity_type:  conflict.entity_type,
            entity_id:    conflict.entity_id,
            remote_data:  choice === 'remote' ? conflict.remote_data : undefined,
        });
        removeConflict(conflictId);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-6 no-print">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Conflits de synchronisation</h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {conflicts.length} conflit{conflicts.length > 1 ? 's' : ''} détecté{conflicts.length > 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <AlertTriangle size={16} className="text-orange-600" />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {conflicts.map((conflict) => (
                        <ConflictCard key={conflict.conflict_id} conflict={conflict} onResolve={handleResolve} />
                    ))}
                </div>
            </div>
        </div>
    );
};
