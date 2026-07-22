import type { Enrollment } from "./enrollment.schema";

/**
 * Port for enrollment persistence. The application layer depends only on
 * this interface, never on a concrete storage/transport implementation —
 * swap the localStorage adapter for the HTTP adapter without touching
 * use-cases or UI.
 */
export interface EnrollmentRepository {
  list(): Promise<Enrollment[]>;
  getById(id: string): Promise<Enrollment | undefined>;
  save(enrollment: Enrollment): Promise<Enrollment>;
  remove(id: string): Promise<void>;
}
