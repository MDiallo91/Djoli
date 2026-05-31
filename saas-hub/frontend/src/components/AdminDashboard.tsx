import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  LogOut, Settings, Search, TrendingUp, CreditCard,
  School as SchoolIcon, CheckCircle, AlertCircle, Clock,
  Trash2, RefreshCw, BarChart3, Activity, ShieldCheck,
  Plus, Edit2, Eye, Ban, ArrowLeft, Upload, FileText,
  X, User, Phone, Mail, MapPin, Building2, Menu
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
interface School {
  id: string; schoolName: string; email: string; role: string;
  country: string; city: string; level: string;
  directorName: string; prefecture: string; sousPrefecture: string;
  rccm: string; logoUrl: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'suspended';
  subscriptionExpiry: string; createdAt: string;
}

type MainView = 'dashboard' | 'schools' | 'subscriptions' | 'pending' | 'settings';
type SubView  = { kind: 'list' } | { kind: 'detail'; school: School } | { kind: 'form'; school: School | null };

const API = '/api/admin';

const SETTINGS_API = '/api/settings';

// ─── Site config reactive hook ────────────────────────────────
function loadSiteConfig() {
  try { const s = localStorage.getItem('hub_site_config'); return s ? JSON.parse(s) : {}; } catch { return {}; }
}
function useSiteConfigLive() {
  const [cfg, setCfg] = useState(loadSiteConfig);
  useEffect(() => {
    const handler = () => setCfg(loadSiteConfig());
    window.addEventListener('site-config-updated', handler);
    fetch(`${SETTINGS_API}/site`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.statut === 1 && d.data) setCfg((p: any) => ({ ...p, ...d.data })); })
      .catch(() => {});
    return () => window.removeEventListener('site-config-updated', handler);
  }, []);
  return cfg;
}

// ─── WYSIWYG editor (contenteditable) ────────────────────────
function WysiwygEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = value || '';
  }, []); // set on mount only; key prop handles tab switches

  const exec = (cmd: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    onChange(ref.current?.innerHTML || '');
  };

  const TOOLS: { label: string; title: string; cmd: string; arg?: string; style?: React.CSSProperties }[] = [
    { label: 'G',   title: 'Gras',           cmd: 'bold',                 style: { fontWeight: 700 } },
    { label: 'I',   title: 'Italique',        cmd: 'italic',               style: { fontStyle: 'italic' } },
    { label: 'S',   title: 'Souligné',        cmd: 'underline',            style: { textDecoration: 'underline' } },
    { label: 'H1',  title: 'Titre 1',         cmd: 'formatBlock', arg: 'h1' },
    { label: 'H2',  title: 'Titre 2',         cmd: 'formatBlock', arg: 'h2' },
    { label: 'H3',  title: 'Titre 3',         cmd: 'formatBlock', arg: 'h3' },
    { label: 'P',   title: 'Paragraphe',      cmd: 'formatBlock', arg: 'p'  },
    { label: '•',   title: 'Liste à puces',   cmd: 'insertUnorderedList'     },
    { label: '1.',  title: 'Liste numérotée', cmd: 'insertOrderedList'       },
    { label: '─',   title: 'Séparateur',      cmd: 'insertHorizontalRule'    },
    { label: '⌫',   title: 'Effacer format',  cmd: 'removeFormat'            },
  ];

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/10 focus-within:border-indigo-400 transition-all">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-100 bg-slate-50 flex-wrap">
        {TOOLS.map((t, i) => (
          <button key={i} type="button" title={t.title}
            onMouseDown={e => { e.preventDefault(); exec(t.cmd, t.arg); }}
            className="px-2.5 py-1 text-xs text-slate-600 hover:bg-white hover:shadow-sm rounded-md transition-all border border-transparent hover:border-slate-200 min-w-[28px]"
            style={t.style}>
            {t.label}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-slate-400 pr-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />Éditeur visuel
        </span>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML || '')}
        className="min-h-[320px] px-5 py-4 text-sm text-slate-700 outline-none bg-white leading-relaxed"
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      />
      <style>{`
        [contenteditable] h1 { font-size:1.5rem; font-weight:800; margin:.8rem 0; color:#1e293b }
        [contenteditable] h2 { font-size:1.2rem; font-weight:700; margin:.7rem 0; color:#1e293b }
        [contenteditable] h3 { font-size:1rem;   font-weight:700; margin:.6rem 0; color:#1e293b }
        [contenteditable] ul { list-style:disc;   padding-left:1.5rem; margin:.4rem 0 }
        [contenteditable] ol { list-style:decimal;padding-left:1.5rem; margin:.4rem 0 }
        [contenteditable] li { margin:.2rem 0 }
        [contenteditable] hr { border:none; border-top:1px solid #e2e8f0; margin:1rem 0 }
        [contenteditable] p  { margin:.4rem 0 }
        [contenteditable]:empty:before { content: attr(data-placeholder); color:#94a3b8; pointer-events:none }
      `}</style>
    </div>
  );
}

// ─── Audit log ────────────────────────────────────────────────
interface AuditEntry { id: string; ts: string; action: string; detail?: string; user: string }
function getAuditLog(): AuditEntry[] {
  try { const s = localStorage.getItem('hub_audit_log'); return s ? JSON.parse(s) : []; } catch { return []; }
}
function logAudit(action: string, detail?: string) {
  const entries = getAuditLog();
  const user = (() => { try { const u = localStorage.getItem('hub_user'); return u ? JSON.parse(u).email : 'admin'; } catch { return 'admin'; } })();
  entries.unshift({ id: Date.now().toString(), ts: new Date().toISOString(), action, detail, user });
  if (entries.length > 300) entries.splice(300);
  localStorage.setItem('hub_audit_log', JSON.stringify(entries));
}

// ─── Shared styles ────────────────────────────────────────────
const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white placeholder:text-slate-400';
const labelCls = 'block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5';

const SUB_LABEL: Record<string, string> = { active: 'Actif', trial: 'Essai', expired: 'Expiré', suspended: 'Bloqué' };
const SUB_CLS:   Record<string, string> = {
  active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  trial:     'bg-blue-50 text-blue-700 border-blue-200',
  expired:   'bg-red-50 text-red-700 border-red-200',
  suspended: 'bg-slate-100 text-slate-600 border-slate-300',
};
const APV_CLS: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending:  'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cls}`}>{label}</span>;
}

function daysLeft(d: string) {
  const ms = new Date(d).getTime() - Date.now();
  return isNaN(ms) ? null : Math.ceil(ms / 86400000);
}

