import { createEmptyPasseport, type Passeport, type PasseportRepository } from "@/domain/passeport";

/**
 * Application use-cases for passport requests. Depend only on the
 * PasseportRepository port — never import a concrete repository here.
 */
export function createPasseportUseCases(repository: PasseportRepository) {
  return {
    listPasseports: (page?: number, pageSize?: number) => repository.list(page, pageSize),

    getPasseport: (id: string) => repository.getById(id),

    /**
     * Builds a blank passeport locally only — not persisted yet. The
     * backend's citizen_uid is required at creation and only known once
     * the agent fills in Step 1, so the actual POST /demandes happens on
     * the first saveDraft() call, not here.
     */
    startPasseport(): Passeport {
      return createEmptyPasseport();
    },

    saveDraft: (passeport: Passeport) => repository.save(passeport),

    async finalizePasseport(passeport: Passeport): Promise<Passeport> {
      return repository.instruire(passeport);
    },

    async validatePasseport(passeport: Passeport): Promise<Passeport> {
      return repository.valider(passeport);
    },

    async rejectPasseport(passeport: Passeport, reason: string): Promise<Passeport> {
      return repository.rejeter(passeport, reason);
    },

    deletePasseport: (id: string) => repository.remove(id),

    getStats: () => repository.getStats(),

    getHistory: (id: string) => repository.getHistory(id),
  };
}

export type PasseportUseCases = ReturnType<typeof createPasseportUseCases>;
