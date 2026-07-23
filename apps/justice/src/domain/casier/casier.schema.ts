import { z } from "zod";

// This app never stores citizen identity fields (nom, date de naissance, ...).
// It only holds citizenUin — a foreign key into the Identity BB (Agence
// Identité Nationale) — per the architecture's data-separation principle.
// Identity is resolved via OIDC/X-Road, not duplicated here.

export const casierStatusSchema = z.enum(["Soumise", "En instruction", "Validée", "Rejetée"]);
export type CasierStatus = z.infer<typeof casierStatusSchema>;

export const casierSchema = z.object({
  id: z.string(),
  citizenUin: z.string(), // référence Identity BB — jamais de nom/prénom en clé
  createdAt: z.string(),
  updatedAt: z.string(),
  status: casierStatusSchema,

  // Une fois délivré
  documentUrl: z.string().optional(),
});

export type Casier = z.infer<typeof casierSchema>;

/** UIN requis avant de pouvoir créer la demande. */
export function validateCitizenUin(citizenUin: string): string | undefined {
  return citizenUin.trim().length > 0 ? undefined : "UIN requis";
}

export interface CasierStats {
  total: number;
  soumises: number;
  enInstruction: number;
  validees: number;
  rejetees: number;
}

export interface CasierHistoryEntry {
  status: CasierStatus;
  changedBy: string | null;
  changedAt: string;
  reason: string | null;
}
