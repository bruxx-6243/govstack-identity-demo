# Backend Requirements — Système National d'Enrôlement Citoyen

This document specifies what the backend must implement to replace the current
frontend mock (`LocalStorageEnrollmentRepository`) with a real API, based on
the contract already defined in the frontend's domain/infrastructure layers.

Frontend references (for the backend team to cross-check against):
- `src/domain/enrollment/enrollment.schema.ts` — domain model + validation
- `src/domain/enrollment/enrollment.repository.ts` — repository port
- `src/infrastructure/enrollment/enrollment.dto.ts` — wire format (DTO)
- `src/infrastructure/enrollment/http-enrollment.repository.ts` — REST client the frontend already implements, dormant behind `VITE_ENROLLMENT_API_URL`
- `src/application/enrollment/enrollment.use-cases.ts` — actions that must map to endpoints

There is a single domain entity today: **Enrollment**. The "citizen profile"
view is the same record in read-only mode — there is no separate Citizen
entity, and no Agent/Centre entities (see §7).

---

## 1. Entity: Enrollment

### 1.1 Domain shape (camelCase — what the frontend works with internally)

```ts
{
  id: string;
  fileNumber: string;        // "DOS-2026-483920" — MUST be server-generated (see §6)
  citizenUid: string;        // "CG-1234-5678-9012" — MUST be server-generated (see §6)
  createdAt: string;         // ISO datetime
  updatedAt: string;         // ISO datetime
  status: EnrollmentStatus;  // see §2

  // Identité
  nom: string;
  prenom: string;
  sexe: "" | "Masculin" | "Féminin";
  dateNaissance: string;     // ISO date
  lieuNaissance: string;
  nationalite: string;       // default "Congolaise"
  nin: string;                // national ID number — accepted by schema, NOT yet editable in UI
  typePiece: "" | "Carte Nationale d'Identité" | "Passeport" | "Permis de conduire" | "Autre";
  numeroPiece: string;

  // Coordonnées
  telephone: string;
  email: string;
  adresse: string;
  quartier: string;
  arrondissement: string;
  commune: string;
  ville: string;              // default "Brazzaville"
  pays: string;                // default "République du Congo"

  // État civil
  situationMatrimoniale: "" | "Célibataire" | "Marié(e)" | "Divorcé(e)" | "Veuf/Veuve";
  nomConjoint: string;        // required only if situationMatrimoniale === "Marié(e)"
  nombreEnfants: string;

  // Famille
  nomPere: string;
  nomMere: string;
  contactUrgenceNom: string;
  contactUrgenceTel: string;
  contactUrgenceLien: "" | "Père" | "Mère" | "Frère/Sœur" | "Conjoint" | "Autre";

  // Socio-économique
  profession: string;
  employeur: string;
  niveauEtudes: "" | "Aucun" | "Primaire" | "Secondaire" | "Universitaire" | "Formation professionnelle";
  situationEmploi: "" | "Employé" | "Indépendant" | "Sans emploi" | "Étudiant" | "Retraité";
  revenus: string;             // monthly income, FCFA

  // Documents
  documents: CitizenDocument[]; // see §1.2

  // Administratif
  centreEnrolement: string;    // free text today — should become a Centre FK (§7)
  agentResponsable: string;    // free text today — should become an Agent FK (§7)

  // Consentement
  consentement: boolean;
  signature: string;           // typed name, "electronic signature"
}
```

### 1.2 `CitizenDocument`

```ts
{
  key: string;         // stable id: "cni" | "acte" | "passeport" | "permis" | "domicile"
  label: string;
  status: DocumentStatus; // see §2
  fileName?: string;   // today just the browser File.name — see §5 for real upload requirements
}
```

