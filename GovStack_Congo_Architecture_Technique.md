
# Architecture technique — Identité (MOSIP) + X-Road pour un cas de gouvernance publique en République du Congo

**Cas d'usage** : trois services numériques opérés par trois entités administratives distinctes.

| Entité (exemple) | Application | Rôle |
|---|---|---|
| Agence Identité Nationale | App Enregistrement / Identité | Fournisseur d'identité (IdP), source unique de vérité sur le citoyen |
| Ministère de la Justice | App Casier Judiciaire | Demande, instruction et délivrance du casier judiciaire |
| Ministère des Affaires Étrangères / Immigration | App Passeport | Demande, instruction et délivrance du passeport |

Stack retenue : **API en Python (FastAPI)** pour les trois backends, **frontend en TanStack Start** (React) pour les trois portails. Fédération d'identité via **MOSIP + eSignet** (OIDC). Échanges inter-agences via **X-Road** (brique Médiateur d'Information GovStack).

---

## 1. Principes d'architecture à respecter

1. **Séparation des responsabilités par donnée** : l'Identity BB ne connaît que l'identité (attributs démographiques + UIN). Casier Judiciaire et Passeport ne stockent jamais l'identité en clair — seulement l'UIN comme clé étrangère vers l'app Identité.
2. **Deux couches d'intégration distinctes, ne pas les confondre** :
   - **OIDC** (citoyen ↔ Identity BB) : répond à "qui est l'utilisateur ?". Flux navigateur, côté humain.
   - **X-Road** (organisation ↔ organisation) : répond à "quel système d'une administration a le droit d'interroger quel système d'une autre administration ?". Flux machine-à-machine, gouverné, journalisé, signé.
3. **API-first** : chaque backend expose une spec OpenAPI 3.0 dès le premier jour — c'est ce document qui sera réutilisé tel quel pour l'enregistrement du service dans X-Road.
4. **Pas de biométrie en phase 1** : MOSIP est configuré en dédoublonnage démographique uniquement ; le module biométrique s'active plus tard sans changer les contrats d'API.

---

## 2. Vue d'ensemble des flux

```
Citoyen (navigateur)
   │
   │ 1. Connexion "Mon Identité Nationale"
   ▼
Frontend TanStack Start (Passeport ou Casier Judiciaire)
   │
   │ 2. Redirection OIDC vers eSignet (Identity BB)
   ▼
eSignet (OIDC) ──── MOSIP (registre, UIN, attributs démographiques)
   │
   │ 3. Retour: code d'autorisation → échangé côté backend contre id_token/access_token
   ▼
API Python (FastAPI) de l'app "Passeport" ou "Casier Judiciaire"
   │ (stocke uniquement l'UIN + données métier propres)
   │
   │ 4. Si besoin de vérification croisée (ex: passeport → casier)
   ▼
Security Server X-Road (Passeport)  ──►  Security Server X-Road (Justice)  ──►  API Python "Casier Judiciaire"
                              (mTLS, message signé, journalisé)
```

---

## 3. Environnement de développement local

Avant tout déploiement réel, monter un environnement local avec `docker-compose` pour ne pas dépendre d'infrastructure de production dès le départ.

```yaml
# docker-compose.dev.yml (extrait)
version: "3.9"
services:
  db-identite:
    image: postgres:16
    environment: { POSTGRES_DB: identite, POSTGRES_PASSWORD: dev }
  db-justice:
    image: postgres:16
    environment: { POSTGRES_DB: justice, POSTGRES_PASSWORD: dev }
  db-passeport:
    image: postgres:16
    environment: { POSTGRES_DB: passeport, POSTGRES_PASSWORD: dev }

  # eSignet fournit un docker-compose officiel avec mock-identity-system
  # (voir https://github.com/mosip/esignet/tree/master/docker-compose)
  # -> à cloner et lancer séparément en phase 1 :
  #    docker compose --file dependent-docker-compose.yml up
  #    docker compose --file docker-compose.yml up

  api-identite:
    build: ./api-identite
    env_file: .env.identite
    depends_on: [db-identite]

  api-justice:
    build: ./api-justice
    env_file: .env.justice
    depends_on: [db-justice]

  api-passeport:
    build: ./api-passeport
    env_file: .env.passeport
    depends_on: [db-passeport]

  frontend-identite:
    build: ./frontend-identite
    ports: ["3000:3000"]
  frontend-justice:
    build: ./frontend-justice
    ports: ["3001:3000"]
  frontend-passeport:
    build: ./frontend-passeport
    ports: ["3002:3000"]
```

