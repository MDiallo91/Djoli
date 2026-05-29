import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';

// ─── Shared helpers (mirrored from LandingPage) ────────────────
const DEFAULT_LEGAL = { terms: '', privacy: '', mentions: '' };
function useLegal() {
  const [legal, setLegal] = useState(DEFAULT_LEGAL);
  useEffect(() => {
    const load = () => {
      try { const s = localStorage.getItem('hub_legal'); if (s) setLegal({ ...DEFAULT_LEGAL, ...JSON.parse(s) }); } catch {}
    };
    load();
    window.addEventListener('site-config-updated', load);
    return () => window.removeEventListener('site-config-updated', load);
  }, []);
  return legal;
}

const DEFAULT_CFG = { siteName: 'DJOLI', logoUrl: '', primaryColor: '#4f46e5' };
function useSiteCfg() {
  const [cfg, setCfg] = useState<typeof DEFAULT_CFG>(() => {
    try { const s = localStorage.getItem('hub_site_config'); return s ? { ...DEFAULT_CFG, ...JSON.parse(s) } : DEFAULT_CFG; } catch { return DEFAULT_CFG; }
  });
  useEffect(() => {
    const load = () => {
      try { const s = localStorage.getItem('hub_site_config'); if (s) setCfg(p => ({ ...p, ...JSON.parse(s) })); } catch {}
    };
    window.addEventListener('site-config-updated', load);
    return () => window.removeEventListener('site-config-updated', load);
  }, []);
  return cfg;
}


// ─── Title map ────────────────────────────────────────────────
const TITLES: Record<string, string> = {
  terms:    "Conditions d'utilisation",
  privacy:  'Politique de confidentialité',
  mentions: 'Mentions légales',
};

// ─── Component ───────────────────────────────────────────────
export function LegalPage({ type }: { type: 'terms' | 'privacy' | 'mentions' }) {
  const navigate = useNavigate();
  const legal = useLegal();
  const cfg = useSiteCfg();

  const title = TITLES[type];
  const content = legal[type];

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        :root { --cp: ${cfg.primaryColor || '#4f46e5'}; }
        .legal-content h1 { font-size:1.5rem; font-weight:800; margin:1rem 0 .5rem; color:#1e293b }
        .legal-content h2 { font-size:1.2rem; font-weight:700; margin:1.2rem 0 .4rem; color:#1e293b }
        .legal-content h3 { font-size:1rem;   font-weight:700; margin:1rem 0 .3rem; color:#1e293b }
        .legal-content ul  { list-style:disc;    padding-left:1.5rem; margin:.5rem 0 }
        .legal-content ol  { list-style:decimal; padding-left:1.5rem; margin:.5rem 0 }
        .legal-content li  { margin:.25rem 0 }
        .legal-content hr  { border:none; border-top:1px solid #e2e8f0; margin:1.5rem 0 }
        .legal-content p   { margin:.5rem 0; color:#475569 }
        .legal-content strong { font-weight:700; color:#1e293b }
      `}</style>

      {/* ─── Header ──────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-5">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors rounded-lg px-3 py-1.5 hover:bg-slate-100"
          >
            <ArrowLeft size={16} />
            Accueil
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden"
              style={{ backgroundColor: cfg.primaryColor || '#4f46e5' }}
            >
              {cfg.logoUrl
                ? <img src={cfg.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                : <BookOpen size={14} className="text-white" />}
            </div>
            <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
              {cfg.siteName}
            </span>
          </div>
        </div>
      </header>

      {/* ─── Content ─────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <span
            className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4"
            style={{ backgroundColor: `color-mix(in srgb, ${cfg.primaryColor || '#4f46e5'} 12%, transparent)`, color: cfg.primaryColor || '#4f46e5' }}
          >
            Document légal
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900">{title}</h1>
        </div>

        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-slate-100">
          {content ? (
            <div
              className="legal-content text-sm text-slate-600 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-slate-400 italic text-sm">
              Ce contenu n'a pas encore été renseigné. Revenez bientôt.
            </p>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          {Object.entries(TITLES)
            .filter(([k]) => k !== type)
            .map(([k, label]) => (
              <button
                key={k}
                onClick={() => navigate(`/legal/${k}`)}
                className="text-sm px-4 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-400 transition-colors"
              >
                {label}
              </button>
            ))}
        </div>
      </main>

      {/* ─── Footer ──────────────────────────────────────────── */}
      <footer className="max-w-4xl mx-auto px-6 py-6 border-t border-slate-100 mt-8 text-xs text-slate-400 flex justify-between">
        <span>© 2026 {cfg.siteName}. Tous droits réservés.</span>
        <button onClick={() => navigate('/')} className="hover:text-slate-700 transition-colors">← Retour à l'accueil</button>
      </footer>
    </div>
  );
}
