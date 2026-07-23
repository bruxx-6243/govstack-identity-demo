import type { Passeport } from "./passeport.schema";

export const createEmptyPasseport = (): Passeport => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    citizenUin: "",
    createdAt: now,
    updatedAt: now,
    status: "Soumise",
    casierVerifie: false,
    documentUrl: undefined,
  };
};
