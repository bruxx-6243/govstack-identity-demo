import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createEnrollmentUseCases } from "@/application/enrollment/enrollment.use-cases";
import type { Enrollment } from "@/domain/enrollment";
import { enrollmentRepository } from "@/infrastructure/enrollment/enrollment-repository.provider";
import { seedIfEmpty } from "@/infrastructure/enrollment/local-storage-enrollment.repository";

const useCases = createEnrollmentUseCases(enrollmentRepository);

interface EnrollmentState {
  items: Enrollment[];
  current: Enrollment | null;
  isLoading: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  loadOne: (id: string) => Promise<Enrollment | undefined>;
  startNew: () => Promise<Enrollment>;
  updateCurrent: <K extends keyof Enrollment>(key: K, value: Enrollment[K]) => void;
  saveDraft: () => Promise<void>;
  finalize: () => Promise<Enrollment | undefined>;
  verify: (enrollment: Enrollment) => Promise<Enrollment | undefined>;
  deleteEnrollment: (id: string) => Promise<void>;
  clearCurrent: () => void;
}

export const useEnrollmentStore = create<EnrollmentState>()(
  persist(
    (set, get) => ({
      items: [],
      current: null,
      isLoading: false,
      error: null,

      loadAll: async () => {
        set({ isLoading: true, error: null });
        try {
          seedIfEmpty();
          const items = await useCases.listEnrollments();
          set({ items, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      loadOne: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const enrollment = await useCases.getEnrollment(id);
          set({ current: enrollment ?? null, isLoading: false });
          return enrollment;
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          return undefined;
        }
      },

      startNew: async () => {
        const enrollment = await useCases.startEnrollment();
        set((state) => ({ current: enrollment, items: [enrollment, ...state.items] }));
        return enrollment;
      },

      updateCurrent: (key, value) =>
        set((state) => (state.current ? { current: { ...state.current, [key]: value } } : state)),

      saveDraft: async () => {
        const { current } = get();
        if (!current) return;
        const saved = await useCases.saveDraft(current);
        set((state) => ({
          current: saved,
          items: upsert(state.items, saved),
        }));
      },

      finalize: async () => {
        const { current } = get();
        if (!current) return undefined;
        const saved = await useCases.finalizeEnrollment(current);
        set((state) => ({ current: saved, items: upsert(state.items, saved) }));
        return saved;
      },

      verify: async (enrollment) => {
        const saved = await useCases.verifyEnrollment(enrollment);
        set((state) => ({
          current: state.current?.id === saved.id ? saved : state.current,
          items: upsert(state.items, saved),
        }));
        return saved;
      },

      deleteEnrollment: async (id) => {
        await useCases.deleteEnrollment(id);
        set((state) => ({
          items: state.items.filter((e) => e.id !== id),
          current: state.current?.id === id ? null : state.current,
        }));
      },

      clearCurrent: () => set({ current: null }),
    }),
    {
      name: "enrollment-store",
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

function upsert(items: Enrollment[], enrollment: Enrollment): Enrollment[] {
  const idx = items.findIndex((e) => e.id === enrollment.id);
  if (idx === -1) return [enrollment, ...items];
  const next = [...items];
  next[idx] = enrollment;
  return next;
}
