/**
 * types/admin.ts
 * Tous les types TypeScript du panneau admin DJOLI.
 * Consommé par : components/admin/*, components/settings/*, page/admin/*
 */

// ─── Établissement ────────────────────────────────────────────
export interface School {
  id: string;
  schoolName: string;
  email: string;
  role: string;
  country: string;
  city: string;
  level: string;
  levels?: string[];
  pendingLevels?: string[];
  directorName: string;
  prefecture: string;
  sousPrefecture: string;
  rccm: string;
  logoUrl: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'suspended';
  subscriptionExpiry: string;
  createdAt: string;
  /** Date d'archivage (école supprimée côté admin, restaurable) — null/absent si active. */
  deletedAt?: string | null;
}

// ─── Navigation principale ────────────────────────────────────
export type MainView = 'dashboard' | 'schools' | 'subscriptions' | 'pending' | 'settings';

export type SubView =
  | { kind: 'list' }
  | { kind: 'detail'; school: School }
  | { kind: 'form'; school: School | null };

// ─── Sections des paramètres ──────────────────────────────────
export type SettingsSection =
  | 'site'
  | 'contact'
  | 'tarification'
  | 'application'
  | 'accueil'
  | 'email'
  | 'sms'
  | 'push'
  | 'paiement'
  | 'legal'
  | 'audit';

export type SettingsGroup = 'general' | 'communications' | 'paiement' | 'systeme' | 'pages';

export interface SettingsGroupDef {
  id: SettingsGroup;
  label: string;
  sections: { id: SettingsSection; label: string }[];
}

// ─── Configuration du site ────────────────────────────────────
export const DEFAULT_SITE_CONFIG = {
  siteName:        'DJOLI',
  logoUrl:         '',
  email:           '',
  youtubeUrl:      '',
  whatsappPhone:   '',
  primaryColor:    '#4f46e5',
  secondaryColor:  '#10b981',
  currency:        'EUR' as 'EUR' | 'USD' | 'GNF',
  price30:         '29',
  price90:         '79',
  price365:        '249',
  appVersion:      '2.0',
  githubRepo:      '',
  downloadUrl:     '',
  clientSchoolIds: [] as string[],
  featureImages:   ['', '', ''] as string[],
  heroBgUrl:       '',
};

export type SiteConfig = typeof DEFAULT_SITE_CONFIG;

// ─── Tarification ─────────────────────────────────────────────
export type SchoolLevel = 'Maternelle' | 'Primaire' | 'Collège' | 'Lycée';

export interface LevelPricing {
  Maternelle: number;
  Primaire:   number;
  Collège:    number;
  Lycée:      number;
}

export interface DurationPlan {
  id:          'mensuel' | 'trimestriel' | 'annuel';
  label:       string;
  months:      number;
  discountPct: number; // % de réduction vs mensuel × nb mois (ex: 10 = -10%)
}

export interface MultiLevelDiscount {
  count:       number; // nombre de niveaux combinés (2, 3 ou 4)
  discountPct: number; // % de réduction appliqué sur le sous-total
}

export interface PricingConfig {
  currency:            'EUR' | 'USD' | 'GNF';
  levelPrices:         LevelPricing;
  durations:           DurationPlan[];
  multiLevelDiscounts: MultiLevelDiscount[];
}

export const DEFAULT_PRICING: PricingConfig = {
  currency: 'EUR',
  levelPrices: { Maternelle: 20, Primaire: 25, Collège: 30, Lycée: 35 },
  durations: [
    { id: 'mensuel',     label: 'Mensuel',     months: 1,  discountPct: 0  },
    { id: 'trimestriel', label: 'Trimestriel', months: 3,  discountPct: 10 },
    { id: 'annuel',      label: 'Annuel',      months: 12, discountPct: 20 },
  ],
  multiLevelDiscounts: [
    { count: 2, discountPct: 5  },
    { count: 3, discountPct: 10 },
    { count: 4, discountPct: 15 },
  ],
};

// ─── Journal d'audit ──────────────────────────────────────────
export interface AuditEntry {
  id: string;
  ts: string;
  action: string;
  detail?: string;
  user: string;
}
