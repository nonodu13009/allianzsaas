TODO — Commissions Agence (accès administrateur)

Résumé: créer une interface d’administration pour saisir et analyser commissions, charges, résultats et prélèvements des agents, avec navigation par années/mois, saisie via modale, comparatifs et visualisations.

Sources et périmètre
- Source des données actuelle: `docs/comm_agence.md`
- Accès: visible uniquement pour un administrateur (rôle admin)
- Hypothèse data: stockage local côté projet dans un premier temps, migration vers Firebase ultérieurement

Glossaire et règles de calcul
- Commissions globales: iard, vie, courtage, profits exceptionnels
- Charges: ensemble des charges de l’agence
- Résultat: Résultat = Somme(Commissions) − Charges
- Prélèvements agents (Julien, Jean‑Michel): données indépendantes, ne sont pas des charges

Récapitulatif des familles de données

Nom                    | Détails                                   | Inclus dans Résultat
-----------------------|-------------------------------------------|---------------------
Commissions            | iard, vie, courtage, profits exceptionnels | Oui (somme)
Charges                | Charges d’exploitation                     | Oui (soustraction)
Prélèvements (agents)  | Julien, Jean‑Michel                        | Non (indépendant)

Parcours utilisateur (admin) et critères d’acceptation
- [x] La sidebar affiche un bouton « commissions agence » uniquement pour un administrateur connecté ✅
- [x] Un clic ouvre la page de gestion des commissions (route dashboard dédiée) ✅
- [x] La page permet de naviguer d’année en année ✅
- [x] Un clic sur un mois ouvre une modale de saisie regroupant toutes les données du mois ✅
- [x] La validation de la modale met à jour les données persistant localement ✅
- [x] Les prélèvements sont saisis et stockés séparément des charges ✅
- [ ] La page propose des comparatifs année/année et mois/mois
- [ ] Des graphiques affichent tendances et répartitions (commissions, charges, résultat, prélèvements)
- [x] Les calculs affichés correspondent à la règle Résultat = Commissions − Charges ✅
- [x] Un utilisateur non admin ne voit pas le bouton et ne peut pas accéder à la page ✅

Tâches de développement

Sécurité & Accès
- [x] Restreindre l’accès au bouton et à la page aux administrateurs (guard côté UI et serveur si besoin) ✅
- [ ] Tests d’accès (admin vs non‑admin)

Données & Types
- [x] Définir les types/contrats TypeScript: CommissionBreakdown, Charges, Resultat, PrelevementAgent, YearData, MonthData ✅
- [x] Écrire un service d’accès aux données (lecture/écriture) basé sur `docs/comm_agence.md` pour la phase locale ✅
- [x] Gérer la validation des données de saisie (schéma, contraintes) ✅

UI & Navigation
- [x] Ajouter le bouton « commissions agence » dans la sidebar (scope admin uniquement) ✅
- [x] Créer la page `dashboard/commissions-agence` (sous `src/app/dashboard/...`) ✅
- [x] Ajouter la navigation par années (sélecteur/contrôles précédent/suivant) ✅
- [x] Afficher une grille 12 mois avec état de complétude par mois ✅

Saisie mensuelle (modale)
- [x] Réutiliser/adapter `AppModal` pour la saisie par mois ✅
- [x] Champs saisis: iard, vie, courtage, profits exceptionnels, charges, prélèvements (par agent) ✅
- [x] Calcul instantané du résultat et contrôle des incohérences ✅
- [x] Sauvegarde locale non bloquante et feedback visuel de succès/erreur ✅

Visualisations & Comparaisons
- [ ] Choisir une librairie de graphiques (ex: Recharts ou Chart.js) — à valider
- [ ] Mettre en place les courbes/tendances par mois (commissions, charges, résultat)
- [ ] Ajouter des visualisations comparatives Y/Y et M/M
- [ ] Ajouter des répartitions par type de commission (iard/vie/courtage/profits exceptionnels)

Persistance, Export & Outillage
- [x] Persister en local (lecture/écriture) en s’appuyant sur `docs/comm_agence.md` (ou format dédié si nécessaire) ✅
- [x] Fournir un export CSV/JSON des données d’une année ✅
- [ ] Indicateur d’intégrité (données manquantes/incomplètes)

Qualité & Tests
- [ ] Tests unitaires des calculs (résultat, totaux, contrôles)
- [ ] Tests d’intégration UI (saisie modale, navigation années)
- [ ] Lint/Types stricts sur les nouveaux fichiers

Migration Firebase (phase ultérieure)
- [ ] Créer schéma de collections (ex: `agenceCommissions/{annee}/{mois}`)
- [ ] Implémenter le service Firebase (feature flag pour activer la source Firebase)
- [ ] Règles de sécurité: lecture/écriture admin uniquement; validation côté règles
- [ ] Script de migration des données locales vers Firebase

Documentation & Workflow Git
- [ ] Documenter l’usage (parcours admin, structure des données, règles de calcul)
- [x] Créer une branche `feat/commissions-agence-admin` ✅
- [ ] Ouvrir une PR avec description, screenshots et plan de test

