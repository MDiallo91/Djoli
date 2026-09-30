import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { fetchLatestRelease } from '../lib/githubRelease';
import type { GithubRelease } from '../lib/githubRelease';
import { fetchLatestAppRelease, APP_DOWNLOAD_URL } from '../services/appReleaseApi';
import { useSiteConfig, toEmbedUrl, themeVars } from './landing/useSiteConfig';
import { LandingHeader } from './landing/LandingHeader';
import { LandingHero } from './landing/LandingHero';
import { AboutSection, CounterSection, ModulesSection, VideoSection, OfflineSection, StepsSection } from './landing/LandingSections';
import { PricingSection, OfferBand, TestimonialsSection, PartnersSection } from './landing/LandingPricing';
import { ContactSection, LandingFooter } from './landing/LandingContact';
import './landing/landing.css';

// Page d'accueil publique — mise en page inspirée du thème « Eduka »
// (bandeau contact, hero à slides, cartes flottantes, modules, compteurs…).
// Chaque section vit dans components/landing/ ; ce fichier ne fait que charger
// la config/les données et assembler les sections.
export const LandingPage = () => {
  const cfg = useSiteConfig();
  const navigate = useNavigate();
  const goLogin = () => navigate('/login');

  const [ghRelease, setGhRelease]     = useState<GithubRelease | null>(null);
  const [publicStats, setPublicStats] = useState<{ schoolCount: number; studentCount: number } | null>(null);
  const [videoOpen, setVideoOpen]     = useState(false);
  const [showTop, setShowTop]         = useState(false);

  useEffect(() => {
    fetch('/api/public/stats').then(r => r.ok ? r.json() : null).then(d => { if (d) setPublicStats(d); }).catch(() => {});
  }, []);

  // Installateur publié en base (prioritaire), sinon lien direct configuré dans
  // l'admin, sinon dernière release GitHub (.exe).
  const [dbRelease, setDbRelease] = useState<GithubRelease | null>(null);
  useEffect(() => {
    fetchLatestAppRelease().then(r => { if (r) setDbRelease({ version: r.version, downloadUrl: APP_DOWNLOAD_URL }); });
  }, []);
  useEffect(() => {
    if (!cfg.downloadUrl && cfg.githubRepo) fetchLatestRelease(cfg.githubRepo).then(r => { if (r) setGhRelease(r); });
  }, [cfg.downloadUrl, cfg.githubRepo]);
  const release: GithubRelease | null = dbRelease
    ?? (cfg.downloadUrl ? { version: cfg.appVersion || '?', downloadUrl: cfg.downloadUrl } : ghRelease);

  useEffect(() => {
    const fn = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const whatsappHref = cfg.whatsappPhone ? `https://wa.me/${cfg.whatsappPhone.replace(/\D/g, '')}` : null;
  const embedUrl     = cfg.youtubeUrl ? toEmbedUrl(cfg.youtubeUrl) : null;
  const downloadUrl  = release?.downloadUrl ?? null;
  const images       = cfg.featureImages ?? [];

  return (
    <div className="lp-root" style={themeVars(cfg)}>
      <LandingHeader cfg={cfg} downloadUrl={downloadUrl} onLogin={goLogin} />

      <LandingHero heroBgUrl={cfg.heroBgUrl} downloadUrl={downloadUrl} hasVideo={!!embedUrl}
        onLogin={goLogin} onVideo={() => setVideoOpen(true)} />

      <AboutSection onLogin={goLogin} />
      <CounterSection stats={publicStats} />
      <ModulesSection images={images} />
      {embedUrl && <VideoSection bg={cfg.heroBgUrl} onPlay={() => setVideoOpen(true)} />}
      <OfflineSection />
      <StepsSection />
      <PricingSection cfg={cfg} onLogin={goLogin} />
      <OfferBand downloadUrl={downloadUrl} version={release?.version ?? null} onLogin={goLogin} />
      <TestimonialsSection />
      <PartnersSection schools={cfg.clientSchools} />
      <ContactSection cfg={cfg} whatsappHref={whatsappHref} />
      <LandingFooter cfg={cfg} whatsappHref={whatsappHref} downloadUrl={downloadUrl} />

      {/* ── Vidéo plein écran ── */}
      {videoOpen && embedUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,.88)' }} onClick={() => setVideoOpen(false)}>
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="relative w-full rounded-2xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
              <iframe src={embedUrl} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen" allowFullScreen title="Vidéo de présentation" />
            </div>
          </div>
          <button onClick={() => setVideoOpen(false)} aria-label="Fermer"
            className="absolute top-5 right-5 w-11 h-11 grid place-items-center text-white text-2xl rounded-full border-0 cursor-pointer"
            style={{ background: 'rgba(255,255,255,.15)' }}>×</button>
        </div>
      )}

      {/* ── Flottants ── */}
      <button className={`lp-scroll-top ${showTop ? '' : 'is-hidden'}`} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Remonter">
        <ArrowUp size={20} />
      </button>
      {whatsappHref && (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="lp-whatsapp">
          <FaWhatsapp size={20} /> WhatsApp
        </a>
      )}
    </div>
  );
};
