## CDC Santé Individuelle — Suivi de la production (navigation mensuelle)

### Contexte
Document vivant. Outil de déclaration et de suivi de la production, avec navigation mensuelle, réservé aux profils Santé Individuelle. Sert d’entrée au fichier TODO d’implémentation.

### Fichiers impactés
 - `src/app/dashboard/layout.tsx` — navigation et accès au module Santé (bouton de sidebar « Santé individuelle »)
 - `src/app/dashboard/cdc-sante-ind/page.tsx` — page Suivi production Santé

---

## Fonctionnalités principales

### Accès et rôles
- Accès exclusivement réservé au rôle `CD_sante_ind`.
- Si rôle absent/invalide: redirection vers `/dashboard`.
 - Point d’entrée: bouton cliquable « Santé individuelle » dans la sidebar du dashboard (visible uniquement pour `CD_sante_ind`).

### Suivi de la production avec navigation mensuelle
- Par défaut, affichage du mois courant.
- Contrôles « Mois précédent » / « Mois suivant ».
- Le mois sélectionné pilote l’historique (tableau/liste) et les KPI du mois.
- Les actions de création/édition s’appliquent au mois en cours d’affichage.

### Déclaration des actes commerciaux (5 boutons)
- Boutons en haut de la page:
  - Affaire nouvelle
  - Révision
  - Adhésion groupe
  - Courtage → Allianz
  - Allianz → Courtage
- Au clic, ouverture d’une modale adaptée au type choisi.

### Modales — contenu
- Champs communs (par modale):
  - `Date de saisie` (automatique, non éditable)
  - `Nature de l'acte` (automatique, déduite du bouton)
  - `Nom du client` (normaliser en majuscules à la saisie)
  - `Numéro de contrat`
  - `Date d'effet` (date picker design — pas le sélecteur natif système)
  - `CA` (euros, entier)
  - `CA pondéré` (calculé automatiquement — cf. grille)
- Spécifique « Affaire nouvelle »:
  - `Compagnie` (select obligatoire): valeurs `Allianz` | `Courtage`
- Comportements communs:
  - Enregistrer / Annuler
  - Message de confirmation en cas de succès
  - Message d’erreur clair et conservation des saisies

### Grille de pondération (CA → CA pondéré)
- Affaire nouvelle: 100 %
- Révision: 50 %
- Adhésion groupe: 50 %
- Courtage → Allianz: 75 %
- Allianz → Courtage: 50 %

Formule: `caPondere = roundToEuro(ca * taux)` avec `ca` entier en € et `taux ∈ {1.00, 0.50, 0.75}`.

### Commissions versées (selon seuil pondéré du mois)
- Seuil 1: `< 10 000 €` → 0 %
- Seuil 2: `< 14 000 €` → 2 %
- Seuil 3: `< 18 000 €` → 3 %
- Seuil 4: `< 22 000 €` → 4 %
- Seuil 5: `≥ 22 000 €` → 6 %

Règle: si la production pondérée mensuelle est, par exemple, 19 000 €, alors 4 % s’appliquent dès le 1er euro.

### Critère qualitatif
- Minimum 4 révisions dans le mois.
- Impact exact sur la commission à préciser (bloquant ou bonus?).

### KPIs mensuels (à préciser)
- Production brute mensuelle (somme des `CA`).
- Production pondérée mensuelle (somme des `CA pondéré`).
- Taux de commission applicable (0/2/3/4/6 %).
- Commission estimée du mois.
- Nombre d’actes par type (Affaire nouvelle, Révision, Adhésion groupe, Courtage → Allianz, Allianz → Courtage).
- Nombre de révisions (contrôle du minimum de 4).

### Tableau de production (consultation)
- Colonnes minimales: `Jour de saisie`, `Nom client`, `Nature de l'acte`, `N° contrat`, `Date d'effet`, `CA`, `CA pondéré`.
  - Si acte = « Affaire nouvelle », afficher en plus `Compagnie`.
- CRUD:
  - Create via modales
  - Read via tableau filtrable/triable
  - Update tant que le mois n’est pas verrouillé
  - Delete avec confirmation
- Colonne « Verrou »: case `bloqué / débloqué` pilotée par l’espace administrateur.
  - Icône: vert si ouvert (débloqué), rouge si fermé (bloqué).

### Verrouillage mensuel (administrateur)
- L’administrateur verrouille/déverrouille un mois pour un CDC donné depuis l’espace admin.
- Effet côté CDC: si le mois M est verrouillé, toutes les modifications sont désactivées sur M (création/édition/suppression).
- Contexte paie: commissions déterminent une partie du salaire.
  - Ex.: paie de septembre calculée sur les données verrouillées d’août; aucune modification ultérieure sur août n’est permise.
  - Objectif: éviter incohérences et litiges employeur/employé.

