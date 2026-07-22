import { createEmptyEnrollment, type Enrollment, type EnrollmentRepository } from "@/domain/enrollment";

const KEY = "enrollments_v1";

function readAll(): Enrollment[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function writeAll(all: Enrollment[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export class LocalStorageEnrollmentRepository implements EnrollmentRepository {
  async list(): Promise<Enrollment[]> {
    return readAll();
  }

  async getById(id: string): Promise<Enrollment | undefined> {
    return readAll().find((e) => e.id === id);
  }

  async save(enrollment: Enrollment): Promise<Enrollment> {
    const all = readAll();
    const idx = all.findIndex((e) => e.id === enrollment.id);
    const saved: Enrollment = { ...enrollment, updatedAt: new Date().toISOString() };
    if (idx >= 0) all[idx] = saved;
    else all.unshift(saved);
    writeAll(all);
    return saved;
  }

  async remove(id: string): Promise<void> {
    writeAll(readAll().filter((e) => e.id !== id));
  }
}

/** Seeds demo records on first load, when no data has been persisted yet. */
export function seedIfEmpty() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEY)) return;
  const demos: Partial<Enrollment>[] = [
    { nom: "MBOUALA", prenom: "Jean-Pierre", sexe: "Masculin", dateNaissance: "1985-03-12", status: "Validé", ville: "Brazzaville" },
    { nom: "NGUESSO", prenom: "Marie-Claire", sexe: "Féminin", dateNaissance: "1992-07-24", status: "En attente de validation", ville: "Pointe-Noire" },
    { nom: "OKEMBA", prenom: "Serge", sexe: "Masculin", dateNaissance: "1978-11-02", status: "Validé", ville: "Dolisie" },
    { nom: "SASSOU", prenom: "Aline", sexe: "Féminin", dateNaissance: "1990-05-19", status: "Brouillon", ville: "Brazzaville" },
    { nom: "MAKOSSO", prenom: "Fabrice", sexe: "Masculin", dateNaissance: "1988-01-30", status: "Validé", ville: "Owando" },
  ];
  const all = demos.map((d) => ({ ...createEmptyEnrollment(), ...d }));
  writeAll(all);
}
