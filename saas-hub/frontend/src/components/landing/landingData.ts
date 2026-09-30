import {
  Users, BookOpen, Wallet, CalendarDays, UserCog, ShieldCheck,
  WifiOff, Lock, MonitorSmartphone, Headphones,
} from 'lucide-react';

// ─── Contenu statique de la page d'accueil ──────────────────────────────────
export const NAV_LINKS = [
  { label: 'Accueil',         href: '#accueil' },
  { label: 'Fonctionnalités', href: '#fonctionnalites' },
  { label: 'Hors ligne',      href: '#hors-ligne' },
  { label: 'Tarifs',          href: '#tarification' },
  { label: 'Témoignages',     href: '#temoignages' },
  { label: 'Contact',         href: '#contact' },
];

// Slides du hero (rotation automatique)
export const HERO_SLIDES = [
  { tag: 'Plateforme de gestion scolaire', title: 'Gérez votre école', accent: 'simplement.',
    text: 'Inscriptions, notes, bulletins, finances et personnel réunis dans une seule application pensée pour les écoles africaines.' },
  { tag: 'Offline-first', title: 'Travaillez même', accent: 'sans connexion.',
    text: 'Vos secrétariats continuent de travailler pendant les coupures. Tout se synchronise automatiquement dès que le réseau revient.' },
  { tag: 'Finances en temps réel', title: 'Suivez chaque', accent: 'franc encaissé.',
    text: 'Paiements mensuels, retards, caisse et salaires : une vue claire et à jour sur les finances de votre établissement.' },
];

// Cartes qui chevauchent le bas du hero
export const HIGHLIGHTS = [
  { title: '100 % hors ligne',  desc: 'Aucune coupure ne bloque votre travail.',       Icon: WifiOff },
  { title: 'Données sécurisées', desc: 'Sauvegarde cloud chiffrée et automatique.',    Icon: Lock },
  { title: 'Multi-postes',       desc: 'Secrétariat, comptabilité, direction en sync.', Icon: MonitorSmartphone },
  { title: 'Support local',      desc: 'Une équipe qui vous répond, en français.',      Icon: Headphones },
];

// Modules (grille type « cours » d'Eduka) — l'image vient de cfg.featureImages[i] si définie
export const MODULES = [
  { title: 'Élèves & inscriptions', desc: "Dossiers élèves, inscriptions et réinscriptions par année, import Excel en masse.", Icon: Users,        tag: 'Scolarité' },
  { title: 'Notes & bulletins',     desc: 'Saisie par matière et trimestre, moyennes avec coefficients, bulletins PDF et classements.', Icon: BookOpen, tag: 'Pédagogie' },
  { title: 'Finances & caisse',     desc: 'Frais de scolarité, paiements mensuels, relances des retards et journal de caisse.', Icon: Wallet,     tag: 'Gestion' },
  { title: 'Emplois du temps',      desc: "Composez les emplois du temps des classes et des professeurs sans conflit d'horaire.", Icon: CalendarDays, tag: 'Organisation' },
  { title: 'Personnel & salaires',  desc: 'Fiches du personnel, rôles, salaires de base et historique des versements.', Icon: UserCog,       tag: 'RH' },
  { title: 'Comptes & permissions', desc: 'Un compte par membre de l’équipe, avec des droits précis : enseignant, comptable, secrétaire…', Icon: ShieldCheck, tag: 'Sécurité' },
];

export const ABOUT_POINTS = [
  'Prise en main en moins d’une heure',
  'Bulletins et reçus prêts à imprimer',
  'Synchronisation cloud automatique',
  'Accès web pour la direction, où qu’elle soit',
];

export const TESTIMONIALS = [
  { quote: "Djoli nous fait gagner un temps considérable sur les inscriptions et les paiements, même en connexion instable.", name: 'Fatou Cissé',   role: 'Directrice, Groupe Scolaire Étoile' },
  { quote: "Le mode hors-ligne change tout : nos secrétariats travaillent même en coupure, tout se synchronise sans effort.", name: 'Moussa Traoré', role: 'Fondateur, Institut Les Cèdres' },
  { quote: "Nous avons enfin une vue claire sur les finances de l'établissement, en temps réel et sans tableur Excel.",        name: 'Aïcha Koné',    role: 'Gestionnaire, Lycée Nouvel Horizon' },
];

export const HOW_IT_WORKS = [
  { n: '01', title: "Téléchargez l'application",
    desc: 'Installez DJOLI sur votre ordinateur Windows en quelques minutes. Aucun serveur à configurer.',
    detail: 'Compatible Windows 10 / 11' },
  { n: '02', title: 'Configurez votre établissement',
    desc: 'Renseignez classes, matières et personnel. Importez vos élèves existants via Excel ou ajoutez-les un par un.',
    detail: "Prise en main en moins d'une heure" },
  { n: '03', title: 'Travaillez en toute liberté',
    desc: 'Inscriptions, notes, finances : tout fonctionne sans connexion et se synchronise dès que le réseau revient.',
    detail: 'Offline-first, sync automatique' },
];

// Avantages affichés sur chaque carte de tarif, par id de durée (TarificationSection).
// Les montants, eux, viennent des paramètres admin — rien n'est codé en dur ici.
export const PLAN_FEATURES: Record<string, string[]> = {
  mensuel:     ['Accès complet à toutes les fonctions', 'Synchronisation cloud', 'Support par email'],
  trimestriel: ['Accès complet à toutes les fonctions', 'Synchronisation cloud', 'Support prioritaire 24 h'],
  annuel:      ['Accès complet à toutes les fonctions', 'Synchronisation cloud', 'Support VIP & formation'],
};
export const DEFAULT_PLAN_FEATURES = PLAN_FEATURES.mensuel;
