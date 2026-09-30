import { CircleCheck, Download, ArrowRight, Star, Quote } from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import { PLAN_FEATURES, DEFAULT_PLAN_FEATURES, TESTIMONIALS } from './landingData';
import { formatPrice, type SiteConfig } from './useSiteConfig';

// ─── Tarifs ─────────────────────────────────────────────────────────────────
// Montants calculés depuis la tarification enregistrée dans l'admin (même formule
// que le simulateur de TarificationSection) : prix mensuel par niveau × mois ×
// (1 − remise durée). « À partir de » = niveau le moins cher, un seul cycle.
const periodLabel = (months: number) =>
  months === 1 ? '/mois' : months === 3 ? '/trimestre' : months === 12 ? '/an' : `/ ${months} mois`;

export function PricingSection({ cfg, onLogin }: { cfg: SiteConfig; onLogin: () => void }) {
  const levels = Object.entries(cfg.levelPrices ?? {}).filter(([, p]) => Number(p) > 0) as [string, number][];
  const minMonthly = levels.length ? Math.min(...levels.map(([, p]) => Number(p))) : 0;
  const durations = [...(cfg.durations ?? [])].filter(d => d.months > 0).sort((a, b) => a.months - b.months);
  const featured = durations.length === 3 ? 1 : -1; // formule du milieu mise en avant
  const multi = [...(cfg.multiLevelDiscounts ?? [])].filter(m => m.discountPct > 0).sort((a, b) => a.count - b.count);
  const fmt = (n: number) => formatPrice(n, cfg.currency);

  return (
    <section id="tarification" className="lp-section lp-bg-light">
      <div className="lp-container">
        <SectionTitle sub="Nos tarifs" center className="mb-6">Un tarif pour <span>chaque établissement</span></SectionTitle>
        <p className="lp-center mb-14">Sans frais cachés. Le prix dépend des cycles de votre école et de la durée choisie.</p>

        {minMonthly > 0 && durations.length > 0 && (
          <div className={`grid gap-7 items-stretch ${durations.length >= 3 ? 'md:grid-cols-3' : durations.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : 'max-w-md mx-auto'}`}>
            {durations.map((d, i) => {
              const monthly = minMonthly * (1 - d.discountPct / 100);
              const isFeatured = i === featured;
              return (
                <div key={d.id} className={`lp-price ${isFeatured ? 'is-featured' : ''}`}>
                  {isFeatured
                    ? <span className="lp-price-badge">Populaire</span>
                    : d.discountPct > 0 && <span className="lp-price-badge">−{d.discountPct} %</span>}
                  <h3 className="text-2xl font-bold mb-5">{d.label}</h3>
                  <div className="text-sm mb-1">À partir de</div>
                  <div className="lp-price-amount">{fmt(monthly * d.months)}</div>
                  <div className="mt-2 mb-7">
                    {periodLabel(d.months)}
                    {d.months > 1 && <> · soit {fmt(monthly)} /mois{isFeatured && d.discountPct > 0 ? ` (−${d.discountPct} %)` : ''}</>}
                  </div>
                  <ul className="list-none p-0 m-0 mb-8 flex-1">
                    {(PLAN_FEATURES[d.id] ?? DEFAULT_PLAN_FEATURES).map(f => <li key={f}><CircleCheck size={18} /> {f}</li>)}
                  </ul>
                  <button onClick={onLogin} className={`lp-btn lp-btn-block ${isFeatured ? '' : 'lp-btn-primary'}`}>Choisir cette formule</button>
                </div>
              );
            })}
          </div>
        )}

        {/* Détail : prix mensuel par cycle + remises multi-niveaux */}
        {levels.length > 0 && (
          <div className="lp-price-levels mt-10">
            <div className="lp-heading text-xl font-bold mb-5 lp-center">Tarif mensuel par cycle scolaire</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {levels.map(([name, price]) => (
                <div key={name} className="lp-price-level">
                  <span>{name}</span>
                  <strong>{fmt(Number(price))}<small> /mois</small></strong>
                </div>
              ))}
            </div>
            {multi.length > 0 && (
              <p className="lp-center mt-6 mb-0">
                Plusieurs cycles ? Remise de{' '}
                {multi.map((m, i) => (
                  <span key={m.count}>
                    <strong style={{ color: 'var(--lp-primary)' }}>−{m.discountPct} %</strong> pour {m.count} cycles
                    {i < multi.length - 2 ? ', ' : i === multi.length - 2 ? ' et ' : ''}
                  </span>
                ))}
                , cumulable avec la remise de durée.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Bandeau offre (essai gratuit + téléchargement) ─────────────────────────
export function OfferBand({ downloadUrl, version, onLogin }: { downloadUrl: string | null; version: string | null; onLogin: () => void }) {
  return (
    <section className="lp-section-sm">
      <div className="lp-container">
        <div className="lp-cta grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <h2 className="lp-title" style={{ color: '#fff' }}>Essai gratuit de 14 jours — commencez aujourd'hui</h2>
            <p className="mt-4 mb-0 text-lg" style={{ color: 'rgba(255,255,255,.92)' }}>
              Sans engagement, sans carte bancaire. Vos données restent sur votre machine, le cloud sert de sauvegarde.
            </p>
          </div>
          <div className="lg:col-span-5 flex flex-wrap gap-4 lg:justify-end">
            <button onClick={onLogin} className="lp-btn lp-btn-primary">Créer mon compte <ArrowRight size={18} /></button>
            {downloadUrl && (
              <a href={downloadUrl} download className="lp-btn lp-btn-outline">
                <Download size={18} /> Windows{version ? ` — v${version}` : ''}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Témoignages ────────────────────────────────────────────────────────────
const initials = (name: string) => name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

export function TestimonialsSection() {
  return (
    <section id="temoignages" className="lp-section">
      <div className="lp-container">
        <SectionTitle sub="Témoignages" center className="mb-14">Ce qu'en disent <span>les établissements</span></SectionTitle>
        <div className="grid md:grid-cols-3 gap-7">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="lp-testi">
              <Quote size={64} className="lp-testi-quote" fill="currentColor" strokeWidth={0} />
              <div className="lp-stars mb-5">{[0, 1, 2, 3, 4].map(i => <Star key={i} size={18} fill="currentColor" strokeWidth={0} />)}</div>
              <p className="mb-7" style={{ fontSize: 17, fontStyle: 'italic' }}>« {t.quote} »</p>
              <div className="flex items-center gap-4">
                <div className="lp-avatar">{initials(t.name)}</div>
                <div>
                  <h4 className="text-lg font-bold">{t.name}</h4>
                  <div className="text-sm" style={{ color: 'var(--lp-primary)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Écoles clientes (configurées dans l'admin) ─────────────────────────────
export function PartnersSection({ schools }: { schools: SiteConfig['clientSchools'] }) {
  if (!schools.length) return null;
  return (
    <section className="pb-24">
      <div className="lp-container">
        <p className="lp-center lp-heading text-xl font-bold mb-8">Ils nous font confiance</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
          {schools.map(s => (
            <div key={s.id} className="lp-partner" title={s.name}>
              {s.logoUrl ? <img src={s.logoUrl} alt={s.name} /> : <span className="text-center text-sm">{s.name}</span>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
