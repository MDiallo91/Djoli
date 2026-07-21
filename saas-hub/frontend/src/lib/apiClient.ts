/**
 * lib/apiClient.ts
 * Client HTTP centralisé (axios). Point d'entrée unique vers le backend.
 * Consommé par : tous les services (settingsApi, schoolApi, paymentApi, smsApi, pushApi)
 *
 * Responsabilités :
 *  - Injecter le token Bearer sur chaque requête
 *  - Rediriger vers /login sur 401 (session expirée)
 *  - Normaliser les erreurs réseau en messages lisibles
 */

import axios, { type AxiosError } from 'axios';

function getToken(): string | null {
  try {
    const user = localStorage.getItem('hub_user');
    if (!user) return null;
    return JSON.parse(user).access_token ?? null;
  } catch {
    return null;
  }
}

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const apiClient = axios.create({ baseURL: BASE });

// ─── Interceptor requête : inject token ───────────────────────
apiClient.interceptors.request.use(config => {
  const token = getToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ─── Interceptor réponse : handle 401 + erreurs normalisées ───
apiClient.interceptors.response.use(
  response => response,
  (error: AxiosError) => {
    console.error(`[API] ${error.config?.method?.toUpperCase()} ${error.config?.url} →`, error.response?.status ?? '(connexion échouée)', error.response?.data ?? error.message);
    if (error.response?.status === 401) {
      // Session expirée ou token invalide → nettoyage + redirection
      localStorage.removeItem('hub_user');
      window.dispatchEvent(new CustomEvent('auth:expired'));
      window.location.href = '/login';
    }
    // Normalise le message d'erreur pour les composants
    const message =
      (error.response?.data as any)?.message ??
      error.message ??
      'Erreur réseau';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
