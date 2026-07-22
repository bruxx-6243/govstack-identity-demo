import type { CitizenDocument, Enrollment } from "./enrollment.schema";

export const defaultDocuments = (): CitizenDocument[] => [
  { key: "cni", label: "Carte nationale d'identité", status: "Non fourni" },
  { key: "acte", label: "Acte de naissance", status: "Non fourni" },
  { key: "passeport", label: "Passeport", status: "Non fourni" },
  { key: "permis", label: "Permis de conduire", status: "Non fourni" },
  { key: "domicile", label: "Justificatif de domicile", status: "Non fourni" },
];

const rand = (len: number) => {
  const chars = "0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
};

export const generateFileNumber = () => `DOS-${new Date().getFullYear()}-${rand(6)}`;
export const generateCitizenUid = () => `CG-${rand(4)}-${rand(4)}-${rand(4)}`;

export const createEmptyEnrollment = (): Enrollment => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    fileNumber: generateFileNumber(),
    citizenUid: generateCitizenUid(),
    createdAt: now,
    updatedAt: now,
    status: "Brouillon",
    nom: "",
    prenom: "",
    sexe: "",
    dateNaissance: "",
    lieuNaissance: "",
    nationalite: "Congolaise",
    nin: "",
    typePiece: "",
    numeroPiece: "",
    telephone: "",
    email: "",
    adresse: "",
    quartier: "",
    arrondissement: "",
    commune: "",
    ville: "Brazzaville",
    pays: "République du Congo",
    situationMatrimoniale: "",
    nomConjoint: "",
    nombreEnfants: "",
    nomPere: "",
    nomMere: "",
    contactUrgenceNom: "",
    contactUrgenceTel: "",
    contactUrgenceLien: "",
    profession: "",
    employeur: "",
    niveauEtudes: "",
    situationEmploi: "",
    revenus: "",
    documents: defaultDocuments(),
    centreEnrolement: "Centre Brazzaville - Poto-Poto",
    agentResponsable: "Agent #0045",
    consentement: false,
    signature: "",
  };
};
