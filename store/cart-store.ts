import { create } from "zustand";

/**
 * Client-side cart UI state. The cart *contents* live in react-query (server is
 * authoritative); this store only governs the drawer's open/close state so any
 * component can pop the drawer (e.g. after add-to-cart).
 */
interface CartUiState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCartStore = create<CartUiState>((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
}));