// ─── Page wrapper with back arrow ─────────────────────────────
function PageShell({ title, subtitle, onBack, actions, children }: {
  title: string; subtitle?: string; onBack: () => void;
  actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 py-4 border-b border-slate-200 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors">
          <ArrowLeft size={16} /> Retour
        </button>
        <div className="w-px h-5 bg-slate-200" />
        <div className="flex-1">
          <p className="text-base font-semibold text-slate-900">{title}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

// ─── File upload widget ───────────────────────────────────────
function FileUpload({ label, value, onChange, accept, hint }: {
  label: string; value: string; onChange: (v: string) => void; accept: string; hint?: string;
}) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {value ? (
        <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3">
          {value.startsWith('data:image')
            ? <img src={value} alt="" className="w-10 h-10 object-contain rounded-lg border border-emerald-200" />
            : <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><FileText size={18} className="text-emerald-600" /></div>
          }
          <span className="flex-1 text-sm font-medium text-emerald-800 truncate">Fichier chargé</span>
          <label className="cursor-pointer p-1 text-emerald-600 hover:text-emerald-800">
            <Upload size={14} />
            <input type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => onChange(r.result as string); r.readAsDataURL(f); }} />
          </label>
          <button type="button" onClick={() => onChange('')} className="p-1 text-slate-400 hover:text-red-500"><X size={14} /></button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-5 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-all group">
          <Upload size={18} className="text-slate-400 group-hover:text-indigo-500 mb-1.5 transition-colors" />
          <p className="text-sm text-slate-500 group-hover:text-indigo-600 font-medium transition-colors">Cliquez pour uploader</p>
          {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
          <input type="file" accept={accept} className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onloadend = () => onChange(r.result as string); r.readAsDataURL(f); }} />
        </label>
      )}
    </div>
  );
}

