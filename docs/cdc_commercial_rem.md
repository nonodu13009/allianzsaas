## CDC commercial — Allianz sur Marseille

### Contexte
Document vivant. Je complète ce CDC au fil des informations partagées. Il servira d’entrée pour le fichier TODO d’implémentation.

### Fichiers impactés
 - `src/app/dashboard/layout.tsx` — navigation et accès au module CDC
 - `src/app/dashboard/cdc-commercial/page.tsx` — zone de travail CDC Commercial

---

## Espace CDC Commercial — Saisie quotidienne & Historique

### Besoin utilisateur
- Les CDC saisissent leur activité tous les jours.
- Après authentification, ils accèdent à une interface dédiée permettant:
  - **Saisie quotidienne** de l’activité du jour.
  - **Consultation** des jours déjà saisis.
  - **Navigation mois par mois** pour consulter l’historique (mois précédent/suivant).

### Types de saisie
- **Affaires nouvelles (AN)**
- **Process** avec trois sous-types:
  - M+3
  - Préterme Auto
  - Préterme IRD

### UI & interactions
- **4 boutons « flashy »** en haut de la page CDC:
  - Bouton 1: AN
  - Bouton 2: M+3
  - Bouton 3: Préterme Auto
  - Bouton 4: Préterme IRD
- Au clic sur l’un de ces boutons, **ouverture d’une modale** adaptée au type choisi:
  - Modale AN (spécifique AN)
  - Modale Process (variant selon M+3 / Préterme Auto / Préterme IRD)
- La modale cible par défaut **la date du jour**; possibilité de changer le jour (contrainte à préciser).

### Modales — contenu (draft)
- **Modale AN**
  - Champs à préciser (exemples): quantité, montant € (optionnel), commentaire libre
  - Validation: quantité > 0, date valide, limites de saisie à définir
- **Modale Process (M+3 / Préterme Auto / Préterme IRD)**
  - Champs à préciser (exemples): volume traité, statut, commentaire
  - Validation: volume > 0, date valide
- Comportements communs
  - Boutons: Enregistrer / Annuler
  - Message de confirmation en cas de succès
  - En cas d’erreur, message clair et conservation des saisies

### Spécifications détaillées de saisie
#### Process
- Titre de la modale = nom du process ("M+3", "Préterme Auto", "Préterme IRD").
- Champs:
  - `Nom client` (texte obligatoire)
  - `Date de saisie` automatique = date/heure courante (non éditable dans la modale)
- Action `Valider`:
  - Ajoute une ligne dans le tableau de saisie avec les colonnes: `Jour de saisie`, `Nom client`, `Process`.
  - La ligne appartient au mois affiché (pilotage par la navigation mensuelle).

#### Affaires nouvelles (AN)
- Titre de la modale = "Affaire nouvelle".
- Champs:
  - `Type affaire` (select obligatoire)
    - Valeurs: `AUTO/MOTO`, `IARD PART DIVERS`, `IARD PRO DIVERS`, `PJ`, `GAV`, `SANTE/PREV`, `NOP 50EUR`, `EPARGNE/RETRAITE`, `PU / VL`.
  - `Nom client` (texte obligatoire)
  - `Numéro de contrat` (texte; format libre à préciser)
  - `Date d'effet` (datepicker moderne — composant custom, pas le select natif du système)
  - `Date de saisie` automatique = date/heure courante (non modifiable dans la modale)
  - `Prime annuelle` (entier en euros > 0) — affichée uniquement si `Type affaire` ≠ `PU / VL`
  - `Versement libre` (entier en euros > 0) — affichée uniquement si `Type affaire` = `PU / VL`
  - `Commissions potentielles` (entier en euros ≥ 0) — calculé automatiquement
- Action `Valider`:
  - Ajoute une ligne dans le tableau de saisie avec les colonnes: `Jour de saisie`, `Nom client`, `Type AN`, `N° contrat`, `Date d'effet`, `Prime annuelle` (ou `Versement libre`), `Commission`.
  - La ligne appartient au mois affiché (pilotage par la navigation mensuelle).

### Règles de calcul — Commissions potentielles (AN)
- **Format monétaire**: tous les montants saisis et calculés sont des entiers en euros (pas de décimales).
- **Barème par type**:
  - `AUTO/MOTO`: 10 €
  - `IARD PART DIVERS`: 20 €
  - `IARD PRO DIVERS`: 20 € + 10 € par tranche pleine de 1 000 € de `Prime annuelle`
    - Formule: `commission = 20 + 10 * floor(primeAnnuelle / 1000)`
    - Exemples: 670 € → 20 €; 999 € → 20 €; 1 000 € → 30 €; 1 350 € → 30 €; 2 320 € → 40 €
  - `PJ`: 30 €
  - `GAV`: 40 €
  - `SANTE/PREV`: 50 €
  - `NOP 50EUR`: 10 €
  - `EPARGNE/RETRAITE`: 50 €
  - `PU / VL`: 1 % de la `Prime versée` (champ `Versement libre`), arrondi à l’euro le plus proche.
