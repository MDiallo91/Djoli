/**
 * services/appReleaseApi.ts
 * Installateur desktop (.exe) stocké en base — voir backend routes/appReleaseRoute.ts.
 * Upload découpé en morceaux (taille imposée par le backend), chacun réessayé
 * en cas d'échec réseau, puis vérification SHA-256 côté serveur.
 * Consommé par : components/settings/ApplicationSection.tsx, landing (version publiée)
 */

import apiClient from '../lib/apiClient';

export const APP_RELEASES_API = '/app-releases';
export const APP_DOWNLOAD_URL = '/api/app-releases/latest/download';

export interface AppRelease {
  id: string; version: string; filename: string; size: number; sha256: string;
  notes: string | null; publishedAt: string; url: string;
  status?: 'uploading' | 'ready'; createdAt?: string;
}

/** Version publiée (null si aucune). Appel public, sans authentification. */
export async function fetchLatestAppRelease(): Promise<AppRelease | null> {
  try {
    const r = await fetch(`/api${APP_RELEASES_API}/latest`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** Toutes les versions connues (admin) — la publiée et un éventuel upload en cours. */
export async function listAppReleases(): Promise<AppRelease[]> {
  const { data } = await apiClient.get<AppRelease[]>(APP_RELEASES_API);
  return data;
}

export async function deleteAppRelease(id: string): Promise<void> {
  await apiClient.delete(`${APP_RELEASES_API}/${id}`);
}

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface UploadProgress { phase: 'hash' | 'upload' | 'verify'; done: number; total: number; }

/**
 * Publie un installateur : init → morceaux → finalisation. La version précédente
 * est supprimée par le backend une fois celle-ci vérifiée et publiée.
 */
export async function uploadAppRelease(
  file: File,
  meta: { version: string; notes?: string },
  onProgress: (p: UploadProgress) => void,
  signal?: AbortSignal,
): Promise<AppRelease> {
  onProgress({ phase: 'hash', done: 0, total: file.size });
  const sha256 = await sha256Hex(file);
  if (signal?.aborted) throw new DOMException('Annulé', 'AbortError');

  const { data: init } = await apiClient.post<{ id: string; chunkSize: number; chunkCount: number }>(
    APP_RELEASES_API,
    { version: meta.version, filename: file.name, size: file.size, sha256, notes: meta.notes || undefined },
    { signal },
  );

  try {
    for (let idx = 0; idx < init.chunkCount; idx++) {
      const blob = file.slice(idx * init.chunkSize, Math.min(file.size, (idx + 1) * init.chunkSize));
      for (let attempt = 1; ; attempt++) {
        try {
          await apiClient.put(`${APP_RELEASES_API}/${init.id}/chunks/${idx}`, blob, {
            headers: { 'Content-Type': 'application/octet-stream' }, signal,
          });
          break;
        } catch (err: any) {
          if (signal?.aborted || attempt >= 4 || (err.response && err.response.status < 500)) throw err;
          await new Promise(r => setTimeout(r, 1000 * attempt)); // 1 s, 2 s, 3 s
        }
      }
      onProgress({ phase: 'upload', done: idx + 1, total: init.chunkCount });
    }

    onProgress({ phase: 'verify', done: 0, total: 1 });
    const { data } = await apiClient.post<AppRelease>(`${APP_RELEASES_API}/${init.id}/complete`, {}, { signal });
    return data;
  } catch (err) {
    // Upload interrompu : on libère les morceaux déjà envoyés (best-effort).
    deleteAppRelease(init.id).catch(() => {});
    throw err;
  }
}

export function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} Go`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} Mo`;
  return `${Math.max(1, Math.round(n / 1024))} Ko`;
}
