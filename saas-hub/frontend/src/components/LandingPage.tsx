import React, { useState, useEffect } from 'react';
import { fetchLatestRelease } from '../lib/githubRelease';
import type { GithubRelease } from '../lib/githubRelease';
import { Link, useNavigate } from 'react-router-dom';
import { Download, Menu, X, MessageCircle, CheckCircle, Laptop, Cloud, WifiOff, Wifi, ArrowRight, RefreshCw, Users, BookOpen, Wallet, CalendarDays } from 'lucide-react';

// ─── Config ────────────────────────────────────────────────────
const DEFAULT_CFG = {
  siteName: 'DJOLI', logoUrl: '', email: '', youtubeUrl: '', whatsappPhone: '',
  primaryColor: '#14213D', secondaryColor: '#C9992F',
  currency: 'GNF', price30: '50000', price90: '130000', price365: '450000',
  appVersion: '2.0', githubRepo: '', downloadUrl: '',
  clientSchoolIds: [] as string[], clientSchools: [] as any[],
  featureImages: ['', '', '', ''] as string[],
  heroBgUrl: '',
};

const SETTINGS_API = '/api/settings';
const CFG_SECTIONS = ['site', 'contact', 'tarification', 'application', 'accueil'] as const;

function useSiteConfig() {
  const [cfg, setCfg] = useState<typeof DEFAULT_CFG>(DEFAULT_CFG);

  const applyWithSchools = (merged: typeof DEFAULT_CFG) => {
    const ids = merged.clientSchoolIds ?? [];
    if (ids.length) {
      fetch('/api/admin/schools')
        .then(r => r.json())
        .then((all: any[]) => {
          const featured = all
            .filter((sc: any) => ids.includes(sc.id) && sc.approvalStatus === 'approved')
            .map((sc: any) => ({ id: sc.id, name: sc.schoolName, logoUrl: sc.logoUrl ?? '' }));
          setCfg({ ...merged, clientSchools: featured });
        })
        .catch(() => setCfg(merged));
    } else {
      setCfg(merged);
    }
  };

  const loadFromApi = () => {
    fetch(SETTINGS_API)
      .then(r => r.ok ? r.json() : null)
      .then(all => {
        if (!all) throw new Error('no data');
        let merged = { ...DEFAULT_CFG };
        for (const sec of CFG_SECTIONS) {
          if (all[sec]?.statut === 1 && all[sec]?.data) merged = { ...merged, ...all[sec].data };
        }
        applyWithSchools(merged);
      })
      .catch(() => {
        try {
          const s = localStorage.getItem('hub_site_config');
          if (s) applyWithSchools({ ...DEFAULT_CFG, ...JSON.parse(s) });
        } catch {}
      });
  };

  useEffect(() => {
    loadFromApi();
    window.addEventListener('site-config-updated', loadFromApi);
    return () => window.removeEventListener('site-config-updated', loadFromApi);
  }, []);

  return cfg;
}

// ─── Helpers ───────────────────────────────────────────────────
function formatPrice(price: string, currency: string) {
  if (currency === 'GNF') return `${Number(price).toLocaleString('fr-FR')} F`;
  return currency === 'USD' ? `$${price}` : `${price} €`;
}

function toEmbedUrl(url: string): string {
  const m1 = url.match(/[?&]v=([^&]+)/);
  if (m1) return `https://www.youtube.com/embed/${m1[1]}?autoplay=1&rel=0`;
  const m2 = url.match(/youtu\.be\/([^?&]+)/);
  if (m2) return `https://www.youtube.com/embed/${m2[1]}?autoplay=1&rel=0`;
  return url;
}

// ─── Static data ───────────────────────────────────────────────
const NAV_LINKS = [
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Tarifs',          href: '#tarification' },
  { label: 'Témoignages',     href: '#temoignages' },
  { label: 'Contact',         href: '#contact' },
];

const FEATURES = [
  { n: '01', title: 'Inscriptions',      desc: "Créez et suivez les dossiers d'inscription de chaque élève, du dépôt à la validation. Import Excel en masse.",          Icon: Users,        iconBg: '#14213D', iconColor: '#C9992F' },
  { n: '02', title: 'Notes & Bulletins', desc: 'Saisissez les notes par matière et générez bulletins PDF et moyennes automatiquement avec coefficients.',                 Icon: BookOpen,     iconBg: '#C9992F', iconColor: '#FAF6EF' },
  { n: '03', title: 'Finances',          desc: 'Suivez frais de scolarité, paiements mensuels et salaires depuis un tableau de bord unique en temps réel.',               Icon: Wallet,       iconBg: '#14213D', iconColor: '#C9992F' },
  { n: '04', title: 'Emplois du temps',  desc: "Composez les emplois du temps de vos classes et professeurs sans conflit d'horaire.",                                     Icon: CalendarDays, iconBg: '#C9992F', iconColor: '#FAF6EF' },
];

const TESTIMONIALS = [
  { quote: "Djoli nous fait gagner un temps considérable sur les inscriptions et les paiements, même en connexion instable.", name: 'Fatou Cissé',   role: 'Directrice, Groupe Scolaire Étoile' },
  { quote: "Le mode hors-ligne change tout : nos secrétariats travaillent même en coupure, tout se synchronise sans effort.", name: 'Moussa Traoré', role: 'Fondateur, Institut Les Cèdres' },
  { quote: "Nous avons enfin une vue claire sur les finances de l'établissement, en temps réel et sans tableur Excel.",        name: 'Aïcha Koné',    role: 'Gestionnaire, Lycée Nouvel Horizon' },
];

