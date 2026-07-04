/**
 * context/ThemeContext.tsx
 * Applique dynamiquement les couleurs admin + le mode dark à toute l'app.
 * - Lit les couleurs depuis localStorage (hub_site_config) au démarrage
 * - Écoute l'event 'site-config-updated' émis par SiteSection après sauvegarde
 * - Expose useDark() pour le toggle dark mode
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
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
  const [primary,   setPrimary]   = useState(DEFAULT_PRIMARY);
  const [secondary, setSecondary] = useState(DEFAULT_SECONDARY);
  const [dark,      setDark]      = useState(() => localStorage.getItem(STORAGE_DARK) === '1');

  const apply = useCallback((p: string, s: string, d: boolean) => {
    setPrimary(p);
    setSecondary(s);
    injectTheme(p, s, d);
  }, []);

  // Charge les couleurs depuis localStorage, sans appel réseau (évite le flash)
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_SITE);
    const cfg: SiteConfig = cached ? JSON.parse(cached) : {};
    apply(
      cfg.primaryColor   || DEFAULT_PRIMARY,
      cfg.secondaryColor || DEFAULT_SECONDARY,
      dark,
    );
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
