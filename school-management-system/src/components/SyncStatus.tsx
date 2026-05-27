import React, { useState } from 'react';
import { RefreshCw, WifiOff, Clock, AlertTriangle, CheckCircle, UploadCloud } from 'lucide-react';
import { useSyncStore, SyncStatus as SyncStatusType } from '../stores/useSyncStore';
import { dbService } from '../services/db';

function formatRelativeTime(isoStr: string | null): string {
    if (!isoStr) return 'jamais';
    const diff = Date.now() - new Date(isoStr).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60)  return 'à l\'instant';
    const m = Math.floor(s / 60);
    if (m < 60)  return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    return `il y a ${h}h`;
}

const STATUS_CONFIG: Record<SyncStatusType, { label: string; dot: string; icon: React.ReactNode }> = {
    idle:     { label: 'En attente',    dot: 'bg-gray-300',    icon: <Clock size={13} /> },
    syncing:  { label: 'Sync…',         dot: 'bg-blue-400 animate-pulse', icon: <RefreshCw size={13} className="animate-spin" /> },
    synced:   { label: 'Synchronisé',   dot: 'bg-emerald-400', icon: <CheckCircle size={13} /> },
    pending:  { label: 'En attente',    dot: 'bg-amber-400',   icon: <Clock size={13} /> },
    offline:  { label: 'Hors ligne',    dot: 'bg-red-400',     icon: <WifiOff size={13} /> },
    conflict: { label: 'Conflit',       dot: 'bg-orange-400',  icon: <AlertTriangle size={13} /> },
};

export const SyncStatus: React.FC = () => {
    const { status, pendingCount, lastSyncAt } = useSyncStore();
    const [syncing, setSyncing] = useState(false);
    const [fullSyncing, setFullSyncing] = useState(false);
    const cfg = STATUS_CONFIG[status];

    const handleSyncNow = async () => {
        setSyncing(true);
        try { await dbService.syncNow(); } finally { setSyncing(false); }
    };

    const handleForceFullSync = async () => {
        if (!confirm('Envoyer toutes les données locales vers le cloud ?\n\nCette opération peut prendre quelques secondes.')) return;
        setFullSyncing(true);
        try {
            const result = await dbService.forceFullSync();
            alert(`Synchronisation complète terminée.\n${result.queued} enregistrement(s) envoyés vers le cloud.`);
        } catch (e: any) {
            alert('Erreur lors de la synchronisation complète : ' + (e?.message || e));
        } finally {
            setFullSyncing(false);
        }
    };

    const busy = syncing || fullSyncing || status === 'syncing';

    return (
        <div className="flex items-center gap-1.5 no-print">
            <button
                onClick={handleSyncNow}
                disabled={busy}
                title={`Dernière sync : ${formatRelativeTime(lastSyncAt)}`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100 transition-all text-xs font-semibold disabled:opacity-60"
            >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <span className="flex items-center gap-1">
                    {cfg.icon}
                    {cfg.label}
                </span>
                {pendingCount > 0 && (
                    <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                        {pendingCount}
                    </span>
                )}
            </button>

            <button
                onClick={handleForceFullSync}
                disabled={busy}
                title="Envoyer toutes les données locales vers le cloud"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-all text-xs font-semibold disabled:opacity-60"
            >
                {fullSyncing
                    ? <RefreshCw size={13} className="animate-spin" />
                    : <UploadCloud size={13} />
                }
                <span className="hidden sm:inline">Resync</span>
            </button>
        </div>
    );
};
