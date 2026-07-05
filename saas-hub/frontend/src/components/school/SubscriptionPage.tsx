import { useState, useEffect } from 'react';
import {
  CheckCircle, Clock, AlertTriangle, MessageCircle, Mail,
  Zap, CreditCard, RefreshCw, ChevronRight, Shield,
  Star,
} from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../../lib/apiClient';

// ─── Types ────────────────────────────────────────────────────

interface Plan {
  days: number;
  label: string;
  badge: string | null;
  amount: number;
  currency: string;
  breakdown: string;
}

interface Gateway {
  id: string;
  name: string;
  environment: string;
}

interface SubscriptionInfo {
  subscription: {
    status: string;
    expiry: string;
    daysRemaining: number;
    isExpired: boolean;
  };
  gateways: Gateway[];
  plans: Plan[];
  contact: { whatsapp: string | null; email: string | null };
}

interface PaymentResult {
  paymentId: string;
  amount: number;
  currency: string;
  breakdown: string;
  gateway: { id: string; name: string };
  instructions: { type: string; steps: string[] };
}

interface HistoryEntry {
  id: string;
  plan: number;
  amount: number;
  currency: string;
  gateway: string;
  status: string;
  reference: string | null;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: 'Actif',       color: 'text-secondary-700', bg: 'bg-secondary-50 border-secondary-200' },
  trial:   { label: 'Essai',       color: 'text-amber-700',     bg: 'bg-amber-50 border-amber-200' },
  expired: { label: 'Expiré',      color: 'text-red-700',       bg: 'bg-red-50 border-red-200' },
  pending: { label: 'En attente',  color: 'text-slate-600',     bg: 'bg-slate-100 border-slate-200' },
};

