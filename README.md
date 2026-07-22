# GovStack Congo — Identité, Casier Judiciaire & Passeport

Démonstrateur d'architecture GovStack pour trois services numériques de la République du Congo, opérés par trois entités administratives distinctes et fédérés autour d'une identité nationale unique.

Voir [`GovStack_Congo_Architecture_Technique.md`](./GovStack_Congo_Architecture_Technique.md) pour l'architecture complète (OIDC/MOSIP/eSignet, X-Road, déploiement, feuille de route).

## Structure du monorepo

Workspace **pnpm** avec un seul lockfile et une configuration d'outillage partagée (`tsconfig.base.json`, `eslint.config.js`, `.prettierrc`) à la racine, étendue par chaque application.

```
govstack/
├── apps/
│   ├── identite/       # Agence Identité Nationale
│   ├── justice/        # Ministère de la Justice
│   └── immigration/    # Affaires Étrangères / Immigration
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
└── package.json
```

| Application | Entité | Rôle |
|---|---|---|
| [`apps/identite/`](./apps/identite) | Agence Identité Nationale | Enrôlement citoyen / Identity BB — fournisseur d'identité, source unique de vérité |
| [`apps/justice/`](./apps/justice) | Ministère de la Justice | Demande, instruction et délivrance du casier judiciaire |
| [`apps/immigration/`](./apps/immigration) | Affaires Étrangères / Immigration | Demande, instruction et délivrance du passeport |

Chaque application est un portail **TanStack Start** (React) indépendant, avec la même architecture en couches (`domain` / `application` / `infrastructure` / `stores` / `routes`). Les apps Justice et Passeport ne stockent jamais l'identité du citoyen — uniquement son UIN (identifiant unique national), résolu auprès de l'Identity BB, conformément au principe de séparation des responsabilités par donnée (§1 de l'architecture).

À ce stade, les trois portails sont **frontend uniquement** : les backends FastAPI, X-Road et l'intégration MOSIP/eSignet réelle restent à construire (voir la feuille de route, §7 du document d'architecture, et `docs/backend-requirements.md` dans chaque application).

## Démarrage

Installation unique à la racine du workspace :

```bash
pnpm install
```

Puis, pour lancer les trois applications en parallèle depuis la racine (comme un `turbo dev`) :

```bash
pnpm dev
```

Ou une seule application à la fois :

```bash
pnpm --filter identite dev
pnpm --filter justice dev
pnpm --filter immigration dev
```

Raccourcis équivalents : `pnpm dev:identite`, `pnpm dev:justice`, `pnpm dev:immigration`.

Autres commandes utiles à la racine (s'exécutent sur les trois applications) :

```bash
pnpm build     # pnpm -r build
pnpm lint      # pnpm -r lint
pnpm format    # pnpm -r format
```

Sans backend configuré, chaque app fonctionne en mode démo avec persistance locale (`localStorage`). Pour brancher une API réelle, définir la variable d'environnement correspondante (fichier `.env` dans le dossier de l'application concernée) :

- `identite` → `VITE_ENROLLMENT_API_URL`
- `justice` → `VITE_CASIER_API_URL`
- `immigration` → `VITE_PASSEPORT_API_URL`

## Stack

- **Frontend** : TanStack Start (React, SSR), TanStack Router/Query, Zustand, Zod, Tailwind, shadcn/ui
- **Monorepo** : pnpm workspaces, configuration d'outillage partagée (TypeScript, ESLint, Prettier)
- **Backend (à venir)** : FastAPI (Python), spec OpenAPI 3.0 dès le départ
- **Identité** : MOSIP + eSignet (OIDC)
- **Échanges inter-agences** : X-Road (Médiateur d'Information GovStack)
