/**
 * services/pushApi.ts
 * Appels API pour la configuration et le test des providers push notification.
 * Consommé par : PushSection, hooks/usePushProviders
 * → Passe par apiClient (token injecté automatiquement)
 */

import apiClient from '../lib/apiClient';
import { API_SETTINGS } from '../constants/api';
import type { PushSettings } from '../types/integrations';

const BASE = `${API_SETTINGS}/push`;

/** Charge la configuration push complète (providers + templates). */
export async function fetchPushSettings(): Promise<PushSettings | null> {
  try {
    const { data } = await apiClient.get<{ data: PushSettings }>(BASE);
    return data?.data ?? null;
  } catch {
    return null;
  }
}

/** Sauvegarde la configuration push complète. */
export async function savePushSettings(settings: PushSettings): Promise<void> {
  await apiClient.put(BASE, { data: settings });
}

/** Envoie une notification push de test. */
export async function sendTestPush(payload: {
  title: string;
  body: string;
}): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    `${BASE}/test`,
    payload
  );
  return data;
}
