import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createCasierUseCases } from "@/application/casier/casier.use-cases";
import type { Casier } from "@/domain/casier";
import { casierRepository } from "@/infrastructure/casier/casier-repository.provider";
import { seedIfEmpty } from "@/infrastructure/casier/local-storage-casier.repository";

const useCases = createCasierUseCases(casierRepository);

interface CasierState {
  items: Casier[];
  current: Casier | null;
  isLoading: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  loadOne: (id: string) => Promise<Casier | undefined>;
  startNew: () => Promise<Casier>;
  updateCurrent: <K extends keyof Casier>(key: K, value: Casier[K]) => void;
  saveDraft: () => Promise<void>;
  finalize: () => Promise<Casier | undefined>;
  validate: (casier: Casier) => Promise<Casier | undefined>;
  reject: (casier: Casier) => Promise<Casier | undefined>;
  deleteCasier: (id: string) => Promise<void>;
  clearCurrent: () => void;
}

export const useCasierStore = create<CasierState>()(
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
          const items = await useCases.listCasiers();
          set({ items, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
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

      startNew: async () => {
        const casier = await useCases.startCasier();
        set((state) => ({ current: casier, items: [casier, ...state.items] }));
        return casier;
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

      reject: async (casier) => {
        const saved = await useCases.rejectCasier(casier);
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