> Important : le `docker-compose` officiel d'eSignet est explicitement documenté comme **non destiné à la production** — il sert uniquement à développer/tester le flux OIDC en local avec un identity system simulé (mock). En production, MOSIP et eSignet se déploient via leurs charts Helm officiels sur Kubernetes.

Pour simuler X-Road en local, des images Docker de test de Security Server existent dans les dépôts du Nordic Institute for Interoperability Solutions (NIIS) — utile en phase 1 pour valider le protocole avant de monter une vraie fédération inter-agences.

---

## 4. Backend Python — structure commune aux 3 API

Framework recommandé : **FastAPI**. Raison : génération native de la spec OpenAPI 3.0 (exigée par GovStack et directement réutilisable pour l'enregistrement du service dans X-Road), validation via Pydantic, support async natif utile pour les appels sortants OIDC/X-Road.

### 4.1 Arborescence type (identique pour les 3 API, seul le domaine métier change)

```
api-justice/
├── app/
│   ├── main.py                # point d'entrée FastAPI
│   ├── core/
│   │   ├── config.py           # variables d'env (OIDC issuer, client_id/secret, DB, X-Road)
│   │   └── security.py         # session cookie, dépendance get_current_user
│   ├── auth/
│   │   ├── oidc.py              # client OIDC vers eSignet (Authlib)
│   │   └── routes.py            # /auth/login, /auth/callback, /auth/logout
│   ├── xroad/
│   │   ├── client.py            # appels sortants via Security Server local
│   │   └── exposed_routes.py    # endpoints exposés côté "producteur" à X-Road
│   ├── domain/
│   │   ├── models.py            # SQLAlchemy: Demande, Dossier... (clé = uin)
│   │   ├── schemas.py           # Pydantic
│   │   └── services.py          # logique métier (workflow de la demande)
│   ├── db/
│   │   ├── session.py
│   │   └── migrations/          # Alembic
│   └── api/
│       └── routes.py            # endpoints métier consommés par le frontend
├── tests/
├── Dockerfile
└── pyproject.toml
```

### 4.2 Intégration OIDC (Identity BB / eSignet) — `auth/oidc.py`

```python
# app/auth/oidc.py
from authlib.integrations.starlette_client import OAuth
from app.core.config import settings

oauth = OAuth()
oauth.register(
    name="esignet",
    server_metadata_url=f"{settings.ESIGNET_ISSUER}/.well-known/openid-configuration",
    client_id=settings.ESIGNET_CLIENT_ID,
    client_secret=settings.ESIGNET_CLIENT_SECRET,
    client_kwargs={"scope": "openid profile"},
)
```

```python
# app/auth/routes.py
from fastapi import APIRouter, Request
from starlette.responses import RedirectResponse
from app.auth.oidc import oauth
from app.core.security import create_session

router = APIRouter(prefix="/auth")

@router.get("/login")
async def login(request: Request):
    redirect_uri = request.url_for("callback")
    return await oauth.esignet.authorize_redirect(request, redirect_uri)

@router.get("/callback")
async def callback(request: Request):
    token = await oauth.esignet.authorize_access_token(request)
    userinfo = token["userinfo"]          # nom, date de naissance, uin, ...
    uin = userinfo["sub"]                  # identifiant unique national
    response = RedirectResponse(url="/")
    create_session(response, uin=uin, attrs=userinfo)
    return response
```

> Pattern retenu : **BFF (Backend For Frontend)**. Le client OIDC "confidentiel" (avec `client_secret`) vit dans l'API Python, jamais dans le navigateur. Le frontend TanStack ne voit jamais de token OIDC — seulement un cookie de session `httpOnly` posé par l'API après le callback.

### 4.3 Modèle de données — clé UIN, pas d'identité dupliquée

```python
# app/domain/models.py
class DemandeCasierJudiciaire(Base):
    __tablename__ = "demandes"
    id: Mapped[int] = mapped_column(primary_key=True)
    uin: Mapped[str] = mapped_column(index=True)   # référence Identity BB, jamais nom/prénom en clé
    statut: Mapped[str]                             # soumise, en_instruction, validee, rejetee
    document_url: Mapped[str | None]
    cree_le: Mapped[datetime]
```

### 4.4 Exposer le service à X-Road (côté "producteur", ex: Casier Judiciaire)

FastAPI génère déjà `/openapi.json`. Il suffit de le déclarer côté Security Server local :

1. Interface d'admin du Security Server → onglet **Clients** → sélectionner le sous-système Justice → onglet **Services** → **ADD REST** → type **"OpenAPI 3 Description"** → coller l'URL `https://api-justice.interne/openapi.json`.
2. Définir le **droit d'accès** : autoriser explicitement le sous-système "Passeport" à appeler ce service précis (rien n'est ouvert par défaut).
3. Aucune modification de code nécessaire côté FastAPI — le Security Server proxifie l'appel en conservant votre contrat REST existant.

