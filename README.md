# Book In Pass — site et back-office Angular

Monorepo [Nx](https://nx.dev) : le site voyageurs (`front`) et le back-office du personnel (`backoffice`), en Angular 22
avec Tailwind CSS 4 et Transloco. L'API Spring Boot est dans le dépôt
[bookinpass](https://github.com/seydousoow/bookinpass) (variables d'environnement, déploiement Render : voir son README).

## Prérequis

- Node `26.13.1` (`.nvmrc` ; `nvm install` puis `nvm alias default 26.13.1`), npm 11 — voir `engines` dans `package.json`.
- L'API sur `http://localhost:8080` : les deux applications relaient `/api` vers elle (`apps/*/proxy.conf.json`).

```bash
npm ci
npm run front:start   # site : http://localhost:4200
npm run bo:start      # back-office : http://localhost:4300
```

## Projets

| Projet       | Chemin                    | Import       | Tags                            | Rôle                                                              |
| ------------ | ------------------------- | ------------ | ------------------------------- | ----------------------------------------------------------------- |
| `front`      | `apps/front`              | —            | `layer:app`, `scope:front`      | Site voyageurs (préfixe `bip`)                                    |
| `backoffice` | `apps/backoffice`         | —            | `layer:app`, `scope:backoffice` | Back-office du personnel (préfixe `bo`)                           |
| `models`     | `packages/models`         | `models`     | `layer:models`, `scope:shared`  | Types et contrats de l'API                                        |
| `utils`      | `packages/utils`          | `utils`      | `layer:util`, `scope:shared`    | Utilitaires : dates, durées, montants, téléphone, erreurs d'API   |
| `providers`  | `packages/configurations` | `configs`    | `layer:config`, `scope:shared`  | Config. de l'app, titre des pages, icônes, intercepteur de langue |
| `state`      | `packages/state`          | `state`      | `layer:state`, `scope:front`    | Stores du site (recherche, aéroports, devises…)                   |
| `components` | `packages/components`     | `components` | `layer:ui`, `scope:shared`      | Composants partagés (`bip-field`, `bip-input`…)                   |
| `pipes`      | `packages/pipes`          | `pipes`      | `layer:ui`, `scope:front`       | Pipes du site                                                     |
| `payment`    | `packages/payment`        | `payment`    | `layer:ui`, `scope:front`       | Formulaires de paiement (Stripe, PayDunya)                        |

Les applications portent aussi `kind:application`, les bibliothèques `kind:library` (utilisé par les scripts `libs:*`).

### Dépendances autorisées

Vérifiées par ESLint (`@nx/enforce-module-boundaries`, `eslint.config.mjs`) :

- **Couches, sens unique** : `models` ← `util` ← `config` ← `state` ← `ui` ← `app`.
- **Périmètre** : `scope:shared` ne dépend que du partagé ; chaque application, du partagé et de son propre périmètre.

Une nouvelle bibliothèque doit recevoir un tag `kind:*`, un `layer:*` et un `scope:*`, sinon le lint la refuse.

## Scripts

| Script                                   | Effet                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------- |
| `front:start` / `bo:start`               | Serveur de développement                                                |
| `front:test` / `bo:test`                 | Tests Jest avec couverture                                              |
| `front:lint` / `bo:lint`                 | ESLint                                                                  |
| `front:build` / `bo:build`               | Build de production                                                     |
| `libs:test` / `libs:lint` / `libs:build` | La même cible sur toutes les bibliothèques (`tag:kind:library`)         |
| `libs:*:ci`                              | Idem, sortie sans interface (CI)                                        |
| `ci:affected`                            | lint, test, typecheck et build des projets touchés depuis `origin/main` |
| `format` / `format:check`                | Prettier (avec tri des classes Tailwind dans `clsx` et `cn`)            |

Toute tâche passe par Nx (`npx nx <cible> <projet>`) : test, lint et typecheck sont mis en cache. Après un changement de
version de Node ou un comportement étrange du cache : `npx nx reset`.

Un hook `pre-commit` (Husky + lint-staged) lance ESLint et Prettier sur les fichiers indexés.

## Design

### Couches

```
packages/components/src/styles/theme.css   tokens (@theme Tailwind) — source unique des valeurs
packages/components/src/styles/base.css    règles globales : body, focus, curseurs, tooltips, mouvement réduit
packages/components/src/lib/*              composants bip-* : n'utilisent que les tokens
apps/front/src/styles.css                  tailwindcss + theme + base (rien d'autre : le site est la référence)
apps/backoffice/src/styles.css             tailwindcss + theme + base, puis redéfinit les tokens et ajoute les bo-*
apps/backoffice/src/app/ui/*               composants bo-* propres au back-office
```

Règle : **aucune valeur brute** (couleur, rayon, ombre, taille) hors de `theme.css` — ni dans un composant, ni dans une
page. Une nouvelle valeur devient d'abord un token. Le style s'écrit en classes Tailwind dans les templates ; les
classes conditionnelles passent par `clsx` (triées par Prettier, comme celles de `cn`).

### Tokens (`theme.css`)

Chaque token `--color-*`, `--radius-*`, `--shadow-*` devient une classe Tailwind (`bg-brand-primary`, `rounded-card`,
`shadow-panel`…).

| Famille    | Tokens                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------- |
| Marque     | `brand-primary`, `brand-dark`, `brand-accent`, `brand-soft`                                        |
| Surfaces   | `surface-page`, `surface-card`, `surface-muted`, `border-subtle`, `border-strong`                  |
| Texte      | `ink` (principal), `muted` (secondaire), `onbrand` (sur fond de marque)                            |
| États      | `state-{success,warning,error,info}` et leur variante `-soft` (fond)                               |
| Rayons     | `button` 10px, `field` 12px, `card` 14px, `panel` 18px, `pill` — quatre valeurs, pas une de plus   |
| Ombres     | `shadow-card`, `shadow-panel`                                                                      |
| Espacement | `--spacing: 4px` : échelle 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64                                     |
| Divers     | `--size-touch` 44px (cible tactile minimale), `text-xss` (0,625rem), pile de polices `--font-sans` |

### Deux thèmes, mêmes composants

Le site et le back-office partagent les composants ; seules les valeurs des tokens changent.

|        | Site (`front`)                  | Back-office                              |
| ------ | ------------------------------- | ---------------------------------------- |
| Marque | violet `#5125d7`, accent orange | bleu `#315edb`, orange en accent discret |
| Police | Segoe UI / pile système         | Inter / pile système                     |
| Cartes | rayon 14px, ombre douce         | rayon 12px, presque sans ombre           |
| Thème  | clair                           | clair uniquement                         |

Le back-office redéfinit les tokens dans `:root` de son `styles.css` : un composant `bip-*` y prend le bleu sans
modification. Il y ajoute aussi son gabarit (`--bo-sidebar` 248px, replié 76px, `--bo-topbar` 64px, `--bo-drawer`
520px) et ses classes :

| Classe                                   | Usage                                                                                      |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `bo-card`                                | Surface de carte sur un lien, un formulaire, une ligne (sans `bip-card`)                   |
| `bo-section-title`, `bo-link`, `bo-chip` | Titre de section, lien « Tout voir », puce de filtre (`aria-pressed`)                      |
| `bo-table`                               | Tableau de données ; sous 768px chaque ligne devient une fiche (`data-label` sur les `td`) |
| `bo-progress-track` / `bo-progress-bar`  | Barre de progression (billets contrôlés, places vendues)                                   |
| `bo-slide-in`, `bo-fade-in`              | Entrée des panneaux                                                                        |

### Composants partagés (`components`)

| Groupe       | Composants                                                                                                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Actions      | `bip-button` (aussi `button[bipButton]`, `a[bipButton]`)                                                                                                                                                               |
| Formulaires  | `bip-field`, `bip-input`, `bip-textarea`, `bip-select`, `bip-checkbox`, `bip-radio-group`, `bip-phone-input`, `bip-date-picker`, `bip-location-field`, `bip-passenger-selector`, `bip-slider`, `bip-currency-selector` |
| Affichage    | `bip-card`, `bip-badge`, `bip-spinner`, `bip-system-state`, `bip-pagination`                                                                                                                                           |
| Superposés   | `bip-modal`, `bip-dropdown`, `bip-overlay` ; service `ScrollLock` / `lockScrollWhile`                                                                                                                                  |
| Gabarit site | `bip-header`, `bip-footer` ; service `Viewport` (point de rupture `md:` de Tailwind, côté TS)                                                                                                                          |

Conventions :

- **Variantes par entrées typées**, mappées sur des classes de tokens : `bip-button` `variant` (`primary`, `secondary`,
  `outline`, `ghost`, `accent`, `success`, `danger`, `warning`, `link`) et `size` (`sm`, `md`, `lg`) ; `bip-badge`
  `tone` (`neutral`, `brand`, `accent`, `success`, `warning`, `error`, `info`) ; `bip-card` `padding`, `interactive`,
  `flat`.
- **Formulaires** : les champs implémentent `FormValueControl` (Signal Forms, `[formField]`) ou `[(value)]`, et
  s'enveloppent dans `bip-field`, qui porte le libellé, l'aide, le compteur et les erreurs (`<name>-hint`,
  `<name>-error` pour `aria-describedby`).
- **Sémantique native d'abord** : `bipButton` sur un vrai `<button>`/`<a>` plutôt qu'un `role` recopié.
- **Accessibilité** : anneau de focus unique (`bip-focusable`), cibles d'au moins 44px (`min-h-11`), animations
  coupées si `prefers-reduced-motion`.
- **Icônes** : heroicons via `@ng-icons`, déclarées par chaque composant (`provideIcons`) ; pictogrammes et drapeaux du
  site chargés à la demande depuis `/svg/<nom>.svg` (`provideAppIcons`).

La page `/ui-kit` du site montre les composants et leurs variantes.

## Traductions

Fichiers `apps/<app>/public/i18n/{fr,en}.json` (Transloco) :

- `front` : format ICU (pluriels, `select`) via `intl-messageformat`.
- `backoffice` : paramètres `{{param}}` seulement, pas de pluriels.

Les composants partagés traduisent les clés qu'ils reçoivent (`label`, `hint`, messages d'erreur) : leur passer une clé,
jamais un texte déjà traduit. Un texte calculé (ex. le compteur `0/1000` de `bip-textarea`) passe par l'entrée `counter`
de `bip-field`, qui n'est pas traduite.

## Applications

### Site (`front`)

Un dossier par produit sous `apps/front/src/app/features/`, chargé à la demande (`loadComponent`) :

| Route         | Dossier    | Parcours                                                                     |
| ------------- | ---------- | ---------------------------------------------------------------------------- |
| `/flight`     | `flight`   | Recherche (`/search`), offre (`/:offerId`), réservation, gestion (`/manage`) |
| `/stays`      | `stay`     | Recherche d'hébergements, détail (`/:resultId`)                              |
| `/activities` | `activity` | Recherche, fiche (`/:slug`), réservation (`/book`, `/booking`), avis         |
| `/bus`        | `bus`      | Recherche de trajets, réservation (`/book`, `/booking`)                      |
| `/ui-kit`     | `ui-kit`   | Vitrine des composants partagés                                              |

`/` redirige vers `/flight`. Paiement : Stripe (vols, hébergements), PayDunya (car et activités, mobile money ou carte),
via la bibliothèque `payment`.

### Back-office (`backoffice`)

```
apps/backoffice/src/app/
  core/    session (connexion, rôles, gardes), api, modèles, langue, utilitaires métier
  ui/      composants propres au back-office : page-header, drawer, confirm-dialog, stat-card, toasts…
  pages/   une page par dossier, chargée à la demande
```

Session par cookie HttpOnly posé par l'API (même site que l'API, `SameSite=Lax`). Gardes : `signedInGuard` (connecté),
`passwordGuard` (mot de passe provisoire à changer), `roleGuard` avec `data: { roles }`.

