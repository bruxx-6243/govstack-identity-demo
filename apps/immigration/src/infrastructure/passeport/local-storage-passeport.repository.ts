import { createEmptyPasseport, type Passeport, type PasseportRepository } from "@/domain/passeport";

const KEY = "passeports_v1";

function readAll(): Passeport[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(all: Passeport[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export class LocalStoragePasseportRepository implements PasseportRepository {
  async list(): Promise<Passeport[]> {
    return readAll();
  }

  async getById(id: string): Promise<Passeport | undefined> {
    return readAll().find((p) => p.id === id);
  }

  async save(passeport: Passeport): Promise<Passeport> {
    const all = readAll();
    const idx = all.findIndex((p) => p.id === passeport.id);
    const saved: Passeport = { ...passeport, updatedAt: new Date().toISOString() };
    if (idx >= 0) all[idx] = saved;
    else all.unshift(saved);
    writeAll(all);
    return saved;
  }

  async remove(id: string): Promise<void> {
    writeAll(readAll().filter((p) => p.id !== id));
  }
}

/** Seeds demo records on first load, when no data has been persisted yet. */
export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEY)) return;
  const demos: Partial<Passeport>[] = [
    {
      citizenUin: "CG-1839-2047-5521",
      citizenNomAffiche: "MBOUALA Jean-Pierre",
      typePasseport: "Ordinaire",
      verificationCasierStatut: "Vérifié",
      status: "Validée",
    },
    {
      citizenUin: "CG-2093-8845-1102",
      citizenNomAffiche: "NGUESSO Marie-Claire",
      typePasseport: "Ordinaire",
      verificationCasierStatut: "Non vérifié",
      status: "En instruction",
    },
    {
      citizenUin: "CG-7712-0093-4488",
      citizenNomAffiche: "OKEMBA Serge",
      typePasseport: "Service",
      verificationCasierStatut: "Non vérifié",
      status: "Soumise",
    },
    {
      citizenUin: "CG-4456-1120-9987",
      citizenNomAffiche: "SASSOU Aline",
      typePasseport: "Diplomatique",
      verificationCasierStatut: "Mention trouvée",
      status: "Rejetée",
    },
  ];
  const all = demos.map((d) => ({ ...createEmptyPasseport(), ...d }));
  writeAll(all);
}