// ─── School Form Page ─────────────────────────────────────────
function SchoolFormPage({ school, onBack, onSave }: { school: School | null; onBack: () => void; onSave: () => void }) {
  const [form, setForm] = useState<any>(school ?? {
    schoolName: '', email: '', password: '', country: '', city: '', level: '',
    directorName: '', prefecture: '', sousPrefecture: '', rccm: '', logoUrl: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      const url = school ? `${API}/schools/${school.id}` : `${API}/schools`;
      const res = await fetch(url, { method: school ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erreur'); setSaving(false); return; }
      toast.success(school ? 'Établissement modifié avec succès' : 'Établissement créé avec succès');
      onSave(); onBack();
    } catch { toast.error('Erreur réseau'); setSaving(false); }
  };

  return (
    <PageShell title={school ? `Modifier — ${school.schoolName}` : 'Ajouter un établissement'} onBack={onBack}>
      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">
        {/* Identité */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0"><Building2 size={13} className="text-white" /></div>
            <p className="text-sm font-semibold text-slate-900">Identité de l'école</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <div>
              <label className={labelCls}>Nom de l'établissement *</label>
              <input required className={inputCls} value={form.schoolName || ''} onChange={e => set('schoolName', e.target.value)} placeholder="École Excellence 224" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Email *</label>
                <input required type="email" className={inputCls} value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="contact@ecole.com" />
              </div>
              <div>
                <label className={labelCls}>Cycle scolaire</label>
                <select className={inputCls} value={form.level || ''} onChange={e => set('level', e.target.value)}>
                  <option value="">—</option>
                  {['Maternelle','Primaire','Collège','Lycée','Mixte'].map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Directeur / Responsable</label>
                <input className={inputCls} value={form.directorName || ''} onChange={e => set('directorName', e.target.value)} placeholder="M. Diallo" />
              </div>
              <div>
                <label className={labelCls}>RCCM (numéro)</label>
                <input className={inputCls} value={form.rccm || ''} onChange={e => set('rccm', e.target.value)} placeholder="RC/KA/2026/..." />
              </div>
            </div>
            {!school && (
              <div>
                <label className={labelCls}>Mot de passe initial</label>
                <input className={inputCls} value={form.password || ''} onChange={e => set('password', e.target.value)} placeholder="Vide = 'changeme123'" />
              </div>
            )}
          </div>
        </div>

        {/* Localisation */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0"><MapPin size={13} className="text-white" /></div>
            <p className="text-sm font-semibold text-slate-900">Localisation</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <div className="grid grid-cols-2 gap-4">
              {[['Pays','country','Guinée'],['Ville','city','Conakry'],['Préfecture / Commune','prefecture','RATOMA'],['Sous-préfecture (opt.)','sousPrefecture','YATTAYA']].map(([l,k,p]) => (
                <div key={k}>
                  <label className={labelCls}>{l}</label>
                  <input className={inputCls} value={form[k] || ''} onChange={e => set(k, e.target.value)} placeholder={p} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Documents */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0"><FileText size={13} className="text-white" /></div>
            <p className="text-sm font-semibold text-slate-900">Documents & Logo</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
            <FileUpload label="Logo de l'école" value={form.logoUrl || ''} onChange={v => set('logoUrl', v)} accept="image/*" hint="PNG, JPG, SVG" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onBack} className="px-6 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50">
            {saving ? 'Enregistrement…' : school ? 'Sauvegarder les modifications' : 'Créer l\'établissement'}
          </button>
        </div>
      </form>
    </PageShell>
  );
}

// ─── School Detail Page ───────────────────────────────────────
function SchoolDetailPage({ school, onBack, onEdit, onRefresh }: {
  school: School; onBack: () => void; onEdit: () => void; onRefresh: () => void;
}) {
  const [busy, setBusy] = useState('');

  const activate = async (days: number) => {
    setBusy('a' + days);
    const expiry = new Date(); expiry.setDate(expiry.getDate() + days);
    try {
      const res = await fetch(`${API}/subscription/${school.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active', expiry: expiry.toISOString() }) });
      if (!res.ok) { toast.error('Erreur lors de l\'activation'); return; }
      toast.success(`Abonnement activé pour ${days === 365 ? '1 an' : days + ' jours'}`);
      onRefresh();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };
  const block = async () => {
    if (!confirm('Bloquer cet établissement ?')) return;
    setBusy('block');
    try {
      const res = await fetch(`${API}/subscription/${school.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'suspended' }) });
      if (!res.ok) { toast.error('Erreur lors du blocage'); return; }
      toast.warning('Établissement bloqué');
      onRefresh();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };
  const unblock = async () => {
    setBusy('unblock');
    try {
      const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
      const res = await fetch(`${API}/subscription/${school.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active', expiry: expiry.toISOString() }) });
      if (!res.ok) { toast.error('Erreur lors du déblocage'); return; }
      toast.success('Établissement débloqué (30 jours)');
      onRefresh();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };
  const remove = async () => {
    if (!confirm('Supprimer définitivement ?')) return;
    setBusy('del');
    try {
      const res = await fetch(`${API}/school/${school.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Erreur lors de la suppression'); return; }
      toast.success('Établissement supprimé');
      onRefresh(); onBack();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };

  const dl = daysLeft(school.subscriptionExpiry);

  return (
    <PageShell
      title={school.schoolName}
      subtitle={school.email}
      onBack={onBack}
      actions={
        <button onClick={onEdit} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all">
          <Edit2 size={14} /> Modifier
        </button>
      }
    >
      <div className="max-w-2xl space-y-6">
        {/* Header card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-5">
          {school.logoUrl
            ? <img src={school.logoUrl} alt="" className="w-16 h-16 rounded-xl object-contain border border-slate-200 flex-shrink-0" />
            : <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-2xl flex-shrink-0">{school.schoolName[0]}</div>
          }
          <div>
            <p className="text-lg font-bold text-slate-900">{school.schoolName}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge label={SUB_LABEL[school.subscriptionStatus] ?? school.subscriptionStatus} cls={SUB_CLS[school.subscriptionStatus] ?? SUB_CLS.suspended} />
              <Badge label={school.approvalStatus === 'approved' ? 'Approuvé' : school.approvalStatus === 'pending' ? 'En attente' : 'Refusé'} cls={APV_CLS[school.approvalStatus]} />
              {school.level && <Badge label={school.level} cls="bg-slate-100 text-slate-600 border-slate-200" />}
            </div>
          </div>
        </div>

        {/* Info sections */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Informations générales</p>
          {[
            ['Email',             school.email,          <Mail size={14} />],
            ['Directeur',         school.directorName,   <User size={14} />],
            ['RCCM',              school.rccm,           <FileText size={14} />],
            ['Inscrit le',        school.createdAt ? new Date(school.createdAt).toLocaleDateString('fr-FR') : '—', <Clock size={14} />],
          ].filter(([,v]) => v).map(([l, v, icon]) => (
            <div key={l as string} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <span className="text-slate-400 flex-shrink-0">{icon}</span>
              <span className="text-xs text-slate-500 w-28 flex-shrink-0">{l as string}</span>
              <span className="text-sm font-medium text-slate-900 break-all">{v as string}</span>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Localisation</p>
          {[
            ['Pays',             school.country],
            ['Ville',            school.city],
            ['Préfecture',       school.prefecture],
            ['Sous-préfecture',  school.sousPrefecture],
          ].filter(([,v]) => v).map(([l, v]) => (
            <div key={l} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
              <MapPin size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-xs text-slate-500 w-28 flex-shrink-0">{l}</span>
              <span className="text-sm font-medium text-slate-900">{v}</span>
            </div>
          ))}
        </div>

        {/* Subscription */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Gestion de l'abonnement</p>
          <div className="flex items-center justify-between mb-4 p-3 bg-slate-50 rounded-xl">
            <span className="text-sm text-slate-600">Expiration</span>
            <span className={`text-sm font-semibold ${dl !== null && dl <= 7 && dl >= 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {dl === null ? '—' : dl < 0 ? `Expiré (${Math.abs(dl)}j)` : `J-${dl}`}
              {dl !== null && dl >= 0 && !isNaN(new Date(school.subscriptionExpiry).getTime()) &&
                <span className="text-slate-400 font-normal ml-2">({new Date(school.subscriptionExpiry).toLocaleDateString('fr-FR')})</span>}
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mb-2">Activer / Prolonger</p>
          <div className="flex flex-wrap gap-2">
            {[30, 90, 180, 365].map(d => (
              <button key={d} onClick={() => activate(d)} disabled={!!busy}
                className="flex items-center gap-1 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all disabled:opacity-50">
                <Plus size={11} /> {d === 365 ? '1 an' : `${d} jours`}
              </button>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-white border border-red-100 rounded-2xl p-5">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-4">Zone dangereuse</p>
          <div className="flex flex-wrap gap-3">
            {school.subscriptionStatus === 'suspended' ? (
              <button onClick={unblock} disabled={!!busy}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-medium hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all disabled:opacity-50">
                <CheckCircle size={14} /> Débloquer l'accès
              </button>
            ) : (
              <button onClick={block} disabled={!!busy}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-sm font-medium hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all disabled:opacity-50">
                <Ban size={14} /> Bloquer l'accès
              </button>
            )}
            <button onClick={remove} disabled={!!busy}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition-all disabled:opacity-50">
              <Trash2 size={14} /> Supprimer définitivement
            </button>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────
function DashboardTab({ schools }: { schools: School[] }) {
  const approved = schools.filter(s => s.approvalStatus === 'approved');
  const s = {
    total: approved.length,
    active: approved.filter(x => x.subscriptionStatus === 'active').length,
    trial:  approved.filter(x => x.subscriptionStatus === 'trial').length,
    expired:approved.filter(x => x.subscriptionStatus === 'expired').length,
    pending:schools.filter(x => x.approvalStatus === 'pending').length,
    revenue:approved.filter(x => x.subscriptionStatus === 'active').length * 49,
  };
  const expiring = approved.filter(x => { const d = daysLeft(x.subscriptionExpiry); return d !== null && d >= 0 && d <= 7; });
  const recent   = [...approved].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-base font-semibold text-slate-900">Tableau de bord</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { l: 'Total',      v: s.total,    i: SchoolIcon,  c: 'text-indigo-600 bg-indigo-50' },
          { l: 'Actifs',     v: s.active,   i: CheckCircle, c: 'text-emerald-600 bg-emerald-50' },
          { l: 'Essai',      v: s.trial,    i: Clock,       c: 'text-blue-600 bg-blue-50' },
          { l: 'Expirés',    v: s.expired,  i: AlertCircle, c: 'text-red-600 bg-red-50' },
          { l: 'En attente', v: s.pending,  i: Activity,    c: 'text-amber-600 bg-amber-50' },
        ].map(({ l, v, i: Icon, c }) => (
          <div key={l} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${c}`}><Icon size={15} /></div>
            <p className="text-xl font-bold text-slate-900">{v}</p>
            <p className="text-xs text-slate-500 mt-0.5">{l}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Répartition</p>
        <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
          {s.total > 0 && <>
            <div className="bg-emerald-500" style={{ width: `${(s.active/s.total)*100}%` }} />
            <div className="bg-blue-400"    style={{ width: `${(s.trial/s.total)*100}%` }} />
            <div className="bg-red-400"     style={{ width: `${(s.expired/s.total)*100}%` }} />
          </>}
        </div>
        <div className="flex gap-5 mt-2 text-xs text-slate-500">
          {[['bg-emerald-500','Actif',s.active],['bg-blue-400','Essai',s.trial],['bg-red-400','Expiré',s.expired]].map(([c,l,v]) => (
            <span key={l as string} className="flex items-center gap-1.5"><span className={`w-2 h-2 rounded-full ${c}`} />{l as string} ({v as number})</span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100"><p className="text-xs font-semibold text-slate-600">Inscriptions récentes</p></div>
          <div className="divide-y divide-slate-50">
            {recent.map(sc => (
              <div key={sc.id} className="flex items-center gap-3 px-5 py-3">
                {sc.logoUrl ? <img src={sc.logoUrl} alt="" className="w-7 h-7 rounded object-contain border border-slate-200 flex-shrink-0" />
                  : <div className="w-7 h-7 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">{sc.schoolName[0]}</div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{sc.schoolName}</p>
                  <p className="text-xs text-slate-400">{new Date(sc.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <Badge label={SUB_LABEL[sc.subscriptionStatus] ?? sc.subscriptionStatus} cls={SUB_CLS[sc.subscriptionStatus] ?? SUB_CLS.suspended} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <AlertCircle size={13} className="text-amber-500" />
            <p className="text-xs font-semibold text-slate-600">Expirent dans 7 jours ({expiring.length})</p>
          </div>
          {expiring.length === 0
            ? <p className="px-5 py-8 text-center text-sm text-slate-400">Aucun abonnement critique</p>
            : <div className="divide-y divide-slate-50">
                {expiring.map(sc => (
                  <div key={sc.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-7 h-7 rounded bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-xs flex-shrink-0">{sc.schoolName[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{sc.schoolName}</p>
                      <p className="text-xs text-slate-400">{sc.city}</p>
                    </div>
                    <span className="text-xs font-semibold text-amber-600">J-{daysLeft(sc.subscriptionExpiry)}</span>
                  </div>
                ))}
              </div>}
        </div>
      </div>
    </div>
  );
}

// ─── SCHOOLS TAB ──────────────────────────────────────────────
function SchoolsTab({ schools, onRefresh }: { schools: School[]; onRefresh: () => void }) {
  const [sub, setSub]   = useState<SubView>({ kind: 'list' });
  const [search, setSearch]   = useState('');
  const [statusFilter, setFilter] = useState('all');

  if (sub.kind === 'form')   return <SchoolFormPage school={sub.school} onBack={() => setSub({ kind: 'list' })} onSave={onRefresh} />;
  if (sub.kind === 'detail') return (
    <SchoolDetailPage
      school={sub.school}
      onBack={() => setSub({ kind: 'list' })}
      onEdit={() => setSub({ kind: 'form', school: sub.school })}
      onRefresh={onRefresh}
    />
  );

  const approved = schools.filter(s => s.approvalStatus === 'approved');
  const filtered = approved.filter(s => {
    const ok = s.schoolName.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    return ok && (statusFilter === 'all' || s.subscriptionStatus === statusFilter);
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Établissements</h1>
          <p className="text-xs text-slate-400 mt-0.5">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setSub({ kind: 'form', school: null })}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search size={14} className="text-slate-400 flex-shrink-0" />
          <input type="text" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm text-slate-900 outline-none flex-1 placeholder:text-slate-400" />
        </div>
        <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-1">
          {['all','active','trial','expired','suspended'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${statusFilter === s ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              {s === 'all' ? 'Tous' : SUB_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/70">
              {['École','Localisation','Statut','Expiration','Actions'].map(h => (
                <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">Aucun résultat</td></tr>}
            {filtered.map(s => {
              const dl = daysLeft(s.subscriptionExpiry);
              return (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {s.logoUrl ? <img src={s.logoUrl} alt="" className="w-8 h-8 rounded object-contain border border-slate-200 flex-shrink-0" />
                        : <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">{s.schoolName[0]}</div>}
                      <div>
                        <p className="text-sm font-medium text-slate-900">{s.schoolName}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">{[s.city, s.country].filter(Boolean).join(', ') || '—'}</td>
                  <td className="px-5 py-3"><Badge label={SUB_LABEL[s.subscriptionStatus] ?? s.subscriptionStatus} cls={SUB_CLS[s.subscriptionStatus] ?? SUB_CLS.suspended} /></td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium ${dl !== null && dl <= 7 && dl >= 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {dl === null ? '—' : dl < 0 ? 'Expiré' : `J-${dl}`}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setSub({ kind: 'detail', school: s })} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Voir détails"><Eye size={14} /></button>
                      <button onClick={() => setSub({ kind: 'form', school: s })}   className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all" title="Modifier"><Edit2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

// ─── PENDING TAB ──────────────────────────────────────────────
function PendingTab({ schools, onRefresh }: { schools: School[]; onRefresh: () => void }) {
  const [detail, setDetail] = useState<School | null>(null);
  const [sub, setSub] = useState<SubView>({ kind: 'list' });
  const [busy, setBusy] = useState('');

  if (sub.kind === 'detail') return (
    <SchoolDetailPage school={sub.school} onBack={() => setSub({ kind: 'list' })} onEdit={() => setSub({ kind: 'form', school: sub.school })} onRefresh={onRefresh} />
  );
  if (sub.kind === 'form') return (
    <SchoolFormPage school={sub.school} onBack={() => setSub({ kind: 'list' })} onSave={onRefresh} />
  );

  const pending = schools.filter(s => s.approvalStatus === 'pending');

  const approve = async (id: string) => {
    setBusy(id + 'a');
    try {
      const res = await fetch(`${API}/schools/${id}/approve`, { method: 'PUT' });
      if (!res.ok) { toast.error('Erreur lors de l\'approbation'); return; }
      toast.success('École approuvée avec succès');
      const s = schools.find(x => x.id === id);
      logAudit('École approuvée', s?.schoolName);
      onRefresh();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };
  const reject = async (id: string) => {
    if (!confirm('Rejeter cette demande ?')) return;
    setBusy(id + 'r');
    try {
      const res = await fetch(`${API}/schools/${id}/reject`, { method: 'PUT' });
      if (!res.ok) { toast.error('Erreur lors du rejet'); return; }
      toast.info('Demande rejetée');
      const s = schools.find(x => x.id === id);
      logAudit('École rejetée', s?.schoolName);
      onRefresh();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-slate-900">Demandes en attente</h1>
        {pending.length > 0 && <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">{pending.length}</span>}
      </div>

      {pending.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl py-16 text-center">
          <CheckCircle size={32} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-600">Aucune demande en attente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(s => (
            <div key={s.id} className="bg-white border border-amber-200 rounded-xl p-5 flex items-start gap-4">
              <div className="flex-shrink-0">
                {s.logoUrl ? <img src={s.logoUrl} alt="" className="w-12 h-12 rounded-xl object-contain border border-slate-200" />
                  : <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-bold text-lg">{s.schoolName[0]}</div>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{s.schoolName}</p>
                    <p className="text-xs text-slate-500">{s.email}</p>
                  </div>
                  <p className="text-xs text-slate-400 whitespace-nowrap">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                  {s.country && <span>🌍 {s.country}</span>}
                  {s.city && <span>📍 {s.city}</span>}
                  {s.level && <span>🎓 {s.level}</span>}
                  {s.directorName && <span>👤 {s.directorName}</span>}
                  {s.rccm && <span className="font-semibold text-indigo-600">RCCM: {s.rccm}</span>}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button onClick={() => setSub({ kind: 'detail', school: s })} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all">
                    Voir les détails
                  </button>
                  <button onClick={() => approve(s.id)} disabled={busy.startsWith(s.id)}
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-all disabled:opacity-50">
                    {busy === s.id + 'a' ? '…' : '✓ Approuver'}
                  </button>
                  <button onClick={() => reject(s.id)} disabled={busy.startsWith(s.id)}
                    className="px-4 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50">
                    {busy === s.id + 'r' ? '…' : '✗ Rejeter'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SUBSCRIPTIONS TAB ────────────────────────────────────────
function SubscriptionsTab({ schools, onRefresh }: { schools: School[]; onRefresh: () => void }) {
  const [sub, setSub] = useState<SubView>({ kind: 'list' });
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');

  if (sub.kind === 'detail') return <SchoolDetailPage school={sub.school} onBack={() => setSub({ kind: 'list' })} onEdit={() => setSub({ kind: 'form', school: sub.school })} onRefresh={onRefresh} />;
  if (sub.kind === 'form')   return <SchoolFormPage school={sub.school} onBack={() => setSub({ kind: 'list' })} onSave={onRefresh} />;

  const approved = schools.filter(s => s.approvalStatus === 'approved');
  const filtered = approved.filter(s => filter === 'all' || s.subscriptionStatus === filter)
    .sort((a, b) => (daysLeft(a.subscriptionExpiry) ?? 9999) - (daysLeft(b.subscriptionExpiry) ?? 9999));
  const counts = { all: approved.length, active: approved.filter(s => s.subscriptionStatus === 'active').length, trial: approved.filter(s => s.subscriptionStatus === 'trial').length, expired: approved.filter(s => s.subscriptionStatus === 'expired').length, suspended: approved.filter(s => s.subscriptionStatus === 'suspended').length };

  const activate = async (id: string, days: number) => {
    setBusy(id + days);
    const e = new Date(); e.setDate(e.getDate() + days);
    try {
      const res = await fetch(`${API}/subscription/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'active', expiry: e.toISOString() }) });
      if (!res.ok) { toast.error('Erreur lors de l\'activation'); return; }
      toast.success(`Abonnement prolongé de ${days === 365 ? '1 an' : days + ' jours'}`);
      onRefresh();
    } catch { toast.error('Erreur réseau'); }
    finally { setBusy(''); }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-base font-semibold text-slate-900">Abonnements</h1>
      <div className="flex flex-wrap gap-2">
        {[['all','Tous'],['active','Actifs'],['trial','Essai'],['expired','Expirés'],['suspended','Bloqués']].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold border transition-all ${filter === k ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
            {l} <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === k ? 'bg-white/20' : 'bg-slate-100'}`}>{counts[k as keyof typeof counts]}</span>
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(s => {
          const dl = daysLeft(s.subscriptionExpiry);
          const urgent = dl !== null && dl >= 0 && dl <= 7;
          return (
            <div key={s.id} className={`bg-white border rounded-xl p-4 flex items-center gap-4 ${urgent ? 'border-amber-200' : 'border-slate-200'}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${s.subscriptionStatus === 'active' ? 'bg-emerald-50 text-emerald-700' : s.subscriptionStatus === 'trial' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-600'}`}>
                {s.schoolName[0]}
              </div>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSub({ kind: 'detail', school: s })}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors">{s.schoolName}</p>
                  <Badge label={SUB_LABEL[s.subscriptionStatus] ?? s.subscriptionStatus} cls={SUB_CLS[s.subscriptionStatus] ?? SUB_CLS.suspended} />
                  {urgent && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Expire bientôt</span>}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{s.email}</p>
              </div>
              <div className="text-right hidden md:block mr-3">
                <p className={`text-sm font-semibold ${urgent ? 'text-amber-600' : 'text-slate-700'}`}>{dl === null ? '—' : dl < 0 ? `Expiré` : `J-${dl}`}</p>
                {dl !== null && dl >= 0 && !isNaN(new Date(s.subscriptionExpiry).getTime()) &&
                  <p className="text-xs text-slate-400">{new Date(s.subscriptionExpiry).toLocaleDateString('fr-FR')}</p>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {[30,90,365].map(d => (
                  <button key={d} onClick={() => activate(s.id, d)} disabled={!!busy}
                    className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all disabled:opacity-40">
                    {d === 365 ? '1an' : `${d}j`}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── SETTINGS TAB ─────────────────────────────────────────────
export const DEFAULT_SITE_CONFIG = {
  siteName:       'DJOLI',
  logoUrl:        '',
  email:          '',
  youtubeUrl:     '',
  whatsappPhone:  '',
  primaryColor:   '#4f46e5',
  secondaryColor: '#10b981',
  currency:       'EUR' as 'EUR' | 'USD' | 'GNF',
  price30:        '29',
  price90:        '79',
  price365:       '249',
  appVersion:     '2.0',
  appDownloadUrl: '',
  clientSchoolIds: [] as string[],
  featureImages:  ['', '', ''] as string[],
}

// ─── Color picker widget ──────────────────────────────────────
function ColorPicker({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  const safe = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#4f46e5';
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="flex items-center gap-3">
        <div className="relative">
          <input
            type="color"
            value={safe}
            onChange={e => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <div className="w-11 h-11 rounded-xl border-2 border-slate-200 shadow-sm cursor-pointer transition-all hover:border-slate-400"
            style={{ backgroundColor: safe }} />
        </div>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          maxLength={7}
          placeholder="#4f46e5"
          className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 uppercase bg-white"
        />
        <div className="flex-1">
          {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
          {/* Preset swatches */}
          <div className="flex gap-1.5 mt-1">
            {['#4f46e5','#2563eb','#7c3aed','#dc2626','#ea580c','#16a34a','#0891b2','#be185d','#1e293b'].map(c => (
              <button key={c} type="button" onClick={() => onChange(c)}
                className="w-5 h-5 rounded-md border border-white/50 shadow-sm transition-transform hover:scale-110"
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
export type SiteConfig = typeof DEFAULT_SITE_CONFIG

type SettingsSection = 'site' | 'contact' | 'tarification' | 'application' | 'accueil' | 'legal' | 'audit'
const SETTINGS_TABS: { id: SettingsSection; label: string }[] = [
  { id: 'site',         label: 'Site' },
  { id: 'contact',      label: 'Contact' },
  { id: 'tarification', label: 'Tarification' },
  { id: 'application',  label: 'Application' },
  { id: 'accueil',      label: 'Page d\'accueil' },
  { id: 'legal',        label: 'Pages légales' },
  { id: 'audit',        label: 'Journal' },
]

const DEFAULT_LEGAL = { terms: '', privacy: '', mentions: '' }
function loadLegal() {
  try { const s = localStorage.getItem('hub_legal'); return s ? { ...DEFAULT_LEGAL, ...JSON.parse(s) } : DEFAULT_LEGAL; } catch { return DEFAULT_LEGAL; }
}

function StatutToggle({ value, onChange }: { value: 0|1; onChange: (v: 0|1) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl mb-5">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut :</span>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="radio" checked={value === 1} onChange={() => onChange(1)} className="accent-emerald-500 w-3.5 h-3.5" />
        <span className={`text-xs font-semibold ${value === 1 ? 'text-emerald-600' : 'text-slate-400'}`}>Actif</span>
      </label>
      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="radio" checked={value === 0} onChange={() => onChange(0)} className="accent-slate-400 w-3.5 h-3.5" />
        <span className={`text-xs font-semibold ${value === 0 ? 'text-slate-700' : 'text-slate-400'}`}>Inactif</span>
      </label>
      {value === 0 && (
        <span className="ml-1 text-xs text-amber-600 font-medium italic">— non appliqué à la page d'accueil</span>
      )}
    </div>
  )
}

function SettingsTab({ schools }: { schools: School[] }) {
  const [cfg,     setCfg]     = useState<SiteConfig>(DEFAULT_SITE_CONFIG)
  const [legal,   setLegal]   = useState(DEFAULT_LEGAL)
  const [statuts, setStatuts] = useState<Record<string, 0|1>>({})
  const setStatutFor = (key: string, v: 0|1) => setStatuts(p => ({ ...p, [key]: v }))
  const [section, setSection] = useState<SettingsSection>('site')
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | 'mentions'>('terms')
  const [saving,  setSaving]  = useState(false)
  const [loaded,  setLoaded]  = useState(false)

  // Charger depuis l'API au montage
  useEffect(() => {
    const CFG_SECTIONS = ['site','contact','tarification','application','accueil'] as const
    fetch(SETTINGS_API)
      .then(r => r.ok ? r.json() : {})
      .then((all: any) => {
        const newStatuts: Record<string, 0|1> = {}
        let merged: Partial<SiteConfig> = {}
        for (const sec of CFG_SECTIONS) {
          newStatuts[sec] = all[sec]?.statut ?? 1
          if (all[sec]?.data) merged = { ...merged, ...all[sec].data }
        }
        if (Object.keys(merged).length > 0) {
          setCfg(p => ({ ...p, ...merged }))
        } else {
          try { const s = localStorage.getItem('hub_site_config'); if (s) setCfg(p => ({ ...p, ...JSON.parse(s) })) } catch {}
        }
        newStatuts.legal = all.legal?.statut ?? 1
        if (all.legal?.data) {
          setLegal(p => ({ ...p, ...all.legal.data }))
        } else {
          try { const s = localStorage.getItem('hub_legal'); if (s) setLegal(p => ({ ...p, ...JSON.parse(s) })) } catch {}
        }
        setStatuts(newStatuts)
        setLoaded(true)
      })
      .catch(() => {
        try { const s = localStorage.getItem('hub_site_config'); if (s) setCfg(p => ({ ...p, ...JSON.parse(s) })) } catch {}
        try { const s = localStorage.getItem('hub_legal'); if (s) setLegal(p => ({ ...p, ...JSON.parse(s) })) } catch {}
        setLoaded(true)
      })
  }, [])

  const set = (k: keyof SiteConfig, v: any) => setCfg(p => ({ ...p, [k]: v }))
  const setLeg = (k: 'terms' | 'privacy' | 'mentions', v: string) => setLegal(p => ({ ...p, [k]: v }))

  const handleSave = async () => {
    setSaving(true)
    const H = { 'Content-Type': 'application/json' }
    const SECTION_DATA: [string, object][] = [
      ['site',         { siteName: cfg.siteName, logoUrl: cfg.logoUrl, primaryColor: cfg.primaryColor, secondaryColor: cfg.secondaryColor }],
      ['contact',      { email: cfg.email, whatsappPhone: cfg.whatsappPhone, youtubeUrl: cfg.youtubeUrl }],
      ['tarification', { currency: cfg.currency, price30: cfg.price30, price90: cfg.price90, price365: cfg.price365 }],
      ['application',  { appVersion: cfg.appVersion, appDownloadUrl: cfg.appDownloadUrl }],
      ['accueil',      { featureImages: cfg.featureImages, clientSchoolIds: cfg.clientSchoolIds }],
    ]
    try {
      const responses = await Promise.all([
        ...SECTION_DATA.map(([key, data]) =>
          fetch(`${SETTINGS_API}/${key}`, { method: 'PUT', headers: H, body: JSON.stringify({ statut: statuts[key] ?? 1, data }) })
        ),
        fetch(`${SETTINGS_API}/legal`, { method: 'PUT', headers: H, body: JSON.stringify({ statut: statuts.legal ?? 1, data: legal }) }),
      ])
      const failed = responses.filter(r => !r.ok)
      if (failed.length > 0) {
        const errData = await failed[0].json().catch(() => ({}))
        throw new Error(errData.error || `Erreur serveur (${failed[0].status})`)
      }
      localStorage.setItem('hub_site_config', JSON.stringify(cfg))
      localStorage.setItem('hub_legal',       JSON.stringify(legal))
      window.dispatchEvent(new Event('site-config-updated'))
      logAudit('Paramètres sauvegardés', `Onglet: ${section}`)
      toast.success('Configuration sauvegardée')
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const approvedSchools = schools.filter(s => s.approvalStatus === 'approved')

  const toggleSchool = (id: string) => {
    const ids = cfg.clientSchoolIds
    set('clientSchoolIds', ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  if (!loaded) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-0 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-base font-semibold text-slate-900">Paramètres Hub</h1>
        <button type="button" onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 transition-all disabled:opacity-50">
          <ShieldCheck size={13} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>

      {/* Tabs — underline style, scrollable on mobile */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto scrollbar-none">
        {SETTINGS_TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setSection(t.id)}
            className={`flex-shrink-0 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-all whitespace-nowrap ${
              section === t.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Site ── */}
      {section === 'site' && (
        <div className="space-y-4">
          <StatutToggle value={statuts.site ?? 1} onChange={v => setStatutFor('site', v)} />
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <label className={labelCls}>Nom du site</label>
              <input className={inputCls} value={cfg.siteName} onChange={e => set('siteName', e.target.value)} placeholder="DJOLI" />
            </div>
            <FileUpload label="Logo du site" value={cfg.logoUrl} onChange={v => set('logoUrl', v)} accept="image/*" hint="PNG ou SVG avec fond transparent recommandé" />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Couleurs</p>

            <ColorPicker
              label="Couleur primaire"
              value={cfg.primaryColor || '#4f46e5'}
              onChange={v => set('primaryColor', v)}
              hint="Boutons, liens actifs, accents principaux"
            />
            <ColorPicker
              label="Couleur secondaire"
              value={cfg.secondaryColor || '#10b981'}
              onChange={v => set('secondaryColor', v)}
              hint="Dégradés, éléments de succès, highlights"
            />

            {/* Preview */}
            <div className="rounded-xl overflow-hidden border border-slate-100">
              <div className="p-3 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-100">Aperçu</div>
              <div className="p-4 bg-white flex items-center gap-3 flex-wrap">
                <button className="px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm"
                  style={{ backgroundColor: cfg.primaryColor || '#4f46e5' }}>Bouton principal</button>
                <button className="px-4 py-2 rounded-lg text-white text-sm font-semibold shadow-sm"
                  style={{ backgroundColor: cfg.secondaryColor || '#10b981' }}>Bouton secondaire</button>
                <span className="text-sm font-semibold" style={{ color: cfg.primaryColor || '#4f46e5' }}>Lien / Texte actif</span>
                <div className="h-6 w-24 rounded-full" style={{ background: `linear-gradient(135deg, ${cfg.primaryColor || '#4f46e5'}, ${cfg.secondaryColor || '#10b981'})` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Contact ── */}
      {section === 'contact' && (
        <div className="space-y-4">
          <StatutToggle value={statuts.contact ?? 1} onChange={v => setStatutFor('contact', v)} />
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <label className={labelCls}>Email de contact</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" className={inputCls} style={{ paddingLeft: 36 }} value={cfg.email}
                  onChange={e => set('email', e.target.value)} placeholder="contact@smspro.com" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Affiché dans le footer de la page d'accueil</p>
            </div>
            <div>
              <label className={labelCls}>Numéro WhatsApp (avec indicatif pays)</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input className={inputCls} style={{ paddingLeft: 36 }} value={cfg.whatsappPhone}
                  onChange={e => set('whatsappPhone', e.target.value)} placeholder="+224 620 000 000" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Active le bouton WhatsApp flottant sur la page d'accueil</p>
            </div>
            <div>
              <label className={labelCls}>Lien vidéo YouTube (démo)</label>
              <input className={inputCls} value={cfg.youtubeUrl}
                onChange={e => set('youtubeUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
              <p className="text-[11px] text-slate-400 mt-1">Lié au bouton « Voir la démo » sur l'accueil</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tarification ── */}
      {section === 'tarification' && (
        <div className="space-y-4">
          <StatutToggle value={statuts.tarification ?? 1} onChange={v => setStatutFor('tarification', v)} />
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <label className={labelCls}>Devise</label>
              <div className="flex gap-2">
                {(['EUR','USD','GNF'] as const).map(c => (
                  <button key={c} type="button" onClick={() => set('currency', c)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${cfg.currency === c ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                    {c === 'EUR' ? '€ Euro' : c === 'USD' ? '$ Dollar' : 'GNF Franc'}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {([['price30','30 jours'],['price90','90 jours'],['price365','1 an']] as const).map(([k, l]) => (
                <div key={k}>
                  <label className={labelCls}>{l}</label>
                  <input type="number" className={inputCls} value={cfg[k]} onChange={e => set(k, e.target.value)} placeholder="0" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 border border-slate-100">
              <span className="font-medium text-slate-600">Aperçu affiché :</span>
              {[['30 jours', cfg.price30],['90 jours', cfg.price90],['1 an', cfg.price365]].map(([l,p]) => (
                <span key={l} className="font-semibold text-slate-800">
                  {l} → {cfg.currency === 'GNF' ? `${Number(p).toLocaleString('fr')} GNF` : cfg.currency === 'EUR' ? `${p} €` : `$${p}`}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Application ── */}
      {section === 'application' && (
        <div className="space-y-4">
          <StatutToggle value={statuts.application ?? 1} onChange={v => setStatutFor('application', v)} />
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Numéro de version</label>
                <input className={inputCls} value={cfg.appVersion} onChange={e => set('appVersion', e.target.value)} placeholder="2.0.0" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Lien de téléchargement (.exe / .dmg)</label>
              <input className={inputCls} value={cfg.appDownloadUrl}
                onChange={e => set('appDownloadUrl', e.target.value)}
                placeholder="https://drive.google.com/... ou lien direct .exe" />
              <p className="text-[11px] text-slate-400 mt-1">
                Hébergez votre fichier sur Google Drive, Dropbox ou votre serveur, puis collez le lien ici. Ce lien sera utilisé pour le bouton « Télécharger » sur la page d'accueil.
              </p>
            </div>
            {cfg.appDownloadUrl && (
              <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-emerald-800">Lien configuré — v{cfg.appVersion}</p>
                  <p className="text-[11px] text-emerald-600 truncate">{cfg.appDownloadUrl}</p>
                </div>
                <a href={cfg.appDownloadUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-700 hover:underline whitespace-nowrap">Tester →</a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Page d'accueil ── */}
      {section === 'accueil' && (
        <div className="space-y-4">
          <StatutToggle value={statuts.accueil ?? 1} onChange={v => setStatutFor('accueil', v)} />

          {/* Aperçus fonctionnalités */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aperçus des fonctionnalités</p>
              <p className="text-xs text-slate-500">Ces images apparaissent dans la section fonctionnalités de la page d'accueil.</p>
            </div>
            {[
              ['Inscriptions & Élèves', 0],
              ['Finance & Caisse',      1],
              ['Notes & Bulletins',     2],
            ].map(([label, idx]) => {
              const i = idx as number;
              const imgs = Array.isArray(cfg.featureImages) ? cfg.featureImages : ['','',''];
              const setImg = (val: string) => { const next = Array.isArray(cfg.featureImages) ? [...cfg.featureImages] : ['','','']; next[i] = val; set('featureImages', next); };
              return (
                <div key={i} className="space-y-2">
                  <label className={labelCls}>{label as string}</label>

                  {/* Champ URL */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <img src="https://upload.wikimedia.org/wikipedia/commons/0/08/Pinterest-logo.png" alt="pinterest" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 object-contain pointer-events-none" />
                      <input
                        type="url"
                        placeholder="Coller un lien image (Pinterest, etc.)"
                        value={imgs[i] && !imgs[i].startsWith('data:') ? imgs[i] : ''}
                        onChange={e => setImg(e.target.value)}
                        className={inputCls + ' pl-9 text-xs'}
                      />
                    </div>
                    <label title="Uploader un fichier" className="flex-shrink-0 cursor-pointer w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-500 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 transition-all">
                      <Upload size={15} />
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                        const f = e.target.files?.[0]; if (!f) return;
                        const r = new FileReader(); r.onloadend = () => setImg(r.result as string); r.readAsDataURL(f);
                      }} />
                    </label>
                    {imgs[i] && (
                      <button type="button" onClick={() => setImg('')} title="Supprimer"
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-red-200 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all">
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Aperçu */}
                  {imgs[i] && (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 h-36">
                      <img src={imgs[i]} alt="" className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Écoles */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Section « Ils nous font confiance »</p>
              <p className="text-xs text-slate-500">Cochez les écoles à afficher sur la page d'accueil. Si aucune n'est cochée, des noms par défaut seront utilisés.</p>
            </div>

            {approvedSchools.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Aucun établissement approuvé pour l'instant</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {approvedSchools.map(s => {
                  const selected = cfg.clientSchoolIds.includes(s.id)
                  return (
                    <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${selected ? 'bg-indigo-50 border border-indigo-200' : 'border border-transparent hover:bg-slate-50'}`}>
                      <input type="checkbox" checked={selected} onChange={() => toggleSchool(s.id)}
                        className="w-4 h-4 accent-indigo-600 flex-shrink-0" />
                      {s.logoUrl
                        ? <img src={s.logoUrl} alt="" className="w-8 h-8 rounded object-contain border border-slate-200 flex-shrink-0" />
                        : <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs flex-shrink-0">{s.schoolName[0]}</div>}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{s.schoolName}</p>
                        <p className="text-xs text-slate-400">{[s.city, s.country].filter(Boolean).join(', ') || s.email}</p>
                      </div>
                      {selected && <CheckCircle size={14} className="text-indigo-600 flex-shrink-0" />}
                    </label>
                  )
                })}
              </div>
            )}

            <p className="text-xs text-slate-400">{cfg.clientSchoolIds.length} école{cfg.clientSchoolIds.length !== 1 ? 's' : ''} sélectionnée{cfg.clientSchoolIds.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      )}

      {/* ── Pages légales ── */}
      {section === 'legal' && (
        <div className="space-y-4">
          <StatutToggle value={statuts.legal ?? 1} onChange={v => setStatutFor('legal', v)} />
          <div className="flex gap-0 border border-slate-200 rounded-xl overflow-hidden">
            {([['terms',"Conditions d'utilisation"],['privacy','Politique de confidentialité'],['mentions','Mentions légales']] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setLegalTab(k)}
                className={`flex-1 py-2.5 text-xs font-semibold transition-all border-r border-slate-200 last:border-0 ${legalTab === k ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
            <p className="text-[11px] text-slate-400">
              Utilisez la barre d'outils pour mettre en forme le texte (titres, gras, listes…). Le contenu s'affiche sur la page <code>/legal/{legalTab}</code>.
            </p>
            <WysiwygEditor
              key={legalTab}
              value={legal[legalTab]}
              onChange={v => setLeg(legalTab, v)}
            />
          </div>
        </div>
      )}

      {/* ── Journal d'audit ── */}
      {section === 'audit' && <AuditLogPanel />}
    </div>
  )
}

function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  useEffect(() => { setEntries(getAuditLog()); }, []);
  const clear = () => { localStorage.removeItem('hub_audit_log'); setEntries([]); };

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' })
      + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Journal d'activité</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{entries.length} action{entries.length !== 1 ? 's' : ''} enregistrée{entries.length !== 1 ? 's' : ''}</p>
        </div>
        {entries.length > 0 && (
          <button type="button" onClick={clear}
            className="text-xs text-rose-500 hover:text-rose-700 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-all border border-rose-100">
            Tout effacer
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 text-center">
          <Activity size={32} className="mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-400">Aucune activité enregistrée pour l'instant.</p>
          <p className="text-xs text-slate-300 mt-1">Les actions admin apparaîtront ici.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date & heure</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Détail</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Utilisateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-slate-400 whitespace-nowrap">{fmt(e.ts)}</td>
                  <td className="px-4 py-2.5 font-semibold text-slate-700">{e.action}</td>
                  <td className="px-4 py-2.5 text-slate-500">{e.detail || '—'}</td>
                  <td className="px-4 py-2.5 text-slate-400">{e.user}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────
export const AdminDashboard: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<MainView>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const siteCfg = useSiteConfigLive();

  const fetchSchools = useCallback(async () => {
    try { const r = await fetch(`${API}/schools`); const d = await r.json(); setSchools(Array.isArray(d) ? d : []); }
    catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSchools(); }, [fetchSchools]);

  const pendingCount = schools.filter(s => s.approvalStatus === 'pending').length;

  const NAV: { id: MainView; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard',     label: 'Tableau de bord',  icon: TrendingUp },
    { id: 'schools',       label: 'Établissements',    icon: SchoolIcon },
    { id: 'subscriptions', label: 'Abonnements',       icon: CreditCard },
    { id: 'pending',       label: 'En attente',        icon: Clock, badge: pendingCount },
    { id: 'settings',      label: 'Paramètres',        icon: Settings },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f8fafc' }}>
      <div className="w-8 h-8 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  const SidebarContent = () => (
    <>
      <div className="px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
            {siteCfg.logoUrl
              ? <img src={siteCfg.logoUrl} alt="Logo" className="w-full h-full object-contain" />
              : <ShieldCheck size={14} className="text-white" />}
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none truncate max-w-[120px]">
              {siteCfg.siteName || 'SaaS Admin'}
            </p>
            <p className="text-[10px] text-indigo-400 font-medium mt-0.5">Master Panel</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon, badge }) => (
          <button key={id} onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${activeTab === id ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
            <Icon size={15} />
            <span className="flex-1 text-left">{label}</span>
            {badge ? <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{badge}</span> : null}
          </button>
        ))}
      </nav>
      <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between px-3 py-2 mb-1">
          <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /><span className="text-[11px] text-slate-400">En ligne</span></div>
          <button onClick={fetchSchools} className="p-1 text-slate-500 hover:text-white transition-colors"><RefreshCw size={12} /></button>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <LogOut size={14} /> Déconnexion
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — drawer on mobile, static on desktop */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-56 flex-shrink-0 flex flex-col transition-transform duration-200 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: '#0f172a' }}>
        <SidebarContent />
      </aside>

      {/* Right side */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-slate-900 text-sm flex-1">
            {NAV.find(n => n.id === activeTab)?.label}
          </span>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">{pendingCount}</span>
          )}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'dashboard'     && <DashboardTab     schools={schools} />}
          {activeTab === 'schools'       && <SchoolsTab       schools={schools} onRefresh={fetchSchools} />}
          {activeTab === 'subscriptions' && <SubscriptionsTab schools={schools} onRefresh={fetchSchools} />}
          {activeTab === 'pending'       && <PendingTab       schools={schools} onRefresh={fetchSchools} />}
          {activeTab === 'settings'      && <SettingsTab schools={schools} />}
        </main>
      </div>
    </div>
  );
};
