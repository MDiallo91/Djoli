/**
 * components/settings/PushSection.tsx
 * Configuration des providers push notification + templates par événement.
 * Inspiré de : BELTAM fcm-index.blade.php (FCM config + templates titre+corps)
 * Données : services/pushApi → clé 'push'
 * Consommé par : page/admin/SettingsPage.tsx
 */

import { useState, useEffect } from 'react';
import { Bell, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { fetchPushSettings, savePushSettings, sendTestPush } from '../../services/pushApi';
import type { PushSettings, PushProvider, PushEventTemplate, PushProviderType } from '../../types/integrations';
import { ProviderCard }      from '../../ui/component/ProviderCard';
import { EventTemplateForm } from '../../ui/component/EventTemplateForm';
import { Spinner }           from '../../ui/design_system/Spinner';

// ─── Valeurs par défaut ───────────────────────────────────────

const DEFAULT_PROVIDERS: PushProvider[] = [
  {
    id: 'fcm', name: 'Firebase Cloud Messaging (FCM)',
    enabled: false,
    config: { serverKey: '', projectId: '', vapidKey: '' },
  },
  {
    id: 'onesignal', name: 'OneSignal',
    enabled: false,
    config: { appId: '', apiKey: '', safariWebId: '' },
  },
];

const DEFAULT_TEMPLATES: PushEventTemplate[] = [
  { event: 'otp',               label: 'Code OTP',            enabled: true,  title: 'Code de vérification', body: 'Votre code DJOLI : #CODE#. Valide 10 min.', placeholders: ['#CODE#','#SCHOOL#','#APP#'] },
  { event: 'approval',          label: 'Compte approuvé',     enabled: true,  title: '#SCHOOL# approuvée !', body: 'Bienvenue dans la famille DJOLI — votre école est activée.', placeholders: ['#SCHOOL#','#APP#'] },
  { event: 'rejection',         label: 'Compte rejeté',       enabled: false, title: 'Demande refusée',      body: 'Votre demande pour #SCHOOL# a été refusée. #REASON#', placeholders: ['#SCHOOL#','#REASON#'] },
  { event: 'payment_confirmed', label: 'Paiement confirmé',   enabled: false, title: 'Abonnement activé',    body: 'Abonnement DJOLI pour #SCHOOL# — #DAYS# jours.',       placeholders: ['#SCHOOL#','#DAYS#','#AMOUNT#'] },
];

const DEFAULT: PushSettings = { providers: DEFAULT_PROVIDERS, templates: DEFAULT_TEMPLATES };

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all bg-white placeholder:text-slate-400';

const PROVIDER_FIELDS: Record<PushProviderType, { key: string; label: string; placeholder: string; hint?: string }[]> = {
  fcm: [
    { key: 'projectId',  label: 'Project ID',   placeholder: 'my-djoli-app' },
    { key: 'serverKey',  label: 'Server Key',   placeholder: 'AAAA…', hint: 'Firebase Console → Paramètres du projet → Cloud Messaging' },
    { key: 'vapidKey',   label: 'VAPID Key',    placeholder: 'BG…', hint: 'Optionnel — pour les push web' },
  ],
  onesignal: [
    { key: 'appId',      label: 'App ID',       placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'apiKey',     label: 'REST API Key', placeholder: '••••••••', hint: 'OneSignal → Settings → Keys & IDs' },
    { key: 'safariWebId',label: 'Safari Web ID',placeholder: 'web.onesignal.auto.…', hint: 'Optionnel — requis pour Safari' },
  ],
};

export function PushSection() {
  const [settings, setSettings] = useState<PushSettings>(DEFAULT);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [testTitle,setTestTitle]= useState('Test DJOLI');
  const [testBody, setTestBody] = useState('Ceci est une notification de test.');
  const [testing,  setTesting]  = useState(false);

  useEffect(() => {
    fetchPushSettings().then(s => {
      if (s) setSettings({ providers: mergeProviders(s.providers), templates: mergeTemplates(s.templates) });
      setLoading(false);
    });
  }, []);

  const mergeProviders = (saved: PushProvider[]): PushProvider[] =>
    DEFAULT_PROVIDERS.map(d => saved.find(s => s.id === d.id) ?? d);

  const mergeTemplates = (saved: PushEventTemplate[]): PushEventTemplate[] =>
    DEFAULT_TEMPLATES.map(d => saved.find(s => s.event === d.event) ?? d);

  const toggleProvider = (id: PushProviderType, enabled: boolean) =>
    setSettings(p => ({
      ...p,
      providers: p.providers.map(pr => ({
        ...pr,
        enabled: pr.id === id ? enabled : (enabled ? false : pr.enabled),
      })),
    }));

  const setCfg = (id: PushProviderType, key: string, val: string) =>
    setSettings(p => ({
      ...p,
      providers: p.providers.map(pr => pr.id === id ? { ...pr, config: { ...pr.config, [key]: val } } : pr),
    }));

  const updateTemplate = (event: string, patch: Partial<PushEventTemplate>) =>
    setSettings(p => ({
      ...p,
      templates: p.templates.map(t => t.event === event ? { ...t, ...patch } : t),
    }));

  const save = async () => {
    setSaving(true);
    try {
      await savePushSettings(settings);
      toast.success('Configuration push sauvegardée');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    if (!testTitle.trim() && !testBody.trim()) { toast.error('Remplissez le titre ou le corps'); return; }
    setTesting(true);
    try {
      const res = await sendTestPush({ title: testTitle, body: testBody });
      if (res.success) toast.success(res.message || 'Notification test envoyée');
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
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
        Un seul provider push peut être actif à la fois. Les push notifications nécessitent l'intégration du SDK côté application desktop.
      </div>

      {/* Providers */}
      <div className="grid grid-cols-2 gap-4">
        {settings.providers.map(prov => {
          const fields = PROVIDER_FIELDS[prov.id] ?? [];
          return (
            <ProviderCard
              key={prov.id}
              name={prov.name}
              initials={prov.id === 'fcm' ? 'FCM' : 'OS'}
              enabled={prov.enabled}
              onToggle={v => toggleProvider(prov.id as PushProviderType, v)}
            >
              {fields.map(f => (
                <div key={f.key}>
                  <p className="text-xs text-black mb-1">{f.label}</p>
                  {f.hint && <p className="text-[10px] text-slate-400 mb-1">{f.hint}</p>}
                  <input
                    type="text"
                    placeholder={f.placeholder}
                    value={prov.config[f.key] || ''}
                    onChange={e => setCfg(prov.id as PushProviderType, f.key, e.target.value)}
                    className={inputCls + ' text-xs'}
                  />
                </div>
              ))}
            </ProviderCard>
          );
        })}
      </div>

      {/* Test d'envoi */}
      {activeProvider && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <p className="text-xs font-semibold text-slate-700">Tester via {activeProvider.name}</p>
          <div className="space-y-2">
            <input type="text" placeholder="Titre de la notification" value={testTitle}
              onChange={e => setTestTitle(e.target.value)}
              className={inputCls + ' text-xs'} />
            <input type="text" placeholder="Corps de la notification" value={testBody}
              onChange={e => setTestBody(e.target.value)}
              className={inputCls + ' text-xs'} />
          </div>
          <button type="button" onClick={sendTest} disabled={testing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-xs hover:bg-primary-700 transition-all disabled:opacity-50">
            <Bell size={12}/> {testing ? 'Envoi…' : 'Envoyer notification test'}
          </button>
        </div>
      )}

      {/* Templates */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">Templates de notifications</p>
          <p className="text-xs text-slate-500 mt-0.5">Chaque template a un titre et un corps personnalisables.</p>
        </div>
        {settings.templates.map(tpl => (
          <EventTemplateForm
            key={tpl.event}
            label={tpl.label}
            enabled={tpl.enabled}
            onToggle={v => updateTemplate(tpl.event, { enabled: v })}
            value={tpl.body}
            onChange={v => updateTemplate(tpl.event, { body: v })}
            placeholders={tpl.placeholders}
            title={tpl.title}
            onTitleChange={v => updateTemplate(tpl.event, { title: v })}
          />
        ))}
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
