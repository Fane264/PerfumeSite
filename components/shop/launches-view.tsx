"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CountdownTimer } from "@/components/shop/CountdownTimer";
import { WaitlistButton } from "@/components/shop/WaitlistButton";
import { PreOrderButton } from "@/components/shop/PreOrderButton";
import { BLUR_DATA_URL } from "@/lib/blur-placeholder";

export interface LaunchCard {
  id: string;
  name: string;
  slug: string;
  houseName: string;
  imageUrl: string | null;
  launchDate: string | null;
  waitlistOpen: boolean;
  preOrderOpen: boolean;
  preOrderVariantId: string | null;
}

interface LaunchesViewProps {
  launches: LaunchCard[];
  defaultEmail?: string | null;
}

/** Grid of upcoming launches with per-product countdown + waitlist/pre-order. */
export function LaunchesView({ launches, defaultEmail }: LaunchesViewProps) {
  const t = useTranslations("launches");
  if (launches.length === 0) {
    return (
      <p className="py-20 text-center text-muted-foreground">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
      {launches.map((launch) => (
        <article key={launch.id} className="flex flex-col">
          <Link
            href={`/parfumuri/${launch.slug}`}
            className="relative block aspect-[3/4] overflow-hidden bg-surface"
          >
            {launch.imageUrl ? (
              <Image
                src={launch.imageUrl}
                alt={launch.name}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                placeholder="blur"
                blurDataURL={BLUR_DATA_URL}
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                {launch.name}
              </div>
            )}
          </Link>

          <div className="mt-4 flex flex-1 flex-col">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {launch.houseName}
            </p>
            <h2 className="mt-1 font-serif text-xl text-cream">{launch.name}</h2>

            {launch.launchDate && (
              <div className="mt-3">
                <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                  Lansare în
                </p>
                <CountdownTimer endsAt={launch.launchDate} size="sm" />
              </div>
            )}

            <div className="mt-4 space-y-3">
              {launch.preOrderOpen && launch.preOrderVariantId && (
                <PreOrderButton
                  variantId={launch.preOrderVariantId}
                  expectedDate={launch.launchDate}
                />
              )}
              {launch.waitlistOpen && (
                <WaitlistButton
                  perfumeId={launch.id}
                  perfumeName={launch.name}
                  defaultEmail={defaultEmail}
                />
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
