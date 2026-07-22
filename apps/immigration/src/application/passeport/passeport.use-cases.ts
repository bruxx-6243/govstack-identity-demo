import { createEmptyPasseport, type Passeport, type PasseportRepository } from "@/domain/passeport";

/**
 * Application use-cases for passport requests. Depend only on the
 * PasseportRepository port — never import a concrete repository here.
 */
export function createPasseportUseCases(repository: PasseportRepository) {
  return {
    listPasseports: () => repository.list(),

    getPasseport: (id: string) => repository.getById(id),

    async startPasseport(): Promise<Passeport> {
      const passeport = createEmptyPasseport();
      return repository.save(passeport);
    },

    saveDraft: (passeport: Passeport) => repository.save(passeport),

    async finalizePasseport(passeport: Passeport): Promise<Passeport> {
      return repository.save({ ...passeport, status: "En instruction" });
    },

    async validatePasseport(passeport: Passeport): Promise<Passeport> {
      return repository.save({ ...passeport, status: "Validée" });
    },

    async rejectPasseport(passeport: Passeport): Promise<Passeport> {
      return repository.save({ ...passeport, status: "Rejetée" });
    },

    deletePasseport: (id: string) => repository.remove(id),
  };
}

export type PasseportUseCases = ReturnType<typeof createPasseportUseCases>;
