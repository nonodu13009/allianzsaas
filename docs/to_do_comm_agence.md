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
- [ ] La sidebar affiche un bouton « commissions agence » uniquement pour un administrateur connecté
- [ ] Un clic ouvre la page de gestion des commissions (route dashboard dédiée)
- [ ] La page permet de naviguer d’année en année
- [ ] Un clic sur un mois ouvre une modale de saisie regroupant toutes les données du mois
- [ ] La validation de la modale met à jour les données persistant localement
- [ ] Les prélèvements sont saisis et stockés séparément des charges
- [ ] La page propose des comparatifs année/année et mois/mois
- [ ] Des graphiques affichent tendances et répartitions (commissions, charges, résultat, prélèvements)
- [ ] Les calculs affichés correspondent à la règle Résultat = Commissions − Charges
- [ ] Un utilisateur non admin ne voit pas le bouton et ne peut pas accéder à la page

Tâches de développement

Sécurité & Accès
- [ ] Restreindre l’accès au bouton et à la page aux administrateurs (guard côté UI et serveur si besoin)
- [ ] Tests d’accès (admin vs non‑admin)

Données & Types
- [ ] Définir les types/contrats TypeScript: CommissionBreakdown, Charges, Resultat, PrelevementAgent, YearData, MonthData
- [ ] Écrire un service d’accès aux données (lecture/écriture) basé sur `docs/comm_agence.md` pour la phase locale
- [ ] Gérer la validation des données de saisie (schéma, contraintes)

UI & Navigation
- [ ] Ajouter le bouton « commissions agence » dans la sidebar (scope admin uniquement)
- [ ] Créer la page `dashboard/commissions-agence` (sous `src/app/dashboard/...`)
- [ ] Ajouter la navigation par années (sélecteur/contrôles précédent/suivant)
- [ ] Afficher une grille 12 mois avec état de complétude par mois

Saisie mensuelle (modale)
- [ ] Réutiliser/adapter `AppModal` pour la saisie par mois
- [ ] Champs saisis: iard, vie, courtage, profits exceptionnels, charges, prélèvements (par agent)
- [ ] Calcul instantané du résultat et contrôle des incohérences
- [ ] Sauvegarde locale non bloquante et feedback visuel de succès/erreur

Visualisations & Comparaisons
- [ ] Choisir une librairie de graphiques (ex: Recharts ou Chart.js) — à valider
- [ ] Mettre en place les courbes/tendances par mois (commissions, charges, résultat)
- [ ] Ajouter des visualisations comparatives Y/Y et M/M
- [ ] Ajouter des répartitions par type de commission (iard/vie/courtage/profits exceptionnels)

Persistance, Export & Outillage
- [ ] Persister en local (lecture/écriture) en s’appuyant sur `docs/comm_agence.md` (ou format dédié si nécessaire)
- [ ] Fournir un export CSV/JSON des données d’une année
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
- [ ] Créer une branche `feat/commissions-agence-admin`
- [ ] Ouvrir une PR avec description, screenshots et plan de test

Décisions à valider
- [ ] Librairie de graphiques (Recharts vs Chart.js vs autre)
- [ ] Format de persistance locale temporaire (réutiliser `docs/comm_agence.md` tel quel vs fichier dédié JSON/TS)
- [ ] Détails UI (grille vs tableau, badges de complétude, couleurs)

Notes d’implémentation
- Réutiliser `AppModal` pour la saisie mensuelle et `KpiCard` pour les tuiles KPI si pertinent
- Respecter la structure existante de `src/app/dashboard` et les conventions du projet