"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, PackageSearch } from "lucide-react";
import { preordersApi, type MyPreOrder } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";

const STATUS_CLS: Record<MyPreOrder["status"], string> = {
  PENDING: "text-amber-400 border-amber-400/40",
  PAID: "text-gold border-gold/40",
  FULFILLED: "text-emerald-400 border-emerald-400/40",
  CANCELLED: "text-muted-foreground border-border",
};

function formatEta(iso: string | null, locale: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ro-RO", {
    month: "long",
    year: "numeric",
  }).format(d);
}

export default function PrecomenziPage() {
  const t = useTranslations("preorders");
  const locale = useLocale();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["preorders", "my"],
    queryFn: preordersApi.my,
  });

  const statusLabel: Record<MyPreOrder["status"], string> = {
    PENDING: t("statusPending"),
    PAID: t("statusPaid"),
    FULFILLED: t("statusFulfilled"),
    CANCELLED: t("statusCancelled"),
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl text-cream">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("subtitle")}
        </p>
      </header>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-gold" />
        </div>
      )}

      {isError && (
        <p className="py-16 text-center text-muted-foreground">
          {t("loadError")}
        </p>
      )}

      {data && data.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <PackageSearch className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            {t("empty")}
          </p>
          <Link
            href="/lansari"
            className="border border-gold px-5 py-2.5 text-sm uppercase tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
          >
            {t("viewLaunches")}
          </Link>
        </div>
      )}

      {data && data.length > 0 && (
        <ul className="divide-y divide-border border border-border">
          {data.map((p) => {
            const eta = formatEta(p.expectedDate, locale);
            return (
              <li key={p.id} className="flex gap-4 p-4">
                <Link
                  href={`/parfumuri/${p.perfumeSlug}`}
                  className="relative size-20 shrink-0 overflow-hidden bg-surface"
                >
                  {p.imageUrl && (
                    <Image
                      src={p.imageUrl}
                      alt={p.perfumeName}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </Link>
                <div className="flex flex-1 flex-col">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {p.houseName}
                  </p>
                  <Link
                    href={`/parfumuri/${p.perfumeSlug}`}
                    className="font-serif text-lg text-cream hover:text-gold"
                  >
                    {p.perfumeName}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {p.sizeML} ml × {p.quantity} · {formatPrice(p.unitPrice * p.quantity, "RON")}
                  </p>
                  {eta && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("estimatedDelivery", { date: eta })}
                    </p>
                  )}
                </div>
                <span
                  className={`h-fit shrink-0 border px-2.5 py-1 text-xs ${STATUS_CLS[p.status]}`}
                >
                  {statusLabel[p.status]}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
