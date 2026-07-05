/**
 * components/settings/SmsSection.tsx
 * Configuration des providers SMS + templates de messages par événement.
 * Inspiré de : BELTAM sms-index.blade.php (providers + templates par statut)
 * Données : services/smsApi → clé 'sms'
 * Consommé par : page/admin/SettingsPage.tsx
 *
 * Contrainte métier : un seul provider actif à la fois (exclusion mutuelle).
 * Inspiré de : BELTAM (mutual exclusion pattern pour SMS providers).
 */

import { useState, useEffect } from 'react';
import { Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchSmsSettings, saveSmsSettings, sendTestSms } from '../../services/smsApi';
import type { SmsSettings, SmsProvider, SmsEventTemplate, SmsProviderType } from '../../types/integrations';
import { ProviderCard }      from '../../ui/component/ProviderCard';
import { EventTemplateForm } from '../../ui/component/EventTemplateForm';
import { Spinner }           from '../../ui/design_system/Spinner';

// ─── Valeurs par défaut ───────────────────────────────────────

const DEFAULT_PROVIDERS: SmsProvider[] = [
  { id: 'twilio',   name: 'Twilio',     enabled: false, config: { accountSid: '', authToken: '', fromNumber: '' } },
  { id: 'vonage',   name: 'Vonage',     enabled: false, config: { apiKey: '', apiSecret: '', fromNumber: '' } },
  { id: 'orange',   name: 'Orange SMS', enabled: false, config: { clientId: '', clientSecret: '', senderAddress: '' } },
  { id: 'infobip',  name: 'Infobip',    enabled: false, config: { apiKey: '', baseUrl: 'https://api.infobip.com', from: '' } },
  { id: 'lengosms', name: 'LengoSMS',   enabled: false, config: { apiKey: '', sender: '' } },
];

const DEFAULT_TEMPLATES: SmsEventTemplate[] = [
  { event: 'otp',               label: 'Code OTP',             enabled: true,  template: 'Votre code DJOLI : #CODE#. Valide 10 min.',               placeholders: ['#CODE#','#SCHOOL#','#APP#'] },
  { event: 'approval',          label: 'Compte approuvé',      enabled: true,  template: 'Votre école #SCHOOL# a été approuvée sur DJOLI !',         placeholders: ['#SCHOOL#','#APP#'] },
  { event: 'rejection',         label: 'Compte rejeté',        enabled: false, template: 'Votre demande pour #SCHOOL# a été refusée. Motif : #REASON#', placeholders: ['#SCHOOL#','#REASON#','#APP#'] },
  { event: 'payment_confirmed', label: 'Paiement confirmé',    enabled: false, template: 'Abonnement DJOLI activé pour #SCHOOL# — #DAYS# jours.',    placeholders: ['#SCHOOL#','#DAYS#','#AMOUNT#'] },
];

const DEFAULT: SmsSettings = { providers: DEFAULT_PROVIDERS, templates: DEFAULT_TEMPLATES };

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all bg-white placeholder:text-slate-400';

// Labels des champs par provider
const PROVIDER_FIELDS: Record<SmsProviderType, { key: string; label: string; placeholder: string; secret?: boolean }[]> = {
  twilio:   [
    { key: 'accountSid', label: 'Account SID',  placeholder: 'ACxxxxxxxxxxxxxxxx' },
    { key: 'authToken',  label: 'Auth Token',   placeholder: '••••••••••••••••', secret: true },
    { key: 'fromNumber', label: 'Numéro From',  placeholder: '+1234567890' },
  ],
  vonage:   [
    { key: 'apiKey',     label: 'API Key',      placeholder: 'xxxxxxxx' },
    { key: 'apiSecret',  label: 'API Secret',   placeholder: '••••••••', secret: true },
    { key: 'fromNumber', label: 'Expéditeur',   placeholder: 'DJOLI' },
  ],
  orange:   [
    { key: 'clientId',      label: 'Client ID',     placeholder: 'xxxx-xxxx-xxxx' },
    { key: 'clientSecret',  label: 'Client Secret', placeholder: '••••••••', secret: true },
    { key: 'senderAddress', label: 'Expéditeur',    placeholder: 'tel:+224620000000' },
  ],
  infobip:  [
    { key: 'apiKey',   label: 'API Key',  placeholder: '••••••••', secret: true },
    { key: 'baseUrl',  label: 'Base URL', placeholder: 'https://api.infobip.com' },
    { key: 'from',     label: 'From',     placeholder: 'DJOLI' },
  ],
  lengosms: [
    { key: 'apiKey', label: 'API Key',    placeholder: '••••••••', secret: true },
    { key: 'sender', label: 'Expéditeur', placeholder: 'DJOLI' },
  ],
};

