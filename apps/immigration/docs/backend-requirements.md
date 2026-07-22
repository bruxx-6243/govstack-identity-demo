# Backend Requirements — Passeport

This document specifies what the backend must implement to replace the current
frontend mock (`LocalStoragePasseportRepository`) with a real API, based on
the contract already defined in the frontend's domain/infrastructure layers.

Frontend references (for the backend team to cross-check against):

- `src/domain/passeport/passeport.schema.ts` — domain model + validation
- `src/domain/passeport/passeport.repository.ts` — repository port
- `src/infrastructure/passeport/passeport.dto.ts` — wire format (DTO)
- `src/infrastructure/passeport/http-passeport.repository.ts` — REST client the frontend already implements, dormant behind `VITE_PASSEPORT_API_URL`
- `src/application/passeport/passeport.use-cases.ts` — actions that must map to endpoints

This app is the **Ministère des Affaires Étrangères / Immigration** service
in the three-agency GovStack architecture (see
`GovStack_Congo_Architecture_Technique.md`). It never stores citizen identity
data — only `citizenUin`, a foreign key resolved against the Identity BB
(Agence Identité Nationale) via OIDC. There is a single domain entity today:
**Passeport** (a demande de passeport).

---

## 1. Entity: Passeport

### 1.1 Domain shape (camelCase — what the frontend works with internally)

```ts
{
  id: string;
  numeroDemande: string;     // "PP-2026-483920" — MUST be server-generated (see §6)
  citizenUin: string;        // FK to Identity BB — resolved via OIDC, never a name
  createdAt: string;         // ISO datetime
  updatedAt: string;         // ISO datetime
  status: PasseportStatus;   // see §2

  // Identité (résolution seule — pas de saisie)
  citizenNomAffiche: string; // nom affiché après résolution OIDC/X-Road, lecture seule côté agent

  // Type & motif
  typePasseport: "" | "Ordinaire" | "Diplomatique" | "Service";
  motifVoyage: string;

  // Vérification casier judiciaire (X-Road, voir §9)
  verificationCasierStatut: "Non vérifié" | "Vérifié" | "Mention trouvée";

  // Documents
  documents: PasseportDocument[]; // see §1.2

  // Livraison
  centreRetrait: string;
  consentement: boolean;

  documentUrl?: string;       // une fois le passeport délivré
}
```

### 1.2 `PasseportDocument`

```ts
{
  key: string;         // stable id: "cni" | "photo" | "acte" | "ancien_passeport"
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
    "passport_type": "Ordinaire" /* | "Diplomatique" | "Service" | "" */,
    "travel_reason": "string",
  },

  "criminal_record_check": {
    "status": "Non vérifié" /* | "Vérifié" | "Mention trouvée" */,
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
    "pickup_center": "string",
  },

  "consent": { "accepted": true },

  "document_url": "string (optional)",
}
```

**Important:** all enum/status values must be accepted as the exact French
strings shown above.

---

## 2. Status model

`PasseportStatus`: `"Soumise" | "En instruction" | "Validée" | "Rejetée"`
(Submitted / Under review / Validated / Rejected) — same convention as the
Casier Judiciaire app for consistency across the three GovStack services.

`DocumentStatus`: `"Non fourni" | "Téléversé" | "Vérifié"`.

### 2.1 Status transitions

| Transition             | Trigger (today, client-side)                                | Required endpoint                                                         |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------- |
| _(none)_ → `Soumise`   | Agent clicks "Nouvelle demande"                             | `POST /passeports`                                                        |
| `Soumise` → `Soumise`  | Autosave / "Enregistrer brouillon"                          | `PUT /passeports/:id`                                                     |
| any → `En instruction` | Agent clicks "Soumettre la demande" on the last wizard step | Same update endpoint, status changed                                      |
| any → `Validée`        | Agent clicks "Valider" on the dossier detail page           | Same update endpoint, or a dedicated `POST /passeports/:id/validate`      |
| any → `Rejetée`        | Agent clicks "Rejeter"                                      | Recommend a dedicated `POST /passeports/:id/reject` with a `reason` field |

Document transitions: same pattern as the other two apps — recommend a
dedicated `POST /passeports/:id/documents/:key/verify`.

### 2.2 Audit trail — currently missing

Same gap as the other two apps — no real event log, "Historique" is
synthesized client-side. Recommend `GET /passeports/:id/history`.

---

## 3. Repository contract

