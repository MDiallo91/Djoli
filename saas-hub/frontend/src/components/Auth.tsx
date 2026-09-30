import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight,
  Upload, FileText, CheckCircle, User, Phone,
  Building2, X, ShieldCheck, RefreshCw, WifiOff, Check, GraduationCap, Send,
} from 'lucide-react';
import apiClient from '../lib/apiClient';
import { useSiteConfig, themeVars, type SiteConfig } from './landing/useSiteConfig';
import './landing/landing.css';

interface AuthProps {
  onBack: () => void;
  onSuccess: (data: any) => void;
}

// Même identité visuelle que la page d'accueil (landing/landing.css) :
// couleurs de marque = paramètres admin (cfg.primaryColor / cfg.secondaryColor).

// ─── Petits éléments partagés ──────────────────────────────────
function Logo({ cfg, light }: { cfg: SiteConfig; light?: boolean }) {
  return (
    <div className="lp-logo" style={light ? { color: '#fff' } : undefined}>
      {cfg.logoUrl
        ? <img src={cfg.logoUrl} alt="" className="w-10 h-10 object-contain" />
        : <span className="lp-logo-mark" style={light ? { background: 'rgba(255,255,255,.14)' } : undefined}><GraduationCap size={24} /></span>}
      {cfg.siteName || 'DJOLI'}
    </div>
  );
}

const Spinner = () => <span className="au-spinner" />;

function PasswordField({ value, onChange, placeholder, autoComplete }: {
  value: string; onChange: (v: string) => void; placeholder: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="au-field">
      <Lock size={17} />
      <input required type={show ? 'text' : 'password'} autoComplete={autoComplete} placeholder={placeholder}
        value={value} onChange={e => onChange(e.target.value)} className="lp-input has-toggle" />
      <button type="button" onClick={() => setShow(!show)} className="au-toggle" aria-label={show ? 'Masquer' : 'Afficher'}>
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

// ─── Mise en page : panneau de marque à gauche + formulaire à droite ──
function AuthPanel({ onBack, step, totalSteps, children }: {
  onBack: () => void;
  step?: number;
  totalSteps?: number;
  children: React.ReactNode;
}) {
  const cfg = useSiteConfig();
  return (
    <div className="lp-root au-page" style={themeVars(cfg)}>
      {/* ── Colonne gauche ── */}
      <div className={`au-side hidden lg:flex lg:w-[46%] flex-col ${cfg.heroBgUrl ? 'has-image' : ''}`}
        style={cfg.heroBgUrl ? { backgroundImage: `url(${cfg.heroBgUrl})` } : undefined}>
        {!cfg.heroBgUrl && <div className="lp-hero-dots" />}
        <div className="au-side-inner flex flex-col h-full p-12">
          <div className="flex items-center justify-between">
            <Logo cfg={cfg} light />
            <button onClick={onBack} className="au-back"><ArrowLeft size={16} /> Retour au site</button>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-md">
            <span className="lp-hero-tag mb-5" style={{ fontSize: 15 }}>Espace établissement</span>
            <h2 className="mb-5">La gestion scolaire, <span>simplifiée.</span></h2>
            <p className="mb-10" style={{ color: 'rgba(255,255,255,.8)', fontSize: 17 }}>
              Pilotez élèves, notes, paiements et personnel depuis une seule plateforme — en ligne ou hors ligne.
            </p>
            <div className="flex flex-col gap-4">
              {[
                { Icon: RefreshCw,   text: 'Synchronisation cloud automatique' },
                { Icon: WifiOff,     text: 'Mode hors-ligne complet' },
                { Icon: ShieldCheck, text: 'Données sécurisées & chiffrées' },
              ].map(f => (
                <div key={f.text} className="au-feature">
                  <span className="au-feature-icon"><f.Icon size={19} /></span>
                  {f.text}
                </div>
              ))}
            </div>

            {step !== undefined && totalSteps !== undefined && (
              <div className="flex items-center gap-2 mt-12">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className="au-progress"
                    style={{ background: i < step ? 'var(--lp-accent)' : 'rgba(255,255,255,.2)', flex: i === step - 1 ? 2 : 1 }} />
                ))}
              </div>
            )}
          </div>

          <p className="text-sm m-0" style={{ color: 'rgba(255,255,255,.5)' }}>© {new Date().getFullYear()} {cfg.siteName || 'DJOLI'} — Tous droits réservés</p>
        </div>
      </div>

      {/* ── Colonne droite ── */}
      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-between mb-7">
            <Logo cfg={cfg} />
            <button onClick={onBack} className="au-back au-back-dark"><ArrowLeft size={16} /> Retour</button>
          </div>
          <div className="au-card">{children}</div>
        </div>
      </div>
    </div>
  );
}