- **Visibilité**: le champ « Commissions potentielles » est calculé automatiquement et affiché en lecture seule dans la modale AN.

### KPIs mensuels (dépendent de la navigation mois)
- **Périmètre**: tous les KPI ci-dessous sont calculés sur le mois affiché.
- **Définitions**:
  - `Nombre d'affaires nouvelles` = count des AN du mois.
  - `Nombre AUTO/MOTO` = count des AN avec type `AUTO/MOTO`.
  - `Nombre autres` = count des AN dont le type ≠ `AUTO/MOTO`.
  - `Nombre de process` (total) = count des saisies Process (tous types) du mois.
    - Détail par type: `M+3`, `Préterme Auto`, `Préterme IRD` (counts séparés).
  - `CA d'affaire cumulé` = somme(`Prime annuelle`) + somme(`Versement libre`) sur les AN du mois (entiers en €).
  - `Ratio` = `Nombre autres` / `Nombre AUTO/MOTO` en pourcentage.
    - Cas limite: si `Nombre AUTO/MOTO` = 0, alors `Ratio` = 100 % par défaut.
  - `Commissions potentielles` = somme des commissions calculées des AN du mois (entiers en €).
  - `Commissions réelles`:
    - Si les 3 conditions sont vraies, alors `Commissions réelles = Commissions potentielles`, sinon `0 €`.
      1) `Commissions potentielles` ≥ 200 €
      2) `Nombre de process` ≥ 15
      3) `Ratio` ≥ 100 %
- **Formatage**:
  - Montants affichés en € (entiers); `Ratio` en % (0 décimale).

### Timeline journalière (au-dessus du tableau)
- **Emplacement**: juste au‑dessus du tableau de saisie, dépend du mois sélectionné.
- **Rendu**: une rangée horizontale de pastilles (1 par jour du mois courant). Pastilles scrollables si nécessaire.
- **Valeur par pastille**: nombre total de saisies du jour (AN + Process). Par défaut `0` (ou icône « Ø » / « rien »).
- **Couleurs**: neutre si 0, intensité/progression lorsque > 0 (lisible en thème clair/sombre).
- **Filtres**:
  - Toggle: `Tous | AN | Process`. La timeline et le tableau se synchronisent avec ce filtre.
  - Si `AN` est actif: filtre additionnel `Produit` (valeurs du select AN) pour spécialiser la timeline et le tableau.
- **Interaction**: clic sur une pastille filtre le tableau sur ce jour (un second clic retire le filtre jour).
- **Verrouillage**: si le mois est verrouillé, la timeline reste visible et filtrable mais aucune action de création/édition n’est possible.

### Tableau de saisie (consultation)
- Vue type tableur (style "Excel")
  - Colonnes minimales Process: `Jour de saisie`, `Nom client`, `Process`.
  - Colonnes minimales AN: `Jour de saisie`, `Nom client`, `Type AN`, `N° contrat`, `Date d'effet`, `Prime annuelle`/`Versement libre`, `Commission`.
- **CRUD**:
  - `Create` via modales AN/Process.
  - `Read` via tableau filtrable/triable.
  - `Update` via édition (inline ou modale d’édition) tant que le mois n’est pas verrouillé.
  - `Delete` avec confirmation explicite (et protection si mois verrouillé).
- **Colonne Verrou**:
  - Affiche un cadenas `fermé` si le mois affiché est verrouillé par l’administrateur, `ouvert` sinon.
  - Pour l’instant, indicateur visuel uniquement côté CDC (pas d’action). L’intervention se fera plus tard depuis le dashboard Administrateur.
- La navigation mensuelle pilote le contenu du tableau (mois courant par défaut, possibilité mois précédent/suivant).

### Verrouillage mensuel (administrateur)
- L’administrateur peut verrouiller/déverrouiller un mois pour un CDC donné depuis son propre dashboard (implémentation ultérieure).
- Lorsque le mois M est **verrouillé**:
  - Côté CDC, toutes les opérations de modification sont désactivées sur M (création, édition, suppression).
  - Les modales s’ouvrent en lecture seule ou un message indique que le mois est verrouillé.
  - La colonne Verrou affiche le cadenas `fermé`.
