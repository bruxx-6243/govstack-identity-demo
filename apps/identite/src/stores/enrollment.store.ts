import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createEnrollmentUseCases } from "@/application/enrollment/enrollment.use-cases";
import type { Enrollment, EnrollmentHistoryEntry, EnrollmentStats } from "@/domain/enrollment";
import { enrollmentRepository } from "@/infrastructure/enrollment/enrollment-repository.provider";
import { seedIfEmpty } from "@/infrastructure/enrollment/local-storage-enrollment.repository";

const useCases = createEnrollmentUseCases(enrollmentRepository);
const PAGE_SIZE = 100;

interface EnrollmentState {
  items: Enrollment[];
  current: Enrollment | null;
  stats: EnrollmentStats | null;
  history: EnrollmentHistoryEntry[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  loadMore: () => Promise<void>;
  loadOne: (id: string) => Promise<Enrollment | undefined>;
  loadStats: () => Promise<void>;
  loadHistory: (id: string) => Promise<void>;
  startNew: () => Promise<Enrollment>;
  updateCurrent: <K extends keyof Enrollment>(key: K, value: Enrollment[K]) => void;
  saveDraft: () => Promise<void>;
  finalize: () => Promise<Enrollment | undefined>;
  verify: (enrollment: Enrollment) => Promise<Enrollment | undefined>;
  reject: (enrollment: Enrollment, reason: string) => Promise<Enrollment | undefined>;
  deleteEnrollment: (id: string) => Promise<void>;
  uploadDocument: (enrollmentId: string, key: string, file: File) => Promise<Enrollment | undefined>;
  verifyDocument: (enrollmentId: string, key: string) => Promise<Enrollment | undefined>;
  clearCurrent: () => void;
}

let currentPage = 1;

export const useEnrollmentStore = create<EnrollmentState>()(
  persist(
    (set, get) => ({
      items: [],
      current: null,
      stats: null,
      history: [],
      isLoading: false,
      hasMore: false,
      isLoadingMore: false,
      error: null,

      loadAll: async () => {
        set({ isLoading: true, error: null });
        currentPage = 1;
        try {
          seedIfEmpty();
          const items = await useCases.listEnrollments(currentPage, PAGE_SIZE);
          set({ items, isLoading: false, hasMore: items.length === PAGE_SIZE });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      loadMore: async () => {
        if (get().isLoadingMore || !get().hasMore) return;
        set({ isLoadingMore: true });
        try {
          const nextPage = currentPage + 1;
          const more = await useCases.listEnrollments(nextPage, PAGE_SIZE);
          currentPage = nextPage;
          set((state) => ({
            items: [...state.items, ...more],
            hasMore: more.length === PAGE_SIZE,
            isLoadingMore: false,
          }));
        } catch (err) {
          set({ error: (err as Error).message, isLoadingMore: false });
        }
      },

      loadStats: async () => {
        try {
          const stats = await useCases.getStats();
          set({ stats });
        } catch (err) {
          set({ error: (err as Error).message });
        }
      },

      loadHistory: async (id) => {
        try {
          const history = await useCases.getHistory(id);
          set({ history });
        } catch (err) {
          set({ error: (err as Error).message, history: [] });
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

      reject: async (enrollment, reason) => {
        const saved = await useCases.rejectEnrollment(enrollment, reason);
        set((state) => ({
          current: state.current?.id === saved.id ? saved : state.current,
          items: upsert(state.items, saved),
        }));
        return saved;
      },

      uploadDocument: async (enrollmentId, key, file) => {
        const saved = await useCases.uploadDocument(enrollmentId, key, file);
        set((state) => ({
          current: state.current?.id === saved.id ? saved : state.current,
          items: upsert(state.items, saved),
        }));
        return saved;
      },

      verifyDocument: async (enrollmentId, key) => {
        const saved = await useCases.verifyDocument(enrollmentId, key);
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
