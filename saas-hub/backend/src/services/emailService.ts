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

export async function sendApprovalEmail(school: { email: string; schoolName: string }) {
  const from = await getFromEmail();
  const loginUrl = `${process.env.FRONTEND_URL || 'https://djoli.vercel.app'}/login`;
  await resend.emails.send({
    from,
    to: school.email,
    subject: '✅ Votre compte DJOLI a été approuvé',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:#1e3a5f;padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">DJOLI</h1>
          <p style="color:rgba(255,255,255,0.7);margin:8px 0 0;font-size:14px">Gestion scolaire intelligente</p>
        </div>
        <div style="padding:32px">
          <h2 style="color:#0f172a;margin:0 0 12px">Bienvenue, ${school.schoolName} !</h2>
          <p style="color:#475569;line-height:1.6">
            Votre demande d'inscription a été <strong style="color:#16a34a">approuvée</strong>. Vous pouvez maintenant accéder à votre espace école et télécharger l'application de bureau DJOLI.
          </p>
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0">
            <p style="color:#166534;margin:0;font-size:14px">
              🎉 Votre période d'essai de <strong>14 jours</strong> commence maintenant.
            </p>
          </div>
          <a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px;margin:8px 0">
            Accéder à mon espace →
          </a>
          <p style="color:#94a3b8;font-size:12px;margin-top:24px">
            En cas de problème, contactez notre support. Cet email a été envoyé automatiquement.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendRejectionEmail(school: { email: string; schoolName: string }) {
  const from = await getFromEmail();
  await resend.emails.send({
    from,
    to: school.email,
    subject: 'Votre demande DJOLI — Information importante',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:#1e3a5f;padding:32px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">DJOLI</h1>
        </div>
        <div style="padding:32px">
          <h2 style="color:#0f172a;margin:0 0 12px">Bonjour ${school.schoolName}</h2>
          <p style="color:#475569;line-height:1.6">
            Après examen de votre dossier, nous ne sommes pas en mesure d'approuver votre demande pour le moment.
            Veuillez nous contacter pour plus d'informations.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendOTPEmail(email: string, code: string, schoolName: string) {
  const from = await getFromEmail();
  await resend.emails.send({
    from,
    to: email,
    subject: `${code} — Votre code de connexion DJOLI`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:#1e3a5f;padding:24px 32px">
          <h1 style="color:#fff;margin:0;font-size:20px">DJOLI</h1>
        </div>
        <div style="padding:32px">
          <p style="color:#475569;margin:0 0 20px">Bonjour <strong>${schoolName}</strong>,</p>
          <p style="color:#475569;margin:0 0 20px">Voici votre code de connexion à usage unique :</p>
          <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:24px;text-align:center;margin:0 0 20px">
            <span style="font-size:42px;font-weight:900;letter-spacing:12px;color:#0f172a;font-family:monospace">${code}</span>
          </div>
          <p style="color:#94a3b8;font-size:13px;margin:0">
            Ce code expire dans <strong>10 minutes</strong>. Ne le partagez avec personne.
          </p>
        </div>
      </div>
    `,
  });
}
