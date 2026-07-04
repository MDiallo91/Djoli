/**
 * constants/api.ts
 * Points d'entrée API centralisés.
 * Consommé par : services/*, hooks/*, et adminDashboard (en attendant migration)
 * → Toute modification d'URL se fait ici, un seul endroit
 */

export const API_ADMIN    = '/api/admin';   // fetch() direct → chemin complet
export const API_SETTINGS = '/settings';    // apiClient (baseURL = /api) → pas de /api ici
export const API_AUTH     = '/auth';        // apiClient → idem
