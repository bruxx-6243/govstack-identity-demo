import {
  createEmptyEnrollment,
  type Enrollment,
  type EnrollmentRepository,
} from "@/domain/enrollment";

/**
 * Application use-cases for enrollment. Depend only on the
 * EnrollmentRepository port — never import a concrete repository here.
 */
export function createEnrollmentUseCases(repository: EnrollmentRepository) {
  return {
    listEnrollments: (page?: number, pageSize?: number) => repository.list(page, pageSize),

    getEnrollment: (id: string) => repository.getById(id),

    async startEnrollment(): Promise<Enrollment> {
      const enrollment = createEmptyEnrollment();
      return repository.save(enrollment);
    },

    saveDraft: (enrollment: Enrollment) => repository.save(enrollment),

    async finalizeEnrollment(enrollment: Enrollment): Promise<Enrollment> {
      return repository.save({ ...enrollment, status: "En attente de validation" });
    },

    async verifyEnrollment(enrollment: Enrollment): Promise<Enrollment> {
      return repository.verify(enrollment);
    },

    async rejectEnrollment(enrollment: Enrollment, reason: string): Promise<Enrollment> {
      return repository.reject(enrollment, reason);
    },

    deleteEnrollment: (id: string) => repository.remove(id),

    getStats: () => repository.getStats(),

    getHistory: (id: string) => repository.getHistory(id),

    uploadDocument: (enrollmentId: string, key: string, file: File) =>
      repository.uploadDocument(enrollmentId, key, file),

    verifyDocument: (enrollmentId: string, key: string) =>
      repository.verifyDocument(enrollmentId, key),
  };
}

export type EnrollmentUseCases = ReturnType<typeof createEnrollmentUseCases>;
