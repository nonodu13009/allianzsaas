## Allianz Saas — Frontend (Next.js + App Router)

### Installation
```bash
npm ci
npm run dev
```

### Scripts
- `dev`: démarre le serveur local
- `build`: compile l’application
- `start`: lance le build
- `lint`: exécute ESLint

### Architecture
- `src/app` (App Router)
  - `page.tsx` (home, image plein écran floutée)
  - `login/page.tsx` (fond flouté + carte login, domaine restreint, toggle mot de passe)
  - `dashboard/` (layout + pages, fond flouté global)
    - `layout.tsx` (header, sidebar, garde auth)
    - `page.tsx` (hero + timeline du mois)
    - `cdc-commercial/page.tsx` (section réservée CDC Commercial)
  - `error.tsx` (page d’erreur stylée)
- `src/data/users.ts` (liste users, `getRoleDisplayName`)
- `src/lib/auth.ts` (auth locale mock: `signIn`, `signOut`, `getCurrentSession`)

### Design System
- Typo Geist et utilitaires globaux dans `src/app/globals.css`
- Composants CSS: `.btn`, `.btn-primary`, `.btn-ghost`, `.badge`, `.card`, `.input`, `.hero`, `.section-title`

### CI
Un workflow GitHub Actions (`.github/workflows/ci.yml`) installe, lint et build sur Node 20 à chaque push/PR sur `main`.

### Notes
- Favicon forcé via `metadata.icons` (`public/favicon.ico`, fallback `favicon.png`).
- Les accès dashboard exigent une session locale; la redirection s’opère depuis le layout.
