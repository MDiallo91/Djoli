import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, Clock, Send, ChevronRight, GraduationCap } from 'lucide-react';
import { FaWhatsapp, FaYoutube } from 'react-icons/fa';
import { SectionTitle } from './SectionTitle';
import { NAV_LINKS } from './landingData';
import type { SiteConfig } from './useSiteConfig';

// ─── Contact ────────────────────────────────────────────────────────────────
export function ContactSection({ cfg, whatsappHref }: { cfg: SiteConfig; whatsappHref: string | null }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg]     = useState('');
  const [sent, setSent]   = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!cfg.email) return;
    const subject = encodeURIComponent(`Message depuis ${cfg.siteName || 'DJOLI'}`);
    const body    = encodeURIComponent(`De: ${email}\n\n${msg}`);
    window.open(`mailto:${cfg.email}?subject=${subject}&body=${body}`);
    setSent(true); setEmail(''); setMsg('');
    setTimeout(() => setSent(false), 5000);
  };

  return (
    <section id="contact" className="lp-section lp-bg-light">
      <div className="lp-container grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 flex flex-col gap-5">
          <SectionTitle sub="Contact" className="mb-3">Vous avez <span>une question ?</span></SectionTitle>
          <p className="m-0 mb-2">Notre équipe vous répond sous 24 h. Écrivez-nous ou contactez-nous directement.</p>
          {cfg.email && (
            <div className="lp-contact-info">
              <div className="lp-icon lp-icon-sm"><Mail size={24} /></div>
              <div><h4>Email</h4><a href={`mailto:${cfg.email}`}>{cfg.email}</a></div>
            </div>
          )}
          {whatsappHref && (
            <div className="lp-contact-info">
              <div className="lp-icon lp-icon-sm"><FaWhatsapp size={24} /></div>
              <div><h4>WhatsApp</h4><a href={whatsappHref} target="_blank" rel="noopener noreferrer">{cfg.whatsappPhone}</a></div>
            </div>
          )}
          <div className="lp-contact-info">
            <div className="lp-icon lp-icon-sm"><Clock size={24} /></div>
            <div><h4>Disponibilité</h4><p>Lundi – Samedi, 8 h – 18 h</p></div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="lp-form">
            {sent ? (
              <div className="text-center py-16">
                <div className="lp-icon mx-auto mb-5"><Send size={30} /></div>
                <h3 className="text-2xl font-bold mb-2">Message prêt à partir !</h3>
                <p className="m-0">Votre messagerie s'est ouverte. Nous vous répondrons rapidement.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-5">
                <h3 className="text-3xl font-bold mb-1">Envoyez-nous un message</h3>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="Votre email (ex. directeur@monecole.gn)" className="lp-input" />
                <textarea required rows={6} value={msg} onChange={e => setMsg(e.target.value)}
                  placeholder="Décrivez votre question ou votre projet…" className="lp-input" style={{ resize: 'vertical' }} />
                <div>
                  <button type="submit" disabled={!cfg.email} className="lp-btn"><Send size={18} /> Envoyer le message</button>
                </div>
                {!cfg.email && <p className="text-sm m-0">Email de contact non configuré (paramètres admin).</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────
export function LandingFooter({ cfg, whatsappHref, downloadUrl }: { cfg: SiteConfig; whatsappHref: string | null; downloadUrl: string | null }) {
  const siteName = cfg.siteName || 'DJOLI';
  return (
    <footer className="lp-footer">
      <div className="lp-container grid sm:grid-cols-2 lg:grid-cols-4 gap-10 py-20">
        <div>
          <div className="lp-logo mb-5" style={{ color: '#fff' }}>
            {cfg.logoUrl
              ? <img src={cfg.logoUrl} alt="" className="w-10 h-10 object-contain" />
              : <span className="lp-logo-mark"><GraduationCap size={24} /></span>}
            {siteName}
          </div>
          <p className="mb-6">La plateforme qui simplifie la gestion des établissements scolaires, connectée ou non.</p>
          <div className="flex gap-3">
            {whatsappHref && <a className="lp-social" href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><FaWhatsapp size={18} /></a>}
            {cfg.youtubeUrl && <a className="lp-social" href={cfg.youtubeUrl} target="_blank" rel="noopener noreferrer" aria-label="YouTube"><FaYoutube size={18} /></a>}
            {cfg.email && <a className="lp-social" href={`mailto:${cfg.email}`} aria-label="Email"><Mail size={18} /></a>}
          </div>
        </div>

        <div>
          <h4>Navigation</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-3">
            {NAV_LINKS.slice(1).map(l => (
              <li key={l.href}><a href={l.href} className="lp-footer-link"><ChevronRight size={16} /> {l.label}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h4>Ressources</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-3">
            {downloadUrl && <li><a href={downloadUrl} className="lp-footer-link"><ChevronRight size={16} /> Télécharger l'application</a></li>}
            <li><Link to="/login" className="lp-footer-link"><ChevronRight size={16} /> Espace école</Link></li>
            <li><Link to="/legal/terms" className="lp-footer-link"><ChevronRight size={16} /> Conditions d'utilisation</Link></li>
            <li><Link to="/legal/privacy" className="lp-footer-link"><ChevronRight size={16} /> Confidentialité</Link></li>
            <li><Link to="/legal/mentions" className="lp-footer-link"><ChevronRight size={16} /> Mentions légales</Link></li>
          </ul>
        </div>

        <div>
          <h4>Nous contacter</h4>
          <ul className="list-none p-0 m-0 flex flex-col gap-4">
            {cfg.email && <li><a href={`mailto:${cfg.email}`} className="lp-footer-link"><Mail size={18} /> {cfg.email}</a></li>}
            {cfg.whatsappPhone && <li><a href={`tel:${cfg.whatsappPhone.replace(/[^\d+]/g, '')}`} className="lp-footer-link"><Phone size={18} /> {cfg.whatsappPhone}</a></li>}
            <li className="inline-flex items-center gap-2"><Clock size={18} style={{ color: 'var(--lp-accent)' }} /> Lun – Sam, 8 h – 18 h</li>
          </ul>
        </div>
      </div>

      <div className="lp-footer-bottom">
        <div className="lp-container flex flex-wrap justify-between gap-3 py-6 text-sm">
          <span>© {new Date().getFullYear()} {siteName}. Tous droits réservés.</span>
          <span>Conçu pour l'éducation africaine</span>
        </div>
      </div>
    </footer>
  );
}
