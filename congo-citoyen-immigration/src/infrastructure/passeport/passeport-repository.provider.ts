import type { PasseportRepository } from "@/domain/passeport";
import { HttpPasseportRepository } from "./http-passeport.repository";
import { LocalStoragePasseportRepository } from "./local-storage-passeport.repository";

/**
 * Single composition point for which PasseportRepository implementation is
 * active. Set VITE_PASSEPORT_API_URL to point the app at the real backend;
 * leave it unset to keep using local persistence.
 */
function createPasseportRepository(): PasseportRepository {
  const baseUrl = import.meta.env.VITE_PASSEPORT_API_URL as string | undefined;
  if (baseUrl) {
    return new HttpPasseportRepository({
      baseUrl,
      getAuthHeader: () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        return token ? `Bearer ${token}` : undefined;
      },
    });
  }
  return new LocalStoragePasseportRepository();
}

export const passeportRepository: PasseportRepository = createPasseportRepository();
