# Modifications Prévues : Élèves, Finance, et Notes

## User Review Required
Il n'y a pas de décisions risquées majeures, mais quelques clarifications sur la structure des notes :
- **Notes** : Nous allons remplacer la saisie de "Devoir" et "Composition" par une seule saisie "Moyenne" pour chaque matière et trimestre, afin de respecter votre demande de n'avoir qu'une seule note (la moyenne de la matière).
- **Moyenne Générale** : Le calcul de la moyenne générale (et le classement) divisera désormais la somme des notes (pondérées) par **la somme des coefficients de toutes les matières de la classe**. Ainsi, une matière non notée comptera comme un zéro pour l'élève.

## Proposed Changes

### 1. Module Élève
- **[MODIFY] [electron/main.ts](file:///e:/WorkSpace/School/school-management-system/electron/main.ts)**
  - Mettre à jour la requête SQL de `get-students` (ligne ~92) pour inclure toutes les informations du parent (`p.first_name`, `p.last_name`, `p.address`, `p.profession`). Actuellement, seul le téléphone est récupéré.
- **[MODIFY] [src/components/StudentForm.tsx](file:///e:/WorkSpace/School/school-management-system/src/components/StudentForm.tsx)**
  - Ajouter la propriété `initialData` aux props du composant.
  - Pré-remplir les champs (`studentData`, `parentData`, `enrollmentData`) si `initialData` est fourni (lorsque l'on clique sur "Modifier").
  - Si en mode édition, masquer la barre de recherche "Rechercher un élève existant".
- **[MODIFY] [src/components/StudentList.tsx](file:///e:/WorkSpace/School/school-management-system/src/components/StudentList.tsx)**
  - Passer `initialData={editingStudent}` lors de l'appel au composant `<StudentForm>`.
  - Mettre à jour la modale "Détails" (qui utilise `viewingStudent`) pour afficher les informations complètes du tuteur/parent (prénom, nom, adresse, profession, téléphone) récupérées par la requête modifiée du backend.

---

### 2. Module Finance / Caisse
- **[MODIFY] [src/components/FinanceManagement.tsx](file:///e:/WorkSpace/School/school-management-system/src/components/FinanceManagement.tsx)**
  - **Onglets Entrées/Sorties** : Dans la section "Flux de Trésorerie", ajouter un système d'onglets (boutons) pour basculer entre l'affichage des "Paiements" (+ Entrées) et des "Sorties d'argent" (- Sorties), n'affichant qu'une catégorie à la fois.
  - **Filtre de paiement (Rapport par classe)** : Dans la section "Suivi des Paiements par Classe", ajouter un menu déroulant pour filtrer par statut : "Tous", "A jour (Payé)" et "Non Payé". Le bouton d'impression prendra en compte ce filtre pour imprimer uniquement la liste filtrée.

---

### 3. Module Notes
- **[MODIFY] [electron/main.ts](file:///e:/WorkSpace/School/school-management-system/electron/main.ts)**
  - Modifier les requêtes de `get-class-grades` et `save-class-grades-bulk` pour n'utiliser qu'un seul type d'examen (`exam_type = 'Moyenne'`) au lieu de Devoir et Composition, afin de préserver la structure de la base de données.
  - Modifier le calcul du classement dans `get-class-rankings` pour utiliser la somme des coefficients de toutes les matières affectées à la classe (`class_subjects`), garantissant qu'une note manquante pénalise la moyenne générale.
- **[MODIFY] [src/components/GradeManagement.tsx](file:///e:/WorkSpace/School/school-management-system/src/components/GradeManagement.tsx)**
  - Modifier le tableau de "Saisie par Classe" pour n'afficher qu'une seule colonne d'entrée : "Moyenne" (par trimestre et matière).
  - Modifier la modale de "Saisie Individuelle" pour définir par défaut `exam_type` sur 'Moyenne'.
  - Ajuster la fonction (locale) [calculateAverage](file:///e:/WorkSpace/School/school-management-system/src/components/GradeManagement.tsx#161-176) pour qu'elle utilise le format à une seule note, et idéalement qu'elle tienne compte du coefficient total de la classe (si les données de classe sont disponibles).
  - **Correction de Synchronisation** : Ajouter une logique de rafraîchissement (re-fetch) des notes lors du passage entre la vue par classe et la vue individuelle pour garantir que les notes saisies d'un côté apparaissent immédiatement de l'autre.
- **[MODIFY] [electron/main.ts](file:///e:/WorkSpace/School/school-management-system/electron/main.ts)** (Corrections Bugs)
  - `get-class-rankings` : Gérer le cas où la table `class_subjects` n'est pas remplie en utilisant la table globale `subjects` par défaut, évitant ainsi le problème d'une moyenne calculée à 0 lors de l'impression.

## Verification Plan
### Automated Tests
- Aucune modification de tests automatisés (car l'application utilise une vérification manuelle pour la couche UI).

### Manual Verification
1. **Élève** : Lancer l'app, aller dans la liste des élèves, cliquer sur les 3 points -> Modifier. Vérifier que le formulaire s'ouvre avec les données pré-remplies. Cliquer sur "Détails" et vérifier que les infos complètes du parent s'affichent.
2. **Finance** : Aller dans Finance. Vérifier les deux nouveaux onglets "Paiement" et "Sortie d'argent" dans les flux. Générer un rapport pour une classe et tester le filtre "Payé" / "Non Payé".
3. **Notes** : Saisir des notes par classe. Vérifier qu'une seule colonne "Moyenne" est présente. Imprimer le bulletin pour voir si la moyenne générale calcule correctement en fonction de toutes les matières de la classe, même si l'élève a des notes manquantes.
