import jwt from 'jsonwebtoken';
import UserModel from '../models/userModel';

// For production: switch to RS256 (asymmetric).
// Private key stays on server; embed public key in Electron app.
// For now: HS256 with LICENSE_SECRET shared secret.
const LICENSE_SECRET = process.env.LICENSE_SECRET || 'sms-pro-dev-license-secret-change-in-prod';

export interface LicensePayload {
    school_id: string;
    school_name: string;
    email: string;
    status: 'trial' | 'active' | 'expired' | 'suspended';
    trial_end_date: string | null;
    subscription_end_date: string | null;
    issued_at: string;
}

export function generateLicenseKey(user: UserModel): string {
    const toISO = (v: any): string | null => {
        if (!v) return null;
        const d = v instanceof Date ? v : new Date(v);
        return isNaN(d.getTime()) ? String(v) : d.toISOString();
    };
    const trialEnd = user.subscriptionStatus === 'trial' ? toISO(user.subscriptionExpiry) : null;
    const subEnd   = user.subscriptionStatus === 'active' ? toISO(user.subscriptionExpiry) : null;

    const payload: LicensePayload = {
        school_id:             user.id,
        school_name:           user.schoolName,
        email:                 user.email,
        status:                user.subscriptionStatus as LicensePayload['status'],
        trial_end_date:        trialEnd,
        subscription_end_date: subEnd,
        issued_at:             new Date().toISOString(),
    };

    // License token valid for 400 days — renewed on each successful login
    return jwt.sign(payload, LICENSE_SECRET, { expiresIn: '400d' });
}

export function verifyLicenseKey(token: string): LicensePayload {
    return jwt.verify(token, LICENSE_SECRET) as LicensePayload;
}