> Ancienne alternative (X-Road v6, plus lourde) : un composant séparé "REST Adapter Service" (Consumer/Provider Gateway). Non nécessaire avec les versions récentes du Security Server qui supportent nativement REST/OpenAPI 3 — à éviter sauf contrainte de compatibilité avec une infra X-Road ancienne.

### 4.5 Appeler un service d'une autre agence (côté "consommateur", ex: Passeport → Casier Judiciaire)

```python
# app/xroad/client.py
import httpx
from app.core.config import settings

# Le consommateur n'appelle JAMAIS l'autre agence directement :
# il passe par son propre Security Server, qui route vers le Security Server producteur.
XROAD_URL = (
    f"{settings.LOCAL_SECURITY_SERVER}/r1/{settings.XROAD_INSTANCE}"
    f"/GOV/JUSTICE/CASIER-JUDICIAIRE/verifier-mention"
)

async def verifier_casier(uin: str) -> dict:
    headers = {
        "X-Road-Client": f"{settings.XROAD_INSTANCE}/GOV/AFFAIRES-ETRANGERES/PASSEPORT",
    }
    async with httpx.AsyncClient(verify=settings.XROAD_TLS_CA) as client:
        resp = await client.get(XROAD_URL, params={"uin": uin}, headers=headers)
        resp.raise_for_status()
        return resp.json()
```

Chaque échange est automatiquement signé et journalisé par les deux Security Servers (horodatage, non-répudiation) — utile pour la valeur probante d'une vérification de casier judiciaire dans une procédure administrative.

### 4.6 Spécificité de l'app Identité

L'app Identité n'est pas un service métier comme les deux autres : c'est une **couche d'intégration (BFF) devant MOSIP**, pas une réécriture de MOSIP. Son rôle : exposer à son propre frontend les écrans d'enrôlement (saisie démographique), en appelant en interne les API MOSIP (Registration, ID Repository) — MOSIP et eSignet restent les systèmes de référence, votre code Python ne fait qu'orchestrer/afficher.

---

## 5. Frontend — TanStack Start pour les 3 portails

**Choix retenu : TanStack Start** (passé en v1.0 début 2026), construit sur TanStack Router, avec rendu serveur (SSR), server functions et routing typé — pertinent ici pour un portail citoyen (temps de chargement initial plus robuste sur connexions faibles, important dans le contexte congolais) plutôt qu'une SPA pure.

### 5.1 Arborescence type

```
frontend-passeport/
├── app/
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── connexion.tsx        # redirige vers {API}/auth/login (géré par le backend)
│   │   └── demande.tsx           # route protégée, données via TanStack Query
│   ├── lib/
│   │   └── api-client.ts         # wrapper fetch vers l'API FastAPI (cookies inclus)
│   └── router.tsx
├── package.json
└── vite.config.ts
```

### 5.2 Connexion : déléguer entièrement l'OIDC au backend

```tsx
// app/routes/connexion.tsx
export const Route = createFileRoute("/connexion")({
  loader: () => {
    // Le navigateur est simplement redirigé vers l'API,
    // qui gère tout le flux OIDC avec eSignet (voir §4.2).
    window.location.href = "/api/auth/login";
  },
});
```

### 5.3 Récupération des données métier via TanStack Query

```tsx
// app/routes/demande.tsx
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";

export const Route = createFileRoute("/demande")({
  component: () => {
    const { data, isLoading } = useQuery({
      queryKey: ["demande"],
      queryFn: () => apiClient.get("/api/demandes/moi"),
    });
    if (isLoading) return <p>Chargement…</p>;
    return <StatutDemande demande={data} />;
  },
});
```

Le cookie de session `httpOnly` posé par le backend (§4.2) est envoyé automatiquement à chaque requête — le frontend n'a jamais besoin de manipuler de token.

---

## 6. Déploiement

### 6.1 Conteneurisation

Chaque API et chaque frontend : un `Dockerfile` multi-stage standard (build → runtime léger, ex. `python:3.12-slim` pour les API, `node:20-slim` pour le build TanStack).