const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'En attente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmé',   cls: 'bg-secondary-50 text-secondary-700 border-secondary-200' },
  failed:    { label: 'Échoué',     cls: 'bg-red-50 text-red-700 border-red-200' },
  cancelled: { label: 'Annulé',     cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function fmt(n: number, currency: string) {
  if (currency === 'GNF') return `${Math.round(n).toLocaleString('fr')} GNF`;
  if (currency === 'EUR') return `${n.toFixed(2)} €`;
  return `$${n.toFixed(2)}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Sous-composants ──────────────────────────────────────────

function StatusBanner({ info, schoolName }: { info: SubscriptionInfo; schoolName: string }) {
  const sub = info.subscription;
  const st  = STATUS_LABELS[sub.status] ?? STATUS_LABELS.pending;
  const urgent = sub.daysRemaining <= 7 && !sub.isExpired;

  return (
    <div className={`rounded-2xl border p-5 ${sub.isExpired ? 'bg-red-50 border-red-200' : urgent ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {sub.isExpired
              ? <AlertTriangle size={16} className="text-red-500" />
              : sub.status === 'active'
                ? <CheckCircle size={16} className="text-secondary-500" />
                : <Clock size={16} className="text-amber-500" />}
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${st.bg} ${st.color}`}>
              {st.label}
            </span>
          </div>
          <p className="font-semibold text-slate-900">{schoolName}</p>
          {sub.isExpired
            ? <p className="text-sm text-red-600 mt-0.5">Abonnement expiré le {fmtDate(sub.expiry)}</p>
            : <p className="text-sm text-slate-500 mt-0.5">
                {sub.daysRemaining > 0
                  ? <>Expire le <span className="font-medium text-slate-700">{fmtDate(sub.expiry)}</span> — <span className={`font-semibold ${urgent ? 'text-amber-600' : 'text-slate-700'}`}>{sub.daysRemaining} jour{sub.daysRemaining > 1 ? 's' : ''} restant{sub.daysRemaining > 1 ? 's' : ''}</span></>
                  : 'Aucune date d\'expiration'}
              </p>}
        </div>
        {urgent && !sub.isExpired && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
            <Zap size={12} /> Renouveler bientôt
          </span>
        )}
      </div>
    </div>
  );
}

function PlanCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: () => void }) {
  const popular = plan.badge === 'Populaire';
  const best    = plan.badge === 'Meilleure valeur';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'relative w-full text-left rounded-2xl border-2 p-5 transition-all',
        selected
          ? 'border-primary-500 bg-primary-50/50'
          : 'border-slate-200 bg-white hover:border-slate-300',
      ].join(' ')}
    >
      {plan.badge && (
        <span className={`absolute -top-3 left-4 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${popular ? 'bg-primary-600 text-white' : 'bg-amber-400 text-amber-900'}`}>
          {plan.badge}
        </span>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{plan.label}</p>
          <p className="text-xs text-slate-400 mt-0.5">{plan.breakdown}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-lg font-bold text-slate-900">{fmt(plan.amount, plan.currency)}</p>
        </div>
      </div>

      {selected && (
        <div className="absolute top-3 right-3 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
          <CheckCircle size={12} className="text-white" />
        </div>
      )}
    </button>
  );
}

function GatewayButton({ gw, selected, onSelect }: { gw: Gateway; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium',
        selected ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
      ].join(' ')}
    >
      <CreditCard size={15} />
      {gw.name}
      {gw.environment === 'sandbox' && (
        <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">SANDBOX</span>
      )}
    </button>
  );
}

function PaymentInstructions({ result, onDone }: { result: PaymentResult; onDone: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-secondary-50 rounded-xl flex items-center justify-center border border-secondary-200">
          <CheckCircle size={18} className="text-secondary-600" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Paiement initié</p>
          <p className="text-xs text-slate-500">via {result.gateway.name} — {fmt(result.amount, result.currency)}</p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2.5">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Instructions de paiement</p>
        {result.instructions.steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <p className="text-sm text-slate-700">{step}</p>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
        <strong>Important :</strong> Votre abonnement sera activé après confirmation du paiement par notre équipe (délai max 24h).
      </div>

      <button onClick={onDone}
        className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all">
        Terminer
      </button>
    </div>
  );
}

function ContactAdmin({ contact, planLabel, schoolName }: {
  contact: { whatsapp: string | null; email: string | null };
  planLabel: string;
  schoolName: string;
}) {
  const msg = encodeURIComponent(
    `Bonjour, je suis l'école "${schoolName}". Je souhaite activer un abonnement ${planLabel} sur DJOLI. Merci de procéder à l'activation.`
  );
  const subject = encodeURIComponent(`Demande d'abonnement DJOLI — ${schoolName}`);
  const body    = encodeURIComponent(`Bonjour,\n\nJe suis l'école "${schoolName}" et je souhaite activer un abonnement ${planLabel} sur DJOLI.\n\nMerci de procéder à l'activation.\n\nCordialement`);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <MessageCircle size={20} className="text-slate-500" />
        </div>
        <p className="font-semibold text-slate-900 mb-1">Contactez l'administrateur</p>
        <p className="text-sm text-slate-500">
          Aucun paiement en ligne disponible pour le moment. Contactez-nous pour activer votre abonnement <strong>{planLabel}</strong>.
        </p>
      </div>

      <div className="space-y-2.5">
        {contact.whatsapp && (
          <a
            href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}?text=${msg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border-2 border-green-200 bg-green-50 text-green-700 font-semibold text-sm hover:bg-green-100 transition-all"
          >
            <MessageCircle size={18} />
            Contacter via WhatsApp
            <ChevronRight size={15} className="ml-auto" />
          </a>
        )}
        {contact.email && (
          <a
            href={`mailto:${contact.email}?subject=${subject}&body=${body}`}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all"
          >
            <Mail size={18} />
            Contacter par email
            <ChevronRight size={15} className="ml-auto" />
          </a>
        )}
        {!contact.whatsapp && !contact.email && (
          <p className="text-center text-sm text-slate-400">Aucun contact disponible pour le moment.</p>
        )}
      </div>
    </div>
  );
}

function PaymentHistory({ history }: { history: HistoryEntry[] }) {
  if (!history.length) return null;
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-semibold text-slate-800">Historique des paiements</p>
      </div>
      <div className="divide-y divide-slate-100">
        {history.map(h => {
          const st = PAYMENT_STATUS[h.status] ?? PAYMENT_STATUS.pending;
          return (
            <div key={h.id} className="flex items-center justify-between px-5 py-3.5 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-800">{h.plan} jours — {h.gateway}</p>
                <p className="text-xs text-slate-400">{fmtDate(h.createdAt)}{h.reference ? ` · Réf: ${h.reference}` : ''}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <p className="text-sm font-semibold text-slate-700">{fmt(h.amount, h.currency)}</p>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────

export function SubscriptionPage({ schoolName }: { schoolName: string }) {
  const [info,        setInfo]        = useState<SubscriptionInfo | null>(null);
  const [history,     setHistory]     = useState<HistoryEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [selectedGw,   setSelectedGw]   = useState<string | null>(null);
  const [paying,      setPaying]      = useState(false);
  const [payResult,   setPayResult]   = useState<PaymentResult | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [infoRes, histRes] = await Promise.all([
        apiClient.get('/subscription/info'),
        apiClient.get('/subscription/payment/history'),
      ]);
      setInfo(infoRes.data);
      setHistory(histRes.data ?? []);
      // Pré-sélectionner le plan populaire (90j)
      if (!selectedPlan) setSelectedPlan(90);
    } catch {
      toast.error('Impossible de charger les informations d\'abonnement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handlePay = async () => {
    if (!selectedPlan || !selectedGw) return;
    setPaying(true);
    try {
      const res = await apiClient.post('/subscription/payment/initiate', {
        planDays: selectedPlan,
        gatewayId: selectedGw,
      });
      setPayResult(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'initiation du paiement');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw size={20} className="text-slate-400 animate-spin" />
      </div>
    );
  }

  if (!info) return null;

  const hasGateways  = info.gateways.length > 0;
  const selectedPlanObj = info.plans.find(p => p.days === selectedPlan);

  // Après paiement initié → instructions
  if (payResult) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <PaymentInstructions result={payResult} onDone={() => { setPayResult(null); load(); }} />
        <PaymentHistory history={history} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Statut actuel */}
      <StatusBanner info={info} schoolName={schoolName} />

      {/* Sélection du plan */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Star size={15} className="text-primary-500" />
          <p className="font-semibold text-slate-900 text-sm">Choisir un plan</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {info.plans.map(plan => (
            <PlanCard
              key={plan.days}
              plan={plan}
              selected={selectedPlan === plan.days}
              onSelect={() => setSelectedPlan(plan.days)}
            />
          ))}
        </div>
      </div>

      {/* Cas A : gateways disponibles */}
      {hasGateways && selectedPlanObj && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-primary-500" />
            <p className="font-semibold text-slate-900 text-sm">Moyen de paiement</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {info.gateways.map(gw => (
              <GatewayButton
                key={gw.id}
                gw={gw}
                selected={selectedGw === gw.id}
                onSelect={() => setSelectedGw(gw.id)}
              />
            ))}
          </div>

          {selectedGw && (
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-500">Montant à payer</p>
                  <p className="text-xl font-bold text-slate-900">
                    {fmt(selectedPlanObj.amount, selectedPlanObj.currency)}
                  </p>
                  <p className="text-xs text-slate-400">{selectedPlanObj.breakdown}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Shield size={12} /> Sécurisé
                </div>
              </div>
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full py-3.5 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))', boxShadow: '0 4px 14px rgba(var(--primary-600-rgb),0.35)' }}
              >
                {paying
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Traitement…</>
                  : <>Payer {fmt(selectedPlanObj.amount, selectedPlanObj.currency)} <ChevronRight size={15} /></>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cas B : pas de gateway → contact admin */}
      {!hasGateways && selectedPlanObj && (
        <ContactAdmin
          contact={info.contact}
          planLabel={selectedPlanObj.label}
          schoolName={schoolName}
        />
      )}

      {/* Historique */}
      <PaymentHistory history={history} />
    </div>
  );
}
