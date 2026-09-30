import { useState, useEffect, type CSSProperties } from 'react';
import { DEFAULT_PRICING, type PricingConfig } from '../../types/admin';

// ─── Config du site (paramètres admin → /api/settings) ──────────────────────
// Couleurs par défaut : palette « Eduka » (vert + orange). Restent surchargées
// par cfg.primaryColor / cfg.secondaryColor si l'admin les a enregistrées.
export const DEFAULT_CFG = {
  siteName: 'DJOLI', logoUrl: '', email: '', youtubeUrl: '', whatsappPhone: '',
  primaryColor: '#116E63', secondaryColor: '#FDA31B',
  // Tarification (section admin « tarification ») : prix mensuel par niveau,
  // remises par durée et multi-niveaux — voir components/settings/TarificationSection.tsx
  currency: DEFAULT_PRICING.currency as PricingConfig['currency'],
  levelPrices: DEFAULT_PRICING.levelPrices as PricingConfig['levelPrices'],
  durations: DEFAULT_PRICING.durations as PricingConfig['durations'],
  multiLevelDiscounts: DEFAULT_PRICING.multiLevelDiscounts as PricingConfig['multiLevelDiscounts'],
  appVersion: '2.0', githubRepo: '', downloadUrl: '',
  clientSchoolIds: [] as string[], clientSchools: [] as { id: string; name: string; logoUrl: string }[],
  featureImages: ['', '', '', ''] as string[],
  heroBgUrl: '',
};
export type SiteConfig = typeof DEFAULT_CFG;

const SETTINGS_API = '/api/settings';
const CFG_SECTIONS = ['site', 'contact', 'tarification', 'application', 'accueil'] as const;

export function useSiteConfig() {
  const [cfg, setCfg] = useState<SiteConfig>(DEFAULT_CFG);

  const applyWithSchools = (merged: SiteConfig) => {
    const ids = merged.clientSchoolIds ?? [];
    if (ids.length) {
      fetch('/api/admin/schools')
        .then(r => r.json())
        .then((all: any[]) => {
          const featured = all
            .filter((sc: any) => ids.includes(sc.id) && sc.approvalStatus === 'approved')
            .map((sc: any) => ({ id: sc.id, name: sc.schoolName, logoUrl: sc.logoUrl ?? '' }));
          setCfg({ ...merged, clientSchools: featured });
        })
        .catch(() => setCfg(merged));
    } else {
      setCfg(merged);
    }
  };

  const loadFromApi = () => {
    fetch(SETTINGS_API)
      .then(r => r.ok ? r.json() : null)
      .then(all => {
        if (!all) throw new Error('no data');
        let merged = { ...DEFAULT_CFG };
        for (const sec of CFG_SECTIONS) {
          if (all[sec]?.statut === 1 && all[sec]?.data) merged = { ...merged, ...all[sec].data };
        }
        applyWithSchools(merged);
      })
      .catch(() => {
        try {
          const s = localStorage.getItem('hub_site_config');
          if (s) applyWithSchools({ ...DEFAULT_CFG, ...JSON.parse(s) });
        } catch { /* localStorage indisponible ou config corrompue — on garde les valeurs par défaut */ }
      });
  };

  useEffect(() => {
    loadFromApi();
    window.addEventListener('site-config-updated', loadFromApi);
    return () => window.removeEventListener('site-config-updated', loadFromApi);
  }, []);

  return cfg;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
/** Variables CSS de marque à poser sur `.lp-root` (accueil + pages de connexion). */
export function themeVars(cfg: SiteConfig): CSSProperties {
  return {
    '--lp-primary': cfg.primaryColor   || DEFAULT_CFG.primaryColor,
    '--lp-accent':  cfg.secondaryColor || DEFAULT_CFG.secondaryColor,
  } as CSSProperties;
}

export function formatPrice(amount: number, currency: string) {
  if (currency === 'GNF') return `${Math.round(amount).toLocaleString('fr-FR')} GNF`;
  const n = Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace('.', ',');
  return currency === 'USD' ? `$${n.replace(',', '.')}` : `${n} €`;
}

export function toEmbedUrl(url: string): string {
  const m1 = url.match(/[?&]v=([^&]+)/);
  if (m1) return `https://www.youtube.com/embed/${m1[1]}?autoplay=1&rel=0`;
  const m2 = url.match(/youtu\.be\/([^?&]+)/);
  if (m2) return `https://www.youtube.com/embed/${m2[1]}?autoplay=1&rel=0`;
  return url;
}
