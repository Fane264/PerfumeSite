"use client";

import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Loader2, Building2, Check, Clock, Ban } from "lucide-react";
import { wholesaleApi } from "@/lib/api-client";
import { formatPrice } from "@/lib/utils";

const STATUS_META = {
  ACTIVE: { icon: Check, cls: "text-emerald-400" },
  PENDING: { icon: Clock, cls: "text-gold" },
  SUSPENDED: { icon: Ban, cls: "text-red-400" },
} as const;

export default function ContWholesalePage() {
  const t = useTranslations("wholesale");
  const { data, isLoading } = useQuery({
    queryKey: ["wholesale", "my"],
    queryFn: wholesaleApi.my,
  });

  const statusLabel = {
    ACTIVE: t("statusActive"),
    PENDING: t("statusPending"),
    SUSPENDED: t("statusSuspended"),
  } as const;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-6 animate-spin text-gold" />
      </div>
    );
  }

  if (!data?.hasAccount) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl text-cream">{t("b2bTitle")}</h1>
        <div className="border border-border bg-surface p-6 text-center">
          <Building2 className="mx-auto size-8 text-gold" />
          <p className="mt-3 text-muted-foreground">
            {t("noAccount")}
          </p>
          <Link
            href="/wholesale"
            className="mt-4 inline-block border border-gold px-6 py-2.5 text-sm uppercase tracking-wide text-gold transition-colors hover:bg-gold hover:text-background"
          >
            {t("applyBtn")}
          </Link>
        </div>
      </div>
    );
  }

  const statusKey = data.status ?? "PENDING";
  const status = STATUS_META[statusKey];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl text-cream">{data.companyName}</h1>
        <p
          className={`mt-1 inline-flex items-center gap-1.5 text-sm ${status.cls}`}
        >
          <status.icon className="size-4" />
          {statusLabel[statusKey]}
        </p>
      </header>

      {data.status === "ACTIVE" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              {t("discountActive")}
            </p>
            <p className="mt-1 font-serif text-3xl text-gold">
              {Math.round((data.discountRate ?? 0) * 100)}%
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("discountNote")}
            </p>
          </div>
          {data.cui && (
            <div className="border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                CUI
              </p>
              <p className="mt-1 font-serif text-xl text-cream">{data.cui}</p>
            </div>
          )}
        </div>
      )}

      {data.orders && data.orders.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-xl text-cream">
            {t("ordersTitle")}
          </h2>
          <ul className="divide-y divide-border border border-border">
            {data.orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-cream">{o.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.createdAt).toLocaleDateString("ro-RO")} · {o.status}
                  </p>
                </div>
                <span className="font-medium text-gold">
                  {formatPrice(o.total, o.currency === "EUR" ? "EUR" : "RON")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-sm text-muted-foreground">
        {t("contactText")}{" "}
        <a href="mailto:b2b@decantlux.ro" className="text-gold hover:underline">
          b2b@decantlux.ro
        </a>
        .
      </p>
    </div>
  );
}
