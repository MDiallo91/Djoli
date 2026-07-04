import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import Setting from '../models/settingModel';

// ─── Provider types ───────────────────────────────────────────
export type ProviderType = 'resend' | 'smtp';
export type EmailRoute   = 'otp' | 'approval' | 'rejection';

export interface ResendConfig {
  apiKey:    string;
  fromEmail: string;
  fromName?: string;
}
export interface SmtpConfig {
  host:      string;
  port:      number;
  secure:    boolean;
  user:      string;
  password:  string;
  fromEmail: string;
  fromName?: string;
}
export interface EmailProvider {
  id:      string;
  type:    ProviderType;
  name:    string;
  enabled: boolean;
  config:  ResendConfig | SmtpConfig;
}
export interface EmailProvidersSettings {
  providers: EmailProvider[];
  routing: Record<EmailRoute, string>; // route → provider id
}

// ─── Sender abstraction ───────────────────────────────────────
interface SendPayload { to: string; subject: string; html: string }

async function sendViaResend(cfg: ResendConfig, payload: SendPayload) {
  const resend = new Resend(cfg.apiKey);
  const from   = cfg.fromName ? `${cfg.fromName} <${cfg.fromEmail}>` : cfg.fromEmail;
  await resend.emails.send({ from, to: payload.to, subject: payload.subject, html: payload.html });
}

async function sendViaSmtp(cfg: SmtpConfig, payload: SendPayload) {
  const transport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.password },
  });
  const from = cfg.fromName ? `"${cfg.fromName}" <${cfg.fromEmail}>` : cfg.fromEmail;
  await transport.sendMail({ from, to: payload.to, subject: payload.subject, html: payload.html });
}

// ─── Load settings from DB ────────────────────────────────────
async function loadProviders(): Promise<EmailProvidersSettings | null> {
  try {
    const row = await Setting.findOne({ where: { key: 'email_providers' } });
    if (!row?.data) return null;
    const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return d as EmailProvidersSettings;
  } catch { return null; }
}

// Legacy fallback: old email_config key
async function loadLegacyConfig(): Promise<{ apiKey: string; fromEmail: string } | null> {
  try {
    const row = await Setting.findOne({ where: { key: 'email_config' } });
    if (!row?.data) return null;
    const d = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
    return d?.apiKey ? d : null;
  } catch { return null; }
}

async function getProviderForRoute(route: EmailRoute): Promise<EmailProvider> {
  const settings = await loadProviders();

  if (settings?.providers?.length) {
    // Try routed provider first
    const routedId = settings.routing?.[route];
    if (routedId) {
      const p = settings.providers.find(p => p.id === routedId && p.enabled);
      if (p) return p;
    }
    // Fallback: first enabled provider
    const fallback = settings.providers.find(p => p.enabled);
    if (fallback) return fallback;
  }

  // Legacy email_config fallback
  const legacy = await loadLegacyConfig();
  if (legacy?.apiKey) {
    return {
      id: 'legacy', type: 'resend', name: 'Resend',
      enabled: true,
      config: { apiKey: legacy.apiKey, fromEmail: legacy.fromEmail || 'onboarding@resend.dev' },
    };
  }

  // Env vars last resort
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    return {
      id: 'env', type: 'resend', name: 'Resend (env)',
      enabled: true,
      config: { apiKey, fromEmail: process.env.FROM_EMAIL || 'onboarding@resend.dev' },
    };
  }

  throw new Error('Aucun provider email configuré. Allez dans Admin → Email pour en ajouter un.');
}

async function sendEmail(route: EmailRoute, payload: SendPayload) {
  const provider = await getProviderForRoute(route);
  if (provider.type === 'resend') {
    await sendViaResend(provider.config as ResendConfig, payload);
  } else {
    await sendViaSmtp(provider.config as SmtpConfig, payload);
  }
}

// ─── Email templates ──────────────────────────────────────────
const BRAND_COLOR   = '#1e3a5f';
const ACCENT_COLOR  = '#4f46e5';
const YEAR          = new Date().getFullYear();
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@djoli.app';
const FRONTEND_URL  = process.env.FRONTEND_URL  || 'https://djoli.app';

function emailShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>DJOLI</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">
        <tr>
          <td style="background:${BRAND_COLOR};padding:28px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">DJOLI</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.55);font-size:12px;letter-spacing:1px;text-transform:uppercase;">Plateforme de gestion scolaire</p>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">${content}</td>
        </tr>
        <tr>
          <td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td>
        </tr>
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;">Vous recevez cet email car vous avez créé un compte sur la plateforme DJOLI.</p>
            <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;">Pour toute question&nbsp;: <a href="mailto:${SUPPORT_EMAIL}" style="color:${ACCENT_COLOR};text-decoration:none;">${SUPPORT_EMAIL}</a></p>
            <p style="margin:12px 0 0;color:#cbd5e1;font-size:10px;">&copy; ${YEAR} DJOLI &mdash; Tous droits réservés</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Public send functions ─────────────────────────────────────
export async function sendApprovalEmail(school: { email: string; schoolName: string }) {
  const loginUrl = `${FRONTEND_URL}/login`;
  const body = `
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Confirmation d'inscription</p>
    <h2 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;">Votre compte a été approuvé</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Bonjour, <strong style="color:#0f172a;">${school.schoolName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">Nous avons le plaisir de vous informer que votre dossier d'inscription a été <strong style="color:#15803d;">examiné et approuvé</strong>. Votre espace école est désormais actif.</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;"><p style="margin:0;color:#166534;font-size:14px;line-height:1.6;"><strong>Période d'essai gratuit&nbsp;: 14 jours</strong><br/>Profitez de toutes les fonctionnalités sans limitation pendant votre essai.</p></td></tr>
    </table>
    <table cellpadding="0" cellspacing="0"><tr><td style="background:${ACCENT_COLOR};border-radius:8px;">
      <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">Accéder à mon espace &rarr;</a>
    </td></tr></table>`;
  await sendEmail('approval', { to: school.email, subject: `Votre compte DJOLI est approuvé — Bienvenue, ${school.schoolName}`, html: emailShell(body) });
}

export async function sendRejectionEmail(school: { email: string; schoolName: string }) {
  const body = `
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Information sur votre dossier</p>
    <h2 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;">Suite donnée à votre demande</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Bonjour, <strong style="color:#0f172a;">${school.schoolName}</strong>,</p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">Après analyse de votre dossier, nous ne sommes malheureusement pas en mesure de l'approuver en l'état.</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#fef9f0;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;"><p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">Si vous pensez qu'il s'agit d'une erreur, contactez-nous à <a href="mailto:${SUPPORT_EMAIL}" style="color:${ACCENT_COLOR};text-decoration:none;">${SUPPORT_EMAIL}</a></p></td></tr>
    </table>`;
  await sendEmail('rejection', { to: school.email, subject: `Information concernant votre demande DJOLI — ${school.schoolName}`, html: emailShell(body) });
}

export async function sendOTPEmail(email: string, code: string, schoolName: string) {
  const digits = code.split('').map(d =>
    `<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;font-size:28px;font-weight:800;color:#0f172a;font-family:'Courier New',monospace;margin:0 4px;">${d}</span>`
  ).join('');
  const body = `
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Vérification de votre adresse email</p>
    <h2 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;">Code de confirmation</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">Bonjour, <strong style="color:#0f172a;">${schoolName}</strong>,</p>
    <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">Pour finaliser la création de votre compte DJOLI, veuillez saisir le code ci-dessous&nbsp;:</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;">
      <tr><td align="center" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:28px 20px;"><div>${digits}</div></td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" width="100%" style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;margin:0 0 24px;">
      <tr><td style="padding:14px 18px;"><p style="margin:0;color:#991b1b;font-size:13px;line-height:1.6;"><strong>Important&nbsp;:</strong> Ce code est valable <strong>10 minutes</strong> et à usage unique.</p></td></tr>
    </table>`;
  await sendEmail('otp', { to: email, subject: `[DJOLI] Votre code de vérification : ${code}`, html: emailShell(body) });
}
