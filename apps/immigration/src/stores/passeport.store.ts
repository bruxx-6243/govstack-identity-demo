import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createPasseportUseCases } from "@/application/passeport/passeport.use-cases";
import type { Passeport, PasseportHistoryEntry, PasseportStats } from "@/domain/passeport";
import { passeportRepository } from "@/infrastructure/passeport/passeport-repository.provider";
import { seedIfEmpty } from "@/infrastructure/passeport/local-storage-passeport.repository";

const useCases = createPasseportUseCases(passeportRepository);
const PAGE_SIZE = 100;

interface PasseportState {
  items: Passeport[];
  current: Passeport | null;
  stats: PasseportStats | null;
  history: PasseportHistoryEntry[];
  isLoading: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  loadMore: () => Promise<void>;
  loadOne: (id: string) => Promise<Passeport | undefined>;
  loadStats: () => Promise<void>;
  loadHistory: (id: string) => Promise<void>;
  startNew: () => Passeport;
  updateCurrent: <K extends keyof Passeport>(key: K, value: Passeport[K]) => void;
  /** Persists `current` for the first time (create) or updates document_url on an existing one. */
  saveDraft: () => Promise<Passeport | undefined>;
  finalize: () => Promise<Passeport | undefined>;
  validate: (passeport: Passeport) => Promise<Passeport | undefined>;
  reject: (passeport: Passeport, reason: string) => Promise<Passeport | undefined>;
  deletePasseport: (id: string) => Promise<void>;
  clearCurrent: () => void;
}

let currentPage = 1;

export const usePasseportStore = create<PasseportState>()(
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
          const items = await useCases.listPasseports(currentPage, PAGE_SIZE);
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
          const more = await useCases.listPasseports(nextPage, PAGE_SIZE);
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
          const passeport = await useCases.getPasseport(id);
          set({ current: passeport ?? null, isLoading: false });
          return passeport;
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
          return undefined;
        }
      },

      startNew: () => {
        const passeport = useCases.startPasseport();
        set({ current: passeport });
        return passeport;
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
        const saved = await useCases.finalizePasseport(current);
        set((state) => ({ current: saved, items: upsert(state.items, saved) }));
        return saved;
      },

      validate: async (passeport) => {
        const saved = await useCases.validatePasseport(passeport);
        set((state) => ({
          current: state.current?.id === saved.id ? saved : state.current,
          items: upsert(state.items, saved),
        }));
        return saved;
      },

      reject: async (passeport, reason) => {
        const saved = await useCases.rejectPasseport(passeport, reason);
        set((state) => ({
          current: state.current?.id === saved.id ? saved : state.current,
          items: upsert(state.items, saved),
        }));
        return saved;
      },

      deletePasseport: async (id) => {
        await useCases.deletePasseport(id);
        set((state) => ({
          items: state.items.filter((p) => p.id !== id),
          current: state.current?.id === id ? null : state.current,
        }));
      },

      clearCurrent: () => set({ current: null }),
    }),
    {
      name: "passeport-store",
      partialize: (state) => ({ items: state.items }),
    },
  ),
);

function upsert(items: Passeport[], passeport: Passeport): Passeport[] {
  const idx = items.findIndex((p) => p.id === passeport.id);
  if (idx === -1) return [passeport, ...items];
  const next = [...items];
  next[idx] = passeport;
  return next;
}
