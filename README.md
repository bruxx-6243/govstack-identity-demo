# GovStack Congo — Identité, Casier Judiciaire & Passeport

Démonstrateur d'architecture GovStack pour trois services numériques de la République du Congo, opérés par trois entités administratives distinctes et fédérés autour d'une identité nationale unique.

Voir [`GovStack_Congo_Architecture_Technique.md`](./GovStack_Congo_Architecture_Technique.md) pour l'architecture complète (OIDC/MOSIP/eSignet, X-Road, déploiement, feuille de route).

## Applications

| Dossier | Entité | Rôle |
|---|---|---|
| [`congo-citoyen-reg/`](./congo-citoyen-reg) | Agence Identité Nationale | Enrôlement citoyen / Identity BB — fournisseur d'identité, source unique de vérité |
| [`congo-citoyen-justice/`](./congo-citoyen-justice) | Ministère de la Justice | Demande, instruction et délivrance du casier judiciaire |
| [`congo-citoyen-immigration/`](./congo-citoyen-immigration) | Affaires Étrangères / Immigration | Demande, instruction et délivrance du passeport |

Chaque application est un portail **TanStack Start** (React) indépendant, avec la même architecture en couches (`domain` / `application` / `infrastructure` / `stores` / `routes`). Les apps Justice et Passeport ne stockent jamais l'identité du citoyen — uniquement son UIN (identifiant unique national), résolu auprès de l'Identity BB, conformément au principe de séparation des responsabilités par donnée (§1 de l'architecture).

À ce stade, les trois portails sont **frontend uniquement** : les backends FastAPI, X-Road et l'intégration MOSIP/eSignet réelle restent à construire (voir la feuille de route, §7 du document d'architecture, et `docs/backend-requirements.md` dans chaque application).

## Démarrage

Chaque application se lance indépendamment :

```bash
cd congo-citoyen-reg        # ou congo-citoyen-justice / congo-citoyen-immigration
pnpm install
pnpm dev
```

Sans backend configuré, chaque app fonctionne en mode démo avec persistance locale (`localStorage`). Pour brancher une API réelle, définir la variable d'environnement correspondante :

- `congo-citoyen-reg` → `VITE_ENROLLMENT_API_URL`
- `congo-citoyen-justice` → `VITE_CASIER_API_URL`
- `congo-citoyen-immigration` → `VITE_PASSEPORT_API_URL`

## Stack

- **Frontend** : TanStack Start (React, SSR), TanStack Router/Query, Zustand, Zod, Tailwind, shadcn/ui
- **Backend (à venir)** : FastAPI (Python), spec OpenAPI 3.0 dès le départ
- **Identité** : MOSIP + eSignet (OIDC)
- **Échanges inter-agences** : X-Road (Médiateur d'Information GovStack)
