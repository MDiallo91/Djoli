import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Play, Download, BookOpen } from 'lucide-react';
import { HERO_SLIDES, HIGHLIGHTS } from './landingData';

interface Props {
  heroBgUrl: string;
  downloadUrl: string | null;
  hasVideo: boolean;
  onLogin: () => void;
  onVideo: () => void;
}

const SLIDE_MS = 7000;

export function LandingHero({ heroBgUrl, downloadUrl, hasVideo, onLogin, onVideo }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % HERO_SLIDES.length), SLIDE_MS);
    return () => clearInterval(t);
  }, [paused]);

  const go = (d: number) => setIdx(i => (i + d + HERO_SLIDES.length) % HERO_SLIDES.length);
  const slide = HERO_SLIDES[idx];

  return (
    <>
      <section id="accueil" className={`lp-hero ${heroBgUrl ? '' : 'no-image'}`}
        style={heroBgUrl ? { backgroundImage: `url(${heroBgUrl})` } : undefined}
        onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        {!heroBgUrl && <div className="lp-hero-dots" />}

        <div className="lp-container grid lg:grid-cols-12 gap-12 items-center">
          {/* Texte (re-monté à chaque slide pour rejouer l'animation) */}
          <div key={idx} className="lg:col-span-7 lp-slide-anim flex flex-col gap-6">
            <div className="lp-hero-tag"><BookOpen size={20} /> {slide.tag}</div>
            <h1>{slide.title} <span>{slide.accent}</span></h1>
            <p className="lp-hero-text m-0">{slide.text}</p>
            <div className="flex flex-wrap gap-4 pt-2">
              <button onClick={onLogin} className="lp-btn">Essayer gratuitement — 14 jours</button>
              {hasVideo
                ? <button onClick={onVideo} className="lp-btn lp-btn-outline"><Play size={18} /> Voir la démo</button>
                : downloadUrl && <a href={downloadUrl} download className="lp-btn lp-btn-outline"><Download size={18} /> Télécharger</a>}
            </div>
          </div>

          {/* Aperçu de l'application */}
          <div className="hidden lg:flex lg:col-span-5 justify-end">
            <AppMockup />
          </div>
        </div>

        {/* Contrôles du slider */}
        <div className="lp-hero-controls">
          <div className="lp-container flex items-center gap-3">
            <button className="lp-hero-nav" onClick={() => go(-1)} aria-label="Précédent"><ChevronLeft size={22} /></button>
            <button className="lp-hero-nav" onClick={() => go(1)} aria-label="Suivant"><ChevronRight size={22} /></button>
            <div className="flex items-center gap-2 ml-3">
              {HERO_SLIDES.map((_, i) => (
                <button key={i} className={`lp-hero-dot ${i === idx ? 'is-active' : ''}`} onClick={() => setIdx(i)} aria-label={`Slide ${i + 1}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Cartes qui chevauchent le bas du hero ── */}
      <div className="lp-highlights">
        <div className="lp-container grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HIGHLIGHTS.map(h => (
            <div key={h.title} className="lp-hl-card">
              <div className="lp-icon mb-5"><h.Icon size={32} /></div>
              <h3 className="text-2xl font-bold mb-2">{h.title}</h3>
              <p className="m-0">{h.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// Aperçu stylisé du tableau de bord (remplace une photo tant qu'aucune image n'est fournie)
function AppMockup() {
  return (
    <div className="lp-float w-full max-w-md">
      <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', boxShadow: '0 40px 80px rgba(0,0,0,.35)' }}>
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'var(--lp-bg-light)' }}>
          <span className="w-3 h-3 rounded-full" style={{ background: '#E05A4D' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#F0A030' }} />
          <span className="w-3 h-3 rounded-full" style={{ background: '#57BB56' }} />
          <span className="flex-1 ml-2 text-center text-xs py-1 rounded-full" style={{ background: '#fff', color: 'var(--lp-text)' }}>djoli · Tableau de bord</span>
        </div>
        <div className="flex" style={{ height: 300 }}>
          <div className="flex flex-col gap-1 p-3 flex-shrink-0" style={{ width: 130, background: 'var(--lp-primary)' }}>
            <div className="font-bold text-white mb-3 px-2" style={{ fontFamily: 'Yantramanav, sans-serif', fontSize: 18 }}>DJOLI</div>
            <div className="text-xs font-bold px-2 py-2 rounded-lg" style={{ background: 'var(--lp-accent)', color: '#fff' }}>Tableau de bord</div>
            {['Élèves', 'Notes', 'Finances', 'Personnel'].map(i => (
              <div key={i} className="text-xs font-medium px-2 py-2" style={{ color: 'rgba(255,255,255,.7)' }}>{i}</div>
            ))}
          </div>
          <div className="flex-1 p-4" style={{ background: 'var(--lp-bg-light)' }}>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[['1 284', 'Élèves'], ['97 %', 'Recouvr.'], ['42', 'Classes']].map(([v, l]) => (
                <div key={l} className="p-2 rounded-lg bg-white">
                  <div className="font-bold" style={{ color: 'var(--lp-dark)', fontSize: 15 }}>{v}</div>
                  <div style={{ fontSize: 9, color: 'var(--lp-text)' }}>{l}</div>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-white mb-3">
              <div className="flex items-end gap-1.5" style={{ height: 70 }}>
                {[40, 65, 50, 80, 60, 92, 75].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i === 5 ? 'var(--lp-accent)' : 'var(--lp-primary)', opacity: i === 5 ? 1 : .8 }} />
                ))}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-white">
              {[['K. Diallo', '450 000 F'], ['A. Camara', '300 000 F']].map(([n, v]) => (
                <div key={n} className="flex justify-between py-1" style={{ fontSize: 10, color: 'var(--lp-dark)' }}>
                  <span>{n}</span><span style={{ color: 'var(--lp-primary)', fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
