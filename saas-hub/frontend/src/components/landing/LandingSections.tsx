import {
  CircleCheck, ArrowRight, Play, Laptop, Cloud, WifiOff, Wifi, RefreshCw, X,
  School, Users, Award, Sparkles,
} from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import { ABOUT_POINTS, MODULES, HOW_IT_WORKS } from './landingData';

// ─── À propos ───────────────────────────────────────────────────────────────
export function AboutSection({ image, onLogin }: { image?: string; onLogin: () => void }) {
  return (
    <section className="lp-section">
      <div className="lp-container grid lg:grid-cols-2 gap-14 items-center">
        <div className="lp-about-visual">
          <div className="lp-about-shape" />
          <div className="lp-about-frame">
            {image
              ? <img src={image} alt="" className="w-full block object-cover" style={{ aspectRatio: '4 / 3' }} />
              : <AboutPlaceholder />}
          </div>
          <div className="lp-about-badge">
            <Award size={40} />
            <div>
              <div className="lp-heading text-3xl font-black" style={{ color: '#fff' }}>14 jours</div>
              <div className="text-sm font-medium">d'essai gratuit</div>
            </div>
          </div>
        </div>

        <div>
          <SectionTitle sub="À propos de nous">Une plateforme pensée pour <span>votre école</span></SectionTitle>
          <p className="mt-6 mb-4">
            DJOLI réunit tout ce dont un établissement a besoin au quotidien : inscriptions, notes, bulletins,
            finances, personnel et comptes utilisateurs. L'application tourne sur vos ordinateurs, même sans
            internet, et se synchronise avec le cloud dès que la connexion revient.
          </p>
          <p className="mb-7">
            La direction garde un œil sur l'établissement depuis le portail web, où qu'elle soit.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-9">
            {ABOUT_POINTS.map(p => (
              <div key={p} className="lp-check"><CircleCheck size={22} /> {p}</div>
            ))}
          </div>
          <button onClick={onLogin} className="lp-btn">Découvrir DJOLI <ArrowRight size={18} /></button>
        </div>
      </div>
    </section>
  );
}