### Parcours cible
1. L’utilisateur `CD_sante_ind` se connecte et voit, dans la sidebar, le bouton « Santé individuelle » (visible uniquement pour ce rôle).
2. Il clique sur le bouton et accède à la page Suivi de production avec le mois courant sélectionné.
3. Il navigue au mois précédent/suivant pour consulter historique et KPI.
4. Il déclare des actes via l’un des 5 boutons; une modale s’ouvre et calcule le `CA pondéré`.
5. La table se met à jour; les KPI mensuels reflètent la production pondérée et la commission estimée.
6. Si le mois est verrouillé par l’admin, toutes les modifications sont bloquées.

### Hypothèses / À préciser
- Schéma de données exact (champs, validations, normalisations — majuscules client, formats dates).
- Détails d’impact du critère qualitatif « 4 révisions mini » sur le calcul de commission.
- Rounding/arrondi des montants (entiers en €; validation stricte côté UI et logique).
- Règles d’accès déjà en place côté route guard à confirmer/étendre.
- Backend: données locales pour commencer; migration ultérieure vers Firebase.

### Critères d’acceptation (draft)
- Accès refusé si rôle ≠ `CD_sante_ind` (redirection `/dashboard`).
- Je peux naviguer entre mois courant, précédent et suivant; le contenu (table/KPI) se met à jour.
- Les 5 boutons sont visibles; au clic, la modale correspondante s’ouvre.
- La date de saisie est auto et non modifiable; la nature d’acte est auto.
- Le nom client est normalisé en majuscules dès la saisie.
- `CA` est un entier en €; `CA pondéré` est calculé selon la grille.
- Les KPI mensuels affichent production brute/pondérée, taux de commission, commission estimée, volumes par type.
- Le tableau est CRUD tant que le mois n’est pas verrouillé; si verrouillé, lecture seule et indicateur « bloqué ».

### Checklist de suivi (CDC Santé Individuelle)
- [ ] Créer page `cdc-sante-ind` et l’entrer dans la navigation du dashboard
- [ ] Ajouter le bouton « Santé individuelle » dans la sidebar (visibilité conditionnelle `CD_sante_ind`)
- [ ] Implémenter garde d’accès basée sur le rôle `CD_sante_ind`
- [ ] Ajouter navigation mensuelle (précédent/suivant + initialisation mois courant)
- [ ] Définir modèle de données local (en attendant Firebase) et brancher la page
- [ ] Créer les 5 boutons (Affaire nouvelle, Révision, Adhésion groupe, Courtage → Allianz, Allianz → Courtage)
- [ ] Ouvrir une modale dédiée par bouton avec champs et validations
- [ ] Normaliser le nom client en majuscules à la saisie
- [ ] Implémenter calcul du `CA pondéré` selon la grille
- [ ] Implémenter calcul des KPI mensuels (brut, pondéré, taux, commission, volumes par type)
- [ ] Ajouter tableau de production avec filtres/tri et colonne « Verrou »
- [ ] Gérer CRUD complet tant que le mois n’est pas verrouillé
- [ ] Implémenter lecture seule si mois verrouillé (pilotage admin)
- [ ] Documenter l’impact du critère « 4 révisions mini » et l’intégrer si bloquant/bonus
- [ ] Définir arrondis, formats et validations monétaires (entiers en €)

on va créer un outil de déclaration et de suivi de la production
exclusivement réservé à ceux qui sont connectés comme CDC_sante_ind

navigation mensuelle

déclaration des actes commerciaux


5 boutons

affaire nouvelle
révision
adhésion groupe
courtage vers allianz
allianz vers courtage

à chaque fois une modale s'ouvre 
* la date de saisie (automatique)
* la nature de l'acte (automatique -> on reprend le bouton)
* nom du client (gérer les majuscules dès la saisie)
* numéro de contrat
* date effet (date picker, design, pas celui qui est système)
* ca (en euros, entier)
* ca pondéré (calcule automatique selon grille ci-dessous)


  -> grille de pondération pour passer de CA à CA pondéré
    si affaire nouvelle 100%
    révision 50%
    adhésion groupe 50%
    courtage vers allianz 75%
    allianz vers courtage 50%


-> on  verse des commissions selon la tranche du seuil pondéré :
Seuil 1	< 10.000 EUR - 0%	0%
Seuil 2	< 14.000 EUR - 2%	2%
Seuil 3	< 18.000 EUR - 3%	3%
Seuil 4	< 22.000 EUR - 4%	4%
Seuil 5	> 22.000 EUR - 6%	6%

Exemple : si 19000 eur de production -> on verse 4% dès le 1er euro

Un critère qualitatif : minimum 4 révisions dans le mois

Il va nous falloir tous les kpis requis

prévoir dans le tableau de production une case bloqué / débloqué
elle sera actionnée depuis l'espace admin

Je t'explique : 

les commissions déterminent une partie du salaire
je paie en septembre ce qui est "bloquée en aout

je ne peux pas déclarer dans les bs de 09 des éléments qui seraient modifiés par la suite

problème potentiel employeur / employé




