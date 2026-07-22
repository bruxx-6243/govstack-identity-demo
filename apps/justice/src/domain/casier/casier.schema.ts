import { z } from "zod";

// This app never stores citizen identity fields (nom, date de naissance, ...).
// It only holds citizenUin — a foreign key into the Identity BB (Agence
// Identité Nationale) — per the architecture's data-separation principle.
// Identity is resolved via OIDC/X-Road, not duplicated here.

export const casierStatusSchema = z.enum(["Soumise", "En instruction", "Validée", "Rejetée"]);
export type CasierStatus = z.infer<typeof casierStatusSchema>;

export const documentStatusSchema = z.enum(["Non fourni", "Téléversé", "Vérifié"]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const casierDocumentSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: documentStatusSchema,
  fileName: z.string().optional(),
});
export type CasierDocument = z.infer<typeof casierDocumentSchema>;

const motifDemandeSchema = z.enum(["", "Emploi", "Dossier judiciaire", "Voyage", "Autre"]);

export const casierSchema = z.object({
  id: z.string(),
  numeroDemande: z.string(),
  citizenUin: z.string(), // référence Identity BB — jamais de nom/prénom en clé
  createdAt: z.string(),
  updatedAt: z.string(),
  status: casierStatusSchema,

  // Step 1 — Identité du demandeur (lookup UIN uniquement, pas de saisie d'identité)
  citizenNomAffiche: z.string(), // nom affiché après résolution OIDC/X-Road, lecture seule

  // Step 2 — Motif & juridiction
  motifDemande: motifDemandeSchema,
  juridictionCompetente: z.string(),
  precisionMotif: z.string(),

  // Step 3 — Documents justificatifs
  documents: z.array(casierDocumentSchema),

  // Step 4 — Livraison & consentement
  adresseLivraison: z.string(),
  modeRetrait: z.enum(["", "Retrait au guichet", "Envoi postal"]),
  consentement: z.boolean(),

  // Une fois délivré
  documentUrl: z.string().optional(),
});

export type Casier = z.infer<typeof casierSchema>;

export const stepSchemas = {
  1: casierSchema.pick({ citizenUin: true }).extend({
    citizenUin: z.string().min(1, "UIN requis"),
  }),
  2: casierSchema.pick({ motifDemande: true, juridictionCompetente: true }).extend({
    motifDemande: z.enum(["Emploi", "Dossier judiciaire", "Voyage", "Autre"], {
      message: "Motif requis",
    }),
    juridictionCompetente: z.string().min(1, "Juridiction requise"),
  }),
  4: casierSchema.pick({ modeRetrait: true, consentement: true }).extend({
    modeRetrait: z.enum(["Retrait au guichet", "Envoi postal"], { message: "Mode requis" }),
    consentement: z.literal(true, { message: "Vous devez consentir" }),
  }),
} as const;

export type ValidatableStep = keyof typeof stepSchemas;

/** Runs the schema for a step against the demande and returns field errors, if any. */
export function validateStep(step: number, data: Casier): Record<string, string> {
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
