import { useState, useEffect } from 'react';
import { fetchLatestRelease } from '../lib/githubRelease';
import type { GithubRelease } from '../lib/githubRelease';
import { Link, useNavigate } from 'react-router-dom';
import {
  Shield, Zap, Globe, Download, CheckCircle, ArrowRight,
  Star, Users, BookOpen, Wallet, BarChart3, Menu, X,
  Play, ChevronRight, Award, Clock, Wifi, MessageCircle
} from 'lucide-react';

const NAV_LINKS = ['Fonctionnalités', 'Tarification', 'Témoignages', 'Contact'];

// ─── Site config ──────────────────────────────────────────────
const DEFAULT_CFG = {
  siteName: 'DJOLI', logoUrl: '', email: '', youtubeUrl: '', whatsappPhone: '',
  primaryColor: '#4f46e5', secondaryColor: '#10b981',
  currency: 'EUR', price30: '29', price90: '79', price365: '249',
  appVersion: '2.0', githubRepo: '', downloadUrl: '',
  clientSchoolIds: [] as string[], clientSchools: [] as any[],
  featureImages: ['', '', ''] as string[],
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
            .map((sc: any) => ({ id: sc.id, name: sc.schoolName, logoUrl: sc.logoUrl ?? '', color: 'bg-indigo-500' }));
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
          // N'applique que les sections actives (statut === 1)
          if (all[sec]?.statut === 1 && all[sec]?.data) {
            merged = { ...merged, ...all[sec].data };
          }
        }
        applyWithSchools(merged);
      })
      .catch(() => {
        // Fallback localStorage si API indisponible
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


// ─── Helpers ──────────────────────────────────────────────────
function formatPrice(price: string, currency: string) {
  if (currency === 'GNF') return `${Number(price).toLocaleString('fr-FR')} GNF`;
  return currency === 'USD' ? `$${price}` : `${price} €`;
}

function toEmbedUrl(url: string): string {
  // https://www.youtube.com/watch?v=ID → https://www.youtube.com/embed/ID
  // https://youtu.be/ID → https://www.youtube.com/embed/ID
  const m1 = url.match(/[?&]v=([^&]+)/);
  if (m1) return `https://www.youtube.com/embed/${m1[1]}?autoplay=1&rel=0`;
  const m2 = url.match(/youtu\.be\/([^?&]+)/);
  if (m2) return `https://www.youtube.com/embed/${m2[1]}?autoplay=1&rel=0`;
  return url;
}

const FEATURES = [
  {
    icon: Users,
    color: 'bg-blue-50 text-blue-600',
    tag: 'Inscriptions',
    title: 'Gérez vos élèves sans effort',
    desc: 'Inscriptions, transferts, historiques scolaires, fiches parents — tout centralisé en un seul endroit. Import/export Excel en un clic.',
    items: ['Inscriptions en masse par Excel', 'Historique multi-années', 'Fiches parents complètes'],
  },
  {
    icon: Wallet,
    color: 'bg-emerald-50 text-emerald-600',
    tag: 'Finance',
    title: 'Suivi financier en temps réel',
    desc: 'Encaissez les scolarités, suivez les paiements mois par mois, gérez la caisse et la paie des enseignants.',
    items: ['Tableau de bord caisse live', 'Suivi par classe & mois', 'Gestion des salaires'],
  },
  {
    icon: Award,
    color: 'bg-indigo-50 text-indigo-600',
    tag: 'Notes & Bulletins',
    title: 'Bulletins professionnels générés automatiquement',
    desc: 'Saisie des notes par matière, calcul automatique des moyennes avec coefficients, classements et bulletins PDF.',
    items: ['Calcul auto avec coefficients', 'Bulletins imprimables PDF', 'Classements & palmarès'],
  },
];

const STATIC_STATS = [
  { value: '98%',   label: 'Satisfaction client' },
  { value: '4.9/5', label: 'Note moyenne' },
];


const TESTIMONIALS = [
  {
    text: '"Depuis DJOLI, nos recouvrements ont augmenté de 30%. La sync cloud me permet de suivre les finances même en déplacement."',
    name: 'M. Diallo',
    role: 'Directeur, Excellence Académie',
    avatar: 'D',
    color: 'bg-indigo-100 text-indigo-600',
    stars: 5,
  },
  {
    text: '"La génération automatique des bulletins a divisé par 4 le temps de mon secrétariat. C\'est l\'outil indispensable du 21ème siècle."',
    name: 'Mme. Aminata',
    role: 'Proviseure, Lycée Horizon',
    avatar: 'A',
    color: 'bg-emerald-100 text-emerald-600',
    stars: 5,
  },
  {
    text: '"Le mode hors-ligne est une bénédiction. Même avec les coupures d\'internet, mon équipe travaille et tout se synchronise après."',
    name: 'Oumar Sow',
    role: 'Gérant, Institut du Savoir',
    avatar: 'O',
    color: 'bg-amber-100 text-amber-600',
    stars: 5,
  },
  {
    text: '"Interface simple, données sécurisées, support réactif. Exactement ce dont une école privée africaine a besoin."',
    name: 'Kadiatou Balde',
    role: 'DAF, Groupe Scolaire Lumière',
    avatar: 'K',
    color: 'bg-rose-100 text-rose-600',
    stars: 5,
  },
];

export const LandingPage = (_props?: { onGetStarted?: () => void }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [testiIdx, setTestiIdx] = useState(0);
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);
  const cfg = useSiteConfig();
  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [publicStats, setPublicStats] = useState<{ schoolCount: number; studentCount: number } | null>(null);
  const navigate = useNavigate();
  const onGetStarted = () => navigate('/login');

  useEffect(() => {
    fetch('/api/public/stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setPublicStats(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (cfg.downloadUrl) {
      setRelease({ version: cfg.appVersion || '?', downloadUrl: cfg.downloadUrl });
    } else if (cfg.githubRepo) {
      fetchLatestRelease(cfg.githubRepo).then(r => { if (r) setRelease(r); });
    }
  }, [cfg.downloadUrl, cfg.githubRepo, cfg.appVersion]);

  const whatsappHref = cfg.whatsappPhone
    ? `https://wa.me/${cfg.whatsappPhone.replace(/\D/g, '')}`
    : null;

  const embedUrl = cfg.youtubeUrl ? toEmbedUrl(cfg.youtubeUrl) : null;

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  // testimonials auto-scroll
  useEffect(() => {
    const t = setInterval(() => setTestiIdx(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const handleContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfg.email) return;
    const subject = encodeURIComponent(`Message depuis ${cfg.siteName || 'DJOLI'}`);
    const body = encodeURIComponent(`De: ${contactEmail}\n\n${contactMsg}`);
    window.open(`mailto:${cfg.email}?subject=${subject}&body=${body}`);
    setContactSent(true);
    setContactEmail('');
    setContactMsg('');
    setTimeout(() => setContactSent(false), 5000);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <style>{`
        :root {
          --cp: ${cfg.primaryColor || '#4f46e5'};
          --cs: ${cfg.secondaryColor || '#10b981'};
        }
        .site-btn   { background-color: var(--cp) !important; color: #fff !important; }
        .site-btn:hover { filter: brightness(0.88); }
        .site-btn-outline { color: var(--cp) !important; border-color: var(--cp) !important; }
        .site-btn-outline:hover { background-color: var(--cp) !important; color: #fff !important; }
        .site-text  { color: var(--cp) !important; }
        .site-ring  { --tw-ring-color: var(--cp); }
        .site-badge { background-color: color-mix(in srgb, var(--cp) 12%, transparent); color: var(--cp); border-color: color-mix(in srgb, var(--cp) 25%, transparent); }
        .site-grad  { background: linear-gradient(135deg, var(--cp), var(--cs)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .site-grad-bg { background: linear-gradient(135deg, var(--cp), color-mix(in srgb, var(--cp) 60%, var(--cs))); }
        .site-highlight { background-color: var(--cp) !important; border-color: var(--cp) !important; }
        .site-logo-badge { background-color: var(--cp) !important; }
        .site-active-dot { background-color: var(--cp); }
      `}</style>

      {/* ─── VIDEO MODAL ──────────────────────────────────────── */}
      {demoOpen && embedUrl && (
        <div className="fixed inset-0 bg-black/85 z-[60] flex items-center justify-center p-4" onClick={() => setDemoOpen(false)}>
          <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={embedUrl}
                className="absolute inset-0 w-full h-full rounded-2xl"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
          <button onClick={() => setDemoOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all text-xl font-light">
            ×
          </button>
        </div>
      )}

      {/* ─── NAVBAR ──────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/90 backdrop-blur-xl shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="site-logo-badge w-8 h-8 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
              {cfg.logoUrl
                ? <img src={cfg.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                : <BookOpen size={16} className="text-white" />}
            </div>
            <span className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Space Grotesk, Inter, sans-serif' }}>
              {cfg.siteName || 'DJOLI'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">{l}</a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {release && (
              <a href={release.downloadUrl} download
                className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-400 px-3.5 py-2 rounded-xl transition-all">
                <Download size={14} /> Télécharger
              </a>
            )}
            <button onClick={onGetStarted} className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3.5 py-2">
              Connexion
            </button>
            <button
              onClick={onGetStarted}
              className="site-btn flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg"
            >
              Essai gratuit <ArrowRight size={15} />
            </button>
          </div>

          <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-slate-600">
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-slate-100 px-6 py-4 space-y-3">
            {NAV_LINKS.map(l => <a key={l} href={`#${l.toLowerCase()}`} className="block text-sm font-medium text-slate-600 py-2">{l}</a>)}
            {release && (
              <a href={release.downloadUrl} download className="w-full flex items-center justify-center gap-2 mt-2 border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold text-sm">
                <Download size={15} /> Télécharger l'application
              </a>
            )}
            <button onClick={onGetStarted} className="w-full mt-2 site-btn py-3 rounded-xl font-semibold text-sm">Essai gratuit</button>
          </div>
        )}
      </nav>

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section
        className={`relative pt-32 pb-24 px-6 overflow-hidden ${cfg.heroBgUrl ? '' : 'hero-gradient dot-grid'}`}
        style={cfg.heroBgUrl ? {
          backgroundImage: `url(${cfg.heroBgUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        } : undefined}
      >
        {/* Overlay sombre quand image de fond */}
        {cfg.heroBgUrl && (
          <div className="absolute inset-0 bg-black/55" />
        )}

        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-8">

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold ${
            cfg.heroBgUrl
              ? 'bg-white/15 border border-white/30 text-white backdrop-blur-sm'
              : 'bg-indigo-50 border border-indigo-200 text-indigo-700'
          }`}>
            <span className="site-active-dot w-2 h-2 rounded-full animate-pulse" />
            Version 2.0 — Nouveau design & synchronisation cloud
            <ChevronRight size={13} />
          </div>

          <h1
            className={`text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight ${cfg.heroBgUrl ? 'text-white' : 'text-slate-900'}`}
            style={{ fontFamily: 'Space Grotesk, sans-serif' }}
          >
            La gestion scolaire <br />
            <span className="site-grad">réinventée pour l'Afrique.</span>
          </h1>

          <p className={`text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-normal ${cfg.heroBgUrl ? 'text-white/80' : 'text-slate-500'}`}>
            Inscriptions, notes, finances, emplois du temps — tout en un.
            Fonctionne sans internet, synchronise dans le cloud dès que la connexion revient.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onGetStarted}
              className="site-btn flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base hover:-translate-y-1 transition-all shadow-2xl"
            >
              Démarrer l'essai gratuit — 14 jours
              <ArrowRight size={18} />
            </button>
            {embedUrl ? (
              <button onClick={() => setDemoOpen(true)} className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-base transition-all shadow-sm ${
                cfg.heroBgUrl
                  ? 'bg-white/15 text-white border border-white/30 hover:bg-white/25 backdrop-blur-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Play size={12} className="text-white ml-0.5" fill="white" />
                </div>
                Voir la démo (2 min)
              </button>
            ) : null}
          </div>

          <p className={`text-xs font-medium ${cfg.heroBgUrl ? 'text-white/50' : 'text-slate-400'}`}>
            Aucune carte bancaire requise • Annulation à tout moment
          </p>
        </div>

        {/* Stats bar */}
        <div className="relative z-10 max-w-3xl mx-auto mt-20">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-100">
            {[
              {
                value: publicStats
                  ? `${publicStats.schoolCount.toLocaleString('fr-FR')}+`
                  : '—',
                label: 'Établissements',
              },
              {
                value: publicStats
                  ? `${publicStats.studentCount.toLocaleString('fr-FR')}+`
                  : '—',
                label: 'Élèves gérés',
              },
              ...STATIC_STATS,
            ].map((s, i) => (
              <div key={i} className="p-6 text-center">
                <p className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{s.value}</p>
                <p className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── LOGOS MARQUEE ────────────────────────────────────── */}
      {(() => {
        const DEFAULTS = [
          { id:'1', name:'Excellence Académie', logoUrl:'', color:'bg-indigo-500' },
          { id:'2', name:'Groupe Lumière',       logoUrl:'', color:'bg-emerald-500' },
          { id:'3', name:'Institut Horizon',     logoUrl:'', color:'bg-amber-500' },
          { id:'4', name:'Lycée Moderne Pro',    logoUrl:'', color:'bg-rose-500' },
          { id:'5', name:'École Avenir',         logoUrl:'', color:'bg-sky-500' },
          { id:'6', name:'Collège du Savoir',    logoUrl:'', color:'bg-purple-500' },
          { id:'7', name:'Institut Futura',      logoUrl:'', color:'bg-teal-500' },
        ];
        const base = cfg.clientSchools?.length > 0 ? cfg.clientSchools : DEFAULTS;
        // Duplicate until we have at least 8 items, then duplicate again for infinite loop
        const padded: any[] = [];
        while (padded.length < 8) padded.push(...base);
        const loop = [...padded, ...padded];

        return (
          <section className="py-14 border-y border-slate-100 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <style>{`
              @keyframes marquee-scroll {
                from { transform: translateX(0); }
                to   { transform: translateX(-50%); }
              }
              .marquee-track {
                display: flex;
                width: max-content;
                animation: marquee-scroll 30s linear infinite;
              }
              .marquee-track:hover { animation-play-state: paused; }
            `}</style>

            <p className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-10">
              Ils nous font confiance
            </p>

            <div className="relative">
              {/* Fade edges */}
              <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-32 z-10" style={{ background: 'linear-gradient(to right, #f8fafc, transparent)' }} />
              <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-32 z-10" style={{ background: 'linear-gradient(to left, #f1f5f9, transparent)' }} />

              <div className="overflow-hidden">
                <div className="marquee-track">
                  {loop.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 mx-4 bg-white border border-slate-200/80 rounded-2xl px-7 py-5 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all cursor-default whitespace-nowrap" style={{ flexShrink: 0 }}>
                      {s.logoUrl
                        ? <img src={s.logoUrl} alt={s.name} className="w-12 h-12 rounded-xl object-contain border border-slate-100" />
                        : (
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold flex-shrink-0 ${s.color}`}>
                            {s.name[0]}
                          </div>
                        )}
                      <span className="font-bold text-slate-700 text-base">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ─── FEATURES ──────────────────────────────────────────── */}
      <section id="fonctionnalités" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20 space-y-4">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-4 py-2 rounded-full text-xs font-semibold">
              <Zap size={13} /> Tout ce dont une école a besoin
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Une plateforme complète, <br className="hidden md:block" />pas un assemblage d'outils.
            </h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">DJOLI couvre l'intégralité de la gestion d'un établissement scolaire dans une interface unique et cohérente.</p>
          </div>

          <div className="space-y-6">
            {FEATURES.map((f, i) => (
              <div key={i} className={`rounded-3xl border border-slate-100 overflow-hidden flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className="flex-1 p-10 md:p-14 flex flex-col justify-center space-y-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.color}`}>
                    <f.icon size={24} />
                  </div>
                  <div className="inline-flex">
                    <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">{f.tag}</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{f.title}</h3>
                  <p className="text-slate-500 text-base leading-relaxed">{f.desc}</p>
                  <ul className="space-y-2">
                    {f.items.map((item, j) => (
                      <li key={j} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                        <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button className="flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:gap-3 transition-all w-fit">
                    En savoir plus <ArrowRight size={15} />
                  </button>
                </div>
                <div className="flex-1 min-h-[300px] flex items-center justify-center overflow-hidden bg-slate-50 relative">
                  {cfg.featureImages?.[i] ? (
                    <img
                      src={cfg.featureImages[i]}
                      alt={f.tag}
                      className="w-full h-full object-cover absolute inset-0"
                      style={{ borderRadius: 0 }}
                    />
                  ) : (
                    <div className="text-center p-10 space-y-5">
                      <div className={`w-28 h-28 rounded-3xl flex items-center justify-center mx-auto ${f.color}`} style={{ opacity: 0.15 }}>
                        <f.icon size={56} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Aperçu</p>
                        <p className="text-slate-300 text-xs">Ajoutez une capture d'écran depuis les paramètres</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Extra mini features */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: BarChart3, label: 'Emploi du temps', color: 'text-sky-500 bg-sky-50' },
              { icon: Users, label: 'Gestion du personnel', color: 'text-orange-500 bg-orange-50' },
              { icon: Clock, label: 'Présences & pointage', color: 'text-rose-500 bg-rose-50' },
              { icon: Wifi, label: 'Mode hors-ligne', color: 'text-teal-500 bg-teal-50' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white border border-slate-100 rounded-2xl p-5 hover:border-indigo-200 hover:shadow-sm transition-all">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon size={18} />
                </div>
                <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BAND ──────────────────────────────────────────── */}
      <section className="site-grad-bg py-20 px-6">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-white">
          <div className="space-y-2">
            <h3 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Prêt à moderniser votre école ?</h3>
            <p className="text-indigo-200 font-medium">Rejoignez 500+ établissements qui gèrent mieux grâce à DJOLI.</p>
          </div>
          <button onClick={onGetStarted} className="site-btn-outline flex items-center gap-3 bg-white px-8 py-4 rounded-2xl font-bold text-sm border-2 hover:-translate-y-1 transition-all shadow-2xl whitespace-nowrap">
            Commencer gratuitement <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ─── TESTIMONIALS ──────────────────────────────────────── */}
      <section id="témoignages" className="py-20 px-6 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Ce que disent les directeurs
            </h2>
            <p className="text-slate-500">Plus de 200 établissements ont déjà modernisé leur gestion.</p>
          </div>

          {/* Carousel */}
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${testiIdx * 100}%)` }}
            >
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="w-full flex-shrink-0 px-2">
                  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm mx-auto max-w-2xl">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: t.stars }).map((_, j) => (
                        <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-slate-600 leading-relaxed text-sm mb-5 italic">{t.text}</p>
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${t.color}`}>{t.avatar}</div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.role}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots + arrows */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button onClick={() => setTestiIdx(i => (i - 1 + TESTIMONIALS.length) % TESTIMONIALS.length)}
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all text-sm">
              ‹
            </button>
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setTestiIdx(i)}
                className={`rounded-full transition-all ${i === testiIdx ? 'w-6 h-2 site-active-dot' : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'}`} />
            ))}
            <button onClick={() => setTestiIdx(i => (i + 1) % TESTIMONIALS.length)}
              className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all text-sm">
              ›
            </button>
          </div>
        </div>
      </section>

      {/* ─── PRICING ───────────────────────────────────────────── */}
      <section id="tarification" className="py-28 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Tarification simple et transparente
            </h2>
            <p className="text-slate-500 text-lg">Sans frais cachés. Changez de plan à tout moment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {[
              { key: 'price30', label: '30 Jours', period: '/ mois', desc: 'Idéal pour tester en conditions réelles', highlight: false, features: ['Accès complet à toutes les fonctions', 'Support par email', '1 poste connecté', 'Données sécurisées localement'], color: 'bg-slate-50 border-slate-200', textCls: 'text-slate-900', subCls: 'text-slate-400', descCls: 'text-slate-500', fcls: 'text-slate-600', btn: 'bg-slate-900 text-white hover:bg-slate-700', icon: 'text-emerald-500' },
              { key: 'price90', label: '3 Mois', period: '/ trimestre', desc: 'Le choix le plus populaire', highlight: true, features: ['Accès complet à toutes les fonctions', 'Synchronisation cloud incluse', 'Support prioritaire 24h', "Jusqu'à 5 postes", 'Mises à jour automatiques'], color: 'bg-indigo-600 border-indigo-600', textCls: 'text-white', subCls: 'text-indigo-300', descCls: 'text-indigo-200', fcls: 'text-indigo-100', btn: 'bg-white text-indigo-600 hover:bg-indigo-50', icon: 'text-indigo-300' },
              { key: 'price365', label: '1 An', period: '/ an', desc: 'Meilleur rapport qualité/prix', highlight: false, features: ['Accès complet à toutes les fonctions', 'Sync cloud illimitée', 'Support VIP & formation', 'Postes illimités', 'Personnalisation logo & couleurs'], color: 'bg-slate-50 border-slate-200', textCls: 'text-slate-900', subCls: 'text-slate-400', descCls: 'text-slate-500', fcls: 'text-slate-600', btn: 'bg-slate-900 text-white hover:bg-slate-700', icon: 'text-emerald-500' },
            ].map((p, i) => (
              <div key={i}
                className={`rounded-3xl border-2 p-8 space-y-8 ${p.highlight ? 'shadow-2xl scale-105' : `${p.color} shadow-sm`}`}
                style={p.highlight ? { backgroundColor: cfg.primaryColor || '#4f46e5', borderColor: cfg.primaryColor || '#4f46e5' } : {}}>
                {p.highlight && <div className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full w-fit">⭐ Le plus populaire</div>}
                <div>
                  <p className={`text-sm font-semibold mb-3 ${p.subCls}`}>{p.label}</p>
                  <div className="flex items-end gap-1">
                    <span className={`text-4xl font-bold ${p.textCls}`} style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                      {formatPrice((cfg as any)[p.key] || '—', cfg.currency)}
                    </span>
                  </div>
                  <p className={`text-xs font-medium mt-1 ${p.subCls}`}>{p.period}</p>
                  <p className={`text-sm mt-2 ${p.descCls}`}>{p.desc}</p>
                </div>
                <button onClick={onGetStarted} className={`w-full py-3.5 rounded-2xl font-semibold text-sm transition-all ${p.btn}`}>
                  Commencer maintenant
                </button>
                <ul className="space-y-3">
                  {p.features.map((f, j) => (
                    <li key={j} className={`flex items-center gap-3 text-sm font-medium ${p.fcls}`}>
                      <CheckCircle size={16} className={p.icon} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DOWNLOAD ──────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center text-white space-y-8">
          <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center mx-auto">
            <Download size={32} className="text-white" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Téléchargez l'application de bureau
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            DJOLI fonctionne 100% hors ligne. Vos données restent sur votre machine, le cloud ne sert que de sauvegarde et de synchronisation.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {release ? (
              <a href={release.downloadUrl} download
                className="flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-semibold hover:bg-slate-100 transition-all shadow-xl">
                <Download size={20} /> Windows (.exe) — v{release.version}
              </a>
            ) : (
              <button disabled className="flex items-center gap-3 bg-white/40 text-slate-400 px-8 py-4 rounded-2xl font-semibold cursor-not-allowed">
                <Download size={20} /> Bientôt disponible
              </button>
            )}
            <button onClick={onGetStarted} className="flex items-center gap-3 bg-white/10 text-white border border-white/20 px-8 py-4 rounded-2xl font-semibold hover:bg-white/20 transition-all">
              <Globe size={20} /> Portail Web
            </button>
          </div>
          <div className="flex items-center justify-center gap-6 text-slate-500 text-sm">
            <div className="flex items-center gap-2"><Shield size={14} className="text-emerald-400" /> Données sécurisées</div>
            <div className="w-1 h-1 bg-slate-600 rounded-full" />
            <div className="flex items-center gap-2"><CheckCircle size={14} className="text-emerald-400" /> Mises à jour auto</div>
            <div className="w-1 h-1 bg-slate-600 rounded-full" />
            <div className="flex items-center gap-2"><Wifi size={14} className="text-emerald-400" /> Offline-first</div>
          </div>
        </div>
      </section>

      {/* ─── WHATSAPP FLOATING BUTTON ──────────────────────────── */}
      {whatsappHref && (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#25D366] text-white pl-4 pr-5 py-3 rounded-full shadow-2xl shadow-green-500/40 hover:bg-[#1ebe5d] transition-all hover:-translate-y-1 group"
          title="Contactez-nous sur WhatsApp">
          <MessageCircle size={22} fill="white" strokeWidth={0} />
          <span className="text-sm font-bold">WhatsApp</span>
        </a>
      )}

      {/* ─── CONTACT FORM ──────────────────────────────────────── */}
      <section id="contact" className="py-20 px-6 bg-white border-t border-slate-100">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-16 items-start">
          {/* Left: branding */}
          <div className="md:w-1/2 space-y-5">
            <div className="flex items-center gap-2.5">
              <div className="site-logo-badge w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shadow">
                {cfg.logoUrl
                  ? <img src={cfg.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  : <BookOpen size={16} className="text-white" />}
              </div>
              <span className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{cfg.siteName || 'DJOLI'}</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              Vous avez une question ?
            </h2>
            <p className="text-slate-500 leading-relaxed">
              Notre équipe vous répond sous 24h. Remplissez le formulaire et nous reviendrons vers vous rapidement.
            </p>
            <div className="flex flex-col gap-3 text-sm">
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-800 transition-colors">
                  <MessageCircle size={16} /> WhatsApp — réponse rapide
                </a>
              )}
            </div>
          </div>

          {/* Right: form */}
          <div className="md:w-1/2 w-full">
            {contactSent ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center space-y-3">
                <CheckCircle size={36} className="mx-auto text-emerald-500" />
                <p className="font-bold text-emerald-800">Message envoyé !</p>
                <p className="text-sm text-emerald-600">Votre client mail s'est ouvert. Nous vous répondrons bientôt.</p>
              </div>
            ) : (
              <form onSubmit={handleContact} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Votre email</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={e => setContactEmail(e.target.value)}
                    placeholder="directeur@monecole.com"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={contactMsg}
                    onChange={e => setContactMsg(e.target.value)}
                    placeholder="Décrivez votre question ou votre projet…"
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white resize-none"
                  />
                </div>
                <button type="submit" disabled={!cfg.email}
                  className="w-full site-btn py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
                  Envoyer le message <ArrowRight size={15} />
                </button>
                {!cfg.email && <p className="text-xs text-slate-400 text-center">Email de contact non configuré (paramètres admin).</p>}
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start gap-10">
          {/* Brand */}
          <div className="space-y-3 max-w-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden bg-white/10">
                {cfg.logoUrl
                  ? <img src={cfg.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  : <BookOpen size={14} className="text-white" />}
              </div>
              <span className="font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>{cfg.siteName || 'DJOLI'}</span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">La plateforme de gestion scolaire Offline-First pour les établissements africains.</p>
          </div>

          <div className="grid grid-cols-3 gap-10 text-sm">
            <div className="space-y-3">
              <p className="font-semibold text-white text-xs uppercase tracking-wider">Produit</p>
              {['Fonctionnalités','Tarification'].map(l => <a key={l} href={`#${l.toLowerCase()}`} className="block text-slate-400 hover:text-white transition-colors">{l}</a>)}
              {release && <a href={release.downloadUrl} download className="block text-slate-400 hover:text-white transition-colors">Télécharger</a>}
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-white text-xs uppercase tracking-wider">Support</p>
              <a href="#contact" className="block text-slate-400 hover:text-white transition-colors">Nous contacter</a>
              {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="block text-slate-400 hover:text-white transition-colors">WhatsApp</a>}
              <a href="#témoignages" className="block text-slate-400 hover:text-white transition-colors">Témoignages</a>
            </div>
            <div className="space-y-3">
              <p className="font-semibold text-white text-xs uppercase tracking-wider">Légal</p>
              <Link to="/legal/terms"    className="block text-slate-400 hover:text-white transition-colors">Conditions</Link>
              <Link to="/legal/privacy"  className="block text-slate-400 hover:text-white transition-colors">Confidentialité</Link>
              <Link to="/legal/mentions" className="block text-slate-400 hover:text-white transition-colors">Mentions légales</Link>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© 2026 {cfg.siteName || 'DJOLI'}. Tous droits réservés.</p>
          <p>Conçu avec ❤️ pour l'éducation africaine</p>
        </div>
      </footer>
    </div>
  );
};
