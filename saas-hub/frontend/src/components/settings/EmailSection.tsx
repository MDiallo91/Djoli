/**
 * components/settings/EmailSection.tsx
 * Providers d'envoi email : Resend et SMTP, avec routage par type de message.
 * Extrait de : AdminDashboard.tsx SettingsTab section === 'email' (~lignes 1368-1556)
 * Données : fetchSetting / saveSetting → clé 'email_providers'
 * Consommé par : page/admin/SettingsPage.tsx
 *
 * Plusieurs providers peuvent coexister (multi-provider).
 * Le routage désigne quel provider envoie chaque type d'email.
 */

import { useState, useEffect } from 'react';
import { Plus, Eye, EyeOff, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSetting, saveSetting } from '../../services/settingsApi';
import { Spinner } from '../../ui/design_system/Spinner';

// ─── Types locaux ─────────────────────────────────────────────
type EProviderType = 'resend' | 'smtp';
type ERoute = 'otp' | 'approval' | 'rejection';
interface EProvider {
  id: string;
  type: EProviderType;
  name: string;
  enabled: boolean;
  config: Record<string, any>;
}
interface EProvidersState {
  providers: EProvider[];
  routing: Record<ERoute, string>;
}

const DEFAULT_STATE: EProvidersState = { providers: [], routing: { otp: '', approval: '', rejection: '' } };

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all bg-white placeholder:text-slate-400';

