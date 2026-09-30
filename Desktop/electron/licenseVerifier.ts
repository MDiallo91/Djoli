import jwt from 'jsonwebtoken';
import type { LicenseData } from '../shared/licenseVerifier';

export type { LicenseData, LicenseStatus } from '../shared/licenseVerifier';
export { getDaysRemaining, computeLicenseStatus } from '../shared/licenseVerifier';

// Must match LICENSE_SECRET in the backend .env.
// TODO (production): switch to RS256 — embed only the public key here,
//   keep the private key exclusively on the server.
const LICENSE_SECRET = process.env.LICENSE_SECRET || 'sms-pro-dev-license-secret-change-in-prod';

export function verifyLicense(token: string): LicenseData {
    return jwt.verify(token, LICENSE_SECRET) as LicenseData;
}
