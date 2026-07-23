import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createCasierUseCases } from "@/application/casier/casier.use-cases";
import type { Casier, CasierHistoryEntry, CasierStats } from "@/domain/casier";
import { casierRepository } from "@/infrastructure/casier/casier-repository.provider";
import { seedIfEmpty } from "@/infrastructure/casier/local-storage-casier.repository";

const useCases = createCasierUseCases(casierRepository);
const PAGE_SIZE = 100;

interface CasierState {
  items: Casier[];
  current: Casier | null;
  stats: CasierStats | null;
  history: CasierHistoryEntry[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  loadMore: () => Promise<void>;
  loadOne: (id: string) => Promise<Casier | undefined>;
  loadStats: () => Promise<void>;
  loadHistory: (id: string) => Promise<void>;
  startNew: () => Casier;
  updateCurrent: <K extends keyof Casier>(key: K, value: Casier[K]) => void;
  /** Persists `current` for the first time (create) or updates document_url on an existing one. */
  saveDraft: () => Promise<Casier | undefined>;
  finalize: () => Promise<Casier | undefined>;
  validate: (casier: Casier) => Promise<Casier | undefined>;
  reject: (casier: Casier, reason: string) => Promise<Casier | undefined>;
  deleteCasier: (id: string) => Promise<void>;
  clearCurrent: () => void;
}

let currentPage = 1;

export const useCasierStore = create<CasierState>()(
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
          const items = await useCases.listCasiers(currentPage, PAGE_SIZE);
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
          const more = await useCases.listCasiers(nextPage, PAGE_SIZE);
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
          const casier = await useCases.getCasier(id);
          set({ current: casier ?? null, isLoading: false });
          return casier;
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          return undefined;
        }
      },

      startNew: () => {
        const casier = useCases.startCasier();
        set({ current: casier });
        return casier;
      },

      updateCurrent: (key, value) =>
        set((state) => (state.current ? { current: { ...state.current, [key]: value } } : state)),

      saveDraft: async () => {
        const { current } = get();
        if (!current) return undefined;
        const saved = await useCases.saveDraft(current);
        set((state) => ({
          current: saved,
          items: upsert(state.items, saved),
        }));
        return saved;
      },

      finalize: async () => {
        const { current } = get();
        if (!current) return undefined;
        const saved = await useCases.finalizeCasier(current);
        set((state) => ({ current: saved, items: upsert(state.items, saved) }));
        return saved;
      },

      validate: async (casier) => {
        const saved = await useCases.validateCasier(casier);
        set((state) => ({
          current: state.current?.id === saved.id ? saved : state.current,
          items: upsert(state.items, saved),
        }));
        return saved;
      },

      reject: async (casier, reason) => {
        const saved = await useCases.rejectCasier(casier, reason);
        set((state) => ({
          current: state.current?.id === saved.id ? saved : state.current,
          items: upsert(state.items, saved),
        }));
        return saved;
      },

      deleteCasier: async (id) => {
        await useCases.deleteCasier(id);
        set((state) => ({
          items: state.items.filter((c) => c.id !== id),
          current: state.current?.id === id ? null : state.current,
        }));
      },

      clearCurrent: () => set({ current: null }),
    }),
    {
      name: "casier-store",
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

function upsert(items: Casier[], casier: Casier): Casier[] {
  const idx = items.findIndex((c) => c.id === casier.id);
  if (idx === -1) return [casier, ...items];
  const next = [...items];
  next[idx] = casier;
  return next;
}