- Justification métier: ex. en septembre 2025, les salaires sont calculés à partir des données d’août 2025; **aucune modification postérieure** ne doit être possible sur août 2025.

### Parcours cible
1. L’utilisateur se connecte et voit le menu « Activité commerciale » dans le dashboard.
2. Page CDC:
   - Bloc « Aujourd’hui »: formulaire rapide de saisie (ex: champs à préciser).
   - Liste/Calendrier des jours du mois courant avec état (saisi / non saisi).
   - Contrôles « Mois précédent » / « Mois suivant » pour naviguer.
3. Sélection d’un jour passé: consultation des données avec possibilité d’éditer si autorisé.

### Règles d’accès
- Réservé aux profils CDC Commercial.
- Redirection vers `/dashboard` si le rôle ne correspond pas (déjà en place dans le route guard).

### Hypothèses / À préciser
- Schéma de données pour une « activité » (champs exacts, validations, pièces jointes?).
- Autorisation d’édition rétroactive (jusqu’à J-? ou illimitée?).
- Affichage par calendrier vs. tableau liste (préférence UX?).
- Stratégie de stockage du verrou mensuel (ex.: collection `locks` par `{userId, yearMonth}` ou champ au niveau agrégé).

### Critères d’acceptation (draft)
- Depuis la page CDC, je peux saisir l’activité du jour et la retrouver instantanément.
- Je peux changer de mois et voir les jours saisis de ce mois.
- Une timeline afﬁche autant de pastilles que de jours dans le mois avec le nombre de saisies/jour; elle se met à jour selon les filtres et la navigation mensuelle.
- Filtres: `Tous | AN | Process` et, pour `AN`, un filtre `Produit` affinent à la fois la timeline et le tableau.
- L’état de chaque jour est visible (saisi/non saisi) et cliquable pour détail.
- Je vois 4 boutons (AN, M+3, Préterme Auto, Préterme IRD) et, au clic, la modale correspondante s’ouvre.
- Je peux enregistrer une saisie AN et une saisie Process et les consulter ensuite.
- La date de saisie d’un Process est remplie automatiquement.
- La date de saisie d’une AN est remplie automatiquement et non modifiable.
- Les champs AN s’affichent/masquent selon le `Type affaire` (`Prime annuelle` si ≠ `PU / VL`, `Versement libre` si = `PU / VL`).
- La commission potentielle est calculée automatiquement selon le barème ci-dessus et affichée en lecture seule (entiers en €).
- Les KPI affichés se mettent à jour lorsque je change de mois et respectent les formules (montants entiers).
- Le tableau est CRUD tant que le mois n’est pas verrouillé; si le mois est verrouillé, toutes les modifications sont impossibles et un cadenas fermé l’indique.
- Le changement de mois met à jour le contenu du tableau en conséquence.

### Checklist de suivi (module CDC)
- [ ] Créer UI saisie « Aujourd’hui »
- [ ] Visualiser l’état des jours du mois courant
- [ ] Ajouter navigation mois précédent/suivant
- [ ] Afficher l’historique d’un mois sélectionné
- [ ] Gérer droits d’accès (CDC uniquement) — existant à vérifier
- [ ] Définir modèle de données et validations (à compléter)
- [ ] Ajouter 4 boutons de saisie (AN, M+3, Préterme Auto, Préterme IRD)
- [ ] Ouvrir une modale spécifique selon le bouton cliqué
- [ ] Construire formulaire AN (champs/validations à confirmer)
- [ ] Construire formulaire Process (M+3/Auto/IRD) (champs/validations à confirmer)
- [ ] Implémenter date de saisie auto pour Process
- [ ] Implémenter date de saisie auto pour AN
- [ ] Implémenter logique conditionnelle AN (Prime annuelle vs Versement libre)
- [ ] Calculer automatiquement la commission potentielle selon le barème (entiers)
- [ ] Créer table de consultation avec tri/filtre
- [ ] Relier la table à la navigation mensuelle
- [ ] Calculer et afficher les KPI mensuels (formules + cas limites, montants entiers)
- [ ] Ajouter CRUD complet sur le tableau (édition/suppression protégées)
- [ ] Afficher colonne Verrou (cadenas ouvert/fermé) et bloquer le mois si fermé
- [ ] Préparer le modèle/stockage du verrou mensuel en vue du dashboard Admin
- [ ] Ajouter la timeline journalière (pastilles, valeurs par filtre, clic pour filtrer le jour)


