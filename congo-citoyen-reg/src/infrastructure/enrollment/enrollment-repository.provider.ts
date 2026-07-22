import type { EnrollmentRepository } from "@/domain/enrollment";
import { HttpEnrollmentRepository } from "./http-enrollment.repository";
import { LocalStorageEnrollmentRepository } from "./local-storage-enrollment.repository";

/**
 * Single composition point for which EnrollmentRepository implementation
 * is active. Set VITE_ENROLLMENT_API_URL to point the app at the real
 * backend; leave it unset to keep using local persistence.
 */
function createEnrollmentRepository(): EnrollmentRepository {
  const baseUrl = import.meta.env.VITE_ENROLLMENT_API_URL as string | undefined;
  if (baseUrl) {
    return new HttpEnrollmentRepository({
      baseUrl,
      getAuthHeader: () => {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        return token ? `Bearer ${token}` : undefined;
      },
    });
  }
  return new LocalStorageEnrollmentRepository();
}

export const enrollmentRepository: EnrollmentRepository = createEnrollmentRepository();