### 6.2 Orchestration — un namespace Kubernetes par entité, pas par application

```
Cluster K8s (ou k3s, plus léger, adapté à une infra locale de taille modeste)
├── ns-identite     (api-identite, frontend-identite, mosip-*, esignet, postgres-identite)
├── ns-justice      (api-justice, frontend-justice, postgres-justice, security-server-justice)
└── ns-passeport    (api-passeport, frontend-passeport, postgres-passeport, security-server-passeport)
```

Cette séparation par namespace **reflète la séparation administrative réelle** — utile si, à terme, chaque entité héberge effectivement son propre cluster/datacenter plutôt qu'un cluster partagé.

- **MOSIP** : déploiement production via les Helm charts officiels du dépôt `mosip/mosip-helm` (pas le docker-compose de dev).
- **eSignet** : idem, chart Helm officiel séparé du docker-compose de test.
- **X-Road Security Server** : historiquement distribué en paquets `.deb`/`.rpm` officiels pour VM dédiées (c'est l'approche la plus courante en déploiement national réel) ; des images Docker existent aussi pour des déploiements conteneurisés/tests. À trancher selon la doctrine de sécurité retenue par chaque entité — beaucoup d'implémentations nationales gardent le Security Server sur une machine dédiée isolée plutôt que dans le cluster applicatif.
- **X-Road Central Server** : composant de gouvernance nationale, à héberger et opérer par l'entité qui portera la fédération d'interopérabilité au niveau pays (voir §7 — c'est un chantier institutionnel, pas seulement technique).

### 6.3 CI/CD

Pipeline standard par dépôt (GitHub Actions/GitLab CI) : lint + tests → build image Docker → push registre → déploiement Helm (staging puis production), avec migrations Alembic exécutées en job dédié avant le rollout applicatif.

### 6.4 Réseau

Les Security Servers communiquent entre eux via mTLS au-dessus d'une liaison réseau sécurisée entre les infrastructures des trois entités (VPN dédié ou réseau gouvernemental interne si disponible, ex. relié au data center de Brazzaville). Les frontends et API grand public restent, eux, exposés via une passerelle web classique (reverse proxy + TLS public).

---

## 7. Feuille de route pragmatique

| Phase | Contenu | Ce qui reste "code" | Ce qui devient "institutionnel" |
|---|---|---|---|
| 0 | Environnement local complet (docker-compose, eSignet mock) | 100% | — |
| 1 | 3 API + 3 frontends, OIDC réel contre une instance MOSIP/eSignet de test | Oui | Choix du porteur de l'Identity BB |
| 2 | Ajout biométrique dans MOSIP | Oui (config) | — |
| 3 | Mise en place X-Road entre 2 entités réelles | Oui (adaptateurs) | Central Server, PKI, gouvernance — nécessite un sponsor national |
| 4 | Ouverture à d'autres ministères | Oui | Cadre légal d'échange de données, onboarding des membres X-Road |

---

## 8. Checklist de conformité GovStack avant mise en production

- [ ] Spec OpenAPI 3.0 exposée et testée pour chaque API
- [ ] Flux OIDC validé contre eSignet réel (pas seulement le mock)
- [ ] Aucune donnée d'identité dupliquée hors de l'Identity BB (audit du modèle de données)
- [ ] Journalisation X-Road activée et testée (signature + horodatage)
- [ ] Politique d'accès explicite par service X-Road documentée
- [ ] Revue sécurité : TLS partout, cookies `httpOnly`/`secure`, secrets hors du code
- [ ] Plan de sauvegarde/reprise par base de données (une par entité)

---

## Sources

- [GovStack Sandbox](https://govstack.gitbook.io/sandbox)
- [Identity Building Block — Service APIs](https://identity.govstack.global/8-apis-and-services)
- [Information Mediator (X-Road) — Description](https://specs.govstack.global/information-mediator/mediator-development/2-description)
- [X-Road — Message Protocol for REST](https://docs.x-road.global/Protocols/pr-rest_x-road_message_protocol_for_rest.html)
- [X-Road — Security Server User Guide](https://docs.x-road.global/Manuals/ug-ss_x-road_6_security_server_user_guide.html)
- [MOSIP — eSignet docker-compose (dev only)](https://github.com/mosip/esignet/blob/master/docker-compose/README.md)
- [MOSIP — Getting Started](https://docs.mosip.io/develop/deployment/getting-started)
- [TanStack Start — Overview](https://tanstack.com/start/latest/docs/framework/react/overview)
