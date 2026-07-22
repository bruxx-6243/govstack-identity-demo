import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createPasseportUseCases } from "@/application/passeport/passeport.use-cases";
import type { Passeport } from "@/domain/passeport";
import { passeportRepository } from "@/infrastructure/passeport/passeport-repository.provider";
import { seedIfEmpty } from "@/infrastructure/passeport/local-storage-passeport.repository";

const useCases = createPasseportUseCases(passeportRepository);

interface PasseportState {
  items: Passeport[];
  current: Passeport | null;
  isLoading: boolean;
  error: string | null;

  loadAll: () => Promise<void>;
  loadOne: (id: string) => Promise<Passeport | undefined>;
  startNew: () => Promise<Passeport>;
  updateCurrent: <K extends keyof Passeport>(key: K, value: Passeport[K]) => void;
  saveDraft: () => Promise<void>;
  finalize: () => Promise<Passeport | undefined>;
  validate: (passeport: Passeport) => Promise<Passeport | undefined>;
  reject: (passeport: Passeport) => Promise<Passeport | undefined>;
  deletePasseport: (id: string) => Promise<void>;
  clearCurrent: () => void;
}

export const usePasseportStore = create<PasseportState>()(
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
          const items = await useCases.listPasseports();
          set({ items, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
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

      startNew: async () => {
        const passeport = await useCases.startPasseport();
        set((state) => ({ current: passeport, items: [passeport, ...state.items] }));
        return passeport;
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

      reject: async (passeport) => {
        const saved = await useCases.rejectPasseport(passeport);
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
