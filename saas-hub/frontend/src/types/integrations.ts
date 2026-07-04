/**
 * types/integrations.ts
 * Types pour les intégrations tierces : email, SMS, push, paiement.
 * Consommé par : components/settings/EmailSection, SmsSection, PushSection, PaymentSection
 *                hooks/useSmsProviders, usePushProviders, usePaymentProviders
 *                services/smsApi, pushApi, paymentApi
 */

// ─── Email ────────────────────────────────────────────────────
export type EmailProviderType = 'resend' | 'smtp';
export type EmailRoute = 'otp' | 'approval' | 'rejection';

export interface EmailProvider {
  id: string;
  type: EmailProviderType;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}

export interface EmailProvidersState {
  providers: EmailProvider[];
  routing: Record<EmailRoute, string>;
}

export const DEFAULT_EMAIL_STATE: EmailProvidersState = {
  providers: [],
  routing: { otp: '', approval: '', rejection: '' },
};

// ─── SMS ──────────────────────────────────────────────────────
export type SmsProviderType = 'twilio' | 'vonage' | 'orange' | 'infobip' | 'lengosms';

export interface SmsProvider {
  id: SmsProviderType;
  name: string;
  logo?: string;
  enabled: boolean;
  config: Record<string, string>;
}

/** Template de message SMS par événement */
export interface SmsEventTemplate {
  event: string;     // ex: 'otp', 'approval', 'payment_confirmed'
  label: string;     // ex: 'Code OTP'
  enabled: boolean;
  template: string;  // ex: 'Votre code DJOLI : #CODE#'
  placeholders: string[];  // ex: ['#CODE#', '#SCHOOL#']
}

export interface SmsSettings {
  providers: SmsProvider[];
  templates: SmsEventTemplate[];
}

// ─── Push Notifications ───────────────────────────────────────
export type PushProviderType = 'fcm' | 'onesignal';

export interface PushProvider {
  id: PushProviderType;
  name: string;
  enabled: boolean;
  config: Record<string, string>;
}

export interface PushEventTemplate {
  event: string;
  label: string;
  enabled: boolean;
  title: string;
  body: string;
  placeholders: string[];
}

export interface PushSettings {
  providers: PushProvider[];
  templates: PushEventTemplate[];
}

// ─── Paiement ─────────────────────────────────────────────────
export type PaymentProviderType =
  | 'wave'
  | 'orange_money'
  | 'mtn_momo'
  | 'paydunya'
  | 'cinetpay'
  | 'stripe'
  | 'paypal'
  | 'bank_transfer';

export type PaymentEnvironment = 'sandbox' | 'live';

export interface PaymentProvider {
  id: PaymentProviderType;
  name: string;
  logo?: string;
  enabled: boolean;
  environment: PaymentEnvironment;
  config: Record<string, string>;
  /** URL de callback à afficher en lecture seule (copier) */
  callbackUri?: string;
}

export interface PaymentSettings {
  providers: PaymentProvider[];
}
