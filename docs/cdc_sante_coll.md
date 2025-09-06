## CDC Santé Collective — Suivi de la production (navigation mensuelle)

### Contexte
Document vivant. Outil de déclaration et de suivi de la production « Santé Collective », réservé au rôle `CDC_sante_coll` (ex. Karen Chollet). S’inspire du module « Santé Individuelle » pour l’UX: timeline mensuelle, filtres, info-bulles (i) cohérentes.

### Fichiers impactés (prévisionnel)
- `src/app/dashboard/layout.tsx` — entrée de menu « Santé collective » visible uniquement pour `CDC_sante_coll`.
- `src/app/dashboard/cdc-sante-coll/page.tsx` — page principale (timeline, KPI, tableau, modale).

---

## Fonctionnalités principales

### Accès et rôles
- Accès exclusivement réservé au rôle `CDC_sante_coll` (sinon redirection vers `/dashboard`).

### Navigation mensuelle (timeline + filtres)
- Mois courant par défaut, avec contrôles « précédent/suivant ».
- Timeline colorée (cohérente avec les autres modules):
  - Dimanche: rouge vif
  - Samedi: orange vif
  - Autres jours: vert vif
- Pastilles avec compte/jour et effet focus sur le jour sélectionné.
- Filtres inspirés de `cdc_sante_ind` (et visibles en dessous des KPI):
  - Filtre « Origine »: Tous | Proactif | Réactif | Prospection
  - Filtre « Nature de l’acte » (voir liste plus bas)
  - Bouton « Reset » (efface les filtres jour/origine/nature)

### Bouton de saisie
- Un seul bouton en haut de page: « Nouvel acte ».
- Au clic: ouverture d’une modale de saisie.

### Modale — contenu
- Champs:
  - `Date de saisie` (auto, non éditable)
  - `Nature de l’acte` (select):
    - coll an santé
    - coll an prev
    - coll an retraite
    - coll adhésion / renfort
    - coll révision
    - ind an santé
    - ind an prev
    - ind an retraite
    - courtage → allianz (ind & coll)
    - allianz → court (ind & coll)
  - `Origine` (select): Proactif | Réactif | Prospection
  - `Compagnie` (select): Allianz | Courtage
  - `Nom du client` (normaliser typographie; majuscules au premier mot)
  - `N° de contrat`
  - `Prime brute` (entier, €)
  - `Prime pondérée` (entier, €) — calculée automatiquement selon « Origine »:
    - Proactif: 100 %
    - Réactif: 50 %
    - Prospection: 120 %

Formule: `primePonderee = arrondiEuro(primeBrute * taux)`.

### Info-bulles (i)
- Icône (i) visible sur chaque KPI et sur certains champs sensibles de la modale.
- Texte concis expliquant la logique (ex.: « Prime pondérée = Prime brute x Taux selon Origine »).

### KPI mensuels
- Nombre d’actes du mois.
- CA brut (somme des primes brutes).
- CA pondéré (somme des primes pondérées).
- Commissions estimées du mois (voir barème).

### Barème commissions (sur CA pondéré du mois)
- Seuil 1: `0 → 6 000 €` → 0 %
- Seuil 2: `6 001 → 10 000 €` → 2 %
- Seuil 3: `10 001 → 14 000 €` → 3 %
- Seuil 4: `14 001 → 18 000 €` → 4 %
- Seuil 5: `≥ 18 001 €` → 6 %

Règle: si la production pondérée du mois atteint un seuil, le taux s’applique « dès le 1er euro » sur tout le mois.
- Ex.: 15 000 € → 4 % sur 15 000 €.
- Ex.: 3 000 € → 0 %.
- Ex.: 23 000 € → 6 % sur 23 000 €.

### Tableau de production
- Colonnes minimales: `Jour`, `Nature de l’acte`, `Origine`, `Compagnie`, `Nom client`, `N° contrat`, `Prime brute`, `Prime pondérée`.
- CRUD: création via modale, édition et suppression tant que le mois n’est pas verrouillé.
- Colonne « Verrou » (ou badge d’état) cohérente avec les autres modules: ouvert/fermé.

### Verrouillage mensuel (administrateur)
- Identique aux autres modules: si le mois est verrouillé côté admin, toute modification est désactivée pour l’utilisateur.

---

## Checklist (CDC Santé Collective)
- [ ] Créer page `cdc-sante-coll` + entrée de menu conditionnée au rôle `CDC_sante_coll`.
- [ ] Garde d’accès (rediriger si rôle invalide).
- [ ] Navigation mensuelle + timeline colorée (rouge/orange/vert).
- [ ] Filtres (Origine, Nature) + Reset.
- [ ] Bouton « Nouvel acte » ouvrant la modale.
- [ ] Modale complète avec calcul auto de la prime pondérée selon l’Origine.
- [ ] KPI mensuels (actes, CA brut, CA pondéré, commission estimée) + info-bulles (i).
- [ ] Barème des commissions par seuil sur le CA pondéré du mois.
- [ ] Tableau CRUD + colonne Verrou.

---

## Hypothèses / À préciser
- Normalisation des noms clients (majuscules/ponctuation).
- Arrondi monétaire (entier €) cohérent avec les autres modules.
- Import futur des données dans Firebase (local pour la V1).