function CardTitle({ sub, title, text }: { sub: string; title: string; text?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <span className="lp-sub" style={{ fontSize: 14, marginBottom: 8 }}>{sub}</span>
      <h1 className="text-3xl font-bold">{title}</h1>
      {text && <p className="mt-2 mb-0">{text}</p>}
    </div>
  );
}

// ─── File uploader helper ─────────────────────────────────────
const formatSize = (b: number) => b >= 1024 * 1024 ? `${(b / 1024 / 1024).toLocaleString('fr-FR')} Mo` : `${Math.round(b / 1024)} Ko`;
const LOGO_MAX_BYTES = 500 * 1024;
const RCCM_MAX_BYTES = 2.5 * 1024 * 1024;

// Lecture locale en data URL (base64) — pas d'upload : le fichier part avec le
// formulaire d'inscription. Limites alignées sur le backend (validate.ts).
function FileUpload({ label, value, onChange, accept, types, maxBytes, hint, optional }: {
  label: string; value: string; onChange: (v: string, name: string) => void; accept: string;
  types: string[]; maxBytes: number; hint?: string; optional?: boolean;
}) {
  const [fileName, setFileName] = useState('');
  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ''; // permet de re-choisir le même fichier après une erreur
    if (!f) return;
    if (!types.includes(f.type)) { toast.error('Format de fichier non accepté.'); return; }
    if (f.size > maxBytes) { toast.error(`Fichier trop volumineux (${formatSize(maxBytes)} maximum).`); return; }
    setFileName(f.name);
    const r = new FileReader();
    r.onloadend = () => onChange(r.result as string, f.name);
    r.readAsDataURL(f);
  };
  return (
    <div>
      <label className="au-label">{label} {optional && <small>(optionnel)</small>}</label>
      {value ? (
        <div className="au-file">
          {value.startsWith('data:image') ? (
            <img src={value} alt="" className="w-11 h-11 object-contain rounded-lg bg-white" />
          ) : (
            <div className="w-11 h-11 rounded-lg grid place-items-center bg-white"><FileText size={18} style={{ color: 'var(--lp-accent)' }} /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate m-0" style={{ color: 'var(--lp-dark)' }}>{fileName || 'Fichier chargé'}</p>
            <p className="text-xs m-0">Cliquez pour remplacer</p>
          </div>
          <label className="cursor-pointer p-1" style={{ color: 'var(--lp-primary)' }}>
            <Upload size={16} />
            <input type="file" accept={accept} className="hidden" onChange={pick} />
          </label>
          <button type="button" onClick={() => { onChange('', ''); setFileName(''); }} className="au-link p-1 grid" style={{ color: 'var(--lp-text)' }} aria-label="Retirer"><X size={15} /></button>
        </div>
      ) : (
        <label className="au-drop">
          <Upload size={22} className="mb-2" style={{ color: 'var(--lp-primary)' }} />
          <p className="text-sm font-medium m-0" style={{ color: 'var(--lp-dark)' }}>Cliquez pour uploader</p>
          {hint && <p className="text-xs mt-1 mb-0">{hint}</p>}
          <input type="file" accept={accept} className="hidden" onChange={pick} />
        </label>
      )}
    </div>
  );
}

// ─── OTP step ─────────────────────────────────────────────────
function OTPStep({ email, onSuccess, onResend, onBack }: {
  email: string; onSuccess: () => void;
  onResend: () => Promise<void>; onBack: () => void;
}) {
  const [otp, setOtp]         = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputsRef             = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => { inputsRef.current[0]?.focus(); }, []);

  const handleChange = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v;
    setOtp(next);
    if (v && i < 5) inputsRef.current[i + 1]?.focus();
  };
  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputsRef.current[i - 1]?.focus();
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { toast.error('Entrez les 6 chiffres'); return; }
    setLoading(true);
    try {
      await apiClient.post('/user/verify-otp', { email, code });
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Code incorrect');
      setOtp(['', '', '', '', '', '']);
      inputsRef.current[0]?.focus();
    } finally { setLoading(false); }
  };
  const handleResend = async () => {
    try { await onResend(); toast.success('Nouveau code envoyé !'); }
    catch { toast.error('Erreur lors du renvoi'); }
  };

  return (
    <AuthPanel onBack={onBack}>
      <div className="text-center mb-8">
        <div className="lp-icon mx-auto mb-5"><ShieldCheck size={30} /></div>
        <h1 className="text-3xl font-bold mb-2">Vérification email</h1>
        <p className="m-0">Code envoyé à <span className="font-bold" style={{ color: 'var(--lp-dark)' }}>{email}</span></p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-7">
        <div className="flex gap-2 justify-center">
          {otp.map((d, i) => (
            <input key={i} ref={el => { inputsRef.current[i] = el; }}
              type="text" inputMode="numeric" maxLength={1} value={d} aria-label={`Chiffre ${i + 1}`}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              className="au-otp" />
          ))}
        </div>
        <button type="submit" disabled={loading || otp.join('').length < 6} className="lp-btn lp-btn-block">
          {loading ? <><Spinner /> Vérification…</> : 'Confirmer mon email'}
        </button>
      </form>
      <p className="text-center text-sm mt-6 mb-0">
        Code valable 10 minutes.{' '}
        <button onClick={handleResend} className="au-link">Renvoyer</button>
      </p>
    </AuthPanel>
  );
}

