import { z } from "zod";

// This app never stores citizen identity fields (nom, date de naissance, ...).
// It only holds citizenUin — a foreign key into the Identity BB (Agence
// Identité Nationale) — per the architecture's data-separation principle.
// Identity is resolved via OIDC/X-Road, not duplicated here.

export const passeportStatusSchema = z.enum(["Soumise", "En instruction", "Validée", "Rejetée"]);
export type PasseportStatus = z.infer<typeof passeportStatusSchema>;

export const passeportSchema = z.object({
  id: z.string(),
  citizenUin: z.string(), // référence Identity BB — jamais de nom/prénom en clé
  createdAt: z.string(),
  updatedAt: z.string(),
  status: passeportStatusSchema,

  // Reflète l'appel X-Road vers le Ministère de la Justice (§4.5 de
  // l'architecture, endpoint "verifier-mention") — simple booléen côté
  // backend (casier_verifie).
  casierVerifie: z.boolean(),

  // Une fois délivré
  documentUrl: z.string().optional(),
});

export type Passeport = z.infer<typeof passeportSchema>;

/** UIN requis avant de pouvoir créer la demande. */
export function validateCitizenUin(citizenUin: string): string | undefined {
  return citizenUin.trim().length > 0 ? undefined : "UIN requis";
}

export interface PasseportStats {
  total: number;
  soumises: number;
  enInstruction: number;
  validees: number;
  rejetees: number;
}

export interface PasseportHistoryEntry {
  status: PasseportStatus;
  changedBy: string | null;
  changedAt: string;
  reason: string | null;
}
