"use client";

import { useState } from "react";
import Image from "next/image";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { Star, Loader2, Check, Camera, X } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { apiFetch, apiFetchEnvelope, ApiError } from "@/lib/api-client";
import { RatingStars } from "@/components/shop/rating-stars";
import { SectionHeading } from "@/components/shop/reveal";
import { CloudinaryUpload } from "@/components/admin/cloudinary-upload";
import {
  CloudinaryVideoUpload,
  type UploadedVideo,
} from "@/components/admin/cloudinary-video-upload";
import type { ApiReview, ApiReviewImage, RatingSummary } from "@/types";

interface ReviewsSectionProps {
  perfumeId: string;
  initialReviews: ApiReview[];
  initialRating: RatingSummary;
  initialPagination?: {
    page: number;
    hasNextPage: boolean;
  };
}

interface ReviewsPage {
  items: ApiReview[];
  pagination?: { page: number; hasNextPage: boolean };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ReviewsSection({
  perfumeId,
  initialReviews,
  initialRating,
  initialPagination,
}: ReviewsSectionProps) {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<ReviewsPage>({
      queryKey: ["reviews", perfumeId],
      initialPageParam: 1,
      queryFn: async ({ pageParam }) => {
        const env = await apiFetchEnvelope<ApiReview[]>(
          `/api/reviews?perfumeId=${perfumeId}&page=${pageParam as number}&limit=10`,
        );
        return {
          items: env.data ?? [],
          pagination: env.meta?.pagination,
        };
      },
      getNextPageParam: (last) =>
        last.pagination?.hasNextPage ? last.pagination.page + 1 : undefined,
      initialData: {
        pages: [
          {
            items: initialReviews,
            pagination: initialPagination
              ? { page: initialPagination.page, hasNextPage: initialPagination.hasNextPage }
              : { page: 1, hasNextPage: false },
          },
        ],
        pageParams: [1],
      },
    });

  const reviews = data?.pages.flatMap((p) => p.items) ?? [];
  const rating = initialRating;
  const maxCount = Math.max(
    1,
    ...([5, 4, 3, 2, 1] as const).map((s) => rating.distribution[s]),
  );

  return (
    <section id="reviews" className="border-t border-border py-16">
      <SectionHeading eyebrow="Părerile clienților" title="Recenzii" />

      <div className="mt-10 grid gap-10 lg:grid-cols-[300px_1fr]">
        {/* Summary */}
        <div>
          <div className="flex items-end gap-3">
            <span className="font-serif text-6xl font-light text-cream">
              {rating.average.toFixed(1)}
            </span>
            <div className="pb-2">
              <RatingStars value={rating.average} size={18} />
              <p className="mt-1 text-sm text-muted-foreground">
                {rating.count} recenzii
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = rating.distribution[star];
              return (
                <div key={star} className="flex items-center gap-3 text-sm">
                  <span className="flex w-8 items-center gap-1 text-muted-foreground">
                    {star}
                    <Star className="size-3 fill-gold text-gold" />
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full bg-gold"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {isSignedIn && (
            <button
              type="button"
              onClick={() => setShowForm((s) => !s)}
              className="mt-8 w-full border border-gold px-6 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
            >
              {showForm ? "Anulează" : "Scrie o recenzie"}
            </button>
          )}
        </div>

        {/* List + form */}
        <div>
          {showForm && (
            <ReviewForm
              perfumeId={perfumeId}
              onDone={() => {
                setShowForm(false);
                void queryClient.invalidateQueries({
                  queryKey: ["reviews", perfumeId],
                });
              }}
            />
          )}

          {reviews.length === 0 ? (
            <p className="text-muted-foreground">
              Încă nu există recenzii. Fii primul care împărtășește o părere.
            </p>
          ) : (
            <ul className="space-y-8">
              {reviews.map((review) => (
                <li key={review.id} className="border-b border-border pb-8">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-surface2 text-sm font-medium text-gold">
                      {initials(review.author.name)}
                    </span>
                    <div>
                      <p className="text-sm text-cream">{review.author.name}</p>
                      <RatingStars value={review.rating} size={13} />
                    </div>
                    {review.isVerifiedPurchase && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded-sm border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] text-success">
                        <Check className="size-3" /> Cumpărare verificată
                      </span>
                    )}
                  </div>
                  <h4 className="mt-3 font-serif text-lg text-cream">
                    {review.title}
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {review.body}
                  </p>
                  {review.images.length > 0 && (
                    <ReviewImages
                      images={review.images}
                      onOpen={(url) => setLightbox(url)}
                    />
                  )}
                  {review.videoUrl && (
                    <video
                      src={review.videoUrl}
                      controls
                      preload="metadata"
                      className="mt-3 aspect-video w-full max-w-sm rounded-md bg-black"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}

          {hasNextPage && (
            <button
              type="button"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="mt-8 flex items-center gap-2 border border-border px-6 py-2.5 text-sm uppercase tracking-widest text-cream transition-colors hover:border-gold hover:text-gold"
            >
              {isFetchingNextPage && <Loader2 className="size-4 animate-spin" />}
              Încarcă mai multe
            </button>
          )}
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Imagine recenzie"
          onClick={() => setLightbox(null)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightbox(null);
          }}
        >
          <button
            type="button"
            aria-label="Închide"
            className="absolute right-6 top-6 text-cream/80 hover:text-cream"
            onClick={() => setLightbox(null)}
          >
            <X className="size-7" />
          </button>
          <div className="relative h-[80vh] w-full max-w-3xl">
            <Image
              src={lightbox}
              alt="Imagine recenzie"
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}

function ReviewImages({
  images,
  onOpen,
}: {
  images: ApiReviewImage[];
  onOpen: (url: string) => void;
}) {
  return (
    <div className="mt-3">
      <span className="mb-2 inline-flex items-center gap-1 rounded-sm border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
        <Camera className="size-3" /> {images.length}{" "}
        {images.length === 1 ? "poză" : "poze"}
      </span>
      <div className="flex flex-wrap gap-2">
        {images.map((img) => (
          <button
            key={img.id}
            type="button"
            onClick={() => onOpen(img.url)}
            aria-label="Vezi imaginea mărită"
            className="relative size-20 overflow-hidden rounded-sm border border-border transition-opacity hover:opacity-80"
          >
            <Image
              src={img.url}
              alt={img.altText ?? "Imagine recenzie"}
              fill
              sizes="80px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function ReviewForm({
  perfumeId,
  onDone,
}: {
  perfumeId: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [video, setVideo] = useState<UploadedVideo | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Selectează un punctaj");
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          perfumeId,
          rating,
          title,
          body,
          images: images.length > 0 ? images : undefined,
          videoUrl: video?.url,
        }),
      });
      toast.success("Recenzie trimisă spre aprobare. Mulțumim!");
      onDone();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Trimitere eșuată",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-10 space-y-4 border border-border bg-surface p-6"
    >
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Punctajul tău
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${star} stele`}
            >
              <Star
                className={cn(
                  "size-7 transition-colors",
                  (hover || rating) >= star
                    ? "fill-gold text-gold"
                    : "text-muted-2",
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        maxLength={140}
        placeholder="Titlul recenziei"
        className="h-11 w-full border border-input bg-surface2 px-3.5 text-sm text-cream placeholder:text-muted-foreground focus:border-gold focus:outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        maxLength={5000}
        rows={4}
        placeholder="Spune-ne ce părere ai despre acest parfum…"
        className="w-full border border-input bg-surface2 px-3.5 py-2.5 text-sm text-cream placeholder:text-muted-foreground focus:border-gold focus:outline-none"
      />
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Camera className="size-3.5" /> Adaugă poze (opțional, max 3)
        </p>
        <CloudinaryUpload
          value={images}
          onChange={setImages}
          folder="perfume-site/reviews"
          max={3}
        />
      </div>
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
          <Camera className="size-3.5" /> Adaugă recenzie video (opțional, max 60s)
        </p>
        <CloudinaryVideoUpload
          value={video}
          onChange={setVideo}
          maxDuration={60}
          label="Încarcă recenzie video"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="flex h-11 items-center gap-2 bg-gold px-6 text-sm font-medium uppercase tracking-widest text-background transition-colors hover:bg-gold-light disabled:opacity-60"
      >
        {submitting && <Loader2 className="size-4 animate-spin" />}
        Trimite recenzia
      </button>
    </form>
  );
}
