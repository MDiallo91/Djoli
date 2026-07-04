/**
 * components/settings/PaymentSection.tsx
 * Gateways de paiement : Wave, Orange Money, MTN MoMo, PayDunya, CinetPay,
 *                        Stripe, PayPal, Virement bancaire.
 * Inspiré de : BELTAM payment-method/index.blade.php (card-per-gateway + sandbox/live toggle)
 * Données : services/paymentApi → clé 'payment'
 * Consommé par : page/admin/SettingsPage.tsx
 *
 * Contrainte : plusieurs gateways peuvent être actifs simultanément (multi-gateway).
 * Sandbox/live toggle indépendant par gateway.
 * URL de callback affichée en lecture seule (CopyField).
 */

import { useState, useEffect } from 'react';
import { ShieldCheck, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { fetchPaymentSettings, savePaymentSettings, testGatewayConnection, getCallbackUri } from '../../services/paymentApi';
import type { PaymentSettings, PaymentProvider, PaymentProviderType } from '../../types/integrations';
import { ProviderCard }  from '../../ui/component/ProviderCard';
import { SandboxBadge }  from '../../ui/component/SandboxBadge';
import { CopyField }     from '../../ui/design_system/CopyField';
import { Spinner }       from '../../ui/design_system/Spinner';

// ─── Valeurs par défaut ───────────────────────────────────────

const DEFAULT_PROVIDERS: PaymentProvider[] = [
  { id: 'wave',         name: 'Wave',                 enabled: false, environment: 'sandbox', config: { apiKey: '', merchantId: '' } },
  { id: 'orange_money', name: 'Orange Money',          enabled: false, environment: 'sandbox', config: { clientId: '', clientSecret: '', merchantId: '' } },
  { id: 'mtn_momo',    name: 'MTN MoMo',              enabled: false, environment: 'sandbox', config: { subscriptionKey: '', apiUser: '', apiKey: '' } },
  { id: 'paydunya',    name: 'PayDunya',               enabled: false, environment: 'sandbox', config: { masterKey: '', privateKey: '', publicKey: '', token: '' } },
  { id: 'cinetpay',    name: 'CinetPay',               enabled: false, environment: 'sandbox', config: { apikey: '', siteId: '' } },
  { id: 'stripe',      name: 'Stripe',                  enabled: false, environment: 'sandbox', config: { secretKey: '', publishableKey: '', webhookSecret: '' } },
  { id: 'paypal',      name: 'PayPal',                  enabled: false, environment: 'sandbox', config: { clientId: '', clientSecret: '' } },
  { id: 'bank_transfer', name: 'Virement bancaire',    enabled: false, environment: 'live',    config: { bankName: '', iban: '', bic: '', accountHolder: '' } },
];

const DEFAULT: PaymentSettings = { providers: DEFAULT_PROVIDERS };

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all bg-white placeholder:text-slate-400';

// Champs par provider
const PROVIDER_FIELDS: Record<PaymentProviderType, { key: string; label: string; placeholder: string; secret?: boolean; hint?: string }[]> = {
  wave: [
    { key: 'apiKey',      label: 'API Key',     placeholder: '••••••••', secret: true, hint: 'Wave for Business → Développeurs' },
    { key: 'merchantId',  label: 'Merchant ID', placeholder: 'M-xxxxxxx' },
  ],
  orange_money: [
    { key: 'clientId',     label: 'Client ID',     placeholder: 'xxxx' },
    { key: 'clientSecret', label: 'Client Secret', placeholder: '••••••••', secret: true },
    { key: 'merchantId',   label: 'Merchant ID',   placeholder: 'M-xxxxxxx' },
  ],
  mtn_momo: [
    { key: 'subscriptionKey', label: 'Subscription Key', placeholder: '••••••••', secret: true, hint: 'MTN MoMo API → Collections' },
    { key: 'apiUser',         label: 'API User (UUID)',   placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
    { key: 'apiKey',          label: 'API Key',           placeholder: '••••••••', secret: true },
  ],
  paydunya: [
    { key: 'masterKey',  label: 'Master Key',   placeholder: '••••••••', secret: true },
    { key: 'privateKey', label: 'Private Key',  placeholder: '••••••••', secret: true },
    { key: 'publicKey',  label: 'Public Key',   placeholder: 'xxxx' },
    { key: 'token',      label: 'Token',        placeholder: 'xxxx' },
  ],
  cinetpay: [
    { key: 'apikey', label: 'API Key',  placeholder: '••••••••', secret: true, hint: 'CinetPay → Mon compte → API' },
    { key: 'siteId', label: 'Site ID', placeholder: '1234567' },
  ],
  stripe: [
    { key: 'secretKey',     label: 'Secret Key',     placeholder: 'sk_live_…', secret: true },
    { key: 'publishableKey',label: 'Publishable Key',placeholder: 'pk_live_…' },
    { key: 'webhookSecret', label: 'Webhook Secret', placeholder: 'whsec_…', secret: true },
  ],
  paypal: [
    { key: 'clientId',     label: 'Client ID',     placeholder: 'AXxx…' },
    { key: 'clientSecret', label: 'Client Secret', placeholder: '••••••••', secret: true },
  ],
  bank_transfer: [
    { key: 'bankName',       label: 'Nom de la banque',   placeholder: 'Banque XYZ' },
    { key: 'accountHolder',  label: 'Titulaire du compte',placeholder: 'DJOLI SARL' },
    { key: 'iban',           label: 'IBAN / N° de compte',placeholder: 'GN…' },
    { key: 'bic',            label: 'BIC / SWIFT',        placeholder: 'XYZXYZ2X' },
  ],
};

export function PaymentSection() {
  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [secrets,  setSecrets]  = useState<Record<string, boolean>>({});
  const [testing,  setTesting]  = useState<PaymentProviderType | null>(null);

  useEffect(() => {
    fetchPaymentSettings().then(s => {
      if (s) setSettings({ providers: mergeProviders(s.providers) });
      setLoading(false);
    });
  }, []);

  const mergeProviders = (saved: PaymentProvider[]): PaymentProvider[] =>
    DEFAULT_PROVIDERS.map(d => saved.find(s => s.id === d.id) ?? d);

  const toggleProvider = (id: PaymentProviderType, enabled: boolean) =>
    setSettings(p => ({ ...p, providers: p.providers.map(pr => pr.id === id ? { ...pr, enabled } : pr) }));

  const setEnv = (id: PaymentProviderType, environment: 'sandbox' | 'live') =>
    setSettings(p => ({ ...p, providers: p.providers.map(pr => pr.id === id ? { ...pr, environment } : pr) }));

  const setCfg = (id: PaymentProviderType, key: string, val: string) =>
    setSettings(p => ({
      ...p,
      providers: p.providers.map(pr => pr.id === id ? { ...pr, config: { ...pr.config, [key]: val } } : pr),
    }));

  const save = async () => {
    setSaving(true);
    try {
      await savePaymentSettings(settings);
      toast.success('Gateways de paiement sauvegardés');
    } catch (e: any) {
      toast.error(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const testGateway = async (id: PaymentProviderType) => {
    setTesting(id);
    try {
      const res = await testGatewayConnection(id);
      if (res.success) toast.success(res.message || 'Connexion réussie');
      else             toast.error(res.message || 'Échec de la connexion');
    } catch (e: any) {
      toast.error(e.message || 'Erreur réseau');
    } finally {
      setTesting(null);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12"><Spinner size="md" /></div>
  );

  const activeCount = settings.providers.filter(p => p.enabled).length;

  return (
    <div className="space-y-6">
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-xs text-emerald-700">
        {activeCount} gateway{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''}. Plusieurs gateways peuvent être activés simultanément.
        Configurez les URL de callback dans votre dashboard provider.
      </div>

      {/* Grid des gateways */}
      <div className="grid grid-cols-2 gap-4">
        {settings.providers.map(prov => {
          const fields = PROVIDER_FIELDS[prov.id] ?? [];
          const callbackUri = prov.id !== 'bank_transfer' ? getCallbackUri(prov.id) : null;

          return (
            <ProviderCard
              key={prov.id}
              name={prov.name}
              initials={prov.name.slice(0, 2).toUpperCase()}
              enabled={prov.enabled}
              onToggle={v => toggleProvider(prov.id as PaymentProviderType, v)}
              badge={
                prov.id !== 'bank_transfer' ? (
                  <SandboxBadge
                    env={prov.environment}
                    onChange={v => setEnv(prov.id as PaymentProviderType, v)}
                  />
                ) : undefined
              }
              footer={
                prov.id !== 'bank_transfer' ? (
                  <button type="button"
                    onClick={() => testGateway(prov.id as PaymentProviderType)}
                    disabled={testing === prov.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-all disabled:opacity-50">
                    <Zap size={11}/> {testing === prov.id ? 'Test…' : 'Tester connexion'}
                  </button>
                ) : undefined
              }
            >
              {/* Champs credentials */}
              {fields.map(f => (
                <div key={f.key}>
                  <p className="text-xs text-black mb-1">{f.label}</p>
                  {f.hint && <p className="text-[10px] text-slate-400 mb-1">{f.hint}</p>}
                  <div className="flex gap-2">
                    <input
                      type={f.secret && !secrets[`${prov.id}_${f.key}`] ? 'password' : 'text'}
                      placeholder={f.placeholder}
                      value={prov.config[f.key] || ''}
                      onChange={e => setCfg(prov.id as PaymentProviderType, f.key, e.target.value)}
                      className={inputCls + ' text-xs font-mono'}
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

              {/* URL de callback en lecture seule */}
              {callbackUri && (
                <CopyField
                  label="URL de callback (webhook)"
                  value={callbackUri}
                  hint="À configurer dans votre dashboard provider"
                />
              )}
            </ProviderCard>
          );
        })}
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
