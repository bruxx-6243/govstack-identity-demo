import { createEmptyCasier, type Casier, type CasierRepository } from "@/domain/casier";

/**
 * Application use-cases for casier judiciaire requests. Depend only on the
 * CasierRepository port — never import a concrete repository here.
 */
export function createCasierUseCases(repository: CasierRepository) {
  return {
    listCasiers: (page?: number, pageSize?: number) => repository.list(page, pageSize),

    getCasier: (id: string) => repository.getById(id),

    /**
     * Builds a blank casier locally only — not persisted yet. The backend's
     * citizen_uid is required at creation and only known once the agent
     * fills in Step 1, so the actual POST /demandes happens on the first
     * saveDraft() call, not here.
     */
    startCasier(): Casier {
      return createEmptyCasier();
    },

    saveDraft: (casier: Casier) => repository.save(casier),

    async finalizeCasier(casier: Casier): Promise<Casier> {
      return repository.instruire(casier);
    },

    async validateCasier(casier: Casier): Promise<Casier> {
      return repository.valider(casier);
    },

    async rejectCasier(casier: Casier, reason: string): Promise<Casier> {
      return repository.rejeter(casier, reason);
    },

    deleteCasier: (id: string) => repository.remove(id),

    getStats: () => repository.getStats(),

    getHistory: (id: string) => repository.getHistory(id),
  };
}

export type CasierUseCases = ReturnType<typeof createCasierUseCases>;
