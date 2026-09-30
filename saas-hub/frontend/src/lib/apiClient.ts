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
    // Session expirée ou token invalide → nettoyage + redirection. Uniquement si une session
    // était ouverte (jeton envoyé) et hors routes d'authentification : un mauvais mot de passe
    // à la connexion renvoie aussi 401, et rechargeait la page (formulaire et message effacés).
    const sentToken = !!error.config?.headers?.['Authorization'];
    const isAuthRoute = /^\/?user\/(login|register|verify-otp|resend-otp)/.test(error.config?.url ?? '');
    if (error.response?.status === 401 && sentToken && !isAuthRoute) {
      localStorage.removeItem('hub_user');
      window.dispatchEvent(new CustomEvent('auth:expired'));
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    // Normalise le message d'erreur pour les composants. Les routes renvoient
    // `{ message }` (auth, admin, médias) ou `{ error }` (routes école) : on lit les deux.
    // La réponse d'origine est conservée (err.response) pour les composants qui la lisent
    // — avant, elle était perdue et les messages précis du serveur ne s'affichaient pas.
    const data = error.response?.data as any;
    const message = data?.message ?? data?.error ?? error.message ?? 'Erreur réseau';
    const normalized = new Error(message) as Error & { response?: typeof error.response; status?: number };
    normalized.response = error.response;
    normalized.status = error.response?.status;
    return Promise.reject(normalized);
  },
);

export default apiClient;
