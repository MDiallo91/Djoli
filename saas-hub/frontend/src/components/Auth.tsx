import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Mail, Lock, Eye, EyeOff, BookOpen, ArrowLeft, ArrowRight,
  Upload, FileText, CheckCircle, User, Phone,
  Building2, X, ShieldCheck,
} from 'lucide-react';
import apiClient from '../lib/apiClient';
import DocumentUpload from './ui/DocumentUpload';

interface AuthProps {
  onBack: () => void;
  onSuccess: (data: any) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all bg-white placeholder:text-slate-400';
const labelCls = 'block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wider';

// ─── Panneau gauche partagé ────────────────────────────────────
function AuthPanel({ onBack, step, totalSteps, children }: {
  onBack: () => void;
  step?: number;
  totalSteps?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* ── Colonne gauche ── */}
      <div
        className="hidden lg:flex lg:w-[44%] flex-col relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, var(--primary-900) 0%, var(--primary-800) 60%, var(--primary-700) 100%)' }}
      >
        {/* Cercles décoratifs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, var(--primary-400), transparent 70%)' }} />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-10 translate-x-1/3 translate-y-1/3"
          style={{ background: 'radial-gradient(circle, var(--primary-300), transparent 70%)' }} />
        <div className="absolute top-1/2 -right-12 w-48 h-48 rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, white, transparent 70%)' }} />

        {/* Contenu */}
        <div className="relative flex flex-col h-full p-10">
          {/* Top */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/50 hover:text-white text-sm font-medium transition-colors w-fit"
          >
            <ArrowLeft size={15} /> Retour au site
          </button>

          {/* Centre */}
          <div className="flex-1 flex flex-col justify-center">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
                <BookOpen size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg tracking-tight">DJOLI</span>
            </div>

            <h2 className="text-4xl font-bold text-white leading-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              La gestion scolaire<br />
              <span className="text-white/60">réinventée.</span>
            </h2>
            <p className="text-white/50 text-sm leading-relaxed mb-10 max-w-xs">
              Pilotez élèves, notes, paiements et personnels depuis une seule plateforme — en ligne ou hors ligne.
            </p>

            {/* Feature pills */}
            <div className="space-y-3">
              {[
                { icon: '🔄', text: 'Synchronisation cloud automatique' },
                { icon: '📶', text: 'Mode hors-ligne complet' },
                { icon: '🔒', text: 'Données sécurisées & chiffrées' },
              ].map(f => (
                <div key={f.text} className="flex items-center gap-3">
                  <span className="text-base">{f.icon}</span>
                  <span className="text-white/65 text-sm">{f.text}</span>
                </div>
              ))}
            </div>

            {/* Progress steps */}
            {step !== undefined && totalSteps !== undefined && (
              <div className="flex items-center gap-2 mt-10">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all ${i < step ? 'flex-1 bg-white' : i === step - 1 ? 'flex-[2] bg-white' : 'flex-1 bg-white/20'}`} />
                ))}
              </div>
            )}
          </div>

          {/* Bottom */}
          <p className="text-white/25 text-xs">© 2026 DJOLI — Tous droits réservés</p>
        </div>
      </div>

      {/* ── Colonne droite ── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-6 lg:p-10">
        <div className="w-full max-w-md">
          {/* Mobile: bouton retour */}
          <button
            onClick={onBack}
            className="lg:hidden flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm font-medium mb-8 transition-colors"
          >
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
      <label className={labelCls}>{label}</label>
      {value ? (
        <div className="flex items-center gap-3 border border-secondary-200 bg-secondary-50 rounded-xl px-4 py-3">
          {value.startsWith('data:image') ? (
            <img src={value} alt="" className="w-10 h-10 object-contain rounded-lg border border-secondary-200" />
          ) : (
            <div className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center"><FileText size={18} className="text-secondary-600" /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-secondary-800 truncate">{fileName || 'Fichier chargé'}</p>
            <p className="text-xs text-secondary-600">Cliquez pour remplacer</p>
          </div>
          <label className="cursor-pointer p-1 text-secondary-500 hover:text-secondary-700">
            <Upload size={15} />
            <input type="file" accept={accept} className="hidden" onChange={e => {
              const f = e.target.files?.[0]; if (!f) return;
              setFileName(f.name);
              const r = new FileReader();
              r.onloadend = () => onChange(r.result as string, f.name);
              r.readAsDataURL(f);
            }} />
          </label>
          <button type="button" onClick={() => { onChange('', ''); setFileName(''); }} className="p-1 text-slate-400 hover:text-red-500"><X size={14} /></button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-all group">
          <Upload size={20} className="text-slate-400 group-hover:text-primary-500 mb-2 transition-colors" />
          <p className="text-sm font-medium text-slate-500 group-hover:text-primary-600 transition-colors">Cliquez pour uploader</p>
          {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
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
        <div className="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-primary-100">
          <ShieldCheck size={26} className="text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Vérification email</h1>
        <p className="text-slate-500 text-sm">Code envoyé à <span className="font-semibold text-slate-700">{email}</span></p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-2.5 justify-center">
          {otp.map((d, i) => (
            <input key={i} ref={el => { inputsRef.current[i] = el; }}
              type="text" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-slate-200 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all bg-white" />
          ))}
        </div>
        <button type="submit" disabled={loading || otp.join('').length < 6}
          className="w-full py-3.5 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))' }}>
          {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Vérification…</> : 'Confirmer mon email'}
        </button>
      </form>
      <p className="text-center text-xs text-slate-400 mt-5">
        Code valable 10 minutes.{' '}
        <button onClick={handleResend} className="text-primary-600 hover:underline font-semibold">Renvoyer</button>
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
        <h1 className="text-2xl font-bold text-slate-900 mb-1.5">Connexion</h1>
        <p className="text-slate-500 text-sm">Accédez à votre espace établissement.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Adresse email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input required type="email" autoComplete="email" placeholder="contact@ecole.com"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              className={inputCls + ' pl-10'} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Mot de passe</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input required type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              className={inputCls + ' pl-10 pr-10'} />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-3.5 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))', boxShadow: '0 4px 14px rgba(var(--primary-600-rgb),0.35)' }}>
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Connexion…</>
            : 'Se connecter'}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Pas encore de compte ?{' '}
        <button onClick={onRegister} className="text-primary-600 hover:underline font-semibold">Créer un compte école</button>
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
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">Étape 1 / 2</span>
      </div>
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Créer un compte</h1>
      <p className="text-slate-500 text-sm mb-7">Vos identifiants de connexion.</p>

      <form onSubmit={handleNext} className="space-y-4">
        <div>
          <label className={labelCls}>Email de connexion *</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input required type="email" placeholder="contact@ecole.com" value={data.email}
              onChange={e => setData({ ...data, email: e.target.value })} className={inputCls + ' pl-10'} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Mot de passe *</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input required type={show ? 'text' : 'password'} placeholder="Minimum 8 caractères" value={data.password}
              onChange={e => setData({ ...data, password: e.target.value })} className={inputCls + ' pl-10 pr-10'} />
            <button type="button" onClick={() => setShow(!show)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>
        <div>
          <label className={labelCls}>Confirmer le mot de passe *</label>
          <div className="relative">
            <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input required type={show2 ? 'text' : 'password'} placeholder="Répétez le mot de passe" value={data.confirmPassword}
              onChange={e => setData({ ...data, confirmPassword: e.target.value })} className={inputCls + ' pl-10 pr-10'} />
            <button type="button" onClick={() => setShow2(!show2)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {show2 ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer group pt-1">
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${data.terms ? 'bg-primary-600 border-primary-600' : 'border-slate-300 group-hover:border-primary-400'}`}
            onClick={() => setData({ ...data, terms: !data.terms })}>
            {data.terms && <CheckCircle size={11} className="text-white" />}
          </div>
          <span className="text-sm text-slate-500 leading-relaxed">
            J'accepte les{' '}
            <a href="#" className="text-primary-600 hover:underline font-semibold">Conditions d'utilisation</a>{' '}
            et la{' '}
            <a href="#" className="text-primary-600 hover:underline font-semibold">Politique de confidentialité</a>
          </span>
        </label>

        <button type="submit"
          className="w-full py-3.5 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))', boxShadow: '0 4px 14px rgba(var(--primary-600-rgb),0.35)' }}>
          Continuer <ArrowRight size={15} />
        </button>
      </form>

      <p className="text-center text-sm text-slate-400 mt-6">
        Déjà un compte ?{' '}
        <button onClick={onLogin} className="text-primary-600 hover:underline font-semibold">Se connecter</button>
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
    <div className="min-h-screen bg-slate-50">
      {/* Topbar sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-4 shadow-sm">
        <button onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">
          <ArrowLeft size={15} /> Retour
        </button>
        <div className="flex-1 flex items-center gap-3">
          <span className="text-[11px] font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100">Étape 2 / 2</span>
          <span className="text-sm text-slate-400 hidden sm:block">Informations de l'établissement & responsable</span>
        </div>
        <div className="hidden md:flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary-600" />
          <div className="w-12 h-1 bg-primary-600 rounded-full" />
          <div className="w-2.5 h-2.5 rounded-full bg-primary-600" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── École ── */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center flex-shrink-0">
                <Building2 size={14} className="text-white" />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Informations de l'école</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className={labelCls}>Nom de l'établissement *</label>
                <input className={inputCls} value={data.schoolName || ''} onChange={e => set('schoolName', e.target.value)} placeholder="École Excellence 224" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Pays *</label>
                  <input className={inputCls} value={data.country || ''} onChange={e => set('country', e.target.value)} placeholder="Guinée" />
                </div>
                <div>
                  <label className={labelCls}>Ville *</label>
                  <input className={inputCls} value={data.city || ''} onChange={e => set('city', e.target.value)} placeholder="Conakry" />
                </div>
                <div>
                  <label className={labelCls}>Préfecture / Commune *</label>
                  <input className={inputCls} value={data.prefecture || ''} onChange={e => set('prefecture', e.target.value)} placeholder="RATOMA" />
                </div>
                <div>
                  <label className={labelCls}>Sous-préfecture <span className="normal-case font-normal text-slate-400">(optionnel)</span></label>
                  <input className={inputCls} value={data.sousPrefecture || ''} onChange={e => set('sousPrefecture', e.target.value)} placeholder="YATTAYA" />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Cycles scolaires * <span className="normal-case font-normal text-slate-400">(un ou plusieurs)</span></label>
                  <div className="grid grid-cols-2 gap-2 mt-1.5">
                    {(['Maternelle', 'Primaire', 'Collège', 'Lycée'] as const).map(lvl => {
                      const checked = (data.levels || []).includes(lvl);
                      return (
                        <label key={lvl}
                          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all select-none ${checked ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}
                          onClick={() => {
                            const cur = data.levels || [];
                            setData({ ...data, levels: checked ? cur.filter((l: string) => l !== lvl) : [...cur, lvl] });
                          }}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-primary-600 border-primary-600' : 'border-slate-300'}`}>
                            {checked && <CheckCircle size={10} className="text-white" />}
                          </div>
                          <span className="text-sm font-medium">{lvl}</span>
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
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-white" />
              </div>
              <h2 className="text-sm font-semibold text-slate-800">Informations du responsable</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nom complet *</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={inputCls + ' pl-10'} value={data.directorName || ''} onChange={e => set('directorName', e.target.value)} placeholder="M. Diallo Mamadou" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Titre / Fonction *</label>
                  <select className={inputCls} value={data.directorTitle || ''} onChange={e => set('directorTitle', e.target.value)}>
                    <option value="">Sélectionner…</option>
                    {['Directeur général', 'Directrice générale', 'Proviseur', 'Proviseure', 'Gérant', 'Administrateur'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Téléphone *</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="tel" className={inputCls + ' pl-10'} value={data.directorPhone || ''} onChange={e => set('directorPhone', e.target.value)} placeholder="+224 620 00 00 00" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email du responsable</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" className={inputCls + ' pl-10'} value={data.directorEmail || ''} onChange={e => set('directorEmail', e.target.value)} placeholder={data.email || 'email@ecole.com'} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))', boxShadow: '0 4px 18px rgba(var(--primary-600-rgb),0.35)' }}>
            {loading
              ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi en cours…</>
              : <><CheckCircle size={17} /> Soumettre ma demande d'inscription</>}
          </button>
          <p className="text-center text-xs text-slate-400">Votre demande sera examinée sous 24–48h.</p>
        </form>
      </div>
    </div>
  );
}

// ─── Success ──────────────────────────────────────────────────
function RegisterSuccess({ schoolName, onBack }: { schoolName: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="max-w-sm w-full text-center">
        <div className="w-16 h-16 bg-secondary-100 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-secondary-200">
          <CheckCircle size={30} className="text-secondary-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Demande envoyée !</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-2">
          Votre dossier pour <span className="font-semibold text-slate-700">"{schoolName}"</span> a été reçu.
        </p>
        <p className="text-slate-400 text-sm mb-8">
          Notre équipe vous contactera par email sous <strong>24–48h</strong> pour l'activation.
        </p>
        <button onClick={onBack}
          className="px-8 py-3 text-white rounded-xl font-semibold text-sm transition-all"
          style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))' }}>
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
