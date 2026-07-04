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
  directorName: string;
  prefecture: string;
  sousPrefecture: string;
  rccm: string;
  logoUrl: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'suspended';
  subscriptionExpiry: string;
  createdAt: string;
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

// ─── Journal d'audit ──────────────────────────────────────────
export interface AuditEntry {
  id: string;
  ts: string;
  action: string;
  detail?: string;
  user: string;
}
