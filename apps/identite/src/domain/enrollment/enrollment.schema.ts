import { z } from "zod";

export const enrollmentStatusSchema = z.enum([
  "Brouillon",
  "En attente de validation",
  "Validé",
  "Rejeté",
]);
export type EnrollmentStatus = z.infer<typeof enrollmentStatusSchema>;

export const documentStatusSchema = z.enum(["Non fourni", "Téléversé", "Vérifié"]);
export type DocumentStatus = z.infer<typeof documentStatusSchema>;

export const citizenDocumentSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: documentStatusSchema,
  fileName: z.string().optional(),
});
export type CitizenDocument = z.infer<typeof citizenDocumentSchema>;

const sexeSchema = z.enum(["", "Masculin", "Féminin"]);
const typePieceSchema = z.enum([
  "",
  "Carte Nationale d'Identité",
  "Passeport",
  "Permis de conduire",
  "Autre",
]);
const situationMatrimonialeSchema = z.enum([
  "",
  "Célibataire",
  "Marié(e)",
  "Divorcé(e)",
  "Veuf/Veuve",
]);
const contactUrgenceLienSchema = z.enum(["", "Père", "Mère", "Frère/Sœur", "Conjoint", "Autre"]);
const niveauEtudesSchema = z.enum([
  "",
  "Aucun",
  "Primaire",
  "Secondaire",
  "Universitaire",
  "Formation professionnelle",
]);
const situationEmploiSchema = z.enum([
  "",
  "Employé",
  "Indépendant",
  "Sans emploi",
  "Étudiant",
  "Retraité",
]);

export const enrollmentSchema = z.object({
  id: z.string(),
  fileNumber: z.string(),
  citizenUid: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: enrollmentStatusSchema,

  // Step 1 — Identité
  nom: z.string(),
  prenom: z.string(),
  sexe: sexeSchema,
  dateNaissance: z.string(),
  lieuNaissance: z.string(),
  nationalite: z.string(),
  nin: z.string(),
  typePiece: typePieceSchema,
  numeroPiece: z.string(),

  // Step 2 — Coordonnées
  telephone: z.string(),
  email: z.string(),
  adresse: z.string(),
  quartier: z.string(),
  arrondissement: z.string(),
  commune: z.string(),
  ville: z.string(),
  pays: z.string(),

  // Step 3 — État civil
  situationMatrimoniale: situationMatrimonialeSchema,
  nomConjoint: z.string(),
  nombreEnfants: z.string(),

  // Step 4 — Famille
  nomPere: z.string(),
  nomMere: z.string(),
  contactUrgenceNom: z.string(),
  contactUrgenceTel: z.string(),
  contactUrgenceLien: contactUrgenceLienSchema,

  // Step 5 — Socio-économique
  profession: z.string(),
  employeur: z.string(),
  niveauEtudes: niveauEtudesSchema,
  situationEmploi: situationEmploiSchema,
  revenus: z.string(),

  // Step 6 — Documents
  documents: z.array(citizenDocumentSchema),

  // Step 7 — Administratif
  centreEnrolement: z.string(),
  agentResponsable: z.string(),

  // Step 8 — Consentement
  consentement: z.boolean(),
  signature: z.string(),
});

export type Enrollment = z.infer<typeof enrollmentSchema>;

// Per-step validation schemas, used by the wizard to validate before advancing.
export const stepSchemas = {
  1: enrollmentSchema
    .pick({
      nom: true,
      prenom: true,
      sexe: true,
      dateNaissance: true,
      lieuNaissance: true,
      nationalite: true,
      typePiece: true,
      numeroPiece: true,
    })
    .extend({
      nom: z.string().min(1, "Nom requis"),
      prenom: z.string().min(1, "Prénom requis"),
      sexe: z.enum(["Masculin", "Féminin"], { message: "Sexe requis" }),
      dateNaissance: z.string().min(1, "Date requise"),
      lieuNaissance: z.string().min(1, "Lieu requis"),
      nationalite: z.string().min(1, "Nationalité requise"),
      typePiece: z.enum(
        ["Carte Nationale d'Identité", "Passeport", "Permis de conduire", "Autre"],
        { message: "Type requis" },
      ),
      numeroPiece: z.string().min(1, "Numéro requis"),
    }),
  2: enrollmentSchema
    .pick({ telephone: true, adresse: true, commune: true, ville: true, pays: true })
    .extend({
      telephone: z.string().min(1, "Téléphone requis"),
      adresse: z.string().min(1, "Adresse requise"),
      commune: z.string().min(1, "Commune requise"),
      ville: z.string().min(1, "Ville requise"),
      pays: z.string().min(1, "Pays requis"),
    }),
  3: enrollmentSchema
    .pick({ situationMatrimoniale: true, nomConjoint: true })
    .extend({
      situationMatrimoniale: z.enum(["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf/Veuve"], {
        message: "Champ requis",
      }),
    })
    .refine((v) => v.situationMatrimoniale !== "Marié(e)" || v.nomConjoint.length > 0, {
      message: "Nom du conjoint requis",
      path: ["nomConjoint"],
    }),
  4: enrollmentSchema
    .pick({
      nomPere: true,
      nomMere: true,
      contactUrgenceNom: true,
      contactUrgenceTel: true,
      contactUrgenceLien: true,
    })
    .extend({
      nomPere: z.string().min(1, "Requis"),
      nomMere: z.string().min(1, "Requis"),
      contactUrgenceNom: z.string().min(1, "Requis"),
      contactUrgenceTel: z.string().min(1, "Requis"),
      contactUrgenceLien: z.enum(["Père", "Mère", "Frère/Sœur", "Conjoint", "Autre"], {
        message: "Requis",
      }),
    }),
  8: enrollmentSchema.pick({ consentement: true }).extend({
    consentement: z.literal(true, { message: "Vous devez consentir" }),
  }),
} as const;

export type ValidatableStep = keyof typeof stepSchemas;

/** Runs the schema for a step against the enrollment and returns field errors, if any. */
export function validateStep(step: number, data: Enrollment): Record<string, string> {
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
