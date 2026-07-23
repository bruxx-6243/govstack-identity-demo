import type { Enrollment, EnrollmentHistoryEntry, EnrollmentStats } from "./enrollment.schema";

/**
 * Port for enrollment persistence. The application layer depends only on
 * this interface, never on a concrete storage/transport implementation —
 * swap the localStorage adapter for the HTTP adapter without touching
 * use-cases or UI.
 */
export interface EnrollmentRepository {
  list(page?: number, pageSize?: number): Promise<Enrollment[]>;
  getById(id: string): Promise<Enrollment | undefined>;
  save(enrollment: Enrollment): Promise<Enrollment>;
  remove(id: string): Promise<void>;
  /** Marks the enrollment as validated and (backend-side) pushes the identity to MOSIP. */
  verify(enrollment: Enrollment): Promise<Enrollment>;
  reject(enrollment: Enrollment, reason: string): Promise<Enrollment>;
  getStats(): Promise<EnrollmentStats>;
  getHistory(id: string): Promise<EnrollmentHistoryEntry[]>;
  uploadDocument(enrollmentId: string, key: string, file: File): Promise<Enrollment>;
  verifyDocument(enrollmentId: string, key: string): Promise<Enrollment>;
}
