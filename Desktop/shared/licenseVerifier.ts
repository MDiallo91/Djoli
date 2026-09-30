// Logique de licence pure — portable telle quelle. Seule la vérification
// cryptographique du JWT (verifyLicense) diverge par plateforme :
// electron/licenseVerifier.ts (jsonwebtoken) vs
// src/worker/services/authAdapter.ts (jose, WebCrypto).
export interface LicenseData {
    school_id:             string;
    school_name:           string;
    email:                 string;
    status:                'trial' | 'active' | 'expired' | 'suspended';
    trial_end_date:        string | null;
    subscription_end_date: string | null;
    issued_at:             string;
    levels?:               string[];
}

export type LicenseStatus = 'valid' | 'trial' | 'warning' | 'expired' | 'invalid';

export function getDaysRemaining(dateStr: string | null | undefined): number {
    if (!dateStr) return -1;
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function computeLicenseStatus(data: LicenseData): LicenseStatus {
    if (data.status === 'suspended') return 'expired';

    const endDate = data.subscription_end_date ?? data.trial_end_date;
    const daysLeft = getDaysRemaining(endDate);

    if (daysLeft < 0)  return 'expired';
    if (daysLeft <= 7) return 'warning';
    if (data.status === 'trial') return 'trial';
    return 'valid';
}
