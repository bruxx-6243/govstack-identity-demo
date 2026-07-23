import {
  createEmptyCasier,
  type Casier,
  type CasierHistoryEntry,
  type CasierRepository,
  type CasierStats,
} from "@/domain/casier";

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

  async instruire(casier: Casier): Promise<Casier> {
    return this.save({ ...casier, status: "En instruction" });
  }

  async valider(casier: Casier): Promise<Casier> {
    return this.save({ ...casier, status: "Validée" });
  }

  async rejeter(casier: Casier): Promise<Casier> {
    // Reason isn't tracked client-side (mirrors the backend, which only
    // stores it in the demande's history, not on the demande itself).
    return this.save({ ...casier, status: "Rejetée" });
  }

  async getStats(): Promise<CasierStats> {
    const all = readAll();
    return {
      total: all.length,
      soumises: all.filter((c) => c.status === "Soumise").length,
      enInstruction: all.filter((c) => c.status === "En instruction").length,
      validees: all.filter((c) => c.status === "Validée").length,
      rejetees: all.filter((c) => c.status === "Rejetée").length,
    };
  }

  async getHistory(id: string): Promise<CasierHistoryEntry[]> {
    const casier = readAll().find((c) => c.id === id);
    if (!casier) return [];
    return [{ status: casier.status, changedBy: null, changedAt: casier.updatedAt, reason: null }];
  }
}

/** Seeds demo records on first load, when no data has been persisted yet. */
export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEY)) return;
  const demos: Partial<Casier>[] = [
    { citizenUin: "CG-1839-2047-5521", status: "Validée" },
    { citizenUin: "CG-2093-8845-1102", status: "En instruction" },
    { citizenUin: "CG-7712-0093-4488", status: "Soumise" },
    { citizenUin: "CG-4456-1120-9987", status: "Rejetée" },
  ];
  const all = demos.map((d) => ({ ...createEmptyCasier(), ...d }));
  writeAll(all);
}
