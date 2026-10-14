"use client";

import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Loader2, Scale, X } from "lucide-react";
import { useCompareStore } from "@/store/compare-store";
import { usePerfumeDetails } from "@/hooks/use-perfumes";
import { useMounted } from "@/hooks/use-mounted";
import { cn, formatPrice } from "@/lib/utils";
import { RatingStars } from "@/components/shop/rating-stars";
import type { ApiPerfumeDetail, ApiNoteRef } from "@/types";

const GENDER_LABEL = {
  MASCULINE: "Masculin",
  FEMININE: "Feminin",
  UNISEX: "Unisex",
} as const;

const CONCENTRATION_LABEL = {
  EDP: "Eau de Parfum",
  EDT: "Eau de Toilette",
  PARFUM: "Parfum",
  EAU_DE_COLOGNE: "Eau de Cologne",
  EXTRAIT: "Extrait de Parfum",
} as const;

export default function ComparePage() {
  const mounted = useMounted();
  const items = useCompareStore((s) => s.items);
  const removeFromCompare = useCompareStore((s) => s.removeFromCompare);
  const clearCompare = useCompareStore((s) => s.clearCompare);

  const slugs = items.map((p) => p.slug);
  const results = usePerfumeDetails(slugs);
  const loading = results.some((r) => r.isLoading);
  const details = results
    .map((r) => r.data)
    .filter((d): d is ApiPerfumeDetail => Boolean(d));

  if (!mounted) {
    return (
      <div className="container flex justify-center py-40">
        <Loader2 className="size-7 animate-spin text-gold" />
      </div>
    );
  }

  if (items.length < 2) {
    return (
      <div className="container flex flex-col items-center py-40 text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-full border border-border text-muted-foreground">
          <Scale className="size-7" />
        </div>
        <h1 className="font-serif text-3xl font-light text-cream">
          Compară parfumuri
        </h1>
        <p className="mt-3 max-w-md text-muted-foreground">
          Adaugă cel puțin două parfumuri în comparație folosind butonul{" "}
          <Scale className="inline size-4 align-text-bottom text-gold" /> de pe
          cardurile de produs.
        </p>
        <Link
          href="/parfumuri"
          className="mt-6 border border-gold px-7 py-3 text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
        >
          Explorează colecția
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-28 md:py-32">
      <div className="mb-10 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs uppercase tracking-luxe text-gold">
            Comparație
          </p>
          <h1 className="font-serif text-4xl font-light text-cream md:text-5xl">
            Comparație parfumuri
          </h1>
        </div>
        <button
          type="button"
          onClick={clearCompare}
          className="text-xs uppercase tracking-wide text-muted-foreground transition-colors hover:text-gold"
        >
          Golește tot
        </button>
      </div>

      {loading && details.length === 0 ? (
        <div className="flex justify-center py-20">
          <Loader2 className="size-7 animate-spin text-gold" />
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-luxe">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className="w-40 border-b border-border" />
                {details.map((p) => (
                  <th
                    key={p.id}
                    className="border-b border-border p-4 text-left align-top"
                  >
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => removeFromCompare(p.id)}
                        aria-label={`Elimină ${p.name}`}
                        className="absolute right-0 top-0 text-muted-foreground hover:text-cream"
                      >
                        <X className="size-4" />
                      </button>
                      <Link href={`/parfumuri/${p.slug}`} className="block">
                        <div className="relative mb-3 aspect-[3/4] w-full overflow-hidden bg-surface">
                          {p.images[0] && (
                            <Image
                              src={p.images[0].url}
                              alt={p.name}
                              fill
                              sizes="(max-width: 768px) 50vw, 200px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <p className="text-xs uppercase tracking-widest text-gold">
                          {p.house.name}
                        </p>
                        <p className="font-serif text-xl font-light text-cream">
                          {p.name}
                        </p>
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row label="Casă" details={details} render={(p) => p.house.name} />
              <Row
                label="Familie olfactivă"
                details={details}
                render={(p) => (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: p.family.colorHex }}
                    />
                    {p.family.name}
                  </span>
                )}
              />
              <Row
                label="Gen"
                details={details}
                render={(p) => GENDER_LABEL[p.gender]}
              />
              <Row
                label="Concentrație"
                details={details}
                render={(p) => CONCENTRATION_LABEL[p.concentration]}
              />
              <Row
                label="Note de vârf"
                details={details}
                render={(p) => <Notes notes={p.pyramid.top} />}
              />
              <Row
                label="Note de inimă"
                details={details}
                render={(p) => <Notes notes={p.pyramid.heart} />}
              />
              <Row
                label="Note de bază"
                details={details}
                render={(p) => <Notes notes={p.pyramid.base} />}
              />
              <Row
                label="Cel mai mic preț"
                details={details}
                render={(p) => (
                  <span className="text-gold">
                    {formatPrice(p.priceRange.min, p.priceRange.currency)}
                  </span>
                )}
              />
              <Row
                label="Disponibilitate"
                details={details}
                render={(p) => {
                  const inStock = p.variants.some((v) => v.inStock);
                  return (
                    <span className={inStock ? "text-success" : "text-error"}>
                      {inStock ? "În stoc" : "Indisponibil"}
                    </span>
                  );
                }}
              />
              <Row
                label="Rating"
                details={details}
                render={(p) =>
                  p.rating.count > 0 ? (
                    <span className="inline-flex items-center gap-1.5">
                      <RatingStars value={p.rating.average} size={13} />
                      <span className="text-xs text-muted-foreground">
                        ({p.rating.count})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )
                }
              />
              <tr>
                <td className="p-4" />
                {details.map((p) => (
                  <td key={p.id} className="p-4 align-top">
                    <Link
                      href={`/parfumuri/${p.slug}`}
                      className="inline-block w-full border border-gold px-4 py-2.5 text-center text-sm uppercase tracking-widest text-gold transition-colors hover:bg-gold hover:text-background"
                    >
                      Adaugă în coș
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  details,
  render,
}: {
  label: string;
  details: ApiPerfumeDetail[];
  render: (p: ApiPerfumeDetail) => React.ReactNode;
}) {
  return (
    <tr className="border-b border-border">
      <td className="p-4 align-top text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </td>
      {details.map((p) => (
        <td key={p.id} className="p-4 align-top text-sm text-cream">
          {render(p)}
        </td>
      ))}
    </tr>
  );
}

function Notes({ notes }: { notes: ApiNoteRef[] }) {
  if (notes.length === 0)
    return <span className="text-muted-foreground">—</span>;
  return (
    <span className="flex flex-wrap gap-1.5">
      {notes.map((n) => (
        <span
          key={n.id}
          className={cn(
            "rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground",
          )}
        >
          {n.name}
        </span>
      ))}
    </span>
  );
}