export function EmailSection() {
  const [state,   setState]   = useState<EProvidersState>(DEFAULT_STATE);
  const [secrets, setSecrets] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    fetchSetting<EProvidersState>('email_providers').then(res => {
      if (res?.data) {
        setState(typeof res.data === 'string' ? JSON.parse(res.data) : res.data);
      } else {
        fetchSetting<any>('email_config').then(legRes => {
          if (legRes?.data?.apiKey) {
            const pid = 'migrated_resend';
            setState({
              providers: [{ id: pid, type: 'resend', name: 'Resend', enabled: true, config: { apiKey: legRes.data.apiKey, fromEmail: legRes.data.fromEmail || '', fromName: 'DJOLI' } }],
              routing: { otp: pid, approval: pid, rejection: pid },
            });
          }
        });
      }
      setLoading(false);
    });
  }, []);

  const genId = () => Math.random().toString(36).slice(2, 9);

  const addProvider = (type: EProviderType) => {
    const id = genId();
    const config = type === 'resend'
      ? { apiKey: '', fromEmail: '', fromName: 'DJOLI' }
      : { host: '', port: 587, secure: false, user: '', password: '', fromEmail: '', fromName: 'DJOLI' };
    setState(p => ({ ...p, providers: [...p.providers, { id, type, name: type === 'resend' ? 'Resend' : 'SMTP Hébergeur', enabled: false, config }] }));
  };

  const update = (id: string, patch: Partial<EProvider>) =>
    setState(p => ({ ...p, providers: p.providers.map(pr => pr.id === id ? { ...pr, ...patch } : pr) }));

  const updateCfg = (id: string, key: string, val: any) =>
    setState(p => ({ ...p, providers: p.providers.map(pr => pr.id === id ? { ...pr, config: { ...pr.config, [key]: val } } : pr) }));

  const remove = (id: string) =>
    setState(p => ({
      ...p,
      providers: p.providers.filter(pr => pr.id !== id),
      routing: Object.fromEntries(Object.entries(p.routing).map(([k, v]) => [k, v === id ? '' : v])) as Record<ERoute, string>,
    }));

  const save = async () => {
    setSaving(true);
    try {
      await saveSetting('email_providers', { statut: 1, data: state });
      toast.success('Configuration email sauvegardée');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12"><Spinner size="md" /></div>
  );

  return (
    <div className="space-y-4">
      {/* Entête + boutons ajout */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-black">Providers d'envoi d'email</p>
          <p className="text-xs text-black mt-0.5">Configurez un ou plusieurs services d'envoi</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => addProvider('resend')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition-all">
            <Plus size={12}/> Resend
          </button>
          <button type="button" onClick={() => addProvider('smtp')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-all">
            <Plus size={12}/> SMTP
          </button>
        </div>
      </div>

      {/* Placeholder vide */}
      {state.providers.length === 0 && (
        <div className="border-2 border-dashed border-slate-200 rounded-xl py-10 text-center">
          <p className="text-sm text-black">Aucun provider configuré</p>
          <p className="text-xs text-black mt-1">Ajoutez Resend ou SMTP pour activer l'envoi d'emails</p>
        </div>
      )}

      {/* Cards providers — 2 par ligne */}
      <div className="grid grid-cols-2 gap-4">
        {state.providers.map(prov => (
          <div key={prov.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${prov.enabled ? 'border-primary-200 shadow-sm' : 'border-slate-200'}`}>

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-widest flex-shrink-0 ${prov.type === 'resend' ? 'bg-primary-100 text-primary-700' : 'bg-sky-100 text-sky-700'}`}>
                {prov.type === 'resend' ? 'RESEND' : 'SMTP'}
              </span>
              <input type="text" value={prov.name} onChange={e => update(prov.id, { name: e.target.value })}
                className="flex-1 text-sm font-semibold text-slate-800 bg-transparent border-0 outline-none focus:bg-slate-50 rounded px-1.5 py-0.5 min-w-0"
                placeholder="Nom du provider" />
              <span className={`text-xs font-medium flex-shrink-0 ${prov.enabled ? 'text-secondary-600' : 'text-rose-400'}`}>
                {prov.enabled ? 'Actif' : 'Inactif'}
              </span>
              <button type="button" onClick={() => update(prov.id, { enabled: !prov.enabled })}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${prov.enabled ? 'bg-secondary-500' : 'bg-rose-300'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${prov.enabled ? 'translate-x-4' : ''}`} />
              </button>
              <button type="button" onClick={() => remove(prov.id)}
                className="w-7 h-7 flex items-center justify-center text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>

            {/* Corps credentials */}
            <div className="p-5">
              {prov.type === 'resend' ? (
                <div className="grid grid-cols-3 gap-4">
                  {/* Clé API */}
                  <div className="col-span-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Clé API</p>
                    <div className="flex gap-2">
                      <input type={secrets[prov.id] ? 'text' : 'password'} placeholder="re_xxxxxxxxxxxxxxxxxxxx"
                        value={prov.config.apiKey || ''} onChange={e => updateCfg(prov.id, 'apiKey', e.target.value)}
                        className={inputCls + ' font-mono text-xs'} />
                      <button type="button" onClick={() => setSecrets(p => ({ ...p, [prov.id]: !p[prov.id] }))}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 transition-all">
                        {secrets[prov.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Obtenir sur <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:underline">resend.com/api-keys</a> — commence par <code className="bg-slate-100 px-1 rounded">re_</code>
                    </p>
                  </div>
                  {/* Email + Nom */}
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email d'envoi</p>
                    <input type="email" placeholder="noreply@tondomaine.com"
                      value={prov.config.fromEmail || ''} onChange={e => updateCfg(prov.id, 'fromEmail', e.target.value)}
                      className={inputCls + ' text-xs'} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nom d'envoi</p>
                    <input type="text" placeholder="DJOLI"
                      value={prov.config.fromName || ''} onChange={e => updateCfg(prov.id, 'fromName', e.target.value)}
                      className={inputCls + ' text-xs'} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {/* Serveur + Port */}
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Serveur SMTP</p>
                    <input type="text" placeholder="smtp.votrehebergeur.com"
                      value={prov.config.host || ''} onChange={e => updateCfg(prov.id, 'host', e.target.value)}
                      className={inputCls + ' text-xs'} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Port</p>
                    <input type="number" placeholder="587"
                      value={prov.config.port || ''} onChange={e => updateCfg(prov.id, 'port', parseInt(e.target.value) || 587)}
                      className={inputCls + ' text-xs'} />
                  </div>
                  {/* Chiffrement */}
                  <div className="col-span-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Chiffrement</p>
                    <div className="flex gap-6">
                      {([['false', 'TLS / STARTTLS', 'Port 587'], ['true', 'SSL', 'Port 465']] as [string, string, string][]).map(([val, label, hint]) => (
                        <label key={val} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name={`ssl_${prov.id}`}
                            checked={String(prov.config.secure ?? false) === val}
                            onChange={() => updateCfg(prov.id, 'secure', val === 'true')}
                            className="accent-primary-600 w-3.5 h-3.5" />
                          <span className="text-xs text-slate-700">{label}</span>
                          <span className="text-[10px] text-slate-400">{hint}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Utilisateur + Mot de passe */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Utilisateur</p>
                    <input type="text" placeholder="contact@votredomaine.com"
                      value={prov.config.user || ''} onChange={e => updateCfg(prov.id, 'user', e.target.value)}
                      className={inputCls + ' text-xs'} />
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mot de passe</p>
                    <div className="flex gap-2">
                      <input type={secrets[prov.id] ? 'text' : 'password'} placeholder="••••••••"
                        value={prov.config.password || ''} onChange={e => updateCfg(prov.id, 'password', e.target.value)}
                        className={inputCls + ' text-xs'} />
                      <button type="button" onClick={() => setSecrets(p => ({ ...p, [prov.id]: !p[prov.id] }))}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 transition-all">
                        {secrets[prov.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  {/* Email + Nom d'envoi */}
                  <div className="col-span-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email d'envoi</p>
                    <input type="email" placeholder="noreply@votredomaine.com"
                      value={prov.config.fromEmail || ''} onChange={e => updateCfg(prov.id, 'fromEmail', e.target.value)}
                      className={inputCls + ' text-xs'} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nom d'envoi</p>
                    <input type="text" placeholder="DJOLI"
                      value={prov.config.fromName || ''} onChange={e => updateCfg(prov.id, 'fromName', e.target.value)}
                      className={inputCls + ' text-xs'} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Routage */}
      {state.providers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-xs text-black mb-1">Routage par type d'email</p>
            <p className="text-xs text-black">Choisissez quel provider envoie chaque type d'email. "Automatique" = premier provider actif.</p>
          </div>
          <div className="space-y-1">
            {([
              ['otp',       'OTP / Vérification email',  "Code envoyé à l'inscription"],
              ['approval',  'Approbation de compte',      'Dossier accepté'],
              ['rejection', 'Rejet de demande',           'Dossier refusé'],
            ] as [ERoute, string, string][]).map(([route, label, hint]) => (
              <div key={route} className="flex items-center gap-4 py-2.5 border-b border-slate-100 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-black">{label}</p>
                  <p className="text-[10px] text-black">{hint}</p>
                </div>
                <select value={state.routing[route] || ''}
                  onChange={e => setState(p => ({ ...p, routing: { ...p.routing, [route]: e.target.value } }))}
                  className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-black focus:outline-none focus:ring-2 focus:ring-primary-300 flex-shrink-0 min-w-[180px]">
                  <option value="">Automatique (1er actif)</option>
                  {state.providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}{!p.enabled ? ' (inactif)' : ''}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-700 transition-all disabled:opacity-50">
          <ShieldCheck size={13} /> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
}
