/**
 * components/settings/AppInstallerCard.tsx
 * Upload de l'installateur desktop (.exe) directement en base (backend
 * routes/appReleaseRoute.ts). Publier une version remplace la précédente.
 * Consommé par : ApplicationSection.tsx
 */

import { useState, useEffect, useRef } from 'react';
import { Upload, Download, Trash2, Package, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  listAppReleases, uploadAppRelease, deleteAppRelease, formatBytes,
  APP_DOWNLOAD_URL, type AppRelease, type UploadProgress,
} from '../../services/appReleaseApi';
import { Spinner } from '../../ui/design_system/Spinner';

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all bg-white placeholder:text-slate-400';

// « DJOLI Setup 1.2.0.exe » → « 1.2.0 »
const versionFromName = (name: string) => name.match(/(\d+\.\d+(?:\.\d+)?)/)?.[1] ?? '';

const PHASE_LABEL: Record<UploadProgress['phase'], string> = {
  hash: 'Calcul de l’empreinte du fichier…',
  upload: 'Envoi en cours…',
  verify: 'Vérification de l’intégrité…',
};

export function AppInstallerCard({ onPublished }: { onPublished?: (r: AppRelease | null) => void }) {
  const [current,  setCurrent]  = useState<AppRelease | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [file,     setFile]     = useState<File | null>(null);
  const [version,  setVersion]  = useState('');
  const [notes,    setNotes]    = useState('');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [deleting, setDeleting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    listAppReleases()
      .then(rows => setCurrent(rows.find(r => r.status === 'ready') ?? null))
      .catch(() => toast.error('Impossible de charger la version publiée'))
      .finally(() => setLoading(false));
    return () => abortRef.current?.abort();
  }, []);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.exe$/i.test(f.name)) { toast.error('Choisissez l’installateur Windows (.exe)'); return; }
    setFile(f);
    setVersion(versionFromName(f.name));
  };

  const publish = async () => {
    if (!file || !version.trim()) return;
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const release = await uploadAppRelease(file, { version: version.trim(), notes }, setProgress, ctrl.signal);
      setCurrent(release);
      onPublished?.(release);
      setFile(null); setVersion(''); setNotes('');
      toast.success(`Version ${release.version} publiée`, { description: 'L’ancienne version a été supprimée.' });
    } catch (e: any) {
      if (ctrl.signal.aborted || e?.name === 'AbortError' || e?.name === 'CanceledError') toast.info('Upload annulé');
      else toast.error(e.response?.data?.message || e.message || 'Échec de l’upload');
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  const remove = async () => {
    if (!current || !confirm(`Retirer la version ${current.version} ? Le bouton de téléchargement disparaîtra du site.`)) return;
    setDeleting(true);
    try {
      await deleteAppRelease(current.id);
      setCurrent(null);
      onPublished?.(null);
      toast.success('Version retirée');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Suppression impossible');
    } finally { setDeleting(false); }
  };

  const uploading = progress !== null;
  const pct = progress
    ? progress.phase === 'upload' ? Math.round((progress.done / progress.total) * 100)
    : progress.phase === 'verify' ? 100 : 0
    : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-900">Installateur Windows</p>
        <p className="text-xs text-slate-500 mt-0.5">Stocké dans la base de données et proposé au téléchargement sur la page d’accueil. Publier une nouvelle version remplace l’ancienne.</p>
      </div>

      {/* Version publiée */}
      {loading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : current ? (
        <div className="flex items-center gap-3 p-3 bg-secondary-50 border border-secondary-200 rounded-lg">
          <Package size={18} className="text-secondary-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-secondary-800 font-semibold">Version {current.version} publiée</p>
            <p className="text-xs text-secondary-700 truncate">
              {current.filename} · {formatBytes(current.size)} · {new Date(current.publishedAt).toLocaleDateString('fr-FR')}
            </p>
          </div>
          <a href={APP_DOWNLOAD_URL} className="inline-flex items-center gap-1 text-xs text-secondary-700 hover:underline whitespace-nowrap">
            <Download size={13} /> Tester
          </a>
          <button type="button" onClick={remove} disabled={deleting || uploading} title="Retirer cette version"
            className="w-8 h-8 flex items-center justify-center border border-red-200 rounded-lg text-red-500 hover:bg-red-50 transition-all disabled:opacity-50">
            {deleting ? <Spinner size="sm" /> : <Trash2 size={14} />}
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          Aucun installateur publié — le bouton de téléchargement n’apparaît pas sur le site.
        </p>
      )}

      {/* Nouvelle version */}
      {!file ? (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 cursor-pointer hover:border-primary-400 hover:bg-slate-50 transition-all">
          <Upload size={22} className="text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700">{current ? 'Publier une nouvelle version' : 'Choisir l’installateur (.exe)'}</p>
          <p className="text-xs text-slate-400 mt-1">Fichier généré par <code>npm run build</code> dans school-management-system/dist-app</p>
          <input type="file" accept=".exe,application/x-msdownload,application/vnd.microsoft.portable-executable" className="hidden"
            onChange={e => { pick(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
      ) : (
        <div className="space-y-3 p-4 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-3">
            <Package size={18} className="text-primary-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
            </div>
            {!uploading && (
              <button type="button" onClick={() => setFile(null)} title="Changer de fichier"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-black mb-1.5">Version *</label>
              <input className={inputCls} value={version} disabled={uploading}
                onChange={e => setVersion(e.target.value)} placeholder="1.0.0" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-black mb-1.5">Notes de version (optionnel)</label>
              <input className={inputCls} value={notes} disabled={uploading} maxLength={2000}
                onChange={e => setNotes(e.target.value)} placeholder="Nouveautés, corrections…" />
            </div>
          </div>

          {uploading ? (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>{PHASE_LABEL[progress!.phase]}</span>
                {progress!.phase === 'upload' && <span>{pct} % · {progress!.done}/{progress!.total} morceaux</span>}
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-primary-600 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => abortRef.current?.abort()} className="text-xs text-red-500 hover:underline">Annuler l’upload</button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button type="button" onClick={publish} disabled={!version.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-700 transition-all disabled:opacity-50">
                <Upload size={13} /> Publier la version
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
