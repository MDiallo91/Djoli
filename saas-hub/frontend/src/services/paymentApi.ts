/**
 * services/paymentApi.ts
 * Appels API pour la configuration des gateways de paiement.
 * Consommé par : PaymentSection, hooks/usePaymentProviders
 * → Passe par apiClient (token injecté automatiquement)
 *
 * Pattern  : chaque gateway stocke son config en DB (type + value JSON).
 * L'activation d'un gateway ne désactive pas les autres (multi-gateway autorisé,
 * contrairement au SMS où un seul est actif à la fois).
 */

import apiClient from '../lib/apiClient';
import { API_SETTINGS } from '../constants/api';
import type { PaymentSettings, PaymentProviderType } from '../types/integrations';

const BASE = `${API_SETTINGS}/payment`;

/** Charge la configuration de tous les gateways. */
export async function fetchPaymentSettings(): Promise<PaymentSettings | null> {
  try {
    const { data } = await apiClient.get<{ data: PaymentSettings }>(BASE);
    return data?.data ?? null;
  } catch {
    return null;
  }
}


/** Sauvegarde la configuration complète des gateways. */
export async function savePaymentSettings(settings: PaymentSettings): Promise<void> {
  await apiClient.put(BASE, { data: settings });
}

/** Teste la connexion à un gateway spécifique (sandbox). */
export async function testGatewayConnection(
  provider: PaymentProviderType
): Promise<{ success: boolean; message: string }> {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    `${BASE}/test`,
    { provider }
  );
  return data;
}

/**
 * Retourne l'URL de callback à afficher dans l'interface (read-only).
 * Ex: https://djoli.app/api/payment/wave/callback
 */
export function getCallbackUri(provider: PaymentProviderType): string {
  const base = import.meta.env.VITE_API_URL ?? window.location.origin;
  return `${base}/api/payment/${provider}/callback`;
}
