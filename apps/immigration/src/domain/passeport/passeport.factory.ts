import type { Passeport, PasseportDocument } from "./passeport.schema";

export const defaultDocuments = (): PasseportDocument[] => [
  { key: "cni", label: "Carte nationale d'identité", status: "Non fourni" },
  { key: "photo", label: "Photo d'identité", status: "Non fourni" },
  { key: "acte", label: "Acte de naissance", status: "Non fourni" },
  { key: "ancien_passeport", label: "Ancien passeport (si renouvellement)", status: "Non fourni" },
];

const rand = (len: number) => {
  const chars = "0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

export const generateNumeroDemande = () => `PP-${new Date().getFullYear()}-${rand(6)}`;

export const createEmptyPasseport = (): Passeport => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    numeroDemande: generateNumeroDemande(),
    citizenUin: "",
    createdAt: now,
    updatedAt: now,
    status: "Soumise",
    citizenNomAffiche: "",
    typePasseport: "",
    motifVoyage: "",
    verificationCasierStatut: "Non vérifié",
    documents: defaultDocuments(),
    centreRetrait: "",
    consentement: false,
    documentUrl: undefined,
  };
};
