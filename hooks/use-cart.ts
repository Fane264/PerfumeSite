"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { cartApi, ApiError } from "@/lib/api-client";
import { useCartStore } from "@/store/cart-store";
import type { ApiCart } from "@/types";

export const CART_QUERY_KEY = ["cart"] as const;

const EMPTY_CART: ApiCart = {
  id: "",
  currency: "RON",
  items: [],
  itemCount: 0,
  subtotal: 0,
};

/** Current user's cart. Disabled (empty) when signed out. */
export function useCart(): UseQueryResult<ApiCart> & { cart: ApiCart } {
  const { isSignedIn } = useAuth();
  const query = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: cartApi.get,
    enabled: !!isSignedIn,
    staleTime: 30_000,
  });
  return { ...query, cart: query.data ?? EMPTY_CART };
}

/** Add a variant to the cart; opens the drawer and toasts on success. */
export function useAddToCart() {
  const queryClient = useQueryClient();
  const openDrawer = useCartStore((s) => s.open);

  return useMutation({
    mutationFn: ({ variantId, quantity = 1 }: { variantId: string; quantity?: number }) =>
      cartApi.add(variantId, quantity),
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
      openDrawer();
      toast.success("Adăugat în coș");
    },
    onError: (error: ApiError) => {
      toast.error(error.message || "Nu am putut adăuga produsul");
    },
  });
}

/** Add every item of a bundle to the cart (atomic); opens the drawer on success. */
export function useAddBundleToCart() {
  const queryClient = useQueryClient();
  const openDrawer = useCartStore((s) => s.open);

  return useMutation({
    mutationFn: (bundleId: string) => cartApi.addBundle(bundleId),
    onSuccess: (cart) => {
      queryClient.setQueryData(CART_QUERY_KEY, cart);
      openDrawer();
      toast.success("Set adăugat în coș");
    },
    onError: (error: ApiError) => {
      toast.error(error.message || "Nu am putut adăuga setul");
    },
  });
}

/** Set a line's quantity (0 removes). Optimistically updates the cached cart. */
export function useUpdateCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ cartItemId, quantity }: { cartItemId: string; quantity: number }) =>
      cartApi.setQuantity(cartItemId, quantity),
    onMutate: async ({ cartItemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = queryClient.getQueryData<ApiCart>(CART_QUERY_KEY);
      if (previous) {
        const items =
          quantity === 0
            ? previous.items.filter((i) => i.id !== cartItemId)
            : previous.items.map((i) =>
                i.id === cartItemId
                  ? { ...i, quantity, lineTotal: i.variant.price * quantity }
                  : i,
              );
        queryClient.setQueryData<ApiCart>(CART_QUERY_KEY, {
          ...previous,
          items,
          itemCount: items.reduce((n, i) => n + i.quantity, 0),
          subtotal: items.reduce((n, i) => n + i.lineTotal, 0),
        });
      }
      return { previous };
    },
    onError: (error: ApiError, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(CART_QUERY_KEY, context.previous);
      toast.error(error.message || "Nu am putut actualiza coșul");
    },
    onSuccess: (cart) => queryClient.setQueryData(CART_QUERY_KEY, cart),
  });
}

/** Remove a line entirely. */
export function useRemoveCartItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cartItemId: string) => cartApi.remove(cartItemId),
    onMutate: async (cartItemId) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previous = queryClient.getQueryData<ApiCart>(CART_QUERY_KEY);
      if (previous) {
        const items = previous.items.filter((i) => i.id !== cartItemId);
        queryClient.setQueryData<ApiCart>(CART_QUERY_KEY, {
          ...previous,
          items,
          itemCount: items.reduce((n, i) => n + i.quantity, 0),
          subtotal: items.reduce((n, i) => n + i.lineTotal, 0),
        });
      }
      return { previous };
    },
    onError: (error: ApiError, _id, context) => {
      if (context?.previous) queryClient.setQueryData(CART_QUERY_KEY, context.previous);
      toast.error(error.message || "Nu am putut elimina produsul");
    },
    onSuccess: (cart) => queryClient.setQueryData(CART_QUERY_KEY, cart),
  });
}
