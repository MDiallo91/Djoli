import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Mail, Lock, Eye, EyeOff, ArrowLeft, ArrowRight,
  Upload, FileText, CheckCircle, User, Phone,
  Building2, X, ShieldCheck, RefreshCw, WifiOff,
} from 'lucide-react';
import apiClient from '../lib/apiClient';
import DocumentUpload from './ui/DocumentUpload';

interface AuthProps {
  onBack: () => void;
  onSuccess: (data: any) => void;
}

// ─── Design tokens — alignés sur LandingPage.tsx ────────────────
const NAVY = '#14213D';
const GOLD = '#C9992F';
const CREAM = '#FAF6EF';

const inputCls = 'dj-input';
const labelCls = 'block text-xs font-semibold mb-1.5 uppercase tracking-wider dj-sans';

// ─── Styles globaux partagés avec la landing page ───────────────
function DjStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,500;0,600;1,500;1,600&family=Work+Sans:wght@400;500;600;700&display=swap');

      :root { --navy: ${NAVY}; --gold: ${GOLD}; --bg: ${CREAM}; --bdr: rgba(20,33,61,.16); }

      .dj-serif { font-family: 'Source Serif 4', Georgia, serif; }
      .dj-sans  { font-family: 'Work Sans', system-ui, sans-serif; }

      .dj-btn-navy {
        display: inline-flex; align-items: center; justify-content: center; gap: 10px;
        background: var(--navy); color: ${CREAM};
        font-family: 'Work Sans', sans-serif; font-weight: 700; font-size: 12px;
        letter-spacing: .08em; text-transform: uppercase;
        padding: 16px 32px; border: none; cursor: pointer; text-decoration: none;
        transition: background .25s, transform .25s, box-shadow .25s;
      }
      .dj-btn-navy:hover:not(:disabled) { background: var(--gold); color: var(--navy); transform: translateY(-2px); box-shadow: 0 14px 28px rgba(201,153,47,.35); }
      .dj-btn-navy:disabled { opacity: .5; cursor: not-allowed; }

      .dj-btn-ghost {
        background: none; border: none; cursor: pointer; text-decoration: none;
        font-family: 'Work Sans', sans-serif; font-weight: 600; font-size: 13px;
        color: var(--navy); border-bottom: 1px solid var(--navy); padding-bottom: 3px;
        transition: color .2s, border-color .2s;
      }
      .dj-btn-ghost:hover { color: var(--gold); border-color: var(--gold); }
      .dj-btn-ghost-light { color: ${CREAM}; border-color: rgba(250,246,239,.5); }
      .dj-btn-ghost-light:hover { color: var(--gold); border-color: var(--gold); }

      .dj-section-no {
        font-family: 'Work Sans', sans-serif; font-weight: 600; font-size: 12px;
        letter-spacing: .16em; text-transform: uppercase; color: var(--gold);
      }

      .dj-input {
        width: 100%; border: 1px solid var(--bdr); border-radius: 0;
        padding: 13px 16px; font-family: 'Work Sans', sans-serif; font-size: 14px;
        color: var(--navy); background: #fff; outline: none;
        transition: border-color .2s;
      }
      .dj-input:focus { border-color: var(--gold); }
      .dj-input::placeholder { color: #B4A995; }

      .dj-orb {
        position: absolute; border-radius: 50%; pointer-events: none;
        background: radial-gradient(circle, rgba(201,153,47,.22) 0%, rgba(201,153,47,0) 70%);
      }
    `}</style>
  );
}

// ─── Panneau gauche partagé ────────────────────────────────────
function AuthPanel({ onBack, step, totalSteps, children }: {
  onBack: () => void;
  step?: number;
  totalSteps?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex dj-sans" style={{ background: CREAM }}>
      <DjStyles />

      {/* ── Colonne gauche ── */}
      <div className="hidden lg:flex lg:w-[44%] flex-col relative overflow-hidden" style={{ background: NAVY }}>
        <div className="dj-orb" style={{ top: -100, left: -100, width: 420, height: 420 }} />
        <div className="dj-orb" style={{ bottom: -80, right: -80, width: 320, height: 320 }} />

        <div className="relative flex flex-col h-full p-10">
          {/* Top */}
          <button onClick={onBack} className="dj-btn-ghost dj-btn-ghost-light flex items-center gap-2 w-fit border-none pb-0">
            <ArrowLeft size={15} /> Retour au site
          </button>

          {/* Centre */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="dj-serif font-semibold text-xl mb-10" style={{ color: CREAM }}>DJOLI</div>

            <h2 className="dj-serif font-semibold leading-tight mb-4" style={{ fontSize: 38, color: CREAM }}>
              La gestion scolaire<br />
              <em style={{ fontStyle: 'italic', color: GOLD }}>réinventée.</em>
            </h2>
            <p className="text-sm leading-relaxed mb-10 max-w-xs" style={{ color: 'rgba(250,246,239,.55)' }}>
              Pilotez élèves, notes, paiements et personnels depuis une seule plateforme — en ligne ou hors ligne.
            </p>

            {/* Feature pills */}
            <div className="space-y-3.5">
              {[
                { Icon: RefreshCw, text: 'Synchronisation cloud automatique' },
                { Icon: WifiOff,   text: 'Mode hors-ligne complet' },
                { Icon: ShieldCheck, text: 'Données sécurisées & chiffrées' },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-3">
                  <span className="w-7 h-7 flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(201,153,47,.15)' }}>
                    <f.Icon size={14} style={{ color: GOLD }} />
                  </span>
                  <span className="text-sm" style={{ color: 'rgba(250,246,239,.7)' }}>{f.text}</span>
                </div>
              ))}
            </div>

            {/* Progress steps */}
            {step !== undefined && totalSteps !== undefined && (
              <div className="flex items-center gap-2 mt-10">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className="h-[3px] transition-all"
                    style={{ background: i < step ? GOLD : 'rgba(250,246,239,.2)', flex: i === step - 1 ? 2 : 1 }} />
                ))}
              </div>
            )}
          </div>

          <p className="text-xs" style={{ color: 'rgba(250,246,239,.3)' }}>© 2026 DJOLI — Tous droits réservés</p>
        </div>
      </div>

      {/* ── Colonne droite ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">
          <button onClick={onBack} className="lg:hidden dj-btn-ghost flex items-center gap-2 mb-8 border-none pb-0" style={{ color: '#8A7F70' }}>
            <ArrowLeft size={15} /> Retour
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── File uploader helper ─────────────────────────────────────
function FileUpload({ label, value, onChange, accept, hint }: {
  label: string; value: string; onChange: (v: string, name: string) => void; accept: string; hint?: string;
}) {
  const [fileName, setFileName] = useState('');
  return (
    <div>
      <label className={labelCls} style={{ color: '#8A7F70' }}>{label}</label>
      {value ? (
        <div className="flex items-center gap-3 px-4 py-3" style={{ border: `1px solid ${GOLD}`, background: 'rgba(201,153,47,.08)' }}>
          {value.startsWith('data:image') ? (
            <img src={value} alt="" className="w-10 h-10 object-contain" style={{ border: `1px solid ${GOLD}` }} />
          ) : (
            <div className="w-10 h-10 flex items-center justify-center" style={{ background: 'rgba(201,153,47,.15)' }}><FileText size={18} style={{ color: GOLD }} /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate dj-sans" style={{ color: NAVY }}>{fileName || 'Fichier chargé'}</p>
            <p className="text-xs dj-sans" style={{ color: '#8A7F70' }}>Cliquez pour remplacer</p>
          </div>
          <label className="cursor-pointer p-1" style={{ color: GOLD }}>
            <Upload size={15} />
            <input type="file" accept={accept} className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              setFileName(f.name);
              const r = new FileReader();
              r.onloadend = () => onChange(r.result as string, f.name);
              r.readAsDataURL(f);
            }} />
          </label>
          <button type="button" onClick={() => { onChange('', ''); setFileName(''); }} className="p-1" style={{ color: '#B4A995' }}><X size={14} /></button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center p-5 cursor-pointer transition-all group" style={{ border: `1px dashed var(--bdr)` }}>
          <Upload size={20} className="mb-2 transition-colors" style={{ color: '#B4A995' }} />
          <p className="text-sm font-medium dj-sans" style={{ color: '#8A7F70' }}>Cliquez pour uploader</p>
          {hint && <p className="text-xs mt-1 dj-sans" style={{ color: '#B4A995' }}>{hint}</p>}
          <input type="file" accept={accept} className="hidden" onChange={e => {
            const f = e.target.files?.[0]; if (!f) return;
            setFileName(f.name);
            const r = new FileReader();
            r.onloadend = () => onChange(r.result as string, f.name);
            r.readAsDataURL(f);
          }} />
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
        <div className="w-14 h-14 flex items-center justify-center mx-auto mb-5" style={{ background: 'rgba(201,153,47,.12)', border: `1px solid rgba(201,153,47,.3)` }}>
          <ShieldCheck size={26} style={{ color: GOLD }} />
        </div>
        <h1 className="dj-serif font-semibold text-2xl mb-2" style={{ color: NAVY }}>Vérification email</h1>
        <p className="text-sm dj-sans" style={{ color: '#8A7F70' }}>Code envoyé à <span className="font-semibold" style={{ color: NAVY }}>{email}</span></p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-2.5 justify-center">
          {otp.map((d, i) => (
            <input key={i} ref={el => { inputsRef.current[i] = el; }}
              type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              className="w-12 h-14 text-center text-2xl font-bold outline-none transition-all dj-sans"
              style={{ border: '1px solid var(--bdr)', color: NAVY, background: '#fff' }} />
          ))}
        </div>
        <button type="submit" disabled={loading || otp.join('').length < 6} className="w-full dj-btn-navy">
          {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Vérification…</> : 'Confirmer mon email'}
        </button>
      </form>
      <p className="text-center text-xs mt-5 dj-sans" style={{ color: '#B4A995' }}>
        Code valable 10 minutes.{' '}
        <button onClick={handleResend} className="font-semibold" style={{ color: GOLD }}>Renvoyer</button>
      </p>
    </AuthPanel>
  );
}

// ─── Login form ────────────────────────────────────────────────
function LoginForm({ onBack, onSuccess, onRegister }: AuthProps & { onRegister: () => void }) {
  const [form, setForm]       = useState({ email: '', password: '' });
  const [show, setShow]       = useState(false);
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
      <div className="mb-8">
        <span className="dj-section-no block mb-2">Espace établissement</span>
        <h1 className="dj-serif font-semibold text-2xl" style={{ color: NAVY }}>Connexion</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} style={{ color: '#8A7F70' }}>Adresse email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }} />
            <input required type="email" autoComplete="email" placeholder="contact@ecole.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className={inputCls} style={{ paddingLeft: 40 }} />
          </div>
        </div>
        <div>
          <label className={labelCls} style={{ color: '#8A7F70' }}>Mot de passe</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }} />
            <input required type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className={inputCls} style={{ paddingLeft: 40, paddingRight: 40 }} />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full dj-btn-navy mt-2">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connexion…</>
            : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-sm mt-6 dj-sans" style={{ color: '#8A7F70' }}>
        Pas encore de compte ?{' '}
        <button onClick={onRegister} className="font-semibold" style={{ color: GOLD }}>Créer un compte école</button>
      </p>
    </AuthPanel>
  );
}

// ─── Register — Step 1 ────────────────────────────────────────
function RegisterStep1({ onBack, onNext, onLogin, data, setData }: {
  onBack: () => void; onNext: () => void; onLogin: () => void;
  data: any; setData: (d: any) => void;
}) {
  const [show, setShow]   = useState(false);
  const [show2, setShow2] = useState(false);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.password !== data.confirmPassword) { toast.error('Les mots de passe ne correspondent pas.'); return; }
    if (data.password.length < 8) { toast.error('Minimum 8 caractères.'); return; }
    if (!data.terms) { toast.error("Acceptez les conditions d'utilisation."); return; }
    onNext();
  };

  return (
    <AuthPanel onBack={onBack} step={1} totalSteps={2}>
      <span className="dj-section-no block mb-2">Étape 1 / 2</span>
      <h1 className="dj-serif font-semibold text-2xl mb-1" style={{ color: NAVY }}>Créer un compte</h1>
      <p className="text-sm mb-7 dj-sans" style={{ color: '#8A7F70' }}>Vos identifiants de connexion.</p>

      <form onSubmit={handleNext} className="space-y-4">
        <div>
          <label className={labelCls} style={{ color: '#8A7F70' }}>Email de connexion *</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }} />
            <input required type="email" placeholder="contact@ecole.com" value={data.email}
              onChange={e => setData({ ...data, email: e.target.value })} className={inputCls} style={{ paddingLeft: 40 }} />
          </div>
        </div>
        <div>
          <label className={labelCls} style={{ color: '#8A7F70' }}>Mot de passe *</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }} />
            <input required type={show ? 'text' : 'password'} placeholder="Minimum 8 caractères" value={data.password}
              onChange={e => setData({ ...data, password: e.target.value })} className={inputCls} style={{ paddingLeft: 40, paddingRight: 40 }} />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }}>
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label className={labelCls} style={{ color: '#8A7F70' }}>Confirmer le mot de passe *</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }} />
            <input required type={show2 ? 'text' : 'password'} placeholder="Répétez le mot de passe" value={data.confirmPassword}
              onChange={e => setData({ ...data, confirmPassword: e.target.value })} className={inputCls} style={{ paddingLeft: 40, paddingRight: 40 }} />
            <button type="button" onClick={() => setShow2(!show2)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }}>
              {show2 ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer group pt-1">
          <div
            className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
            style={{ background: data.terms ? NAVY : '#fff', border: `2px solid ${data.terms ? NAVY : 'var(--bdr)'}` }}
            onClick={() => setData({ ...data, terms: !data.terms })}>
            {data.terms && <CheckCircle size={11} style={{ color: CREAM }} />}
          </div>
          <span className="text-sm leading-relaxed dj-sans" style={{ color: '#8A7F70' }}>
            J'accepte les{' '}
            <a href="#" className="font-semibold" style={{ color: GOLD }}>Conditions d'utilisation</a>{' '}
            et la{' '}
            <a href="#" className="font-semibold" style={{ color: GOLD }}>Politique de confidentialité</a>
          </span>
        </label>

        <button type="submit" className="w-full dj-btn-navy">
          Continuer <ArrowRight size={15} />
        </button>
      </form>

      <p className="text-center text-sm mt-6 dj-sans" style={{ color: '#8A7F70' }}>
        Déjà un compte ?{' '}
        <button onClick={onLogin} className="font-semibold" style={{ color: GOLD }}>Se connecter</button>
      </p>
    </AuthPanel>
  );
}

// ─── Register — Step 2 ────────────────────────────────────────
function RegisterStep2({ onBack, onSubmit, data, setData, loading }: {
  onBack: () => void; onSubmit: (e: React.FormEvent) => void;
  data: any; setData: (d: any) => void; loading: boolean;
}) {
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
    <div className="min-h-screen dj-sans" style={{ background: CREAM }}>
      <DjStyles />

      {/* Topbar sticky */}
      <div className="sticky top-0 z-10 px-6 py-3.5 flex items-center gap-4" style={{ background: '#fff', borderBottom: '1px solid var(--bdr)' }}>
        <button onClick={onBack} className="dj-btn-ghost flex items-center gap-2 border-none pb-0" style={{ color: '#8A7F70' }}>
          <ArrowLeft size={15} /> Retour
        </button>
        <div className="flex-1 flex items-center gap-3">
          <span className="dj-section-no">Étape 2 / 2</span>
          <span className="text-sm hidden sm:block" style={{ color: '#B4A995' }}>Informations de l'établissement & responsable</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} />
          <div className="w-12 h-[3px]" style={{ background: GOLD }} />
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: GOLD }} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── École ── */}
          <div style={{ background: '#fff', border: '1px solid var(--bdr)' }}>
            <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--bdr)', background: 'rgba(20,33,61,.02)' }}>
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: NAVY }}>
                <Building2 size={14} style={{ color: CREAM }} />
              </div>
              <h2 className="text-sm font-semibold dj-sans" style={{ color: NAVY }}>Informations de l'école</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls} style={{ color: '#8A7F70' }}>Nom de l'établissement *</label>
                <input className={inputCls} value={data.schoolName || ''} onChange={e => set('schoolName', e.target.value)} placeholder="École Excellence 224" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={{ color: '#8A7F70' }}>Pays *</label>
                  <input className={inputCls} value={data.country || ''} onChange={e => set('country', e.target.value)} placeholder="Guinée" />
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#8A7F70' }}>Ville *</label>
                  <input className={inputCls} value={data.city || ''} onChange={e => set('city', e.target.value)} placeholder="Conakry" />
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#8A7F70' }}>Préfecture / Commune *</label>
                  <input className={inputCls} value={data.prefecture || ''} onChange={e => set('prefecture', e.target.value)} placeholder="RATOMA" />
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#8A7F70' }}>Sous-préfecture <span className="normal-case font-normal" style={{ color: '#B4A995' }}>(optionnel)</span></label>
                  <input className={inputCls} value={data.sousPrefecture || ''} onChange={e => set('sousPrefecture', e.target.value)} placeholder="YATTAYA" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls} style={{ color: '#8A7F70' }}>Cycles scolaires * <span className="normal-case font-normal" style={{ color: '#B4A995' }}>(un ou plusieurs)</span></label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {(['Maternelle', 'Primaire', 'Collège', 'Lycée'] as const).map(lvl => {
                      const checked = (data.levels || []).includes(lvl);
                      return (
                        <label key={lvl}
                          className="flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-all"
                          style={{ border: `1px solid ${checked ? NAVY : 'var(--bdr)'}`, background: checked ? 'rgba(20,33,61,.04)' : 'transparent', color: checked ? NAVY : '#6B6258' }}
                          onClick={() => {
                            const cur = data.levels || [];
                            setData({ ...data, levels: checked ? cur.filter((l: string) => l !== lvl) : [...cur, lvl] });
                          }}>
                          <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 transition-all" style={{ background: checked ? NAVY : '#fff', border: `2px solid ${checked ? NAVY : 'var(--bdr)'}` }}>
                            {checked && <CheckCircle size={10} style={{ color: CREAM }} />}
                          </div>
                          <span className="text-sm font-medium dj-sans">{lvl}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <FileUpload label="Logo de l'école" value={data.logoUrl || ''} onChange={v => setData({ ...data, logoUrl: v })} accept="image/*" hint="PNG, JPG, SVG — max 5 Mo" />
              <DocumentUpload label="Document RCCM" value={data.rccmUrl || ''} onChange={v => setData({ ...data, rccmUrl: v })} hint="PDF ou image — max 10 Mo" optional />
            </div>
          </div>

          {/* ── Responsable ── */}
          <div style={{ background: '#fff', border: '1px solid var(--bdr)' }}>
            <div className="flex items-center gap-3 px-6 py-4" style={{ borderBottom: '1px solid var(--bdr)', background: 'rgba(20,33,61,.02)' }}>
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: GOLD }}>
                <User size={14} style={{ color: NAVY }} />
              </div>
              <h2 className="text-sm font-semibold dj-sans" style={{ color: NAVY }}>Informations du responsable</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} style={{ color: '#8A7F70' }}>Nom complet *</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }} />
                    <input className={inputCls} style={{ paddingLeft: 40 }} value={data.directorName || ''} onChange={e => set('directorName', e.target.value)} placeholder="M. Diallo Mamadou" />
                  </div>
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#8A7F70' }}>Titre / Fonction *</label>
                  <select className={inputCls} value={data.directorTitle || ''} onChange={e => set('directorTitle', e.target.value)}>
                    <option value="">Sélectionner…</option>
                    {['Directeur général', 'Directrice générale', 'Proviseur', 'Proviseure', 'Gérant', 'Administrateur'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#8A7F70' }}>Téléphone *</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }} />
                    <input type="tel" className={inputCls} style={{ paddingLeft: 40 }} value={data.directorPhone || ''} onChange={e => set('directorPhone', e.target.value)} placeholder="+224 620 00 00 00" />
                  </div>
                </div>
                <div>
                  <label className={labelCls} style={{ color: '#8A7F70' }}>Email du responsable</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#B4A995' }} />
                    <input type="email" className={inputCls} style={{ paddingLeft: 40 }} value={data.directorEmail || ''} onChange={e => set('directorEmail', e.target.value)} placeholder={data.email || 'email@ecole.com'} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full dj-btn-navy" style={{ padding: '18px 32px' }}>
            {loading
              ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi en cours…</>
              : <><CheckCircle size={17} /> Soumettre ma demande d'inscription</>}
          </button>
          <p className="text-center text-xs dj-sans" style={{ color: '#B4A995' }}>Votre demande sera examinée sous 24–48h.</p>
        </form>
      </div>
    </div>
  );
}

// ─── Success ──────────────────────────────────────────────────
function RegisterSuccess({ schoolName, onBack }: { schoolName: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 dj-sans" style={{ background: CREAM }}>
      <DjStyles />
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(201,153,47,.12)', border: `1px solid rgba(201,153,47,.3)` }}>
          <CheckCircle size={30} style={{ color: GOLD }} />
        </div>
        <h1 className="dj-serif font-semibold text-2xl mb-3" style={{ color: NAVY }}>Demande envoyée !</h1>
        <p className="text-sm leading-relaxed mb-2" style={{ color: '#6B6258' }}>
          Votre dossier pour <span className="font-semibold" style={{ color: NAVY }}>"{schoolName}"</span> a été reçu.
        </p>
        <p className="text-sm mb-8" style={{ color: '#8A7F70' }}>
          Notre équipe vous contactera par email sous <strong>24–48h</strong> pour l'activation.
        </p>
        <button onClick={onBack} className="dj-btn-navy" style={{ padding: '14px 32px' }}>
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}

// ─── Main Auth component ──────────────────────────────────────
export const Auth: React.FC<AuthProps> = ({ onBack, onSuccess }) => {
  const [view, setView]       = useState<'login' | 'register-1' | 'register-2' | 'otp' | 'success'>('login');
  const [loading, setLoading] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');

  const [regData, setRegData] = useState({
    email: '', password: '', confirmPassword: '', terms: false,
    schoolName: '', country: '', city: '', prefecture: '', sousPrefecture: '',
    district: '', levels: [] as string[], logoUrl: '', rccm: '', rccmUrl: '',
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
        rccmUrl:        regData.rccmUrl,
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
