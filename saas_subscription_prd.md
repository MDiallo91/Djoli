# Document d'Exigences Produit (PRD) : Modèle SaaS & Synchronisation Cloud

## 1. Vue d'ensemble du Projet
**Objectif** : Transformer l'application de gestion scolaire actuelle (fonctionnant en local) en une plateforme SaaS (Software as a Service) hybride. Le système permettra aux dirigeants d'écoles de s'abonner en ligne, de télécharger l'application de bureau (Electron), de l'activer via leur compte cloud, de gérer les accès de leur personnel, et de sauvegarder automatiquement leurs données sur Internet de manière transparente.

---

## 2. Architecture Globale
Le système s'articulera autour de trois composantes majeures :
1. **Portail Web d'Abonnement (Cloud)** : Le site web où les écoles s'inscrivent, gèrent leur abonnement et téléchargent l'application.
2. **Backend/API Central (Cloud)** : Serveur gérant les abonnements, l'authentification globale et hébergeant la base de données principale (sauvegarde).
3. **Application de Bureau (Electron/Local)** : L'interface principale de travail qui fonctionne en mode *Offline-First* (priorité au local avec SQLite) et qui se synchronise en arrière-plan avec le cloud.

---

## 3. Fonctionnalités Clés et Parcours Utilisateur

### 3.1. Le Portail Web et la Gestion des Abonnements
* **Inscription Gérant** : Le propriétaire d'école crée un compte sur le site (Nom, prénom, Nom de l'école, Email/Username, Mot de passe, Téléphone, Adresse).
* **Choix du Plan Tarifaire** : Souscription à un plan (Mensuel, Trimestriel, Annuel). Intégration possible avec un système de paiement (ex: Stripe, Orange Money, Wave, etc.).
* **Espace Client** : Une fois abonné, le gérant a accès à un tableau de bord web pour voir l'état de son abonnement, renouveler son plan, et télécharger la dernière version de l'application Electron (.exe, .dmg).

### 3.2. Connexion et Activation sur l'Application Electron
* **Premier lancement** : L'application est verrouillée. Elle présente une page de connexion demandant le *Username* et le *Password* créés sur le site web.
* **Vérification en ligne** : L'app fait une requête au serveur Cloud pour valider les crédentiels et vérifier si l'abonnement est actif.
* **Activation Locale** : Si OK, l'application enregistre de façon sécurisée le statut, le `school_id` et un token localement. Le gérant est reconnu en tant que "Super Administrateur".
* **Contrôle d'Abonnement (En local & Hors-ligne)** : Lors de l'activation et à chaque synchronisation, la date d'expiration de l'abonnement est enregistrée de manière sécurisée en local. Dès que cette date est atteinte, l'application se verrouille instantanément, **même sans aucune connexion Internet**, et affiche une alerte : *"Votre abonnement a expiré. Veuillez le renouveler sur notre site web"*.

### 3.3. Gestion du Personnel et des Rôles (En local)
* Une fois le gérant connecté sur son application, il a accès à un panneau d'administration lui permettant de créer des comptes pour ses employés (Secrétaire, Comptable, Surveillant Général, etc.).
* Chaque compte a son propre *Username*, *Password* et *Rôle* (définissant ses permissions dans l'application).
* Ces employés ouvrent l'application Electron et se connectent directement en local. (L'authentification de ces employés peut se faire sans avoir besoin d'Internet, puisque leurs comptes sont stockés dans la base SQLite locale de l'école).

### 3.4. Sauvegarde et Synchronisation Automatique (Cloud Sync)
* **Approche "Offline-First"** : L'application fonctionne sans internet. Toute la création de données (élèves, paiements, notes) écrit dans la base locale (SQLite).
* **Détection de Connexion** : L'application écoute les événements réseau. Dès qu'Internet est détecté, le module de synchronisation (en arrière-plan) s'active.
* **Téléversement des Données** : L'application envoie toutes les nouvelles données ou modifications vers le Backend Central. 
* **Récupération des Données (Optionnel)** : Si le gérant installe l'application sur un autre ordinateur de la même école et s'y connecte, il peut retélécharger l'entièreté de ses données depuis le Cloud.