// ─── Login form ────────────────────────────────────────────────
function LoginForm({ onBack, onSuccess, onRegister }: AuthProps & { onRegister: () => void }) {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await apiClient.post('/user/login', form);
      onSuccess(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Identifiants incorrects');
    } finally { setLoading(false); }
  };

  return (
    <AuthPanel onBack={onBack}>
      <CardTitle sub="Espace établissement" title="Connexion" text="Heureux de vous revoir ! Connectez-vous à votre école." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="au-label">Adresse email</label>
          <div className="au-field">
            <Mail size={17} />
            <input required type="email" autoComplete="email" placeholder="contact@ecole.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="lp-input" />
          </div>
        </div>
        <div>
          <label className="au-label">Mot de passe</label>
          <PasswordField value={form.password} onChange={v => setForm({ ...form, password: v })} placeholder="••••••••" autoComplete="current-password" />
        </div>
        <button type="submit" disabled={loading} className="lp-btn lp-btn-block mt-2">
          {loading ? <><Spinner /> Connexion…</> : <>Se connecter <ArrowRight size={18} /></>}
        </button>
      </form>

      <p className="text-center mt-7 mb-0">
        Pas encore de compte ?{' '}
        <button onClick={onRegister} className="au-link">Créer un compte école</button>
      </p>
    </AuthPanel>
  );
}

