# Backend Requirements — Casier Judiciaire

This document specifies what the backend must implement to replace the current
frontend mock (`LocalStorageCasierRepository`) with a real API, based on the
contract already defined in the frontend's domain/infrastructure layers.

Frontend references (for the backend team to cross-check against):

- `src/domain/casier/casier.schema.ts` — domain model + validation
- `src/domain/casier/casier.repository.ts` — repository port
- `src/infrastructure/casier/casier.dto.ts` — wire format (DTO)
- `src/infrastructure/casier/http-casier.repository.ts` — REST client the frontend already implements, dormant behind `VITE_CASIER_API_URL`
- `src/application/casier/casier.use-cases.ts` — actions that must map to endpoints

This app is the **Ministère de la Justice** service in the three-agency
GovStack architecture (see `GovStack_Congo_Architecture_Technique.md`). It
never stores citizen identity data — only `citizenUin`, a foreign key
resolved against the Identity BB (Agence Identité Nationale) via OIDC. There
is a single domain entity today: **Casier** (a demande de casier judiciaire).

---

## 1. Entity: Casier

### 1.1 Domain shape (camelCase — what the frontend works with internally)

```ts
{
  id: string;
  numeroDemande: string;     // "CJ-2026-483920" — MUST be server-generated (see §6)
  citizenUin: string;        // FK to Identity BB — resolved via OIDC, never a name
  createdAt: string;         // ISO datetime
  updatedAt: string;         // ISO datetime
  status: CasierStatus;      // see §2

  // Identité (résolution seule — pas de saisie)
  citizenNomAffiche: string; // nom affiché après résolution OIDC/X-Road, lecture seule côté agent

  // Motif & juridiction
  motifDemande: "" | "Emploi" | "Dossier judiciaire" | "Voyage" | "Autre";
  juridictionCompetente: string;
  precisionMotif: string;

  // Documents
  documents: CasierDocument[]; // see §1.2

  // Livraison
  adresseLivraison: string;
  modeRetrait: "" | "Retrait au guichet" | "Envoi postal";
  consentement: boolean;

  documentUrl?: string;       // une fois le casier délivré
}
```

### 1.2 `CasierDocument`

```ts
{
  key: string;         // stable id: "cni" | "formulaire" | "justificatif_motif"
  label: string;
  status: DocumentStatus; // "Non fourni" | "Téléversé" | "Vérifié"
  fileName?: string;   // today just the browser File.name — see §5
}
```

### 1.3 Wire format (DTO)

```jsonc
{
  "id": "string",
  "numero_demande": "string",
  "citizen_uin": "string",
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime",
  "status": "Soumise" /* | "En instruction" | "Validée" | "Rejetée" */,

  "requester": {
    "citizen_display_name": "string",
  },

  "request": {
    "reason": "Emploi" /* | "Dossier judiciaire" | "Voyage" | "Autre" | "" */,
    "competent_jurisdiction": "string",
    "reason_details": "string",
  },

  "documents": [
    {
      "key": "cni",
      "label": "Carte nationale d'identité",
      "status": "Non fourni",
      "file_name": "string (optional)",
    },
  ],

  "delivery": {
    "delivery_address": "string",
    "pickup_mode": "Retrait au guichet" /* | "Envoi postal" | "" */,
  },

  "consent": { "accepted": true },

  "document_url": "string (optional)",
}
```

**Important:** all enum/status values must be accepted as the exact French
strings shown above.

---

## 2. Status model

`CasierStatus`: `"Soumise" | "En instruction" | "Validée" | "Rejetée"`
(Submitted / Under review / Validated / Rejected) — matches the field
comment already sketched in the architecture doc §4.3
(`soumise, en_instruction, validee, rejetee`).

`DocumentStatus`: `"Non fourni" | "Téléversé" | "Vérifié"`.

### 2.1 Status transitions

| Transition             | Trigger (today, client-side)                                | Required endpoint                                                                  |
| ---------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| _(none)_ → `Soumise`   | Agent clicks "Nouvelle demande"                             | `POST /casiers`                                                                    |
| `Soumise` → `Soumise`  | Autosave / "Enregistrer brouillon"                          | `PUT /casiers/:id`                                                                 |
| any → `En instruction` | Agent clicks "Soumettre la demande" on the last wizard step | Same update endpoint, status changed                                               |
| any → `Validée`        | Agent clicks "Valider" on the dossier detail page           | Same update endpoint, or a dedicated `POST /casiers/:id/validate` for auditability |
| any → `Rejetée`        | Agent clicks "Rejeter"                                      | Recommend a dedicated `POST /casiers/:id/reject` accepting a `reason` field        |

