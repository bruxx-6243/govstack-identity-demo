import { createEmptyCasier, type Casier, type CasierRepository } from "@/domain/casier";

/**
 * Application use-cases for casier judiciaire requests. Depend only on the
 * CasierRepository port — never import a concrete repository here.
 */
export function createCasierUseCases(repository: CasierRepository) {
  return {
    listCasiers: () => repository.list(),

    getCasier: (id: string) => repository.getById(id),

    async startCasier(): Promise<Casier> {
      const casier = createEmptyCasier();
      return repository.save(casier);
    },

    saveDraft: (casier: Casier) => repository.save(casier),

    async finalizeCasier(casier: Casier): Promise<Casier> {
      return repository.save({ ...casier, status: "En instruction" });
    },

    async validateCasier(casier: Casier): Promise<Casier> {
      return repository.save({ ...casier, status: "Validée" });
    },

    async rejectCasier(casier: Casier): Promise<Casier> {
      return repository.save({ ...casier, status: "Rejetée" });
    },

    deleteCasier: (id: string) => repository.remove(id),
  };
}

export type CasierUseCases = ReturnType<typeof createCasierUseCases>;
