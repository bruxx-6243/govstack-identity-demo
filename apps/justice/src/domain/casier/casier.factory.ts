import type { Casier } from "./casier.schema";

export const createEmptyCasier = (): Casier => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    citizenUin: "",
    createdAt: now,
    updatedAt: now,
    status: "Soumise",
    documentUrl: undefined,
  };
};
