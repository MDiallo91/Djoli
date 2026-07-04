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
export async function fetchSetting<T>(key: string): Promise<{ statut: number; data: T } | null> {
  try {
    const { data } = await apiClient.get<{ statut: number; data: T }>(`${API_SETTINGS}/${key}`);
    return data;
  } catch {
    return null;
  }
}

/** Sauvegarde une section avec son statut. */
export async function saveSetting(key: string, payload: { statut?: number; data: any }): Promise<void> {
  await apiClient.post(`${API_SETTINGS}/${key}`, payload);
}

/** Sauvegarde le statut seul d'une section (actif/inactif). */
export async function saveSettingStatus(key: string, statut: 0 | 1): Promise<void> {
  await apiClient.post(`${API_SETTINGS}/${key}/status`, { statut });
}
