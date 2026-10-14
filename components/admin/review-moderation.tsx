"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Trash2, Loader2, BadgeCheck } from "lucide-react";
import toast from "react-hot-toast";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { RatingStars } from "@/components/shop/rating-stars";

export interface AdminReview {
  id: string;
  rating: number;
  title: string;
  body: string;
  isApproved: boolean;
  isVerifiedPurchase: boolean;
  createdAt: string;
  authorEmail: string;
  perfumeName: string;
}

export function ReviewModeration({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function setApproved(id: string, isApproved: boolean) {
    setPendingId(id);
    try {
      await apiFetch(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isApproved }),
      });
      toast.success(isApproved ? "Recenzie aprobată" : "Recenzie respinsă");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Acțiune eșuată");
    } finally {
      setPendingId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("Ștergi definitiv această recenzie?")) return;
    setPendingId(id);
    try {
      await apiFetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      toast.success("Recenzie ștearsă");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Ștergere eșuată");
    } finally {
      setPendingId(null);
    }
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
        Nicio recenzie în această categorie.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const busy = pendingId === review.id;
        return (
          <div key={review.id} className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <RatingStars value={review.rating} size={14} />
                  <span className="font-medium">{review.title}</span>
                  {review.isVerifiedPurchase && (
                    <span className="inline-flex items-center gap-1 rounded-sm bg-success/15 px-2 py-0.5 text-[11px] text-success">
                      <BadgeCheck className="size-3" /> Cumpărare verificată
                    </span>
                  )}
                  <StatusPill isApproved={review.isApproved} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {review.perfumeName} · {review.authorEmail} ·{" "}
                  {new Date(review.createdAt).toLocaleDateString("ro-RO")}
                </p>
                <p className="mt-3 text-sm">{review.body}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {busy ? (
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    {!review.isApproved && (
                      <button
                        type="button"
                        onClick={() => setApproved(review.id, true)}
                        className="flex items-center gap-1.5 rounded-md bg-success/15 px-3 py-1.5 text-sm text-success transition-colors hover:bg-success/25"
                      >
                        <Check className="size-4" /> Aprobă
                      </button>
                    )}
                    {review.isApproved && (
                      <button
                        type="button"
                        onClick={() => setApproved(review.id, false)}
                        className="flex items-center gap-1.5 rounded-md bg-amber-500/15 px-3 py-1.5 text-sm text-amber-400 transition-colors hover:bg-amber-500/25"
                      >
                        <X className="size-4" /> Respinge
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(review.id)}
                      aria-label="Șterge recenzia"
                      className="flex items-center rounded-md p-1.5 text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ isApproved }: { isApproved: boolean }) {
  return (
    <span
      className={cn(
        "rounded-sm px-2 py-0.5 text-[11px] uppercase tracking-wide",
        isApproved
          ? "bg-success/15 text-success"
          : "bg-amber-500/15 text-amber-400",
      )}
    >
      {isApproved ? "Aprobată" : "În așteptare"}
    </span>
  );
}