| Pages                                                                                    | Rôles                               |
| ---------------------------------------------------------------------------------------- | ----------------------------------- |
| Tableau de bord (contrôle des billets), départs, incidents, réservations                 | tous (`inspector` compris)          |
| Bagages                                                                                  | `admin`, `manager`, `station_chief` |
| Remboursements, lignes et tarifs, personnel, activités, réservations et avis d'activités | `admin`, `manager`                  |

## Configuration d'exécution

Le build ne contient pas l'adresse de l'API : chaque application charge `/env.js` (dans `public/`) avant Angular, qui
pose `window.__env = { apiBaseUrl }`. Par défaut `/api` (même origine, relayée par le serveur de développement).
`runtimeConfig` (`packages/configurations`) fusionne ces valeurs avec l'environnement du build : un même build sert
partout.

## Tests

Jest (`jest-preset-angular`), un fichier `*.spec.ts` à côté de chaque fichier testé. Les composants se testent par
un composant hôte et le DOM rendu (voir `packages/components/src/lib/textarea/textarea.spec.ts`).

```bash
npx nx test components                 # une bibliothèque
npx nx test front -t "flight search"   # filtrer par nom de test
```

## Ajouter une bibliothèque

```bash
npx nx g @nx/angular:library --directory=packages/<nom> --name=<nom> --prefix=bip
```

