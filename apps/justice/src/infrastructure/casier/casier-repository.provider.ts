import type { CasierRepository } from "@/domain/casier";
import { HttpCasierRepository } from "./http-casier.repository";
import { LocalStorageCasierRepository } from "./local-storage-casier.repository";

/**
 * Single composition point for which CasierRepository implementation is
 * active. Set VITE_CASIER_API_URL to point the app at the real backend;
 * leave it unset to keep using local persistence.
 */
function createCasierRepository(): CasierRepository {
  const baseUrl = import.meta.env.VITE_CASIER_API_URL as string | undefined;
  if (baseUrl) {
    return new HttpCasierRepository({
      baseUrl,
      getAuthHeader: () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        return token ? `Bearer ${token}` : undefined;
      },
    });
  }
  return new LocalStorageCasierRepository();
}

export const casierRepository: CasierRepository = createCasierRepository();