Default document set seeded on every new enrollment: `cni` (Carte nationale
d'identité), `acte` (Acte de naissance), `passeport` (Passeport), `permis`
(Permis de conduire), `domicile` (Justificatif de domicile) — all start at
`"Non fourni"`.

### 1.3 Wire format (DTO) — what the API should actually send/receive

The frontend's HTTP adapter is already built against a **snake_case, nested,
French-literal-preserving** JSON shape. The backend should match this exactly
so the existing `HttpEnrollmentRepository` can be activated by just setting
`VITE_ENROLLMENT_API_URL`, with no frontend changes required.

```jsonc
{
  "id": "string",
  "file_number": "string",
  "citizen_uid": "string",
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime",
  "status": "Brouillon" /* | "En attente de validation" | "Validé" | "Rejeté" */,

  "identity": {
    "last_name": "string",
    "first_name": "string",
    "gender": "Masculin" /* | "Féminin" | "" */,
    "date_of_birth": "ISO date",
    "place_of_birth": "string",
    "nationality": "string",
    "national_id_number": "string",
    "id_document_type": "Carte Nationale d'Identité" /* | "Passeport" | "Permis de conduire" | "Autre" | "" */,
    "id_document_number": "string"
  },

  "contact": {
    "phone": "string",
    "email": "string",
    "address": "string",
    "district": "string",       // quartier
    "borough": "string",        // arrondissement
    "municipality": "string",   // commune
    "city": "string",           // ville
    "country": "string"         // pays
  },

  "civil_status": {
    "marital_status": "Célibataire" /* | "Marié(e)" | "Divorcé(e)" | "Veuf/Veuve" | "" */,
    "spouse_name": "string",
    "children_count": "string"
  },

  "family": {
    "father_name": "string",
    "mother_name": "string",
    "emergency_contact_name": "string",
    "emergency_contact_phone": "string",
    "emergency_contact_relationship": "Père" /* | "Mère" | "Frère/Sœur" | "Conjoint" | "Autre" | "" */
  },

  "socio_economic": {
    "profession": "string",
    "employer": "string",
    "education_level": "Aucun" /* | "Primaire" | "Secondaire" | "Universitaire" | "Formation professionnelle" | "" */,
    "employment_status": "Employé" /* | "Indépendant" | "Sans emploi" | "Étudiant" | "Retraité" | "" */,
    "monthly_income": "string"
  },

  "documents": [
    {
      "key": "cni",
      "label": "Carte nationale d'identité",
      "status": "Non fourni" /* | "Téléversé" | "Vérifié" */,
      "file_name": "string (optional)"
    }
  ],

  "administrative": {
    "enrollment_center": "string",
    "responsible_agent": "string"
  },

  "consent": {
    "accepted": true,
    "signature": "string"
  }
}
```

**Important:** all enum/status values must be accepted as the exact French
strings shown above — the backend must not translate or recode them unless
the frontend is also updated with a mapping layer.

---

## 2. Status model

### 2.1 `EnrollmentStatus`

`"Brouillon" | "En attente de validation" | "Validé" | "Rejeté"`
(Draft / Pending validation / Validated / Rejected)

### 2.2 `DocumentStatus`

`"Non fourni" | "Téléversé" | "Vérifié"`
(Not provided / Uploaded / Verified)

### 2.3 Status transitions the backend must support

| Transition | Trigger (today, client-side) | Required endpoint |
|---|---|---|
| *(none)* → `Brouillon` | Agent clicks "Nouvel enrôlement citoyen" | `POST /enrollments` (create, empty/partial record) |
| `Brouillon` → `Brouillon` | Autosave after each wizard step ("Suivant"), or explicit "Enregistrer brouillon" | `PUT /enrollments/:id` (or `PATCH`, see §4) |
| any → `En attente de validation` | Agent clicks "Finaliser l'enrôlement" on the last wizard step, only once consent step passes validation | Same update endpoint, `status` field changed, ideally with server-side re-validation of required fields |
| any → `Validé` | Agent clicks "Vérifier identité" on the citizen profile page | Same update endpoint, or a dedicated `POST /enrollments/:id/verify` for auditability |
| any → `Rejeté` | **No dedicated UI flow exists yet.** Currently only reachable by manually picking "Rejeté" from a raw status dropdown. | **Gap — recommend a dedicated `POST /enrollments/:id/reject` accepting a `reason` field, with the reason and rejecting agent persisted.** |

Document status transitions:
- `"Non fourni"` → `"Téléversé"`: on successful file upload.
- `"Téléversé"` → `"Vérifié"`: agent clicks "Marquer vérifié". Recommend a
  dedicated `POST /enrollments/:id/documents/:key/verify` for auditability.

### 2.4 Audit trail — currently missing, should be added

The UI shows an "Historique d'enrôlement" section, but today it is
synthesized purely from `createdAt` / `updatedAt` / current `status` — there
is no real event log. The backend should persist a history of status changes
(who, when, from/to, optional reason) and expose it, e.g.:

```
GET /enrollments/:id/history
→ [{ status: "Validé", changed_by: "agent_id", changed_at: "ISO", reason: null }, ...]
```

---

## 3. Repository contract (what any backend adapter must satisfy)

The frontend's domain port (`enrollment.repository.ts`) is minimal:

```ts
interface EnrollmentRepository {
  list(): Promise<Enrollment[]>;
  getById(id: string): Promise<Enrollment | undefined>;
  save(enrollment: Enrollment): Promise<Enrollment>;
  remove(id: string): Promise<void>;
}
```

This is intentionally generic — no create/update distinction, no
query/filter params. The REST endpoints below are the concrete mapping
already implemented in `HttpEnrollmentRepository`.

---

## 4. REST API surface

Base URL example from the frontend adapter: `https://api.enrolement.gouv.cg/v1`

| Method | Path | Body | Response | Notes |
|---|---|---|---|---|
| `GET` | `/enrollments` | — | `EnrollmentDto[]` | See §8 — must add pagination/filtering, current contract assumes full-table fetch |
| `GET` | `/enrollments/:id` | — | `EnrollmentDto` | 404 → frontend treats as "not found", not an error |
| `POST` | `/enrollments` | `EnrollmentDto` | `EnrollmentDto` | Create. Server must assign `id`, `file_number`, `citizen_uid`, `created_at`, `updated_at` |
| `PUT` | `/enrollments/:id` | `EnrollmentDto` | `EnrollmentDto` | Full update. Server must refresh `updated_at` |
| `DELETE` | `/enrollments/:id` | — | 204 No Content | |

**Headers on every request:**
- `Authorization: Bearer <token>` (see §7 — token source doesn't exist yet on the frontend)
- `Content-Type: application/json`

**Error contract:** frontend throws on any non-2xx response, using the
response body (or status text) as the message. Recommend a consistent JSON
error body (e.g. `{ "error": { "code": "...", "message": "..." } }`) rather
than plain text, so the frontend can be updated to branch on error codes.

### 4.1 Create-vs-update semantics — recommend simplifying

The current frontend `save()` does a speculative `GET` first to decide
whether to `POST` or `PUT`. This is inefficient and racy. Recommended
backend-friendly alternative (would need a small frontend change too):
- Explicit `POST /enrollments` for create (frontend already knows when it's
  creating — "Nouvel enrôlement") and `PUT /enrollments/:id` for all
  subsequent updates, with the frontend tracking "is this a new record"
  locally instead of re-fetching to decide.

---

## 5. File / document upload

**Not implemented at all today** — the UI only captures `File.name` into
`fileName`; the actual file bytes are never read, uploaded, or stored
anywhere (not even locally). The backend needs real upload transport:

```
POST /enrollments/:id/documents/:key   (multipart/form-data)
→ { key, label, status: "Téléversé", file_name, file_url? }
```

Considerations for the backend team:
- Max file size / accepted MIME types (identity documents are typically
  images or PDFs).
- Storage backend (object storage recommended over DB blobs).
- Whether uploaded files need virus scanning given this is a government ID
  system.
- No photo/portrait capture exists in the UI yet (citizen profile currently
  shows a placeholder icon) and no biometric (fingerprint/facial) capture
  exists anywhere — out of scope unless product adds it.

---

## 6. ID / file number generation — must move server-side

Currently generated **client-side** with `Math.random()`, no collision
checking:

```ts
fileNumber = `DOS-${year}-${6 random digits}`      // e.g. DOS-2026-482910
citizenUid = `CG-${4 digits}-${4 digits}-${4 digits}` // e.g. CG-4821-9034-1122
```

The backend must own generation of both values on create (likely
sequential and/or checksummed, given this is a national ID scheme), and
the frontend should stop generating them once a real `POST /enrollments`
exists.

---

## 7. Authentication & Agent/Centre entities — currently absent, needs design

**Today there is no auth system.** Findings:
- `agentResponsable` (e.g. `"Agent #0045"`) and `centreEnrolement` (e.g.
  `"Centre Brazzaville - Poto-Poto"`) are free-text strings stored directly
  on the Enrollment record, editable via plain text inputs — anyone can type
  anything.
- The frontend has dormant code that reads a bearer token from
  `localStorage.getItem("auth_token")`, but nothing ever sets that key —
  there is no login page, no auth store, no session concept.

**Required for a real backend:**
- `POST /auth/login` (or equivalent SSO/OIDC flow) issuing a session/JWT.
- First-class `Agent` entity: `{ id, name, badge/matricule, centreId, role }`.
- First-class `Centre` entity: `{ id, name, address, ... }`.
- `agentResponsable` / `centreEnrolement` should become server-resolved
  foreign keys (`agentId`, `centreId`) derived from the authenticated
  session at write time, not client-supplied free text.
- Authorization rules for who may call finalize / verify / reject actions
  (e.g. only agents assigned to a centre can finalize records for that
  centre; only a supervisor role can verify/reject).

---

## 8. List, search, filter, pagination — needs to be added

Today the dashboard calls `list()` with **no parameters** and computes all
stats (total, pending, completed, drafts) client-side by filtering the
entire dataset; "recent enrollments" is just the first 8 records. There is
no search box, filter, or sort control in the UI at all.

This will not scale. Recommend the backend API support, even if the
frontend doesn't consume it on day one:
- Pagination (`?page=`, `?pageSize=` or cursor-based).
- Filtering by `status`, `centreEnrolement`/`centreId`, date range, name.
- Server-computed counts (`GET /enrollments/stats` → `{ total, pending,
  validated, drafts }`) instead of shipping the full table to compute them
  client-side.

---

## 9. Print / export — no backend work needed

- "Imprimer certificat" (`/citizens/:id`) is pure `window.print()` +
  print-specific CSS (`print:hidden`, `print:static`, etc.) — no PDF
  generation endpoint required for this feature as it exists today.
- "Exporter" downloads a client-side JSON blob of the raw record — no
  backend export endpoint exists or is currently required. If an official
  signed export/certificate is wanted later, that would need a dedicated
  endpoint returning a server-generated, signed document instead of a raw
  JSON dump of client state.

---

## 10. Open gaps summary (things the backend spec should explicitly resolve before implementation)

1. **Rejection flow** — status value exists, no reason-capture flow. Needs endpoint + reason + audit fields.
2. **Audit trail** — no event history model exists; needs a real history table/endpoint (§2.4).
3. **File upload** — only metadata is modeled today; real upload transport needed (§5).
4. **ID generation** — must move from client `Math.random()` to server-side, collision-safe generation (§6).
5. **Auth** — no login flow exists; Agent/Centre must become real entities with sessions and authorization (§7).
6. **List/search/pagination** — current contract assumes fetching the entire table; needs params (§8).
7. **Create vs update semantics** — recommend simplifying away from speculative GET-then-POST/PUT (§4.1).
8. **`nin` (national ID number) field** — present in schema/DTO but has no UI binding anywhere today. Confirm with stakeholders whether it should be populated server-side, added to the Step 1 form, or removed.
