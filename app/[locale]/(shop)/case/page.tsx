import { Link } from "@/i18n/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { Reveal } from "@/components/shop/reveal";

export const metadata: Metadata = {
  title: "Case de parfumuri de nișă",
  description:
    "Descoperă casele de parfumuri de nișă din colecția noastră: Creed, Xerjoff, Amouage, Initio și multe altele.",
};

export const revalidate = 300;

export default async function HousesPage() {
  const t = await getTranslations("houses");
  const houses = await db.perfumeHouse.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { perfumes: { where: { isActive: true } } } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="container py-28 md:py-32">
      <div className="mb-12 border-b border-border pb-8">
        <p className="text-xs uppercase tracking-luxe text-gold">{t("eyebrow")}</p>
        <h1 className="mt-2 font-serif text-4xl font-light text-cream md:text-6xl">
          {t("title")}
        </h1>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {houses.map((house) => (
          <Reveal key={house.id}>
            <Link
              href={`/case/${house.slug}`}
              className="group relative flex h-72 flex-col justify-end overflow-hidden border border-border bg-surface p-6"
            >
              {house.coverImageUrl && (
                <Image
                  src={house.coverImageUrl}
                  alt={house.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover opacity-30 transition-all duration-700 group-hover:scale-105 group-hover:opacity-50"
                />
              )}
              <div className="relative">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {house.country}
                  {house.foundedYear ? ` · ${house.foundedYear}` : ""}
                </p>
                <h2 className="mt-1 font-serif text-3xl font-light text-cream transition-colors group-hover:text-gold">
                  {house.name}
                </h2>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-gold">
                  {house._count.perfumes} {t("perfumes")}{" "}
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
