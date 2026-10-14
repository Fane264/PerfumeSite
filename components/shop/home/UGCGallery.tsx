"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { reviewsApi, type UGCGalleryItem } from "@/lib/api-client";
import { SectionHeading } from "@/components/shop/reveal";

/**
 * Social wall of customer photos drawn from approved reviews that carry images.
 * Renders nothing until there is at least one photo, so the homepage degrades
 * gracefully on a fresh install.
 */
export function UGCGallery() {
  const t = useTranslations("home");
  const { data } = useQuery({
    queryKey: ["ugc-gallery"],
    queryFn: () => reviewsApi.gallery(12),
    staleTime: 5 * 60 * 1000,
  });

  // Flatten to one tile per image, keeping the parent review's metadata.
  const tiles = (data ?? []).flatMap((review) =>
    review.images.map((img) => ({ img, review })),
  );

  if (tiles.length === 0) return null;

  return (
    <section className="container py-24">
      <SectionHeading
        eyebrow="#DecantLux"
        title={t("communityTitle")}
      />
      <div className="mt-12 columns-2 gap-4 md:columns-3 lg:columns-4 [&>*]:mb-4">
        {tiles.map(({ img, review }) => (
          <GalleryTile key={img.id} img={img} review={review} />
        ))}
      </div>
    </section>
  );
}

function GalleryTile({
  img,
  review,
}: {
  img: UGCGalleryItem["images"][number];
  review: UGCGalleryItem;
}) {
  return (
    <Link
      href={`/parfumuri/${review.perfume.slug}`}
      className="group relative block break-inside-avoid overflow-hidden rounded-sm border border-border"
      aria-label={`${review.perfume.name} de la ${review.perfume.houseName}`}
    >
      <Image
        src={img.url}
        alt={img.altText ?? `${review.perfume.name} — foto client`}
        width={400}
        height={500}
        sizes="(max-width: 768px) 50vw, 25vw"
        className="h-auto w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/10 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <p className="font-serif text-sm text-cream">{review.perfume.name}</p>
        <p className="text-[11px] text-muted-foreground">
          {review.perfume.houseName}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <span className="flex items-center gap-0.5 text-gold">
            <Star className="size-3 fill-gold" />
            <span className="text-[11px]">{review.rating}</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            {review.author.name}
          </span>
        </div>
      </div>
    </Link>
  );
}
