/**
 * page/admin/SettingsPage.tsx
 * Orchestrateur des paramètres admin — navigation par groupes + sections.
 *
 * Groupes :
 *   Général      → Site, Contact, Tarification, Application
 *   Pages        → Accueil, Pages légales
 *   Communications → Email, SMS, Push
 *   Paiement     → Gateways de paiement
 *   Système      → Journal d'audit
 *
 * Chaque section est un composant autonome qui gère son propre état et save.
 * URL : /admin/parametres/<section> (ex: /admin/parametres/sms)
 *
 * Remplace : SettingsTab exporté depuis AdminDashboard.tsx (supprimé en Sprint 6)
 * Consommé par : App.tsx (route /admin/parametres/*)
 */

import { useNavigate, useLocation } from 'react-router-dom';
import type { SettingsSection } from '../../types/admin';
import { pathToSection }        from '../../constants/routes';

import { SiteSection }        from '../../components/settings/SiteSection';
import { ContactSection }     from '../../components/settings/ContactSection';
import { TarificationSection }from '../../components/settings/TarificationSection';
import { ApplicationSection } from '../../components/settings/ApplicationSection';
import { AccueilSection }     from '../../components/settings/AccueilSection';
import { EmailSection }       from '../../components/settings/EmailSection';
import { LegalSection }       from '../../components/settings/LegalSection';
import { AuditSection }       from '../../components/settings/AuditSection';
import { SmsSection }         from '../../components/settings/SmsSection';
import { PushSection }        from '../../components/settings/PushSection';
import { PaymentSection }     from '../../components/settings/PaymentSection';

// ─── Définition des groupes ───────────────────────────────────

interface SectionDef {
  id:    SettingsSection;
  label: string;
}
interface GroupDef {
  id:       string;
  label:    string;
  sections: SectionDef[];
}

const GROUPS: GroupDef[] = [
  {
    id: 'general', label: 'Général',
    sections: [
      { id: 'site',         label: 'Site'           },
      { id: 'contact',      label: 'Contact'        },
      { id: 'tarification', label: 'Tarification'   },
      { id: 'application',  label: 'Application'    },
    ],
  },
  {
    id: 'pages', label: 'Pages',
    sections: [
      { id: 'accueil', label: "Page d'accueil" },
      { id: 'legal',   label: 'Pages légales'  },
    ],
  },
  {
    id: 'communications', label: 'Communications',
    sections: [
      { id: 'email', label: 'Email' },
      { id: 'sms',   label: 'SMS'   },
      { id: 'push',  label: 'Push'  },
    ],
  },
  {
    id: 'paiement', label: 'Paiement',
    sections: [
      { id: 'paiement', label: 'Gateways' },
    ],
  },
  {
    id: 'systeme', label: 'Système',
    sections: [
      { id: 'audit', label: 'Journal' },
    ],
  },
];

// ─── Map section → composant ──────────────────────────────────

const SECTION_MAP: Record<SettingsSection, React.ReactNode> = {
  site:         <SiteSection />,
  contact:      <ContactSection />,
  tarification: <TarificationSection />,
  application:  <ApplicationSection />,
  accueil:      <AccueilSection />,
  email:        <EmailSection />,
  sms:          <SmsSection />,
  push:         <PushSection />,
  paiement:     <PaymentSection />,
  legal:        <LegalSection />,
  audit:        <AuditSection />,
};

// ─── Helpers ──────────────────────────────────────────────────

function sectionToGroup(section: SettingsSection): string {
  return GROUPS.find(g => g.sections.some(s => s.id === section))?.id ?? 'general';
}

// ─── Page ─────────────────────────────────────────────────────

export function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const section  = pathToSection(location.pathname);
  const activeGroupId = sectionToGroup(section);

  const activeGroup = GROUPS.find(g => g.id === activeGroupId)!;

  const goTo = (s: SettingsSection) =>
    navigate(`/admin/parametres/${s}`, { replace: true });

  return (
    <div className="space-y-0 w-full">
      {/* Titre */}
      <div className="mb-6">
        <h1 className="text-base text-black">Paramètres Hub</h1>
      </div>

      {/* Navigation groupes */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {GROUPS.map(g => (
          <button
            key={g.id}
            type="button"
            onClick={() => goTo(g.sections[0].id)}
            className={[
              'px-4 py-2 rounded-lg text-xs font-semibold transition-all border',
              g.id === activeGroupId
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-800',
            ].join(' ')}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Sous-onglets du groupe actif */}
      {activeGroup.sections.length > 1 && (
        <div className="flex border-b border-slate-200 mb-6 overflow-x-auto scrollbar-none">
          {activeGroup.sections.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(s.id)}
              className={[
                'flex-shrink-0 px-4 py-3 text-sm border-b-2 -mb-px transition-all whitespace-nowrap',
                section === s.id
                  ? 'border-slate-900 text-black'
                  : 'border-transparent text-black/50 hover:text-black',
              ].join(' ')}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Section active */}
      <div className="mt-2">
        {SECTION_MAP[section]}
      </div>
    </div>
  );
}
