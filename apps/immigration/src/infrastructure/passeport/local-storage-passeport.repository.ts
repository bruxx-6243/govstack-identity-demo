import {
  createEmptyPasseport,
  type Passeport,
  type PasseportHistoryEntry,
  type PasseportRepository,
  type PasseportStats,
} from "@/domain/passeport";

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

  async instruire(passeport: Passeport): Promise<Passeport> {
    return this.save({ ...passeport, status: "En instruction" });
  }

  async valider(passeport: Passeport): Promise<Passeport> {
    return this.save({ ...passeport, status: "Validée" });
  }

  async rejeter(passeport: Passeport): Promise<Passeport> {
    // Reason isn't tracked client-side (mirrors the backend, which only
    // stores it in the demande's history, not on the demande itself).
    return this.save({ ...passeport, status: "Rejetée" });
  }

  async getStats(): Promise<PasseportStats> {
    const all = readAll();
    return {
      total: all.length,
      soumises: all.filter((p) => p.status === "Soumise").length,
      enInstruction: all.filter((p) => p.status === "En instruction").length,
      validees: all.filter((p) => p.status === "Validée").length,
      rejetees: all.filter((p) => p.status === "Rejetée").length,
    };
  }

  async getHistory(id: string): Promise<PasseportHistoryEntry[]> {
    const passeport = readAll().find((p) => p.id === id);
    if (!passeport) return [];
    return [
      { status: passeport.status, changedBy: null, changedAt: passeport.updatedAt, reason: null },
    ];
  }
}

/** Seeds demo records on first load, when no data has been persisted yet. */
export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEY)) return;
  const demos: Partial<Passeport>[] = [
    { citizenUin: "CG-1839-2047-5521", casierVerifie: true, status: "Validée" },
    { citizenUin: "CG-2093-8845-1102", casierVerifie: false, status: "En instruction" },
    { citizenUin: "CG-7712-0093-4488", casierVerifie: false, status: "Soumise" },
    { citizenUin: "CG-4456-1120-9987", casierVerifie: false, status: "Rejetée" },
  ];
  const all = demos.map((d) => ({ ...createEmptyPasseport(), ...d }));
  writeAll(all);
}