export function SmsSection() {
  const [settings, setSettings] = useState<SmsSettings>(DEFAULT);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testing,  setTesting]  = useState(false);
  const [secrets,  setSecrets]  = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchSmsSettings().then(s => {
      if (s) setSettings({ providers: mergeProviders(s.providers), templates: mergeTemplates(s.templates) });
      setLoading(false);
    });
  }, []);

  // Fusionne les providers sauvegardés avec les defaults (preserve new providers)
  const mergeProviders = (saved: SmsProvider[]): SmsProvider[] =>
    DEFAULT_PROVIDERS.map(d => saved.find(s => s.id === d.id) ?? d);

  const mergeTemplates = (saved: SmsEventTemplate[]): SmsEventTemplate[] =>
    DEFAULT_TEMPLATES.map(d => saved.find(s => s.event === d.event) ?? d);

  // Exclusion mutuelle : activer un provider désactive les autres
  const toggleProvider = (id: SmsProviderType, enabled: boolean) =>
    setSettings(p => ({
      ...p,
      providers: p.providers.map(pr => ({
        ...pr,
        enabled: pr.id === id ? enabled : (enabled ? false : pr.enabled),
      })),
    }));

  const setCfg = (id: SmsProviderType, key: string, val: string) =>
    setSettings(p => ({
      ...p,
      providers: p.providers.map(pr => pr.id === id ? { ...pr, config: { ...pr.config, [key]: val } } : pr),
    }));

  const updateTemplate = (event: string, patch: Partial<SmsEventTemplate>) =>
    setSettings(p => ({
      ...p,
      templates: p.templates.map(t => t.event === event ? { ...t, ...patch } : t),
    }));

  const save = async () => {
    setSaving(true);
    try {
      await saveSmsSettings(settings);
      toast.success('Configuration SMS sauvegardée');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testPhone.trim()) { toast.error('Entrez un numéro de test'); return; }
    setTesting(true);
    try {
      const res = await sendTestSms(testPhone.trim());
      if (res.success) toast.success(res.message || 'SMS test envoyé');
      else             toast.error(res.message || 'Échec envoi test');
    } catch (e: any) {
      toast.error(e.message || 'Erreur réseau');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12"><Spinner size="md" /></div>
  );

  const activeProvider = settings.providers.find(p => p.enabled);

  return (
    <div className="space-y-6">
      {/* Avertissement exclusion mutuelle */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
        Un seul provider SMS peut être actif à la fois. Activer un provider désactive automatiquement les autres.
      </div>

      {/* Providers */}
      <div className="grid grid-cols-2 gap-4">
        {settings.providers.map(prov => {
          const fields = PROVIDER_FIELDS[prov.id] ?? [];
          return (
            <ProviderCard
              key={prov.id}
              name={prov.name}
              initials={prov.name.slice(0, 2).toUpperCase()}
              enabled={prov.enabled}
              onToggle={v => toggleProvider(prov.id as SmsProviderType, v)}
            >
              {fields.map(f => (
                <div key={f.key}>
                  <p className="text-xs text-black mb-1">{f.label}</p>
                  <div className="flex gap-2">
                    <input
                      type={f.secret && !secrets[`${prov.id}_${f.key}`] ? 'password' : 'text'}
                      placeholder={f.placeholder}
                      value={prov.config[f.key] || ''}
                      onChange={e => setCfg(prov.id as SmsProviderType, f.key, e.target.value)}
                      className={inputCls + ' text-xs'}
                    />
                    {f.secret && (
                      <button type="button"
                        onClick={() => setSecrets(p => ({ ...p, [`${prov.id}_${f.key}`]: !p[`${prov.id}_${f.key}`] }))}
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-slate-200 rounded-xl text-slate-400 hover:bg-slate-50 transition-all text-xs">
                        {secrets[`${prov.id}_${f.key}`] ? '🙈' : '👁'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </ProviderCard>
          );
        })}
      </div>

      {/* Test d'envoi */}
      {activeProvider && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold text-slate-700">Tester l'envoi via {activeProvider.name}</p>
          <div className="flex gap-3">
            <input type="tel" placeholder="+224 620 000 000" value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              className={inputCls + ' text-xs'} />
            <button type="button" onClick={sendTest} disabled={testing}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700 transition-all disabled:opacity-50 whitespace-nowrap flex-shrink-0">
              <Send size={12}/> {testing ? 'Envoi…' : 'Envoyer test'}
            </button>
          </div>
        </div>
      )}

      {/* Templates */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Templates de messages</p>
          <p className="text-xs text-slate-500 mt-0.5">Personnalisez les messages envoyés pour chaque événement.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {settings.templates.map(tpl => (
            <EventTemplateForm
              key={tpl.event}
              label={tpl.label}
              enabled={tpl.enabled}
              onToggle={v => updateTemplate(tpl.event, { enabled: v })}
              value={tpl.template}
              onChange={v => updateTemplate(tpl.event, { template: v })}
              placeholders={tpl.placeholders}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-700 transition-all disabled:opacity-50">
          <ShieldCheck size={13}/> {saving ? 'Sauvegarde…' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  );
}