// ─── Register — Step 1 ────────────────────────────────────────
function RegisterStep1({ onBack, onNext, onLogin, data, setData }: {
  onBack: () => void; onNext: () => void; onLogin: () => void;
  data: any; setData: (d: any) => void;
}) {
  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.password !== data.confirmPassword) { toast.error('Les mots de passe ne correspondent pas.'); return; }
    if (data.password.length < 8) { toast.error('Minimum 8 caractères.'); return; }
    if (!data.terms) { toast.error("Acceptez les conditions d'utilisation."); return; }
    onNext();
  };

  return (
    <AuthPanel onBack={onBack} step={1} totalSteps={2}>
      <CardTitle sub="Étape 1 / 2" title="Créer un compte" text="Vos identifiants de connexion." />

      <form onSubmit={handleNext} className="flex flex-col gap-5">
        <div>
          <label className="au-label">Email de connexion *</label>
          <div className="au-field">
            <Mail size={17} />
            <input required type="email" placeholder="contact@ecole.com" value={data.email}
              onChange={e => setData({ ...data, email: e.target.value })} className="lp-input" />
          </div>
        </div>
        <div>
          <label className="au-label">Mot de passe *</label>
          <PasswordField value={data.password} onChange={v => setData({ ...data, password: v })} placeholder="Minimum 8 caractères" autoComplete="new-password" />
        </div>
        <div>
          <label className="au-label">Confirmer le mot de passe *</label>
          <PasswordField value={data.confirmPassword} onChange={v => setData({ ...data, confirmPassword: v })} placeholder="Répétez le mot de passe" autoComplete="new-password" />
        </div>

        <label className="flex items-start gap-3 cursor-pointer pt-1" onClick={() => setData({ ...data, terms: !data.terms })}>
          <span className={`au-check mt-0.5 ${data.terms ? 'is-on' : ''}`}>{data.terms && <Check size={14} strokeWidth={3} />}</span>
          <span className="text-sm">
            J'accepte les{' '}
            <a href="/legal/terms" target="_blank" rel="noopener noreferrer" className="au-link" onClick={e => e.stopPropagation()}>Conditions d'utilisation</a>{' '}
            et la{' '}
            <a href="/legal/privacy" target="_blank" rel="noopener noreferrer" className="au-link" onClick={e => e.stopPropagation()}>Politique de confidentialité</a>
          </span>
        </label>

        <button type="submit" className="lp-btn lp-btn-block">
          Continuer <ArrowRight size={18} />
        </button>
      </form>

      <p className="text-center mt-7 mb-0">
        Déjà un compte ?{' '}
        <button onClick={onLogin} className="au-link">Se connecter</button>
      </p>
    </AuthPanel>
  );
}

