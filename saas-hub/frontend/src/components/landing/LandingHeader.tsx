import { useState, useEffect } from 'react';
import { Menu, X, Mail, Phone, Download, LogIn, GraduationCap } from 'lucide-react';
import { NAV_LINKS } from './landingData';
import type { SiteConfig } from './useSiteConfig';

interface Props {
  cfg: SiteConfig;
  downloadUrl: string | null;
  onLogin: () => void;
}

export function LandingHeader({ cfg, downloadUrl, onLogin }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const siteName = cfg.siteName || 'DJOLI';

  return (
    <>
      {/* ── Bandeau haut ── */}
      <div className="lp-topbar hidden md:block">
        <div className="lp-container flex items-center justify-between py-2.5">
          <div className="flex items-center gap-7">
            {cfg.email && (
              <a href={`mailto:${cfg.email}`} className="inline-flex items-center gap-2"><Mail size={15} /> {cfg.email}</a>
            )}
            {cfg.whatsappPhone && (
              <a href={`tel:${cfg.whatsappPhone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-2"><Phone size={15} /> {cfg.whatsappPhone}</a>
            )}
            {!cfg.email && !cfg.whatsappPhone && <span>La gestion scolaire, même sans connexion.</span>}
          </div>
          <div className="flex items-center gap-6">
            {downloadUrl && (
              <a href={downloadUrl} download className="inline-flex items-center gap-2"><Download size={15} /> Télécharger l'application</a>
            )}
            <button onClick={onLogin} className="inline-flex items-center gap-2 bg-transparent border-0 cursor-pointer text-white hover:opacity-80 text-sm">
              <LogIn size={15} /> Espace école
            </button>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <header className={`lp-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-container flex items-center justify-between py-3 lg:py-0">
          <a href="#accueil" className="lp-logo">
            {cfg.logoUrl
              ? <img src={cfg.logoUrl} alt="" className="w-10 h-10 object-contain" />
              : <span className="lp-logo-mark"><GraduationCap size={24} /></span>}
            {siteName}
          </a>

          <nav className="hidden lg:flex items-center gap-9">
            {NAV_LINKS.map(l => <a key={l.href} href={l.href} className="lp-nav-link">{l.label}</a>)}
          </nav>

          <div className="hidden lg:block">
            <button onClick={onLogin} className="lp-btn">Essai gratuit</button>
          </div>

          <button className="lg:hidden p-2 bg-transparent border-0 cursor-pointer" style={{ color: 'var(--lp-dark)' }}
            onClick={() => setOpen(o => !o)} aria-label="Menu">
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden lp-container pb-5 flex flex-col" style={{ borderTop: '1px solid var(--lp-border)' }}>
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="py-3 font-medium" style={{ color: 'var(--lp-dark)', borderBottom: '1px solid var(--lp-border)' }}>
                {l.label}
              </a>
            ))}
            <button onClick={onLogin} className="lp-btn mt-4">Essai gratuit</button>
          </div>
        )}
      </header>
    </>
  );
}
