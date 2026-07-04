/**
 * services/smsApi.ts
 * Appels API pour la configuration et le test des providers SMS.
 * Consommé par : SmsSection, hooks/useSmsProviders
 * → Passe par apiClient (token injecté automatiquement)
 */

import apiClient from '../lib/apiClient';
import { API_SETTINGS } from '../constants/api';
import type { SmsSettings } from '../types/integrations';

const BASE = `${API_SETTINGS}/sms`;

/** Charge la configuration SMS complète (providers + templates). */
export async function fetchSmsSettings(): Promise<SmsSettings | null> {
  try {
    const { data } = await apiClient.get<{ data: SmsSettings }>(BASE);
    return data?.data ?? null;
  } catch {
    return null;
  }
}

/** Sauvegarde la configuration SMS complète. */
export async function saveSmsSettings(settings: SmsSettings): Promise<void> {
  await apiClient.post(BASE, { data: settings });
}

/** Envoie un SMS de test via le provider actif. */
export async function sendTestSms(phone: string): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    `${BASE}/test`,
    { phone }
  );
  return data;
}