Décisions à valider
- [ ] Librairie de graphiques (Recharts vs Chart.js vs autre)
- [ ] Format de persistance locale temporaire (réutiliser `docs/comm_agence.md` tel quel vs fichier dédié JSON/TS)
- [ ] Détails UI (grille vs tableau, badges de complétude, couleurs)

Notes d’implémentation
- Réutiliser `AppModal` pour la saisie mensuelle et `KpiCard` pour les tuiles KPI si pertinent
- Respecter la structure existante de `src/app/dashboard` et les conventions du projet

---

Architecture proposée (fichiers & routes)

- `src/app/dashboard/commissions-agence/page.tsx` — Page principale (navigation années, grille mois, synthèse)
- `src/app/dashboard/commissions-agence/components/YearNavigator.tsx` — Sélecteur d’année (préc./suiv.)
- `src/app/dashboard/commissions-agence/components/MonthGrid.tsx` — Grille 12 mois avec état de complétude
- `src/app/dashboard/commissions-agence/components/MonthModal.tsx` — Saisie mensuelle (réutilise `AppModal`)
- `src/app/dashboard/commissions-agence/components/KpiSummary.tsx` — Tuiles KPI (réutilise `KpiCard`)
- `src/app/dashboard/commissions-agence/components/Charts.tsx` — Graphiques (tendances, répartitions, comparatifs)
- `src/app/dashboard/commissions-agence/types.ts` — Types et contrats TS
- `src/app/dashboard/commissions-agence/dataService.ts` — Service données (phase locale, `localStorage`)
- `src/app/dashboard/commissions-agence/selectors.ts` — Calculs dérivés (résultat, totaux, comparatifs)
- `src/app/dashboard/commissions-agence/__tests__/` — Tests unitaires (calculs) et d’intégration UI

Spécifications de types (TS)

```ts
export type CommissionBreakdown = {
  iard: number;
  vie: number;
  courtage: number;
  profitsExceptionnels: number;
};

export type MonthData = {
  month: number; // 1-12
  commissions: CommissionBreakdown;
  charges: number; // charges d’exploitation
  prelevements: Record<string, number>; // { Julien: number; "Jean-Michel": number }
  // Résultat affiché = somme(commissions) - charges (prélèvements exclus)
  completed: boolean; // mois complété (toutes données saisies et valides)
};

export type YearData = {
  year: number;
  months: Record<number, MonthData>; // clé = 1..12
};
```

Service de données (phase locale)

```ts
const STORAGE_KEY = "agence_commissions";

export function loadYear(year: number): YearData | null { /* lecture localStorage, parsing sûr */ }

export function saveMonth(year: number, monthData: MonthData): void {
  // 1) charger l’année courante
  // 2) recalculer l’état de complétude et valider les bornes
  // 3) persister dans localStorage (écriture atomique par année)
}

export function exportYearToCSV(year: number): string { /* export plat colonnes par mois */ }
export function exportYearToJSON(year: number): string { /* stringify propre */ }
```

Validation des données (saisie/modale)

- Numériques ≥ 0, montants en euros (arrondis à 2 décimales pour affichage)
- Tous les champs requis pour marquer un mois « complété »
- Contrôle de cohérence: résultat calculé = somme(commissions) − charges
- Prélèvements saisis mais exclus du calcul de résultat

Règles d’accès (admin)

- Affichage du bouton « commissions agence » si `session.role === 'admin'` (sidebar)
- Protection de la page: redirection vers `login` si non‑admin
- Tests: vérifier visibilité/accès admin vs non‑admin

Visualisations — proposition

- Librairie: Recharts (légère, composable). Alternatives: Chart.js
- Graphiques: lignes (tendance commissions/charges/résultat), barres empilées (répartition commissions), Y/Y et M/M

Format de persistance locale — proposition

- Source unique en phase 1: `localStorage` structuré par année (`agence_commissions:{year}`)
- Mapping direct avec `YearData`/`MonthData` pour limiter la friction de migration
- Migration ultérieure Firebase: `agenceCommissions/{annee}/{mois}` (lecture/écriture admin uniquement)

Plan de livraison (jalons)

1. Squelette page + navigation années + grille mois
2. Modale de saisie + validation + écriture locale
3. KPI et calculs dérivés + états de complétude
4. Graphiques (tendance, répartition, comparatifs)
5. Export CSV/JSON + indicateur d’intégrité
6. Tests unitaires calculs + tests UI clés
7. Intégration Firebase (feature flag) et script de migration

Risques & garde‑fous

- Données locales: prévoir export/backup manuel (CSV/JSON) et avertissement en UI
- Cohérence des montants: validations strictes + arrondis d’affichage
- Performance: mémoïsation des sélecteurs/calculs, composants graphiques optimisés

Décisions à valider (rappel)

- Librairie de graphiques: Recharts par défaut ? Chart.js ?
- Persistance locale: clé unique par année dans `localStorage` vs fichier dédié ?
- Détails UI: grille + badges de complétude + code couleur (à figer)