// ─── Register — Step 2 ────────────────────────────────────────
function RegisterStep2({ onBack, onSubmit, data, setData, loading }: {
  onBack: () => void; onSubmit: (e: React.FormEvent) => void;
  data: any; setData: (d: any) => void; loading: boolean;
}) {
  const cfg = useSiteConfig();
  const set = (k: string, v: string) => setData({ ...data, [k]: v });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data.schoolName?.trim())    { toast.error("Nom de l'école requis."); return; }
    if (!data.country?.trim())       { toast.error('Pays requis.'); return; }
    if (!data.city?.trim())          { toast.error('Ville requise.'); return; }
    if (!data.prefecture?.trim())    { toast.error('Préfecture / Commune requise.'); return; }
    if (!data.levels?.length)        { toast.error('Sélectionnez au moins un cycle scolaire.'); return; }
    if (!data.directorName?.trim())  { toast.error('Nom du responsable requis.'); return; }
    if (!data.directorPhone?.trim()) { toast.error('Téléphone du responsable requis.'); return; }
    onSubmit(e);
  };

  return (
    <div className="lp-root min-h-screen" style={{ ...themeVars(cfg), background: 'var(--lp-bg-light)' }}>
      {/* Barre du haut */}
      <div className="lp-header is-scrolled">
        <div className="lp-container flex items-center gap-4 py-3">
          <button onClick={onBack} className="au-back au-back-dark"><ArrowLeft size={16} /> Retour</button>
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <span className="lp-sub" style={{ fontSize: 14, marginBottom: 0 }}>Étape 2 / 2</span>
            <span className="text-sm hidden sm:block truncate">Informations de l'établissement & responsable</span>
          </div>
          <div className="hidden md:flex items-center gap-2 w-40">
            <div className="au-progress flex-1" style={{ background: 'var(--lp-accent)' }} />
            <div className="au-progress" style={{ background: 'var(--lp-accent)', flex: 2 }} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <span className="lp-sub" style={{ fontSize: 14 }}>Dernière étape</span>
          <h1 className="lp-title">Parlez-nous de <span>votre école</span></h1>
          <div className="lp-divider" />
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* ── École ── */}
          <div className="au-card p-0 overflow-hidden" style={{ padding: 0 }}>
            <div className="au-section-head">
              <div className="lp-icon lp-icon-sm" style={{ width: 44, height: 44 }}><Building2 size={20} /></div>
              <h2 className="text-xl font-bold">Informations de l'école</h2>
            </div>
            <div className="p-6 sm:p-7 flex flex-col gap-5">
              <div>
                <label className="au-label">Nom de l'établissement *</label>
                <input className="lp-input" value={data.schoolName || ''} onChange={e => set('schoolName', e.target.value)} placeholder="École Excellence 224" />
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="au-label">Pays *</label>
                  <input className="lp-input" value={data.country || ''} onChange={e => set('country', e.target.value)} placeholder="Guinée" />
                </div>
                <div>
                  <label className="au-label">Ville *</label>
                  <input className="lp-input" value={data.city || ''} onChange={e => set('city', e.target.value)} placeholder="Conakry" />
                </div>
                <div>
                  <label className="au-label">Préfecture / Commune *</label>
                  <input className="lp-input" value={data.prefecture || ''} onChange={e => set('prefecture', e.target.value)} placeholder="RATOMA" />
                </div>
                <div>
                  <label className="au-label">Sous-préfecture <small>(optionnel)</small></label>
                  <input className="lp-input" value={data.sousPrefecture || ''} onChange={e => set('sousPrefecture', e.target.value)} placeholder="YATTAYA" />
                </div>
              </div>
              <div>
                <label className="au-label">Cycles scolaires * <small>(un ou plusieurs)</small></label>
                <div className="grid grid-cols-2 gap-3">
                  {(['Maternelle', 'Primaire', 'Collège', 'Lycée'] as const).map(lvl => {
                    const checked = (data.levels || []).includes(lvl);
                    return (
                      <div key={lvl} role="checkbox" aria-checked={checked} tabIndex={0}
                        className={`au-option ${checked ? 'is-on' : ''}`}
                        onClick={() => {
                          const cur = data.levels || [];
                          setData({ ...data, levels: checked ? cur.filter((l: string) => l !== lvl) : [...cur, lvl] });
                        }}>
                        <span className={`au-check ${checked ? 'is-on' : ''}`}>{checked && <Check size={14} strokeWidth={3} />}</span>
                        {lvl}
                      </div>
                    );
                  })}
                </div>
              </div>
              <FileUpload label="Logo de l'école" value={data.logoUrl || ''} onChange={v => setData({ ...data, logoUrl: v })}
                accept="image/png,image/jpeg,image/svg+xml,image/webp" types={['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']}
                maxBytes={LOGO_MAX_BYTES} hint="PNG, JPG, SVG — 500 Ko maximum" />
              <FileUpload label="Document RCCM" optional value={data.rccmFile?.dataUrl || ''}
                onChange={(v, name) => setData({ ...data, rccmFile: v ? { dataUrl: v, name } : null })}
                accept="application/pdf,image/jpeg,image/png" types={['application/pdf', 'image/jpeg', 'image/png']}
                maxBytes={RCCM_MAX_BYTES} hint="PDF, JPG ou PNG — 2,5 Mo maximum · conservé de façon confidentielle" />
            </div>
          </div>

          {/* ── Responsable ── */}
          <div className="au-card overflow-hidden" style={{ padding: 0 }}>
            <div className="au-section-head">
              <div className="lp-icon lp-icon-sm" style={{ width: 44, height: 44, background: 'var(--lp-accent)', color: '#fff' }}><User size={20} /></div>
              <h2 className="text-xl font-bold">Informations du responsable</h2>
            </div>
            <div className="p-6 sm:p-7 grid sm:grid-cols-2 gap-5">
              <div>
                <label className="au-label">Nom complet *</label>
                <div className="au-field">
                  <User size={17} />
                  <input className="lp-input" value={data.directorName || ''} onChange={e => set('directorName', e.target.value)} placeholder="M. Diallo Mamadou" />
                </div>
              </div>
              <div>
                <label className="au-label">Titre / Fonction *</label>
                <select className="lp-input" value={data.directorTitle || ''} onChange={e => set('directorTitle', e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {['Directeur général', 'Directrice générale', 'Proviseur', 'Proviseure', 'Gérant', 'Administrateur'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="au-label">Téléphone *</label>
                <div className="au-field">
                  <Phone size={17} />
                  <input type="tel" className="lp-input" value={data.directorPhone || ''} onChange={e => set('directorPhone', e.target.value)} placeholder="+224 620 00 00 00" />
                </div>
              </div>
              <div>
                <label className="au-label">Email du responsable</label>
                <div className="au-field">
                  <Mail size={17} />
                  <input type="email" className="lp-input" value={data.directorEmail || ''} onChange={e => set('directorEmail', e.target.value)} placeholder={data.email || 'email@ecole.com'} />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="lp-btn lp-btn-block" style={{ padding: '17px 30px' }}>
            {loading
              ? <><Spinner /> Envoi en cours…</>
              : <><Send size={18} /> Soumettre ma demande d'inscription</>}
          </button>
          <p className="text-center text-sm m-0">Votre demande sera examinée sous 24–48 h.</p>
        </form>
      </div>
    </div>
  );
}

// ─── Success ──────────────────────────────────────────────────
function RegisterSuccess({ schoolName, onBack }: { schoolName: string; onBack: () => void }) {
  const cfg = useSiteConfig();
  return (
    <div className="lp-root min-h-screen flex items-center justify-center p-5" style={{ ...themeVars(cfg), background: 'var(--lp-bg-light)' }}>
      <div className="au-card max-w-md w-full text-center">
        <div className="lp-icon mx-auto mb-6" style={{ width: 80, height: 80 }}><CheckCircle size={38} /></div>
        <h1 className="text-3xl font-bold mb-3">Demande envoyée !</h1>
        <p className="mb-2">
          Votre dossier pour <span className="font-bold" style={{ color: 'var(--lp-dark)' }}>« {schoolName} »</span> a été reçu.
        </p>
        <p className="mb-8">
          Notre équipe vous contactera par email sous <strong style={{ color: 'var(--lp-dark)' }}>24–48 h</strong> pour l'activation.
        </p>
        <button onClick={onBack} className="lp-btn">Retour à l'accueil</button>
      </div>
    </div>
  );
}

// data URL → { name, type, data } attendu par le backend (base64 sans préfixe)
function toDocumentPayload(file: { dataUrl: string; name: string } | null) {
  if (!file) return undefined;
  const m = file.dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  return m ? { name: file.name, type: m[1], data: m[2] } : undefined;
}

// ─── Main Auth component ──────────────────────────────────────
export const Auth: React.FC<AuthProps> = ({ onBack, onSuccess }) => {
  const [view, setView]       = useState<'login' | 'register-1' | 'register-2' | 'otp' | 'success'>('login');
  const [loading, setLoading] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');

  const [regData, setRegData] = useState({
    email: '', password: '', confirmPassword: '', terms: false,
    schoolName: '', country: '', city: '', prefecture: '', sousPrefecture: '',
    district: '', levels: [] as string[], logoUrl: '', rccm: '',
    rccmFile: null as { dataUrl: string; name: string } | null,
    directorName: '', directorTitle: '', directorPhone: '', directorEmail: '',
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const res = await apiClient.post('/user/register', {
        schoolName:     regData.schoolName,
        email:          regData.email,
        password:       regData.password,
        country:        regData.country,
        city:           regData.city,
        levels:         regData.levels,
        prefecture:     regData.prefecture,
        sousPrefecture: regData.sousPrefecture,
        directorName:   regData.directorName,
        rccm:           regData.rccm,
        rccmFile:       toDocumentPayload(regData.rccmFile),
        logoUrl:        regData.logoUrl,
      });
      if (res.data?.step === 'otp') {
        setOtpEmail(res.data.email || regData.email);
        if (res.data.warning) toast.warning(res.data.warning);
        else toast.success('Code de confirmation envoyé sur votre email.');
        setView('otp');
      } else {
        setView('success');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Erreur lors de l'inscription");
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    await apiClient.post('/user/resend-otp', { email: otpEmail });
  };

  if (view === 'login')      return <LoginForm onBack={onBack} onSuccess={onSuccess} onRegister={() => setView('register-1')} />;
  if (view === 'register-1') return <RegisterStep1 onBack={onBack} onNext={() => setView('register-2')} onLogin={() => setView('login')} data={regData} setData={setRegData} />;
  if (view === 'register-2') return <RegisterStep2 onBack={() => setView('register-1')} onSubmit={handleRegisterSubmit} data={regData} setData={setRegData} loading={loading} />;
  if (view === 'otp')        return <OTPStep email={otpEmail} onBack={() => setView('register-2')} onSuccess={() => setView('success')} onResend={handleResendOtp} />;
  return <RegisterSuccess schoolName={regData.schoolName} onBack={onBack} />;
};