const HOW_IT_WORKS = [
  {
    n: '01',
    title: "Téléchargez l'application",
    desc: "Installez DJOLI sur votre ordinateur Windows en quelques minutes. Aucun serveur à configurer, aucun abonnement cloud requis pour démarrer.",
    detail: 'Compatible Windows 10 / 11',
  },
  {
    n: '02',
    title: "Configurez votre établissement",
    desc: "Renseignez vos classes, matières et personnels. Importez vos élèves existants via Excel ou ajoutez-les un par un selon votre rythme.",
    detail: "Prise en main en moins d'une heure",
  },
  {
    n: '03',
    title: "Travaillez en toute liberté",
    desc: "Inscriptions, notes, finances — tout fonctionne sans connexion. Dès que le réseau revient, vos données se synchronisent automatiquement dans le cloud.",
    detail: 'Offline-first, sync automatique',
  },
];

// ─── Component ─────────────────────────────────────────────────
export const LandingPage = (_props?: { onGetStarted?: () => void }) => {
  const [scrolled,      setScrolled]      = useState(false);
  const [mobileMenu,    setMobileMenu]    = useState(false);
  const [demoOpen,      setDemoOpen]      = useState(false);
  const [contactEmail,  setContactEmail]  = useState('');
  const [contactMsg,    setContactMsg]    = useState('');
  const [contactSent,   setContactSent]   = useState(false);
  const cfg = useSiteConfig();
  const [release,       setRelease]       = useState<GithubRelease | null>(null);
  const [publicStats,   setPublicStats]   = useState<{ schoolCount: number; studentCount: number } | null>(null);
  const navigate = useNavigate();
  const goLogin  = () => navigate('/login');

  const navy = cfg.primaryColor   || '#14213D';
  const gold = cfg.secondaryColor || '#C9992F';

  useEffect(() => {
    fetch('/api/public/stats').then(r => r.ok ? r.json() : null).then(d => { if (d) setPublicStats(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (cfg.downloadUrl) setRelease({ version: cfg.appVersion || '?', downloadUrl: cfg.downloadUrl });
    else if (cfg.githubRepo) fetchLatestRelease(cfg.githubRepo).then(r => { if (r) setRelease(r); });
  }, [cfg.downloadUrl, cfg.githubRepo, cfg.appVersion]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const whatsappHref = cfg.whatsappPhone ? `https://wa.me/${cfg.whatsappPhone.replace(/\D/g, '')}` : null;
  const embedUrl     = cfg.youtubeUrl ? toEmbedUrl(cfg.youtubeUrl) : null;

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfg.email) return;
    const subject = encodeURIComponent(`Message depuis ${cfg.siteName || 'DJOLI'}`);
    const body    = encodeURIComponent(`De: ${contactEmail}\n\n${contactMsg}`);
    window.open(`mailto:${cfg.email}?subject=${subject}&body=${body}`);
    setContactSent(true); setContactEmail(''); setContactMsg('');
    setTimeout(() => setContactSent(false), 5000);
  };

  const STATS = [
    { value: publicStats ? `${publicStats.schoolCount.toLocaleString('fr-FR')}+` : '500+', label: 'Établissements' },
    { value: publicStats ? `${publicStats.studentCount.toLocaleString('fr-FR')}+` : '50k+', label: 'Élèves gérés' },
    { value: '99.9%', label: 'Disponibilité' },
    { value: '100%',  label: 'Offline-ready' },
  ];

  const PRICING = [
    { tier: '30 Jours', key: 'price30',  period: '/mois',      highlight: false, features: ["Accès complet à toutes les fonctions", "Support par email", "1 poste connecté"] },
    { tier: '3 Mois',  key: 'price90',  period: '/trimestre', highlight: true,  features: ["Accès complet à toutes les fonctions", "Synchronisation cloud incluse", "Support prioritaire 24h", "Jusqu'à 5 postes"] },
    { tier: '1 An',    key: 'price365', period: '/an',         highlight: false, features: ["Accès complet à toutes les fonctions", "Sync cloud illimitée", "Support VIP & formation", "Postes illimités"] },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#FAF6EF', fontFamily: "'Work Sans', system-ui, sans-serif", color: navy }}>

      {/* ── Global styles ─────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,500;0,600;1,500;1,600&family=Work+Sans:wght@400;500;600;700&display=swap');

        :root { --navy: ${navy}; --gold: ${gold}; --bg: #FAF6EF; --bg2: #F4E9D0; --txt: #6B6258; --muted: #8A7F70; --bdr: rgba(20,33,61,.16); }

        @keyframes dj-fadeUp   { from { opacity:0; transform:translateY(26px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dj-float    { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-12px); } }

        .dj-serif  { font-family: 'Source Serif 4', Georgia, serif; }
        .dj-sans   { font-family: 'Work Sans', system-ui, sans-serif; }
        .dj-mono   { font-family: monospace; }

        .dj-fadeUp1 { opacity:0; animation: dj-fadeUp .7s ease .05s forwards; }
        .dj-fadeUp2 { opacity:0; animation: dj-fadeUp .7s ease .15s forwards; }
        .dj-fadeUp3 { opacity:0; animation: dj-fadeUp .7s ease .25s forwards; }
        .dj-fadeUp4 { opacity:0; animation: dj-fadeUp .7s ease .35s forwards; }
        .dj-fadeUp5 { opacity:0; animation: dj-fadeUp .7s ease .45s forwards; }
        .dj-floatAnim { animation: dj-float 6s ease-in-out infinite; }

        /* Buttons */
        .dj-btn-navy {
          display: inline-flex; align-items: center; gap: 10px;
          background: var(--navy); color: #FAF6EF;
          font-family: 'Work Sans', sans-serif; font-weight: 700; font-size: 12px;
          letter-spacing: .08em; text-transform: uppercase;
          padding: 16px 32px; border: none; cursor: pointer; text-decoration: none;
          transition: background .25s, transform .25s, box-shadow .25s;
        }
        .dj-btn-navy:hover { background: var(--gold); color: var(--navy); transform: translateY(-3px); box-shadow: 0 14px 28px rgba(201,153,47,.35); }

        .dj-btn-gold {
          display: inline-flex; align-items: center; gap: 10px;
          background: var(--gold); color: var(--navy);
          font-family: 'Work Sans', sans-serif; font-weight: 700; font-size: 12px;
          letter-spacing: .08em; text-transform: uppercase;
          padding: 16px 32px; border: none; cursor: pointer; text-decoration: none;
          transition: transform .25s, box-shadow .25s;
        }
        .dj-btn-gold:hover { transform: translateY(-3px); box-shadow: 0 14px 28px rgba(201,153,47,.4); }

        .dj-btn-ghost {
          background: none; border: none; cursor: pointer; text-decoration: none;
          font-family: 'Work Sans', sans-serif; font-weight: 600; font-size: 13px;
          color: var(--navy); border-bottom: 1px solid var(--navy); padding-bottom: 3px;
          transition: color .2s, border-color .2s;
        }
        .dj-btn-ghost:hover { color: var(--gold); border-color: var(--gold); }
        .dj-btn-ghost-light { color: #FAF6EF; border-color: rgba(250,246,239,.5); }
        .dj-btn-ghost-light:hover { color: var(--gold); border-color: var(--gold); }

        /* Footer links */
        .dj-footer-link { color: rgba(250,246,239,.65); transition: color .2s; }
        .dj-footer-link:hover { color: var(--gold); }

        /* Nav link */
        .dj-nav-link {
          color: var(--muted); text-decoration: none;
          font-family: 'Work Sans', sans-serif; font-weight: 600; font-size: 12px;
          letter-spacing: .12em; text-transform: uppercase;
          transition: color .2s;
        }
        .dj-nav-link:hover { color: var(--navy); }

        /* Feature cards */
        .dj-feat-card { transition: background .25s, transform .25s; }
        .dj-feat-card:hover { background: var(--bg2) !important; transform: translateY(-6px); }

        /* Pricing cards */
        .dj-price-card { transition: transform .25s, box-shadow .25s; }
        .dj-price-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(20,33,61,.12); }

        /* Blog rows */
        .dj-blog-row { transition: background .2s; }
        .dj-blog-row:hover { background: var(--bg2); }

        /* Form inputs */
        .dj-input {
          width: 100%; border: 1px solid var(--bdr); border-radius: 0;
          padding: 13px 16px; font-family: 'Work Sans', sans-serif; font-size: 14px;
          color: var(--navy); background: #fff; outline: none;
          transition: border-color .2s;
        }
        .dj-input:focus { border-color: var(--gold); }

        /* Section label */
        .dj-section-no {
          font-family: 'Work Sans', sans-serif; font-weight: 600; font-size: 12px;
          letter-spacing: .16em; text-transform: uppercase; color: var(--gold);
          margin-bottom: 16px;
        }

        /* Orb glow */
        .dj-orb {
          position: absolute; border-radius: 50%; pointer-events: none;
          background: radial-gradient(circle, rgba(201,153,47,.22) 0%, rgba(201,153,47,0) 70%);
        }

        /* ── Mobile ─────────────────────────────────── */
        @media (max-width: 767px) {
          /* Stats: 2-col → right border only on odd items (0,2) */
          .dj-stat:nth-child(even)  { border-right: none !important; }
          .dj-stat:nth-child(odd)   { border-right: 1px solid rgba(20,33,61,.16) !important; }

          /* Feature cards: tighter padding */
          .dj-feat-card { padding: 20px 16px !important; }

          /* Testimonials: stack with top border instead of left */
          .dj-testi { padding: 24px 0 !important; border-left: none !important; border-top: 1px solid rgba(20,33,61,.16) !important; }
          .dj-testi:first-child { border-top: none !important; }

          /* Pricing: tighter */
          .dj-price-card { padding: 28px 20px !important; }

          /* Blog row: hide the "Bientôt" label, tighter gap */
          .dj-blog-aside { display: none !important; }
          .dj-blog-row   { grid-template-columns: 36px 1fr !important; gap: 14px !important; }

          /* Buttons: some full-width */
          .dj-btn-full-mobile { width: 100%; justify-content: center; }

          /* Hero mockup: shorter */
          .dj-mockup-body { height: 260px !important; }
          .dj-mockup-sidebar { width: 110px !important; }

          /* Section vertical padding */
          .dj-sec { padding-top: 64px !important; padding-bottom: 64px !important; }
          .dj-sec-b { padding-bottom: 64px !important; }
        }
      `}</style>

      {/* ── VIDEO MODAL ───────────────────────────────────────── */}
      {demoOpen && embedUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,.88)' }} onClick={() => setDemoOpen(false)}>
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe src={embedUrl} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
            </div>
          </div>
          <button onClick={() => setDemoOpen(false)} className="absolute top-5 right-5 w-10 h-10 flex items-center justify-center text-white text-xl" style={{ background: 'rgba(255,255,255,.12)', borderRadius: '50%', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────────────── */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300`} style={{ background: '#FAF6EF', borderBottom: scrolled ? '1px solid rgba(20,33,61,.16)' : '1px solid transparent' }}>
        <div className="flex items-center justify-between px-4 sm:px-8 md:px-16 py-4 md:py-5 max-w-screen-2xl mx-auto">

          {/* Logo */}
          <div className="flex items-center gap-3 dj-serif font-semibold text-xl" style={{ color: navy }}>
            {cfg.logoUrl && <img src={cfg.logoUrl} alt="Logo" className="w-7 h-7 object-contain" />}
            {cfg.siteName || 'DJOLI'}
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-10">
            {NAV_LINKS.map(l => <a key={l.label} href={l.href} className="dj-nav-link">{l.label}</a>)}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-6">
            <button onClick={goLogin} className="dj-sans font-semibold text-sm" style={{ background: 'none', border: 'none', cursor: 'pointer', color: navy }}>
              Se connecter
            </button>
            <button onClick={goLogin} className="dj-btn-navy">Essayer gratuitement</button>
          </div>

          {/* Mobile burger */}
          <button className="md:hidden p-2" onClick={() => setMobileMenu(!mobileMenu)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: navy }}>
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden flex flex-col gap-3 px-6 py-5" style={{ borderTop: '1px solid rgba(20,33,61,.16)', background: '#FAF6EF' }}>
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} className="dj-nav-link block py-3" style={{ borderBottom: '1px solid rgba(20,33,61,.08)' }} onClick={() => setMobileMenu(false)}>
                {l.label}
              </a>
            ))}
            <button onClick={goLogin} className="dj-btn-navy justify-center mt-2">Essayer gratuitement</button>
          </div>
        )}
      </header>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden grid md:grid-cols-2 gap-10 md:gap-16 items-center px-4 sm:px-8 md:px-16 pt-28 md:pt-36 pb-16 md:pb-24">
        {/* Gold orb */}
        <div className="dj-orb" style={{ top: -120, right: -60, width: 520, height: 520, zIndex: 0 }} />

        {/* Left: text */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-7 dj-fadeUp1">
            <span className="dj-section-no" style={{ marginBottom: 0 }}>Plateforme SaaS pour établissements scolaires</span>
            <span className="flex-1 h-px" style={{ background: 'rgba(20,33,61,.2)' }} />
          </div>

          <h1 className="dj-serif font-semibold leading-tight mb-7 dj-fadeUp2" style={{ fontSize: 'clamp(36px, 5vw, 58px)', letterSpacing: '-.01em', color: navy }}>
            La gestion de votre école,{' '}
            <em className="dj-serif" style={{ fontStyle: 'italic', color: gold }}>réinventée.</em>
          </h1>

          <p className="text-lg leading-relaxed mb-8 dj-fadeUp3 max-w-md" style={{ color: '#6B6258' }}>
            Inscriptions, notes, finances et emplois du temps — utilisable même sans connexion, synchronisé automatiquement dès que le réseau revient.
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 mb-5 dj-fadeUp4">
            <button onClick={goLogin} className="dj-btn-navy dj-btn-full-mobile">Essayer gratuitement — 14 jours</button>
            {embedUrl && <button onClick={() => setDemoOpen(true)} className="dj-btn-ghost">Voir la démo</button>}
          </div>

          <p className="text-sm dj-fadeUp5" style={{ color: '#8A7F70' }}>
            Réservé aux établissements scolaires — écoles, instituts, groupes scolaires.
          </p>
        </div>

        {/* Right: app mockup */}
        <div className="relative z-10 flex justify-center" style={{ opacity: 0, animation: 'dj-fadeUp .8s ease .3s forwards' }}>
          <div className="dj-floatAnim w-full max-w-lg">
            {/* Browser chrome */}
            <div className="rounded-xl overflow-hidden" style={{ background: '#E4DFD4', boxShadow: '0 32px 64px rgba(20,33,61,.2)' }}>
              {/* Chrome bar */}
              <div className="flex items-center gap-2 px-4 py-3">
                <span className="w-3 h-3 rounded-full" style={{ background: '#E05A4D' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#F0A030' }} />
                <span className="w-3 h-3 rounded-full" style={{ background: '#57BB56' }} />
                <span className="flex-1 ml-3 text-center text-xs py-1 px-3" style={{ background: 'rgba(255,255,255,.5)', color: '#8A7F70', fontFamily: 'monospace' }}>
                  app.djoli.io/tableau-de-bord
                </span>
              </div>
              {/* App UI */}
              <div className="dj-mockup-body flex" style={{ height: 320 }}>
                {/* Sidebar */}
                <div className="dj-mockup-sidebar flex flex-col gap-1 flex-shrink-0 p-4" style={{ width: 148, background: navy }}>
                  <div className="dj-serif font-semibold mb-4" style={{ fontSize: 15, color: '#FAF6EF' }}>DJOLI</div>
                  <div className="text-xs font-bold px-3 py-2" style={{ background: gold, color: navy, fontSize: 11 }}>Tableau de bord</div>
                  {['Inscriptions', 'Notes', 'Finances', 'Emplois du temps'].map(item => (
                    <div key={item} className="px-3 py-2 text-xs font-semibold" style={{ color: '#8A93AC', fontSize: 11 }}>{item}</div>
                  ))}
                </div>
                {/* Content */}
                <div className="flex-1 p-4 overflow-hidden" style={{ background: '#FAF6EF' }}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="dj-serif font-semibold text-sm" style={{ color: navy }}>Tableau de bord</span>
                    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#6B6258' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: gold }} />
                      Synchronisé
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[{ v: '342', l: 'Inscriptions' }, { v: '1 284', l: 'Élèves' }, { v: '97%', l: 'Paiements' }].map(s => (
                      <div key={s.l} className="p-2" style={{ background: '#fff', border: '1px solid rgba(20,33,61,.1)' }}>
                        <div className="dj-serif font-semibold text-base" style={{ color: navy }}>{s.v}</div>
                        <div className="text-xs font-semibold mt-0.5" style={{ color: '#8A7F70', fontSize: 9 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3" style={{ background: '#fff', border: '1px solid rgba(20,33,61,.1)' }}>
                    <div className="font-bold uppercase tracking-wider mb-2" style={{ fontSize: 9, color: navy, letterSpacing: '.06em' }}>Derniers paiements</div>
                    {[['K. Diallo', '45 000 F'], ['S. Ndiaye', '32 000 F'], ['M. Traoré', '45 000 F']].map(([n, v]) => (
                      <div key={n} className="flex justify-between py-1.5 text-xs" style={{ borderTop: '1px solid rgba(20,33,61,.08)', color: '#4A433B', fontSize: 10 }}>
                        <span>{n}</span><span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section className="px-4 sm:px-8 md:px-16 pb-16 md:pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ borderTop: '1px solid rgba(20,33,61,.16)', borderBottom: '1px solid rgba(20,33,61,.16)' }}>
          {STATS.map((s, i) => (
            <div key={i} className="dj-stat py-6 md:py-8 text-center" style={{ borderRight: i < 3 ? '1px solid rgba(20,33,61,.16)' : 'none' }}>
              <div className="dj-serif font-semibold text-2xl md:text-3xl" style={{ color: navy }}>{s.value}</div>
              <div className="font-semibold uppercase tracking-widest mt-2 text-xs" style={{ color: '#8A7F70', letterSpacing: '.1em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="fonctionnalites" className="px-4 sm:px-8 md:px-16 pb-16 md:pb-28">
        <div className="pb-6 mb-10 md:mb-14" style={{ borderBottom: '1px solid rgba(20,33,61,.16)' }}>
          <p className="dj-section-no">N° 01 — Fonctionnalités</p>
          <h2 className="dj-serif font-semibold text-3xl md:text-5xl" style={{ color: navy }}>Tout votre établissement, une seule plateforme</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4" style={{ borderTop: '1px solid rgba(20,33,61,.16)', borderLeft: '1px solid rgba(20,33,61,.16)' }}>
          {FEATURES.map((f, i) => {
            const img = cfg.featureImages?.[i];
            return (
              <div key={i} className="dj-feat-card flex flex-col" style={{ borderRight: '1px solid rgba(20,33,61,.16)', borderBottom: '1px solid rgba(20,33,61,.16)' }}>
                {/* Image ou placeholder iconé */}
                {img ? (
                  <div className="w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
                    <img src={img} alt={f.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-full flex items-center justify-center" style={{ aspectRatio: '16/9', background: f.iconBg }}>
                    <f.Icon size={40} color={f.iconColor} strokeWidth={1.5} />
                  </div>
                )}
                {/* Texte */}
                <div className="flex flex-col flex-1 p-5 md:p-7">
                  <div className="dj-mono font-semibold mb-3" style={{ color: '#E0654A', fontSize: 12 }}>{f.n}</div>
                  <h3 className="dj-serif font-semibold text-lg md:text-xl mb-2" style={{ color: navy }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#6B6258' }}>{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── OFFLINE-FIRST ─────────────────────────────────────── */}
      <section className="dj-sec px-4 sm:px-8 md:px-16 py-16 md:py-24 grid md:grid-cols-2 gap-10 md:gap-16 items-center" style={{ background: '#F4E9D0' }}>
        <div>
          <p className="dj-section-no">N° 02 — Offline-first</p>
          <h2 className="dj-serif font-semibold text-4xl mb-6" style={{ color: navy }}>Fonctionne même sans connexion</h2>
          <p className="text-base leading-loose mb-7" style={{ color: '#6B6258' }}>
            Vos équipes continuent de saisir inscriptions, notes et paiements en toute autonomie, connexion ou pas. Dès que le réseau revient, DJOLI synchronise automatiquement — sans action manuelle, sans conflit.
          </p>
          <div className="flex" style={{ borderTop: '1px solid rgba(20,33,61,.2)' }}>
            <div className="flex-1 py-5 pr-5" style={{ borderRight: '1px solid rgba(20,33,61,.2)' }}>
              <div className="font-semibold text-sm mb-1.5" style={{ color: navy }}>En coupure</div>
              <div className="text-sm" style={{ color: '#6B6258' }}>Saisie locale, aucune perte de données</div>
            </div>
            <div className="flex-1 py-5 pl-5">
              <div className="font-semibold text-sm mb-1.5" style={{ color: navy }}>Connexion rétablie</div>
              <div className="text-sm" style={{ color: '#6B6258' }}>Synchronisation automatique et silencieuse</div>
            </div>
          </div>
        </div>
        {/* Sync diagram */}
        <div>
          <div className="p-6 md:p-8 flex flex-col gap-6" style={{ background: '#E7D2A8' }}>

            {/* Scénario 1 : hors ligne */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <WifiOff size={13} color="#E0654A" />
                <span className="font-bold uppercase tracking-widest" style={{ fontSize: 10, color: '#E0654A', letterSpacing: '.12em' }}>Sans connexion</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Laptop */}
                <div className="flex-1 flex flex-col items-center gap-2 py-4 px-3" style={{ background: '#FAF6EF', border: '1px solid rgba(20,33,61,.15)' }}>
                  <Laptop size={28} color={navy} />
                  <div className="font-bold text-xs text-center" style={{ color: navy }}>Poste local</div>
                  <div className="text-center font-semibold" style={{ fontSize: 9, color: '#6B6258' }}>Saisie continue</div>
                </div>
                {/* Connector: broken */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ width: 44 }}>
                  <X size={14} color="#E0654A" />
                  <div className="w-full h-px" style={{ background: '#E0654A', opacity: .4, borderTop: '2px dashed #E0654A', height: 0 }} />
                </div>
                {/* Cloud: inactive */}
                <div className="flex-1 flex flex-col items-center gap-2 py-4 px-3" style={{ background: 'rgba(250,246,239,.4)', border: '1px dashed rgba(20,33,61,.2)' }}>
                  <Cloud size={28} style={{ color: navy, opacity: .25 }} />
                  <div className="font-bold text-xs text-center" style={{ color: navy, opacity: .35 }}>Cloud DJOLI</div>
                  <div className="text-center font-semibold" style={{ fontSize: 9, color: '#8A7F70', opacity: .5 }}>En attente…</div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(20,33,61,.18)' }} />
              <div className="flex items-center gap-1.5 px-3 py-1.5 font-bold uppercase tracking-wider" style={{ background: '#C9992F', color: '#14213D', fontSize: 9, letterSpacing: '.1em' }}>
                <Wifi size={11} /> Connexion rétablie
              </div>
              <div className="flex-1 h-px" style={{ background: 'rgba(20,33,61,.18)' }} />
            </div>

            {/* Scénario 2 : sync */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw size={13} color="#C9992F" />
                <span className="font-bold uppercase tracking-widest" style={{ fontSize: 10, color: '#C9992F', letterSpacing: '.12em' }}>Synchronisation automatique</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Laptop */}
                <div className="flex-1 flex flex-col items-center gap-2 py-4 px-3" style={{ background: '#FAF6EF', border: '1px solid rgba(20,33,61,.15)' }}>
                  <Laptop size={28} color={navy} />
                  <div className="font-bold text-xs text-center" style={{ color: navy }}>Poste local</div>
                  <div className="text-center font-semibold" style={{ fontSize: 9, color: '#6B6258' }}>Données prêtes</div>
                </div>
                {/* Connector: active */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0" style={{ width: 44 }}>
                  <ArrowRight size={18} color="#C9992F" />
                </div>
                {/* Cloud: active */}
                <div className="flex-1 flex flex-col items-center gap-2 py-4 px-3" style={{ background: '#FAF6EF', border: '1px solid rgba(201,153,47,.4)' }}>
                  <Cloud size={28} color="#C9992F" />
                  <div className="font-bold text-xs text-center" style={{ color: navy }}>Cloud DJOLI</div>
                  <div className="flex items-center gap-1 justify-center">
                    <CheckCircle size={10} color="#C9992F" />
                    <span className="font-semibold" style={{ fontSize: 9, color: '#C9992F' }}>Sauvegardé</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
          <p className="dj-mono font-medium uppercase tracking-wider text-xs mt-4" style={{ color: '#8A7F70', letterSpacing: '.08em' }}>Fig. 02 — Cycle de synchronisation cloud</p>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section id="temoignages" className="dj-sec px-4 sm:px-8 md:px-16 py-16 md:py-24">
        <h2 className="dj-serif font-semibold text-3xl md:text-4xl text-center mb-10 md:mb-14" style={{ color: navy }}>Ce qu'en disent les établissements</h2>
        <div className="grid grid-cols-1 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="dj-testi px-4 md:px-8" style={{ borderLeft: '1px solid rgba(20,33,61,.16)' }}>
              <p className="dj-serif font-medium text-base md:text-lg leading-relaxed mb-5" style={{ fontStyle: 'italic', color: navy }}>"{t.quote}"</p>
              <div className="font-semibold text-xs uppercase tracking-wider" style={{ color: gold, letterSpacing: '.06em' }}>{t.name}</div>
              <div className="text-sm mt-1" style={{ color: '#8A7F70' }}>{t.role}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      <section id="tarification" className="dj-sec px-4 sm:px-8 md:px-16 py-16 md:py-24">
        <div className="text-center max-w-xl mx-auto mb-10 md:mb-14">
          <p className="dj-section-no">N° 03 — Tarifs</p>
          <h2 className="dj-serif font-semibold text-3xl md:text-5xl mb-4" style={{ color: navy }}>Un tarif pour chaque établissement</h2>
          <p className="text-base" style={{ color: '#6B6258' }}>Sans frais cachés. Changez de plan à tout moment.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ borderTop: '1px solid rgba(20,33,61,.2)', borderLeft: '1px solid rgba(20,33,61,.2)' }}>
          {PRICING.map((p, i) => (
            <div key={i} className="dj-price-card p-6 md:p-10" style={{ borderRight: '1px solid rgba(20,33,61,.2)', borderBottom: '1px solid rgba(20,33,61,.2)', background: p.highlight ? '#F4E9D0' : 'transparent' }}>
              <div className="flex items-center gap-2 mb-4">
                {p.highlight && <span className="font-bold text-xs px-2 py-0.5" style={{ background: gold, color: navy, fontSize: 10 }}>Populaire</span>}
                <span className="font-semibold text-xs uppercase tracking-widest" style={{ color: '#8A7F70', letterSpacing: '.12em' }}>{p.tier}</span>
              </div>
              <div className="dj-serif font-semibold mb-1" style={{ fontSize: 32, color: navy }}>
                {formatPrice((cfg as any)[p.key] || '—', cfg.currency)}
              </div>
              <div className="text-sm mb-6" style={{ color: '#8A7F70' }}>{p.period}</div>
              <ul className="mb-6">
                {p.features.map((f, j) => (
                  <li key={j} className="flex items-center gap-3 text-sm py-3" style={{ borderTop: '1px solid rgba(20,33,61,.1)', color: '#4A433B' }}>
                    <CheckCircle size={14} style={{ color: gold, flexShrink: 0 }} strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <button onClick={goLogin} className="dj-btn-navy w-full justify-center">Choisir ce plan</button>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section className="dj-sec-b px-4 sm:px-8 md:px-16 pb-16 md:pb-24">
        <div className="pb-6 mb-10 md:mb-14" style={{ borderBottom: '1px solid rgba(20,33,61,.16)' }}>
          <p className="dj-section-no">N° 04 — Mise en route</p>
          <h2 className="dj-serif font-semibold text-3xl md:text-4xl" style={{ color: navy }}>Opérationnel en moins d'une heure</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3" style={{ borderTop: '1px solid rgba(20,33,61,.16)', borderLeft: '1px solid rgba(20,33,61,.16)' }}>
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="p-6 md:p-10 flex flex-col gap-5" style={{ borderRight: '1px solid rgba(20,33,61,.16)', borderBottom: '1px solid rgba(20,33,61,.16)' }}>
              {/* Step number + connector */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center font-bold text-sm flex-shrink-0" style={{ background: navy, color: '#FAF6EF' }}>
                  {step.n}
                </div>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block flex-1 h-px" style={{ background: 'rgba(20,33,61,.15)' }} />
                )}
              </div>
              <div>
                <h3 className="dj-serif font-semibold text-xl mb-3" style={{ color: navy }}>{step.title}</h3>
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#6B6258' }}>{step.desc}</p>
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: '#C9992F', letterSpacing: '.08em' }}>
                  <span className="w-4 h-px inline-block" style={{ background: '#C9992F' }} />
                  {step.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DOWNLOAD ──────────────────────────────────────────── */}
      {release && (
        <section className="relative overflow-hidden text-center px-4 sm:px-8 md:px-16 py-16 md:py-24" style={{ background: navy }}>
          <div className="dj-orb" style={{ top: -140, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400 }} />
          <div className="relative z-10">
            <p className="dj-section-no" style={{ color: gold }}>Application de bureau</p>
            <h2 className="dj-serif font-semibold text-3xl md:text-4xl mb-4" style={{ color: '#FAF6EF' }}>DJOLI fonctionne 100% hors ligne</h2>
            <p className="text-base mx-auto mb-9 max-w-md" style={{ color: 'rgba(250,246,239,.65)' }}>
              Vos données restent sur votre machine. Le cloud ne sert que de sauvegarde et de synchronisation entre vos postes.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-center">
              <a href={release.downloadUrl} download className="dj-btn-gold dj-btn-full-mobile">
                <Download size={16} /> Windows (.exe) — v{release.version}
              </a>
              <button onClick={goLogin} className="dj-btn-ghost dj-btn-ghost-light">Portail web</button>
            </div>
          </div>
        </section>
      )}

      {/* ── CTA BAND ──────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-center px-4 sm:px-8 md:px-16 py-16 md:py-24" style={{ background: navy, borderTop: '1px solid rgba(250,246,239,.1)' }}>
        <div className="dj-orb" style={{ top: -140, left: '50%', transform: 'translateX(-50%)', width: 600, height: 400 }} />
        <div className="relative z-10">
          <h2 className="dj-serif font-semibold text-3xl md:text-4xl mb-4" style={{ color: '#FAF6EF' }}>Prêt à moderniser votre établissement ?</h2>
          <p className="text-base mb-8" style={{ color: 'rgba(250,246,239,.65)' }}>Démarrez gratuitement, sans engagement, ou parlez à notre équipe.</p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center items-center">
            <button onClick={goLogin} className="dj-btn-gold dj-btn-full-mobile">Essayer gratuitement</button>
            {embedUrl && <button onClick={() => setDemoOpen(true)} className="dj-btn-ghost dj-btn-ghost-light">Demander une démo</button>}
          </div>
        </div>
      </section>

      {/* ── CONTACT ───────────────────────────────────────────── */}
      <section id="contact" className="dj-sec px-4 sm:px-8 md:px-16 py-16 md:py-24" style={{ borderTop: '1px solid rgba(20,33,61,.16)' }}>
        <div className="grid md:grid-cols-2 gap-10 md:gap-20 max-w-4xl mx-auto">
          <div>
            <p className="dj-section-no">N° 05 — Contact</p>
            <h2 className="dj-serif font-semibold text-4xl mb-5" style={{ color: navy }}>Vous avez une question ?</h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: '#6B6258' }}>
              Notre équipe vous répond sous 24h. Remplissez le formulaire et nous reviendrons vers vous rapidement.
            </p>
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-semibold text-sm" style={{ color: '#25D366', textDecoration: 'none' }}>
                <MessageCircle size={16} fill="#25D366" strokeWidth={0} /> WhatsApp — réponse rapide
              </a>
            )}
          </div>

          <div>
            {contactSent ? (
              <div className="p-10 text-center" style={{ border: '1px solid rgba(20,33,61,.16)' }}>
                <div className="dj-serif font-semibold text-xl mb-2" style={{ color: navy }}>Message envoyé !</div>
                <p className="text-sm" style={{ color: '#6B6258' }}>Votre client mail s'est ouvert. Nous vous répondrons bientôt.</p>
              </div>
            ) : (
              <form onSubmit={handleContact} className="flex flex-col gap-5">
                <div>
                  <label className="block font-semibold text-xs uppercase tracking-widest mb-2" style={{ color: '#8A7F70', letterSpacing: '.1em' }}>Votre email</label>
                  <input type="email" required value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="directeur@monecole.com" className="dj-input" />
                </div>
                <div>
                  <label className="block font-semibold text-xs uppercase tracking-widest mb-2" style={{ color: '#8A7F70', letterSpacing: '.1em' }}>Message</label>
                  <textarea required rows={5} value={contactMsg} onChange={e => setContactMsg(e.target.value)} placeholder="Décrivez votre question ou votre projet…" className="dj-input" style={{ resize: 'vertical' }} />
                </div>
                <button type="submit" disabled={!cfg.email} className="dj-btn-navy justify-center" style={{ opacity: cfg.email ? 1 : .4, cursor: cfg.email ? 'pointer' : 'not-allowed' }}>
                  Envoyer le message
                </button>
                {!cfg.email && <p className="text-xs text-center" style={{ color: '#8A7F70' }}>Email de contact non configuré (paramètres admin).</p>}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="px-4 sm:px-8 md:px-16 pt-12 md:pt-16 pb-8" style={{ background: '#1a2535', borderTop: '1px solid rgba(250,246,239,.12)' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-10 md:mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="dj-serif font-semibold text-xl mb-4" style={{ color: '#FAF6EF' }}>{cfg.siteName || 'DJOLI'}</div>
            <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'rgba(250,246,239,.6)' }}>La plateforme SaaS qui simplifie la gestion des établissements scolaires, connectée ou non.</p>
          </div>
          {[
            { title: 'Produit', links: [['Fonctionnalités', '#fonctionnalites'], ['Tarifs', '#tarification'], ...(release ? [['Télécharger', release.downloadUrl]] : [])] },
            { title: 'Support', links: [['Nous contacter', '#contact'], ...(whatsappHref ? [['WhatsApp', whatsappHref]] : []), ['Témoignages', '#temoignages']] },
            { title: 'Légal', links: [] },
          ].map((col, i) => (
            <div key={i}>
              <div className="font-semibold text-xs uppercase tracking-widest mb-5" style={{ color: '#C9992F', letterSpacing: '.1em' }}>{col.title}</div>
              <div className="flex flex-col gap-3">
                {col.links.map(([l, h]) => <a key={l} href={h} className="dj-footer-link text-sm" style={{ textDecoration: 'none' }}>{l}</a>)}
                {col.title === 'Légal' && (
                  <>
                    <Link to="/legal/terms"    className="dj-footer-link text-sm" style={{ textDecoration: 'none' }}>Conditions</Link>
                    <Link to="/legal/privacy"  className="dj-footer-link text-sm" style={{ textDecoration: 'none' }}>Confidentialité</Link>
                    <Link to="/legal/mentions" className="dj-footer-link text-sm" style={{ textDecoration: 'none' }}>Mentions légales</Link>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-between gap-3 pt-6 text-sm" style={{ borderTop: '1px solid rgba(250,246,239,.12)', color: 'rgba(250,246,239,.4)' }}>
          <span>© 2026 {cfg.siteName || 'DJOLI'}. Tous droits réservés.</span>
          <span>Conçu pour l'éducation africaine</span>
        </div>
      </footer>

      {/* ── WHATSAPP FLOAT ────────────────────────────────────── */}
      {whatsappHref && (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 inline-flex items-center gap-2.5 font-bold text-sm"
          style={{ background: '#25D366', color: '#fff', padding: '12px 20px 12px 16px', boxShadow: '0 8px 32px rgba(37,211,102,.35)', textDecoration: 'none' }}>
          <MessageCircle size={20} fill="white" strokeWidth={0} />
          WhatsApp
        </a>
      )}
    </div>
  );
};