function AboutPlaceholder() {
  return (
    <div className="grid place-items-center" style={{ aspectRatio: '4 / 3', background: 'linear-gradient(135deg, var(--lp-primary), color-mix(in srgb, var(--lp-primary) 65%, #000))' }}>
      <div className="grid grid-cols-2 gap-4 p-8 w-full max-w-sm">
        {[['Élèves', '1 284'], ['Classes', '42'], ['Enseignants', '58'], ['Recouvrement', '97 %']].map(([l, v]) => (
          <div key={l} className="rounded-2xl p-4 text-center" style={{ background: 'rgba(255,255,255,.1)' }}>
            <div className="lp-heading text-3xl font-black" style={{ color: 'var(--lp-accent)' }}>{v}</div>
            <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,.85)' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compteurs ──────────────────────────────────────────────────────────────
export function CounterSection({ stats }: { stats: { schoolCount: number; studentCount: number } | null }) {
  const items = [
    { Icon: School,   value: stats ? `${stats.schoolCount.toLocaleString('fr-FR')}+` : '500+', label: 'Établissements' },
    { Icon: Users,    value: stats ? `${stats.studentCount.toLocaleString('fr-FR')}+` : '50k+', label: 'Élèves gérés' },
    { Icon: Cloud,    value: '99,9 %', label: 'Disponibilité' },
    { Icon: WifiOff,  value: '100 %',  label: 'Utilisable hors ligne' },
  ];
  return (
    <section className="pb-20 md:pb-28">
      <div className="lp-container">
        <div className="lp-counter-band grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {items.map(({ Icon, value, label }) => (
            <div key={label} className="flex items-center gap-5 justify-center lg:justify-start">
              <div className="lp-counter-icon"><Icon size={32} /></div>
              <div>
                <div className="lp-counter-value">{value}</div>
                <div className="lp-counter-label">{label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Modules (grille type « cours ») ────────────────────────────────────────
export function ModulesSection({ images }: { images: string[] }) {
  return (
    <section id="fonctionnalites" className="lp-section lp-bg-light">
      <div className="lp-container">
        <SectionTitle sub="Fonctionnalités" center className="mb-14">
          Tout votre établissement, <span>une seule plateforme</span>
        </SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {MODULES.map((m, i) => (
            <div key={m.title} className="lp-module">
              <div className="lp-module-img">
                {images[i]
                  ? <img src={images[i]} alt={m.title} />
                  : <div className="lp-module-ph"><m.Icon size={56} strokeWidth={1.4} /></div>}
                <span className="lp-module-tag">{m.tag}</span>
              </div>
              <div className="px-3 pt-6 pb-4">
                <h3 className="mb-3">{m.title}</h3>
                <p className="mb-5">{m.desc}</p>
                <a href="#tarification" className="lp-module-link">En savoir plus <ArrowRight size={16} /></a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Vidéo ──────────────────────────────────────────────────────────────────
export function VideoSection({ bg, onPlay }: { bg: string; onPlay: () => void }) {
  return (
    <section className="lp-section">
      <div className="lp-container">
        <div className="lp-video px-6" style={bg ? { backgroundImage: `url(${bg})` } : { background: 'linear-gradient(120deg, var(--lp-dark), var(--lp-primary))' }}>
          <div className="flex flex-col items-center gap-7 py-16">
            <span className="lp-sub" style={{ marginBottom: 0 }}><Sparkles size={18} /> Vidéo de présentation</span>
            <h2 className="lp-title lp-title-light max-w-2xl">Découvrez DJOLI <span style={{ color: 'var(--lp-accent)' }}>en 3 minutes</span></h2>
            <button className="lp-play" onClick={onPlay} aria-label="Lire la vidéo"><Play size={34} fill="currentColor" /></button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Hors ligne ─────────────────────────────────────────────────────────────
export function OfflineSection() {
  return (
    <section id="hors-ligne" className="lp-section lp-bg-light">
      <div className="lp-container grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <SectionTitle sub="Offline-first">Fonctionne même <span>sans connexion</span></SectionTitle>
          <p className="mt-6 mb-8">
            Vos équipes continuent de saisir inscriptions, notes et paiements en toute autonomie, connexion ou pas.
            Dès que le réseau revient, DJOLI synchronise automatiquement — sans action manuelle, sans conflit.
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="lp-contact-info" style={{ alignItems: 'flex-start' }}>
              <div className="lp-icon lp-icon-sm"><WifiOff size={24} /></div>
              <div><h4 className="text-lg mb-1">En coupure</h4><p className="text-sm">Saisie locale, aucune perte de données.</p></div>
            </div>
            <div className="lp-contact-info" style={{ alignItems: 'flex-start' }}>
              <div className="lp-icon lp-icon-sm"><RefreshCw size={24} /></div>
              <div><h4 className="text-lg mb-1">Connexion rétablie</h4><p className="text-sm">Synchronisation automatique et silencieuse.</p></div>
            </div>
          </div>
        </div>

        <div className="lp-sync-card flex flex-col gap-6">
          <div>
            <span className="lp-pill mb-3" style={{ background: 'rgba(224,90,77,.1)', color: '#E05A4D' }}><WifiOff size={13} /> Sans connexion</span>
            <div className="flex items-center gap-3">
              <div className="lp-sync-node"><Laptop size={30} style={{ color: 'var(--lp-primary)' }} /> Poste local <small>Saisie continue</small></div>
              <X size={20} color="#E05A4D" className="flex-shrink-0" />
              <div className="lp-sync-node is-off"><Cloud size={30} /> Cloud DJOLI <small>En attente…</small></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--lp-border)' }} />
            <span className="lp-pill" style={{ background: 'var(--lp-accent)', color: '#fff' }}><Wifi size={13} /> Connexion rétablie</span>
            <div className="flex-1 h-px" style={{ background: 'var(--lp-border)' }} />
          </div>
          <div>
            <span className="lp-pill mb-3" style={{ background: 'var(--lp-primary-light)', color: 'var(--lp-primary)' }}><RefreshCw size={13} /> Synchronisation automatique</span>
            <div className="flex items-center gap-3">
              <div className="lp-sync-node"><Laptop size={30} style={{ color: 'var(--lp-primary)' }} /> Poste local <small>Données prêtes</small></div>
              <ArrowRight size={22} className="flex-shrink-0" style={{ color: 'var(--lp-accent)' }} />
              <div className="lp-sync-node is-ok"><Cloud size={30} style={{ color: 'var(--lp-primary)' }} /> Cloud DJOLI <small style={{ color: 'var(--lp-primary)' }}>✓ Sauvegardé</small></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Étapes ─────────────────────────────────────────────────────────────────
export function StepsSection() {
  return (
    <section className="lp-section">
      <div className="lp-container">
        <SectionTitle sub="Mise en route" center className="mb-16">
          Opérationnel en <span>moins d'une heure</span>
        </SectionTitle>
        <div className="grid md:grid-cols-3 gap-12">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.n} className="lp-step">
              {i < HOW_IT_WORKS.length - 1 && <div className="lp-step-line hidden md:block" />}
              <div className="lp-step-num">{s.n}</div>
              <h3 className="text-2xl font-bold mb-3">{s.title}</h3>
              <p className="m-0">{s.desc}</p>
              <span className="lp-step-detail">{s.detail}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