Puis dans `packages/<nom>/project.json` : les tags `kind:library`, `layer:*` et `scope:*` (voir plus haut), et l'alias
d'import dans `tsconfig.base.json` (`paths`).

## CI et déploiement

**GitHub Actions** (`.github/workflows/ci.yml`) : vérification du format, puis lint, test et build des projets
touchés (`nx affected`, bases fixées par `nrwl/nx-set-shas`).

**Vercel** : un projet Vercel par application, de racine `apps/front` ou `apps/backoffice` (`vercel.json` de chacune).

- Installation et build depuis la racine du dépôt (`npm ci`, `npx nx build <app>`), sortie dans
  `dist/apps/<app>/browser`.
- `tools/scripts/write-env.mjs` écrit ensuite `env.js` à partir de la variable Vercel `API_BASE_URL` (absente = `/api`).
  Il échoue si l'origine de l'API n'est pas dans le `connect-src` de la Content-Security-Policy du `vercel.json` : le
  navigateur bloquerait sinon chaque appel sans bruit. Changer de domaine d'API = mettre à jour la CSP d'abord.
- `tools/scripts/vercel-ignore.sh` saute le déploiement si l'application n'est pas touchée depuis le précédent.
- En-têtes de sécurité (CSP, HSTS, `X-Frame-Options`…) et cache (`env.js` jamais en cache, fichiers du build
  immuables) dans chaque `vercel.json`. Le back-office n'est pas indexé (`X-Robots-Tag: noindex`).
