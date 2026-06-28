import { Resend } from 'resend';
import Setting from '../models/settingModel';

const resend = new Resend(process.env.RESEND_API_KEY);

async function getFromEmail(): Promise<string> {
  try {
    const row = await Setting.findOne({ where: { key: 'contact' } });
    if (row) {
      const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
      if (data?.email) return `DJOLI <${data.email}>`;
    }
  } catch {}
  return process.env.FROM_EMAIL || 'DJOLI <onboarding@resend.dev>';
}

const BRAND_COLOR  = '#1e3a5f';
const ACCENT_COLOR = '#4f46e5';
const YEAR         = new Date().getFullYear();
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

        <!-- HEADER -->
        <tr>
          <td style="background:${BRAND_COLOR};padding:28px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">DJOLI</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.55);font-size:12px;letter-spacing:1px;text-transform:uppercase;">Plateforme de gestion scolaire</p>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px 40px 32px;">
            ${content}
          </td>
        </tr>

        <!-- DIVIDER -->
        <tr>
          <td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e2e8f0;margin:0;" /></td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;">
              Vous recevez cet email car vous avez créé un compte sur la plateforme DJOLI.
            </p>
            <p style="margin:0 0 6px;color:#94a3b8;font-size:11px;">
              Pour toute question&nbsp;: <a href="mailto:${SUPPORT_EMAIL}" style="color:${ACCENT_COLOR};text-decoration:none;">${SUPPORT_EMAIL}</a>
            </p>
            <p style="margin:12px 0 0;color:#cbd5e1;font-size:10px;">
              &copy; ${YEAR} DJOLI &mdash; Tous droits réservés
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Approbation ──────────────────────────────────────────────
export async function sendApprovalEmail(school: { email: string; schoolName: string }) {
  const from     = await getFromEmail();
  const loginUrl = `${FRONTEND_URL}/login`;

  const body = `
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Confirmation d'inscription</p>
    <h2 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;">Votre compte a été approuvé</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
      Bonjour, <strong style="color:#0f172a;">${school.schoolName}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
      Nous avons le plaisir de vous informer que votre dossier d'inscription sur la plateforme DJOLI a été
      <strong style="color:#15803d;">examiné et approuvé</strong>. Votre espace école est désormais actif.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:#f0fdf4;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;color:#166534;font-size:14px;line-height:1.6;">
          <strong>Période d'essai gratuit&nbsp;: 14 jours</strong><br/>
          Profitez de toutes les fonctionnalités sans limitation pendant votre essai.
        </p>
      </td></tr>
    </table>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;">
          <p style="margin:0 0 12px;color:#0f172a;font-size:14px;font-weight:600;">Prochaines étapes</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;line-height:1.6;">
            &nbsp;1.&nbsp; Connectez-vous à votre espace de gestion en ligne
          </p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;line-height:1.6;">
            &nbsp;2.&nbsp; Téléchargez l'application de bureau DJOLI
          </p>
          <p style="margin:0;color:#475569;font-size:14px;line-height:1.6;">
            &nbsp;3.&nbsp; Configurez votre établissement et commencez à gérer vos données
          </p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:${ACCENT_COLOR};border-radius:8px;">
          <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
            Accéder à mon espace &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  await resend.emails.send({
    from,
    to:      school.email,
    subject: `Votre compte DJOLI est approuvé — Bienvenue, ${school.schoolName}`,
    html:    emailShell(body),
  });
}

// ─── Rejet ────────────────────────────────────────────────────
export async function sendRejectionEmail(school: { email: string; schoolName: string }) {
  const from = await getFromEmail();

  const body = `
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Information sur votre dossier</p>
    <h2 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;">Suite donnée à votre demande</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
      Bonjour, <strong style="color:#0f172a;">${school.schoolName}</strong>,
    </p>
    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
      Nous avons bien reçu et examiné votre demande d'inscription à la plateforme DJOLI.
      Après analyse de votre dossier, nous ne sommes malheureusement pas en mesure de l'approuver en l'état.
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:#fef9f0;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;margin:0 0 28px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;color:#92400e;font-size:14px;line-height:1.6;">
          Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez soumettre des informations complémentaires,
          notre équipe reste disponible pour étudier votre situation.
        </p>
      </td></tr>
    </table>

    <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
      N'hésitez pas à nous contacter directement à l'adresse&nbsp;:
      <a href="mailto:${SUPPORT_EMAIL}" style="color:${ACCENT_COLOR};font-weight:600;text-decoration:none;">${SUPPORT_EMAIL}</a>
    </p>

    <p style="margin:0;color:#475569;font-size:15px;line-height:1.7;">
      Nous vous remercions de l'intérêt que vous portez à DJOLI.
    </p>
  `;

  await resend.emails.send({
    from,
    to:      school.email,
    subject: `Information concernant votre demande DJOLI — ${school.schoolName}`,
    html:    emailShell(body),
  });
}

// ─── OTP vérification email ───────────────────────────────────
export async function sendOTPEmail(email: string, code: string, schoolName: string) {
  const from = await getFromEmail();
  const digits = code.split('').map(d =>
    `<span style="display:inline-block;width:44px;height:56px;line-height:56px;text-align:center;background:#f8fafc;border:2px solid #e2e8f0;border-radius:10px;font-size:28px;font-weight:800;color:#0f172a;font-family:'Courier New',monospace;margin:0 4px;">${d}</span>`
  ).join('');

  const body = `
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Vérification de votre adresse email</p>
    <h2 style="margin:0 0 20px;color:#0f172a;font-size:22px;font-weight:700;">Code de confirmation</h2>
    <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.7;">
      Bonjour, <strong style="color:#0f172a;">${schoolName}</strong>,
    </p>
    <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
      Pour finaliser la création de votre compte DJOLI, veuillez saisir le code de vérification ci-dessous&nbsp;:
    </p>

    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 28px;">
      <tr>
        <td align="center" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:28px 20px;">
          <div>${digits}</div>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" width="100%" style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:0 8px 8px 0;margin:0 0 24px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0;color:#991b1b;font-size:13px;line-height:1.6;">
          <strong>Important&nbsp;:</strong> Ce code est valable <strong>10 minutes</strong> et à usage unique.
          Ne le communiquez à personne, y compris à notre équipe.
        </p>
      </td></tr>
    </table>

    <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
      Si vous n'avez pas effectué cette demande, vous pouvez ignorer cet email en toute sécurité.
    </p>
  `;

  await resend.emails.send({
    from,
    to:      email,
    subject: `[DJOLI] Votre code de vérification : ${code}`,
    html:    emailShell(body),
  });
}
