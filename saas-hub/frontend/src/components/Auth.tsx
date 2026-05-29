import { useState } from 'react';
import { toast } from 'sonner';
import {
  Mail, Lock, Eye, EyeOff, BookOpen, ArrowLeft, ArrowRight,
  Upload, FileText, CheckCircle, User, Phone,
  MapPin, Building2, X
} from 'lucide-react';
import apiClient from '../lib/apiClient';

interface AuthProps {
  onBack: () => void;
  onSuccess: (data: any) => void;
}

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white placeholder:text-slate-400';
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

// ─── File uploader helper ─────────────────────────────────────
function FileUpload({ label, value, onChange, accept, hint }: {
  label: string; value: string; onChange: (v: string, name: string) => void; accept: string; hint?: string;
}) {
  const [fileName, setFileName] = useState('');
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {value ? (
        <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3">
          {value.startsWith('data:image') ? (
            <img src={value} alt="" className="w-10 h-10 object-contain rounded-lg border border-emerald-200" />
          ) : (
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><FileText size={18} className="text-emerald-600" /></div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800 truncate">{fileName || 'Fichier chargé'}</p>
            <p className="text-xs text-emerald-600">Cliquez pour remplacer</p>
          </div>
          <label className="cursor-pointer p-1 text-emerald-500 hover:text-emerald-700">
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
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group">
          <Upload size={20} className="text-slate-400 group-hover:text-indigo-500 mb-2 transition-colors" />
          <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">Cliquez pour uploader</p>
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

// ─── Login form ───────────────────────────────────────────────
function LoginForm({ onBack, onSuccess }: AuthProps) {
  const [form, setForm]   = useState({ email: '', password: '' });
  const [show, setShow]   = useState(false);
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
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12" style={{ backgroundColor: '#0f172a' }}>
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors w-fit">
          <ArrowLeft size={16} /> Retour au site
        </button>
        <div>
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-8">
            <BookOpen size={22} className="text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">Content de vous revoir !</h2>
          <p className="text-slate-400 text-base leading-relaxed">
            Accédez à votre espace école pour gérer vos données et votre abonnement DJOLI.
          </p>
          <div className="mt-10 space-y-3">
            {['Synchronisation cloud illimitée', 'Mode hors-ligne complet', 'Support technique inclus'].map(f => (
              <div key={f} className="flex items-center gap-3 text-slate-300">
                <CheckCircle size={16} className="text-indigo-400 flex-shrink-0" /> <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-slate-600 text-xs">© 2026 DJOLI</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <button onClick={onBack} className="lg:hidden flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm font-medium mb-8 transition-colors">
            <ArrowLeft size={16} /> Retour
          </button>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Connexion</h1>
          <p className="text-slate-500 text-sm mb-8">Connectez-vous à votre espace école.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelCls}>Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type="email" placeholder="contact@ecole.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  className={inputCls + ' pl-10'} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type={show ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className={inputCls + ' pl-10 pr-10'} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
              {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Connexion…</> : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Register — Step 1 ────────────────────────────────────────
function RegisterStep1({ onBack, onNext, data, setData }: {
  onBack: () => void; onNext: () => void;
  data: any; setData: (d: any) => void;
}) {
  const [show, setShow]   = useState(false);
  const [show2, setShow2] = useState(false);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (data.password !== data.confirmPassword) { toast.error('Les mots de passe ne correspondent pas.'); return; }
    if (data.password.length < 8) { toast.error('Le mot de passe doit contenir au moins 8 caractères.'); return; }
    if (!data.terms) { toast.error('Vous devez accepter les conditions d\'utilisation.'); return; }
    onNext();
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12" style={{ backgroundColor: '#0f172a' }}>
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-medium transition-colors w-fit">
          <ArrowLeft size={16} /> Retour au site
        </button>
        <div>
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-8">
            <BookOpen size={22} className="text-white" />
          </div>
          {/* Progress */}
          <div className="flex items-center gap-3 mb-10">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">1</div>
              <span className="text-white text-sm font-medium">Accès</span>
            </div>
            <div className="flex-1 h-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold">2</div>
              <span className="text-slate-400 text-sm">École & Responsable</span>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">Créez votre compte en 2 étapes</h2>
          <p className="text-slate-400 leading-relaxed">Vos informations de connexion d'abord, puis les détails de votre établissement.</p>
        </div>
        <p className="text-slate-600 text-xs">© 2026 DJOLI</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <button onClick={onBack} className="lg:hidden flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm font-medium mb-8 transition-colors">
            <ArrowLeft size={16} /> Retour
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Étape 1 / 2</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Informations de connexion</h1>
          <p className="text-slate-500 text-sm mb-8">Ces identifiants vous serviront à vous connecter.</p>

          <form onSubmit={handleNext} className="space-y-4">
            <div>
              <label className={labelCls}>Email de connexion *</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type="email" placeholder="contact@ecole.com" value={data.email}
                  onChange={e => setData({ ...data, email: e.target.value })} className={inputCls + ' pl-10'} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Mot de passe *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type={show ? 'text' : 'password'} placeholder="Minimum 8 caractères" value={data.password}
                  onChange={e => setData({ ...data, password: e.target.value })} className={inputCls + ' pl-10 pr-10'} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className={labelCls}>Confirmer le mot de passe *</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input required type={show2 ? 'text' : 'password'} placeholder="Répétez le mot de passe" value={data.confirmPassword}
                  onChange={e => setData({ ...data, confirmPassword: e.target.value })} className={inputCls + ' pl-10 pr-10'} />
                <button type="button" onClick={() => setShow2(!show2)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {show2 ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${data.terms ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-400'}`}
                onClick={() => setData({ ...data, terms: !data.terms })}>
                {data.terms && <CheckCircle size={12} className="text-white" />}
              </div>
              <span className="text-sm text-slate-600 leading-relaxed">
                J'accepte les{' '}
                <a href="#" className="text-indigo-600 hover:underline font-medium">Conditions d'utilisation</a>{' '}
                et la{' '}
                <a href="#" className="text-indigo-600 hover:underline font-medium">Politique de confidentialité</a>
              </span>
            </label>

            <button type="submit"
              className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
              Continuer <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
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
    if (!data.schoolName?.trim())    { toast.error('Le nom de l\'école est requis.'); return; }
    if (!data.country?.trim())       { toast.error('Le pays est requis.'); return; }
    if (!data.city?.trim())          { toast.error('La ville est requise.'); return; }
    if (!data.prefecture?.trim())    { toast.error('La préfecture / commune est requise.'); return; }
    if (!data.level)                 { toast.error('Veuillez sélectionner le cycle scolaire.'); return; }
    if (!data.directorName?.trim())  { toast.error('Le nom du responsable est requis.'); return; }
    if (!data.directorPhone?.trim()) { toast.error('Le téléphone du responsable est requis.'); return; }
    onSubmit(e);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Étape 2 / 2</span>
            <span className="text-sm text-slate-500">Informations de l'établissement & responsable</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center"><CheckCircle size={10} className="text-white" /></div>
          <div className="w-16 h-1 bg-indigo-600 rounded-full" />
          <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[10px] font-bold">2</div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ── Section 1: École ── */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                <Building2 size={14} className="text-white" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Informations de l'école</h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
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
                  <label className={labelCls}>Sous-préfecture <span className="text-slate-400 font-normal normal-case">(optionnel)</span></label>
                  <input className={inputCls} value={data.sousPrefecture || ''} onChange={e => set('sousPrefecture', e.target.value)} placeholder="YATTAYA" />
                </div>
                <div>
                  <label className={labelCls}>District <span className="text-slate-400 font-normal normal-case">(optionnel)</span></label>
                  <input className={inputCls} value={data.district || ''} onChange={e => set('district', e.target.value)} placeholder="District de Conakry" />
                </div>
                <div>
                  <label className={labelCls}>Cycle scolaire *</label>
                  <select className={inputCls} value={data.level || ''} onChange={e => set('level', e.target.value)}>
                    <option value="">Sélectionner…</option>
                    {['Maternelle','Primaire','Collège','Lycée','Mixte'].map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <FileUpload
                label="Logo de l'école"
                value={data.logoUrl || ''}
                onChange={v => setData({ ...data, logoUrl: v })}
                accept="image/*"
                hint="PNG, JPG, SVG — max 5 Mo"
              />

              <FileUpload
                label="Document RCCM *"
                value={data.rccm || ''}
                onChange={v => setData({ ...data, rccm: v })}
                accept="image/*,application/pdf"
                hint="Image ou PDF du registre de commerce"
              />
            </div>
          </div>

          {/* ── Section 2: Responsable ── */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-white" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Informations du responsable</h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nom complet *</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input className={inputCls + ' pl-10'} value={data.directorName || ''} onChange={e => set('directorName', e.target.value)} placeholder="M. Diallo Mamadou" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Titre / Fonction *</label>
                  <select className={inputCls} value={data.directorTitle || ''} onChange={e => set('directorTitle', e.target.value)}>
                    <option value="">Sélectionner…</option>
                    {['Directeur général','Directrice générale','Proviseur','Proviseure','Gérant','Administrateur'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Téléphone *</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="tel" className={inputCls + ' pl-10'} value={data.directorPhone || ''} onChange={e => set('directorPhone', e.target.value)} placeholder="+224 620 00 00 00" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Email du responsable</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="email" className={inputCls + ' pl-10'} value={data.directorEmail || ''} onChange={e => set('directorEmail', e.target.value)} placeholder={data.email || 'email@ecole.com'} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-base hover:bg-indigo-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
            {loading
              ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Envoi en cours…</>
              : <><CheckCircle size={18} /> Soumettre ma demande d'inscription</>
            }
          </button>

          <p className="text-center text-xs text-slate-400">
            Votre demande sera examinée par notre équipe sous 24–48h.
          </p>
        </form>
      </div>
    </div>
  );
}

// ─── Success page ─────────────────────────────────────────────
function RegisterSuccess({ schoolName, onBack }: { schoolName: string; onBack: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#f8fafc' }}>
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">Demande envoyée !</h1>
        <p className="text-slate-500 leading-relaxed mb-2">
          Votre dossier pour <span className="font-semibold text-slate-700">"{schoolName}"</span> a bien été reçu.
        </p>
        <p className="text-slate-400 text-sm mb-8">
          Notre équipe va examiner votre demande et vous contactera par email sous <strong>24–48h</strong> pour activation.
        </p>
        <button onClick={onBack} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all">
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}

// ─── Main Auth component ──────────────────────────────────────
export const Auth: React.FC<AuthProps> = ({ onBack, onSuccess }) => {
  const [view, setView]   = useState<'choice' | 'login' | 'register-1' | 'register-2' | 'success'>('choice');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [regData, setRegData] = useState({
    email: '', password: '', confirmPassword: '', terms: false,
    schoolName: '', country: '', city: '', prefecture: '', sousPrefecture: '',
    district: '', level: '', logoUrl: '', rccm: '',
    directorName: '', directorTitle: '', directorPhone: '', directorEmail: '',
  });

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await apiClient.post('/user/register', {
        schoolName:     regData.schoolName,
        email:          regData.email,
        password:       regData.password,
        country:        regData.country,
        city:           regData.city,
        level:          regData.level,
        prefecture:     regData.prefecture,
        sousPrefecture: regData.sousPrefecture,
        directorName:   regData.directorName,
        rccm:           regData.rccm,
        logoUrl:        regData.logoUrl,
      });
      setView('success');
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally { setLoading(false); }
  };

  if (view === 'login')      return <LoginForm onBack={() => setView('choice')} onSuccess={onSuccess} />;
  if (view === 'register-1') return <RegisterStep1 onBack={() => setView('choice')} onNext={() => setView('register-2')} data={regData} setData={setRegData} />;
  if (view === 'register-2') return <RegisterStep2 onBack={() => setView('register-1')} onSubmit={handleRegisterSubmit} data={regData} setData={setRegData} loading={loading} />;
  if (view === 'success')    return <RegisterSuccess schoolName={regData.schoolName} onBack={onBack} />;

  // Choice screen
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: '#f8fafc' }}>
      <div className="w-full max-w-sm">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm font-medium mb-10 transition-colors">
          <ArrowLeft size={16} /> Retour au site
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <BookOpen size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900">DJOLI</p>
            <p className="text-xs text-slate-400">Portail établissements</p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">Bienvenue</h1>
        <p className="text-slate-500 text-sm mb-8">Connectez-vous ou créez votre espace école.</p>

        <div className="space-y-3">
          <button onClick={() => setView('login')}
            className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
            Se connecter
          </button>
          <button onClick={() => setView('register-1')}
            className="w-full py-3.5 bg-white text-slate-700 border border-slate-200 rounded-xl font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center justify-center gap-2">
            Créer un compte école
          </button>
        </div>
      </div>
    </div>
  );
};
