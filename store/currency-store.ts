import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_DISPLAY_CURRENCY,
  isSupportedCurrency,
  type Currency,
} from "@/lib/currency";

interface CurrencyState {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

/**
 * Persisted display-currency preference (RON default, EUR optional). Read by the
 * navbar toggle, product cards, the buy box and the cart summary so prices are
 * shown in the visitor's chosen currency. The checkout snapshots the choice onto
 * the order.
 */
export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: DEFAULT_DISPLAY_CURRENCY,
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: "display-currency",
      // Guard against a stale/invalid persisted value.
      merge: (persisted, current) => {
        const saved = (persisted as Partial<CurrencyState> | undefined)
          ?.currency;
        return {
          ...current,
          currency:
            saved && isSupportedCurrency(saved)
              ? saved
              : DEFAULT_DISPLAY_CURRENCY,
        };
      },
    },
  ),
);