Document transitions: `"Non fourni"` → `"Téléversé"` on upload; `"Téléversé"`
→ `"Vérifié"` on agent action — same gap as the Identité app, recommend a
dedicated `POST /casiers/:id/documents/:key/verify`.

### 2.2 Audit trail — currently missing

Same gap as the Identité app: no real event log exists today, the UI
synthesizes "Historique" from `createdAt`/`updatedAt`/`status`. Recommend:

```
GET /casiers/:id/history
→ [{ status: "Validée", changed_by: "agent_id", changed_at: "ISO", reason: null }, ...]
```

---

## 3. Repository contract

```ts
interface CasierRepository {
  list(): Promise<Casier[]>;
  getById(id: string): Promise<Casier | undefined>;
  save(casier: Casier): Promise<Casier>;
  remove(id: string): Promise<void>;
}
```

---

## 4. REST API surface

Base URL example: `https://api.casier-judiciaire.gouv.cg/v1`

| Method   | Path           | Body        | Response       | Notes                                                             |
| -------- | -------------- | ----------- | -------------- | ----------------------------------------------------------------- |
| `GET`    | `/casiers`     | —           | `CasierDto[]`  | Needs pagination/filtering, see §8                                |
| `GET`    | `/casiers/:id` | —           | `CasierDto`    | 404 → frontend treats as "not found"                              |
| `POST`   | `/casiers`     | `CasierDto` | `CasierDto`    | Server assigns `id`, `numero_demande`, `created_at`, `updated_at` |
| `PUT`    | `/casiers/:id` | `CasierDto` | `CasierDto`    | Full update, refresh `updated_at`                                 |
| `DELETE` | `/casiers/:id` | —           | 204 No Content |                                                                   |

**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`.

Same create-vs-update simplification recommendation as the Identité app
(§4.1 of that doc) applies here.

---

## 5. File / document upload

Not implemented — only `File.name` is captured client-side. Needs:

```
POST /casiers/:id/documents/:key   (multipart/form-data)
→ { key, label, status: "Téléversé", file_name, file_url? }
```

---

## 6. ID generation — must move server-side

```ts
numeroDemande = `CJ-${year}-${6 random digits}`  // client-side today, no collision checking
```

Must move server-side, collision-safe.

---

## 7. Authentication, Agent entity, and the citizen UIN lookup

**Today there is no auth system and no real OIDC integration.**
`citizenUin` and `citizenNomAffiche` are free-text inputs on Step 1 of the
wizard — anyone can type any UIN and any display name. For a real backend:

- The UIN lookup (Step 1) must call the Identity BB (via OIDC/eSignet or a
  read-only lookup endpoint) to resolve `citizenNomAffiche` server-side,
  never accept it as client input.
- `POST /auth/login` (or OIDC/SSO flow) issuing a session/JWT for agents.
- First-class `Agent` entity, tied to a `juridiction`.
- Authorization: only agents of the competent jurisdiction should be able
  to validate/reject a given demande.

---

## 8. List, search, filter, pagination

Same gap as the Identité app — `list()` takes no parameters, dashboard
stats are computed client-side. Recommend pagination, filtering by
`status`/`motifDemande`/date range, and a `GET /casiers/stats` endpoint.

---

## 9. Cross-agency verification — future X-Road integration

This service is a **consumer** in the X-Road exchange described in the
architecture (§4.5): the Passeport app calls into this service's
`verifier-mention` endpoint to check for a criminal record before issuing a
passport. This backend must eventually expose that endpoint as a
**producer**, registered in the local Security Server per §4.4 of the
architecture doc, with explicit access rights granted to the Passeport
subsystem. Not implemented in this frontend-only scaffold — noted here so
the backend team designs the entity with that future consumer in mind
(e.g. a lightweight read-only "has an active mention" projection, separate
from the full `Casier` record).

---

## 10. Open gaps summary

1. **Rejection flow** — needs endpoint + reason + audit fields (§2.1).
2. **Audit trail** — no event history model exists (§2.2).
3. **File upload** — only metadata is modeled today (§5).
4. **ID generation** — must move server-side (§6).
5. **Auth & UIN resolution** — no login flow, no real OIDC lookup for
   `citizenNomAffiche`; currently free-text (§7).
6. **List/search/pagination** — current contract assumes full-table fetch (§8).
7. **X-Road producer endpoint** — `verifier-mention` must be exposed for the
   Passeport app to consume (§9), not yet implemented.
