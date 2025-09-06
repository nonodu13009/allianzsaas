## Admin — Centralisation des données et pilotage des productions

### Objectifs
- Avoir une vision unifiée des productions de tous les CDC: `cdc_commercial`, `cdc_sante_ind`, `cdc_sante_coll`.
- Suivre la production cumulée (agence), individuelle (par CDC), les commissions et les indicateurs clés.
- Pouvoir « verrouiller/bloquer » un mois par rôle/CDC afin de figer la paie et éviter toute modification ultérieure.

---

## Modèle de données (cible Firebase, V1 locale identique)

### Collections d’entrées (granularité: une saisie)
Nom de collection par domaine:
- `entries_commercial`
- `entries_sante_ind`
- `entries_sante_coll`

Champs communs (toutes collections):
- `id`: string (uid doc)
- `cdcUserId`: string (email ou uid)
- `cdcRole`: string (normalisé, ex: `cdc_commercial`)
- `createdAtIso`: string (ISO)
- `dayIso`: string (YYYY-MM-DD)
- `monthKey`: string (YYYY-MM) — redondant pour requêtes rapides
- `client`: string (normalisé)
- `contractNumber`: string | null

Spécifiques — Commercial:
- `type`: `AN` | `PROCESS`
- `product` (si AN)
- `process` (si PROCESS)
- `primeAnnuelle` | `versementLibre`
- `commissionEur` (calculé par barème interne)

Spécifiques — Santé Individuelle:
- `natureActe` (AN, Révision, Adhésion, C→A, A→C)
- `compagnie`: `allianz` | `courtage`
- `ca`: number (brut, € entier)
- `caPondere`: number (calcul pondération: 100/50/75/50 %)

Spécifiques — Santé Collective:
- `natureActe` (liste coll/ind définie)
- `origine`: `proactif` | `réactif` | `prospection`
- `compagnie`: `allianz` | `courtage`
- `primeBrute` (entier €)
- `primePonderee` (entier €, taux: 100/50/120 %)

Index recommandés:
- `[monthKey, cdcRole]`, `[monthKey, cdcUserId]`, `[cdcUserId, createdAtIso]`

### Collections d’agrégats mensuels
Deux niveaux:
- `monthly_user_stats` (par CDC, par rôle, par mois)
- `monthly_org_stats` (aggrégat agence par rôle, par mois)

Clés communes:
- `monthKey`, `cdcRole`, `cdcUserId?`

Mesures stockées (selon rôle):
- Commun: `countActs`, `caBrut`, `caPondere`, `commissionEur`, `lastComputedAt`
- Commercial (en plus): `countAN`, `countAuto`, `countOthers`, `countProcessTotal`, `countM3`, `countPretAuto`, `countPretIrd`, `ratio`, `commissionPotentielle`, `commissionReelle`

Calcul/MAJ des agrégats:
- À la création/édition/suppression d’une entrée, une fonction (Cloud Function ou job serveur) recalculera l’agrégat du mois visé.
- En V1 locale, on garde la même logique en mémoire/localStorage et on régénère les KPIs à l’affichage; l’API Firebase reprendra ces règles.

---

## Règles de calcul (rappel)

### Commercial
- Commission potentielle par AN selon le barème interne (implémenté côté UI).
- Commission réelle = potentielle si conditions: potentielle ≥ 200 €, process ≥ 15, ratio ≥ 100 %; sinon 0 €.

### Santé Individuelle
- Pondération: AN 100 %, Révision 50 %, Adhésion groupe 50 %, C→A 75 %, A→C 50 %.
- Commission mensuelle appliquée au CA pondéré selon le barème du module (cf. doc `cdc_sante_ind.md`).

### Santé Collective
- Pondération selon origine: Proactif 100 %, Réactif 50 %, Prospection 120 %.
- Barème commissions (sur CA pondéré du mois):
  - 0 → 6 000 €: 0 %
  - 6 001 → 10 000 €: 2 %
  - 10 001 → 14 000 €: 3 %
  - 14 001 → 18 000 €: 4 %
  - ≥ 18 001 €: 6 %
- Règle: taux appliqué dès le 1er euro lorsque le seuil est atteint.

---

## Verrouillage (« bloquer la production »)

Objectif: figer les données d’un mois pour la paie; empêcher toute modification ultérieure par le CDC.

### Modèle
Collection: `locks`
- `monthKey`: string (YYYY-MM)
- `cdcRole`: string (ex: `cdc_sante_coll`)
- `cdcUserId?`: string | null — si null: verrou global pour tous les CDC du rôle; sinon verrou individuel.
- `locked`: boolean
- `lockedAt`: ISO
- `lockedBy`: admin uid/email
- `note`: string (optionnel)

### Comportement côté app
- Si un lock actif est présent pour `(monthKey, cdcRole[, cdcUserId])`, toutes les opérations d’écriture (create/edit/delete) sont désactivées côté UI et refusées côté règles Firebase (voir plus bas).
- Le badge d’état s’affiche « Verrou » sur les pages concernées.

### Règles Firebase (esquisse)
- CDC: peut lire/écrire ses entrées tant que `lock[monthKey, role, userId].locked == false` et `lock[monthKey, role].locked == false`.
- Admin: peut créer/mettre à jour un lock; peut recalculer/écrire les agrégats.

### Processus de paie recommandé
1. Fin de mois M: l’admin vérifie les tableaux et KPI.
2. Il active le « verrou » pour `(monthKey=M, rôle)` (global ou par CDC si nécessaire).
3. Les agrégats « monthly_user_stats » et « monthly_org_stats » sont recalculés et figés (timestamp `lastComputedAt`).
4. Les exports/rapports de paie s’appuient sur ces agrégats figés.

---

## Rapports et exports

### Exports CSV/PDF (mois, rôle)
- Par CDC et global agence; colonnes FR lisibles (séparateur `;`).
- Détail par nature/process/origine; totaux CA brut, CA pondéré, commissions.

### Tableaux de bord admin
- Sélecteur `mois` et `rôle`.
- Cartes: production cumulée (agence), production par CDC, commissions estimées, nombre d’actes.
- Indicateurs de verrouillage visibles et filtrables.

---

## Roadmap d’implémentation
1. V1 UI (locale) — déjà en cours: normaliser les pages CDC, extraire composants (KpiCard, AppModal), badges de verrou.
2. Référentiel de calcul partagé côté front (ou service) pour homogénéité des KPI.
3. Schéma Firebase + règles de sécurité (lecture/écriture par rôle, verrous).
4. Cloud Functions: recalcul agrégats `monthly_*` à l’upsert/suppression d’une entrée.
5. Écrans admin: gestion des verrous, vue synthèse agence, exports.
6. Tests e2e (login→création→verrouillage→export) et unitaires (barèmes/pondérations).

---

## Points d’attention
- Normalisation des rôles (accents/majuscules) et des noms clients.
- Arrondis monétaires (entier €) et formats `fr-FR`.
- Traçabilité: conserver un historique minimal (qui a modifié quoi et quand) — utile pour audit.
- Performance: indexer par `monthKey` et limiter les lectures (agrégats mensuels pour les écrans admin).


