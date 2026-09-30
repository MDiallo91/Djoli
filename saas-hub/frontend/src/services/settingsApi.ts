/**
 * services/settingsApi.ts
 * Appels API pour les paramètres du site.
 * Consommé par : hooks/useSettings, SettingsTab (sections individuelles)
 * → Passe par apiClient (token injecté automatiquement)
 */

import apiClient from '../lib/apiClient';
import { API_SETTINGS } from '../constants/api';

/** Charge toutes les sections de paramètres en une requête. */
export async function fetchAllSettings(): Promise<Record<string, any>> {
  const { data } = await apiClient.get(API_SETTINGS);
  return data;
}

/** Charge une section spécifique. */
export async function fetchSetting<T>(key: string): Promise<{ statut: 0 | 1; data: T } | null> {
  try {
    const { data } = await apiClient.get<{ statut: 0 | 1; data: T }>(`${API_SETTINGS}/${key}`);
    return data;
  } catch {
    return null;
  }
}

/** Sauvegarde une section avec son statut (upsert backend via PUT). */
export async function saveSetting(key: string, payload: { statut?: number; data: any }): Promise<void> {
  await apiClient.put(`${API_SETTINGS}/${key}`, payload);
}

/** Sauvegarde le statut seul d'une section (actif/inactif). */
export async function saveSettingStatus(key: string, statut: 0 | 1): Promise<void> {
  await apiClient.put(`${API_SETTINGS}/${key}`, { statut });
}

/** Taille max d'une image du site — alignée sur le backend (MEDIA_MAX_BYTES). */
export const MEDIA_MAX_BYTES = 3 * 1024 * 1024;
const MEDIA_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

/**
 * Upload d'une image du site (hero, aperçus…) → stockée en base, servie par
 * /api/media/:id. Retourne l'URL à enregistrer dans les paramètres.
 */
export async function uploadMedia(file: File): Promise<string> {
  if (!MEDIA_TYPES.includes(file.type)) throw new Error('Image PNG, JPG, WEBP ou GIF requise');
  if (file.size > MEDIA_MAX_BYTES) throw new Error('Image trop volumineuse (3 Mo maximum)');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('Lecture du fichier impossible'));
    r.readAsDataURL(file);
  });
  const { data } = await apiClient.post<{ id: string; url: string }>('/media', {
    name: file.name, type: file.type, data: dataUrl.slice(dataUrl.indexOf(',') + 1),
  });
  return data.url;
}
