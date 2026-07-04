/**
 * hooks/useSiteConfig.ts
 * Hooks de configuration du site — deux variantes selon le contexte.
 *
 * useSiteConfig()     → LandingPage : charge toutes les sections + écoles,
 *                       pas de cache localStorage (page publique).
 *
 * useSiteConfigLive() → AdminDashboard sidebar : cache localStorage immédiat
 *                       puis rafraîchit depuis /api/settings/site en arrière-plan.
 *
 * Consommé par : LandingPage.tsx (useSiteConfig)
 *                layout/AdminLayout.tsx (useSiteConfigLive)
 */

import { useState, useEffect } from 'react';
import { DEFAULT_SITE_CONFIG, type SiteConfig } from '../types/admin';

const SETTINGS_API = '/api/settings';
const STORAGE_KEY  = 'hub_site_config';
const CFG_SECTIONS = ['site', 'contact', 'tarification', 'application', 'accueil'] as const;

// ─── Variante LandingPage ─────────────────────────────────────
export interface LandingSiteConfig extends SiteConfig {
  clientSchools: { id: string; name: string; logoUrl: string }[];
}

const DEFAULT_LANDING: LandingSiteConfig = { ...DEFAULT_SITE_CONFIG, clientSchools: [] };

export function useSiteConfig(): LandingSiteConfig {
  const [cfg, setCfg] = useState<LandingSiteConfig>(DEFAULT_LANDING);

  useEffect(() => {
    fetch(SETTINGS_API)
      .then(r => r.ok ? r.json() : null)
      .then(async (all) => {
        if (!all) return;

        // Merge toutes les sections actives
        let merged: SiteConfig = { ...DEFAULT_SITE_CONFIG };
        for (const sec of CFG_SECTIONS) {
          if (all[sec]?.statut === 1 && all[sec]?.data) {
            merged = { ...merged, ...all[sec].data };
          }
        }

        // Charger les écoles de confiance
        const ids: string[] = merged.clientSchoolIds ?? [];
        if (ids.length) {
          try {
            const r = await fetch('/api/admin/schools');
            const all: any[] = await r.json();
            const schools = all
              .filter(s => ids.includes(s.id) && s.approvalStatus === 'approved')
              .map(s => ({ id: s.id, name: s.schoolName, logoUrl: s.logoUrl ?? '' }));
            setCfg({ ...merged, clientSchools: schools });
          } catch {
            setCfg({ ...merged, clientSchools: [] });
          }
        } else {
          setCfg({ ...merged, clientSchools: [] });
        }
      })
      .catch(() => {});
  }, []);

  return cfg;
}

// ─── Variante AdminSidebar ────────────────────────────────────
function loadFromStorage(): SiteConfig {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? { ...DEFAULT_SITE_CONFIG, ...JSON.parse(s) } : DEFAULT_SITE_CONFIG;
  } catch {
    return DEFAULT_SITE_CONFIG;
  }
}

export function useSiteConfigLive(): SiteConfig {
  const [cfg, setCfg] = useState<SiteConfig>(loadFromStorage);

  useEffect(() => {
    // Écoute les mises à jour depuis SettingsTab
    const handler = () => setCfg(loadFromStorage());
    window.addEventListener('site-config-updated', handler);

    // Rafraîchit depuis le serveur
    fetch(`${SETTINGS_API}/site`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.statut === 1 && d.data) {
          setCfg(p => ({ ...p, ...d.data }));
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('site-config-updated', handler);
  }, []);

  return cfg;
}