---

## 4. Idées Pertinentes & Recommandations Techniques

### A. Refonte de la Base de Données (Trés Important)
Pour que la synchronisation Cloud/Local fonctionne sans erreurs, **vous ne devez plus utiliser des IDs auto-incrémentés** (ex: id=1, id=2) dans SQLite. Vous devez passer massivement aux **UUID** (identifiants uniques universels, de type *String*).
* *Explication* : Si vous avez un élève avec l'ID=5 en local, et qu'un autre poste de l'école crée un élève avec l'ID=5 aussi, lors de l'envoi sur le serveur central, il y aura un conflit. Les UUID évitent totalement ces conflits.
* **Horodatage (Timestamps)** : Ajoutez des colonnes `created_at`, `updated_at`, et `deleted_at` à toutes vos tables locales pour savoir exactement quelles données doivent être envoyées lors de la prochaine synchronisation.

### B. Mode Gratuit ou Période d'Essai (Trial)
Offrez un essai gratuit de 14 jours aux écoles. Dès qu'elles s'inscrivent sur le web, elles peuvent télécharger et utiliser l'application gratuitement pendant 14 jours. À l'expiration, l'application est bloquée sur un écran de paiement. Cela booste massivement le taux d'adoption.

### C. Gestion du "Multi-Postes" (Réseau Local vs Cloud)
Si une école a 3 ordinateurs dans la même enceinte (1 secrétariat, 2 caisses) :
* *Solution Cloud* : Les 3 ordinateurs utilisent la même application Electron connectée au même compte, modifient leurs données en local, et la synchronisation internet fusionne tout dans le Cloud en temps réel.
* *Sécurité additionnelle* : Limiter le nombre de postes (devices) sur lesquels un compte propriétaire peut se connecter (ex: Plan Standard = 2 postes max, Plan Premium = 5 postes max).

### D. Tableaux de Bord Web pour le Propriétaire
Puisque chaque école envoie ses données sur Internet pour la sauvegarde, vous pouvez créer un mini "Tableau de Bord / Dashboard" sur le portail web. Thus, le propriétaire de l'école, même depuis son téléphone à la maison, peut se connecter sur le web et voir les finances de la journée ou le nombre d'inscrits, sans avoir besoin d'ouvrir l'application Electron.

### E. Notifications et Rappels d'Abonnement
Implémenter un système d'alerte pour le renouvellement :
* J-15 : Notification douce dans l'application (« Pensez à renouveler »).
* J-3 : Bannière rouge permanente en haut de l'écran.
* J+1 (Expiré) : Blocage des nouvelles insertions (ex: impossible d'ajouter un paiement), mais permission de consulter les anciens dossiers et les notes, jusqu'au renouvellement.

---

## 5. Prochaines Étapes de Développement (Plan d'Implémentation)

1. **Phase 1 : Refonte du modèle de données local (Electron)**
   - Remplacer les champs `id` (INTEGER AUTOINCREMENT) par des `uuid` (VARCHAR/TEXT).
   - Ajouter la table `sync_queue` et les timestamps pour préparer le terrain.
   - Ajouter une table `users` et les écrans de création de compte local pour les employés, ainsi que la page de login de démarrage avec rôles et permissions.

2. **Phase 2 : Développement du Hub SaaS central**
   - Créer l'API Backend (ex: Node.js) pour gérer les souscriptions, inscrire un `school_tenant`, traiter les paiements et gérer la base PostgreSQL master.
   - Créer le portail Web (Landing page + Espace client abonnement).

3. **Phase 3 : Intégration App Electron <=> Hub SaaS**
   - Implémenter l'écran de Login Maître (Gérant) sur Electron connecté à l'API.
   - Implémenter la logique de licence (Verrouillage si abonnement expiré).
   - Développer le moteur de synchronisation en arrière-plan (Push local -> Cloud API). c'est une étape cruciale qui demande de bien gérer l'état en ligne/hors-ligne.
