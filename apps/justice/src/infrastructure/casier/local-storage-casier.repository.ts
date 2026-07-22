import { createEmptyCasier, type Casier, type CasierRepository } from "@/domain/casier";

const KEY = "casiers_v1";

function readAll(): Casier[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(all: Casier[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export class LocalStorageCasierRepository implements CasierRepository {
  async list(): Promise<Casier[]> {
    return readAll();
  }

  async getById(id: string): Promise<Casier | undefined> {
    return readAll().find((c) => c.id === id);
  }

  async save(casier: Casier): Promise<Casier> {
    const all = readAll();
    const idx = all.findIndex((c) => c.id === casier.id);
    const saved: Casier = { ...casier, updatedAt: new Date().toISOString() };
    if (idx >= 0) all[idx] = saved;
    else all.unshift(saved);
    writeAll(all);
    return saved;
  }

  async remove(id: string): Promise<void> {
    writeAll(readAll().filter((c) => c.id !== id));
  }
}

/** Seeds demo records on first load, when no data has been persisted yet. */
export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEY)) return;
  const demos: Partial<Casier>[] = [
    {
      citizenUin: "CG-1839-2047-5521",
      citizenNomAffiche: "MBOUALA Jean-Pierre",
      motifDemande: "Emploi",
      status: "Validée",
    },
    {
      citizenUin: "CG-2093-8845-1102",
      citizenNomAffiche: "NGUESSO Marie-Claire",
      motifDemande: "Voyage",
      status: "En instruction",
    },
    {
      citizenUin: "CG-7712-0093-4488",
      citizenNomAffiche: "OKEMBA Serge",
      motifDemande: "Dossier judiciaire",
      status: "Soumise",
    },
    {
      citizenUin: "CG-4456-1120-9987",
      citizenNomAffiche: "SASSOU Aline",
      motifDemande: "Emploi",
      status: "Rejetée",
    },
  ];
  const all = demos.map((d) => ({ ...createEmptyCasier(), ...d }));
  writeAll(all);
}
