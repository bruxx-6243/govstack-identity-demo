import type { Casier, CasierDocument } from "./casier.schema";

export const defaultDocuments = (): CasierDocument[] => [
  { key: "cni", label: "Carte nationale d'identité", status: "Non fourni" },
  { key: "formulaire", label: "Formulaire de demande signé", status: "Non fourni" },
  { key: "justificatif_motif", label: "Justificatif du motif", status: "Non fourni" },
];

const rand = (len: number) => {
  const chars = "0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

export const generateNumeroDemande = () => `CJ-${new Date().getFullYear()}-${rand(6)}`;

export const createEmptyCasier = (): Casier => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    numeroDemande: generateNumeroDemande(),
    citizenUin: "",
    createdAt: now,
    updatedAt: now,
    status: "Soumise",
    citizenNomAffiche: "",
    motifDemande: "",
    juridictionCompetente: "",
    precisionMotif: "",
    documents: defaultDocuments(),
    adresseLivraison: "",
    modeRetrait: "",
    consentement: false,
    documentUrl: undefined,
  };
};
