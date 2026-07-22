import { z } from "zod";

// This app never stores citizen identity fields (nom, date de naissance, ...).
// It only holds citizenUin — a foreign key into the Identity BB (Agence
// Identité Nationale) — per the architecture's data-separation principle.
// Identity is resolved via OIDC/X-Road, not duplicated here.

export const passeportStatusSchema = z.enum(["Soumise", "En instruction", "Validée", "Rejetée"]);
export type PasseportStatus = z.infer<typeof passeportStatusSchema>;

export const documentStatusSchema = z.enum(["Non fourni", "Téléversé", "Vérifié"]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const passeportDocumentSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: documentStatusSchema,
  fileName: z.string().optional(),
});
export type PasseportDocument = z.infer<typeof passeportDocumentSchema>;

const typePasseportSchema = z.enum(["", "Ordinaire", "Diplomatique", "Service"]);

// Statut du contrôle X-Road auprès du Ministère de la Justice (§4.5 de
// l'architecture) — modélisé ici comme un simple champ affiché, l'appel
// inter-agence réel n'est pas implémenté à ce stade.
const verificationCasierStatutSchema = z.enum(["Non vérifié", "Vérifié", "Mention trouvée"]);

export const passeportSchema = z.object({
  id: z.string(),
  numeroDemande: z.string(),
  citizenUin: z.string(), // référence Identity BB — jamais de nom/prénom en clé
  createdAt: z.string(),
  updatedAt: z.string(),
  status: passeportStatusSchema,

  // Step 1 — Identité du demandeur (lookup UIN uniquement, pas de saisie d'identité)
  citizenNomAffiche: z.string(), // nom affiché après résolution OIDC/X-Road, lecture seule

  // Step 2 — Type de passeport & motif
  typePasseport: typePasseportSchema,
  motifVoyage: z.string(),

  // Step 3 — Vérification casier judiciaire (placeholder X-Road)
  verificationCasierStatut: verificationCasierStatutSchema,

  // Step 4 — Documents
  documents: z.array(passeportDocumentSchema),

  // Step 5 — Livraison & consentement
  centreRetrait: z.string(),
  consentement: z.boolean(),

  // Une fois délivré
  documentUrl: z.string().optional(),
});

export type Passeport = z.infer<typeof passeportSchema>;

export const stepSchemas = {
  1: passeportSchema.pick({ citizenUin: true }).extend({
    citizenUin: z.string().min(1, "UIN requis"),
  }),
  2: passeportSchema.pick({ typePasseport: true }).extend({
    typePasseport: z.enum(["Ordinaire", "Diplomatique", "Service"], {
      message: "Type requis",
    }),
  }),
  5: passeportSchema.pick({ centreRetrait: true, consentement: true }).extend({
    centreRetrait: z.string().min(1, "Centre de retrait requis"),
    consentement: z.literal(true, { message: "Vous devez consentir" }),
  }),
} as const;

export type ValidatableStep = keyof typeof stepSchemas;

/** Runs the schema for a step against the demande and returns field errors, if any. */
export function validateStep(step: number, data: Passeport): Record<string, string> {
  const schema = stepSchemas[step as ValidatableStep];
  if (!schema) return {};
  const result = schema.safeParse(data);
  if (result.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !(field in errors)) errors[field] = issue.message;
  }
  return errors;
}