```ts
interface PasseportRepository {
  list(): Promise<Passeport[]>;
  getById(id: string): Promise<Passeport | undefined>;
  save(passeport: Passeport): Promise<Passeport>;
  remove(id: string): Promise<void>;
}
```

---

## 4. REST API surface

Base URL example: `https://api.passeport.gouv.cg/v1`

| Method   | Path              | Body           | Response         | Notes                                                             |
| -------- | ----------------- | -------------- | ---------------- | ----------------------------------------------------------------- |
| `GET`    | `/passeports`     | —              | `PasseportDto[]` | Needs pagination/filtering, see §8                                |
| `GET`    | `/passeports/:id` | —              | `PasseportDto`   | 404 → frontend treats as "not found"                              |
| `POST`   | `/passeports`     | `PasseportDto` | `PasseportDto`   | Server assigns `id`, `numero_demande`, `created_at`, `updated_at` |
| `PUT`    | `/passeports/:id` | `PasseportDto` | `PasseportDto`   | Full update, refresh `updated_at`                                 |
| `DELETE` | `/passeports/:id` | —              | 204 No Content   |                                                                   |

**Headers:** `Authorization: Bearer <token>`, `Content-Type: application/json`.

Same create-vs-update simplification recommendation as the Identité app
(§4.1 of that doc) applies here.

---

## 5. File / document upload

Not implemented — only `File.name` is captured client-side (including for
the identity photo, which has no real capture flow yet). Needs:

```
POST /passeports/:id/documents/:key   (multipart/form-data)
→ { key, label, status: "Téléversé", file_name, file_url? }
```

---

## 6. ID generation — must move server-side

```ts
numeroDemande = `PP-${year}-${6 random digits}`  // client-side today, no collision checking
```

Must move server-side, collision-safe — this becomes the passport
application reference number, so it likely needs to follow whatever
numbering scheme ICAO-compliant passport issuance already requires
nationally; confirm with the Ministry before finalizing the format.

---

## 7. Authentication, Agent entity, and the citizen UIN lookup

**Today there is no auth system and no real OIDC integration.**
`citizenUin` and `citizenNomAffiche` are free-text inputs on Step 1 of the
wizard. For a real backend:

- The UIN lookup (Step 1) must call the Identity BB (via OIDC/eSignet or a
  read-only lookup endpoint) to resolve `citizenNomAffiche` server-side.
- `POST /auth/login` (or OIDC/SSO flow) issuing a session/JWT for agents.
- First-class `Agent` entity, tied to a `centreRetrait`.
- Authorization rules for who may validate/reject a demande for a given
  center.

---

## 8. List, search, filter, pagination

Same gap as the other two apps. Recommend pagination, filtering by
`status`/`typePasseport`/date range, and a `GET /passeports/stats` endpoint.

---

## 9. Cross-agency verification — X-Road call to Casier Judiciaire

Per the architecture (§4.5), this service is a **consumer**: before
issuing a passport, it must call the Casier Judiciaire service
(`verifier-mention`) through its local Security Server, which routes to the
Justice Security Server. The frontend already reserves a field for this
(`verificationCasierStatut`) and a wizard step (Step 3) with a "Lancer la
vérification" action — **currently a stub that just sets the status to
"Vérifié" client-side, no real call is made.**

The backend must implement the real X-Road client call, following the
pattern already sketched in the architecture doc §4.5
(`app/xroad/client.py`, `X-Road-Client` header, mTLS via the local Security
Server), and expose an endpoint the frontend can call to trigger it, e.g.:

```
POST /passeports/:id/verify-casier
→ { status: "Vérifié" | "Mention trouvée", checked_at: "ISO" }
```

This is a hard dependency on the Casier Judiciaire backend exposing its
`verifier-mention` producer endpoint first (see that app's own
`docs/backend-requirements.md`, §9).

---

## 10. Open gaps summary

1. **Rejection flow** — needs endpoint + reason + audit fields (§2.1).
2. **Audit trail** — no event history model exists (§2.2).
3. **File upload** — only metadata is modeled today, no real photo capture (§5).
4. **ID generation** — must move server-side, format TBD with the Ministry (§6).
5. **Auth & UIN resolution** — no login flow, no real OIDC lookup for
   `citizenNomAffiche`; currently free-text (§7).
6. **List/search/pagination** — current contract assumes full-table fetch (§8).
7. **X-Road consumer call** — `verifier-mention` check is currently a
   client-side stub, not a real inter-agency call (§9). Depends on the
   Casier Judiciaire backend being built first.
