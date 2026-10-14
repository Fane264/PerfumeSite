"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { wishlistApi, ApiError, type WishlistEntry } from "@/lib/api-client";

export const WISHLIST_QUERY_KEY = ["wishlist"] as const;

/** Current user's wishlist entries (empty + disabled when signed out). */
export function useWishlist() {
  const { isSignedIn } = useAuth();
  const query = useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: wishlistApi.list,
    enabled: !!isSignedIn,
    staleTime: 60_000,
  });
  const ids = new Set((query.data ?? []).map((w: WishlistEntry) => w.perfume.id));
  return { ...query, entries: query.data ?? [], wishlistedIds: ids };
}

/** Toggle a perfume in/out of the wishlist with a friendly toast. */
export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();

  return useMutation({
    mutationFn: ({ perfumeId, wishlisted }: { perfumeId: string; wishlisted: boolean }) =>
      wishlisted ? wishlistApi.remove(perfumeId) : wishlistApi.add(perfumeId),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY });
      toast.success(
        result.wishlisted ? "Adăugat la favorite" : "Eliminat din favorite",
      );
    },
    onError: (error: ApiError) => {
      if (!isSignedIn) {
        toast.error("Autentifică-te pentru a salva favorite");
        return;
      }
      toast.error(error.message || "Acțiunea a eșuat");
    },
  });
}
