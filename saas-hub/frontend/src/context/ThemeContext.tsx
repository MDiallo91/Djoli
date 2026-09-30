/**
 * context/ThemeContext.tsx
 * Applique dynamiquement les couleurs admin + le mode dark à toute l'app.
 * - Lit les couleurs depuis localStorage (hub_site_config) au démarrage
 * - Écoute l'event 'site-config-updated' émis par SiteSection après sauvegarde
 * - Expose useDark() pour le toggle dark mode
 */

import { createContext, useContext, useState, useEffect, useLayoutEffect, useCallback, type ReactNode } from 'react';
import { injectTheme } from '../lib/colorSystem';

const DEFAULT_PRIMARY   = '#4f46e5';
const DEFAULT_SECONDARY = '#10b981';
const STORAGE_DARK      = 'djoli_dark';
const STORAGE_SITE      = 'hub_site_config';

type SiteConfig = { primaryColor?: string; secondaryColor?: string };

interface ThemeCtx {
  primaryColor:   string;
  secondaryColor: string;
  dark:           boolean;
  toggleDark:     () => void;
}

const ThemeContext = createContext<ThemeCtx>({
  primaryColor:   DEFAULT_PRIMARY,
  secondaryColor: DEFAULT_SECONDARY,
  dark:           false,
  toggleDark:     () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [primary, setPrimary] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_SITE);
      if (s) return JSON.parse(s).primaryColor || DEFAULT_PRIMARY;
    } catch { /* localStorage indisponible ou JSON invalide */ }
    return DEFAULT_PRIMARY;
  });
  const [secondary, setSecondary] = useState(() => {
    try {
      const s = localStorage.getItem(STORAGE_SITE);
      if (s) return JSON.parse(s).secondaryColor || DEFAULT_SECONDARY;
    } catch { /* localStorage indisponible ou JSON invalide */ }
    return DEFAULT_SECONDARY;
  });
  const [dark, setDark] = useState(() => localStorage.getItem(STORAGE_DARK) === '1');

  const apply = useCallback((p: string, s: string, d: boolean) => {
    setPrimary(p);
    setSecondary(s);
    injectTheme(p, s, d);
  }, []);

  // Injection synchrone avant le premier paint — évite tout flash de couleurs
  useLayoutEffect(() => {
    injectTheme(primary, secondary, dark);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Réapplique quand SiteSection sauvegarde de nouvelles couleurs
  useEffect(() => {
    const onUpdate = () => {
      const cfg: SiteConfig = JSON.parse(localStorage.getItem(STORAGE_SITE) || '{}');
      apply(
        cfg.primaryColor   || DEFAULT_PRIMARY,
        cfg.secondaryColor || DEFAULT_SECONDARY,
        dark,
      );
    };
    window.addEventListener('site-config-updated', onUpdate);
    return () => window.removeEventListener('site-config-updated', onUpdate);
  }, [apply, dark]);

  const toggleDark = useCallback(() => {
    const next = !dark;
    setDark(next);
    localStorage.setItem(STORAGE_DARK, next ? '1' : '0');
    injectTheme(primary, secondary, next);
  }, [dark, primary, secondary]);

  return (
    <ThemeContext.Provider value={{ primaryColor: primary, secondaryColor: secondary, dark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
