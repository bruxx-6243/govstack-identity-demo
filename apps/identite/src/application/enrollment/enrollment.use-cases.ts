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
    listEnrollments: () => repository.list(),

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
      return repository.save({ ...enrollment, status: "Validé" });
    },

    deleteEnrollment: (id: string) => repository.remove(id),
  };
}

export type EnrollmentUseCases = ReturnType<typeof createEnrollmentUseCases>;
