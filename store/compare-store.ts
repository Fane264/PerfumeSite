import { create } from "zustand";
import { persist } from "zustand/middleware";
import toast from "react-hot-toast";
import type { ApiPerfumeListItem } from "@/types";

export const MAX_COMPARE = 3;

interface CompareState {
  items: ApiPerfumeListItem[];
  addToCompare: (perfume: ApiPerfumeListItem) => void;
  removeFromCompare: (id: string) => void;
  toggleCompare: (perfume: ApiPerfumeListItem) => void;
  clearCompare: () => void;
  isInCompare: (id: string) => boolean;
}

/**
 * Persisted comparison tray (max 3 perfumes). Holds the lightweight list items;
 * the compare page hydrates full detail (olfactory pyramid) per slug on demand.
 */
export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      addToCompare: (perfume) => {
        const { items } = get();
        if (items.some((p) => p.id === perfume.id)) return;
        if (items.length >= MAX_COMPARE) {
          toast.error(`Poți compara maxim ${MAX_COMPARE} parfumuri`);
          return;
        }
        set({ items: [...items, perfume] });
      },
      removeFromCompare: (id) =>
        set((state) => ({ items: state.items.filter((p) => p.id !== id) })),
      toggleCompare: (perfume) => {
        const { items, addToCompare, removeFromCompare } = get();
        if (items.some((p) => p.id === perfume.id)) {
          removeFromCompare(perfume.id);
        } else {
          addToCompare(perfume);
        }
      },
      clearCompare: () => set({ items: [] }),
      isInCompare: (id) => get().items.some((p) => p.id === id),
    }),
    { name: "compare-perfumes" },
  ),
);
